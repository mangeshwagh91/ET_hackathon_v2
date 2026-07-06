# DCPI Architecture — For an LLM

## Purpose

This document explains the architecture of the DCPI codebase to another LLM. It is written to be precise about components, data flow, integration points, and key implementation details so an LLM can reason about, extend, or generate code changes safely.

Repository layout (high level)

- `backend/` — FastAPI service, API routers, database, services, and agents.
- `frontend/` — Vite + React single-page app (UI and API client).

Primary goals

- Describe the runtime components and interactions.
- Identify files and entry points to read or modify.
- Explain data flow for common operations: spec ingestion, RFI search, LLM calls, and indexing.

## High-level overview

The application is a classic web service with a React frontend and a FastAPI backend. The backend provides REST endpoints, persistent storage (SQLite via a small DB layer), and a semantic vector store (ChromaDB). LLM access is handled by a central service that switches between Groq (cloud) and Ollama (local) depending on configuration.

Key components

- API server: [backend/main.py](backend/main.py)
  - FastAPI app with a lifespan manager for startup/shutdown, router registration, CORS, health checks, and middleware that adds request IDs and timing headers.
- Routers: [backend/routers/](backend/routers)
  - Main feature routers include Upload, Compliance, Schedule, RFI, and Dashboard. Each router exposes endpoints and calls services/agents for logic.
  - Example: RFI endpoints are implemented in [backend/routers/rfi.py](backend/routers/rfi.py).
- Agents: [backend/agents/](backend/agents)
  - Domain agents implement higher-level workflows that combine DB access, vector search, and LLM calls (for example, `rfi_knowledge_agent.py`).
- Services: [backend/services/](backend/services)
  - `llm_client.py`: Centralized LLM client that implements Groq primary / Ollama fallback, JSON parsing heuristics, key rotation, and health checks.
  - `vector_store.py`: ChromaDB integration, embedding via `sentence-transformers`, indexing/search helpers, and serialization rules.
  - `pdf_extractor.py`, `spec_parser.py`: document ingestion and clause extraction helpers used by upload and spec management flows.
- Database: [backend/database/](backend/database)
  - Lightweight SQLite connection wrapper and schema migration/initialization. See `database/connection.py` and `database/schema.py`.

## Detailed component behaviors

LLM client (`backend/services/llm_client.py`)

- Primary provider: Groq (multi-key rotation). Fallback: Ollama (local HTTP server).
- Exposed sync APIs:
  - `call_claude(system_prompt, user_message, max_tokens)` -> text
  - `call_claude_json(system_prompt, user_message, max_tokens)` -> parsed JSON (robust parser with fallback heuristics)
- Key behaviors:
  - Round-robin key selection with simple error-count tracking.
  - JSON-mode for Groq; Ollama uses a `format=json` option when available.
  - Robust JSON extraction strategies (code blocks, brace counting, fix common errors).
  - Health checks for both providers.

Vector store (`backend/services/vector_store.py`)

- Uses ChromaDB persistent client with collections such as `spec_clauses` and `rfis`.
- Embeddings: `sentence-transformers` model (default `all-MiniLM-L6-v2`) — embedding model loaded lazily and kept as a singleton.
- Metadata canonicalization: all metadata saved as strings; `is_resolved` saved as lowercase `"true"`/`"false"`.
- Search functions return normalized chunk records with `id`, `text`, `metadata`, `distance`, and `score`.

Routers and agents

- Routers are thin: validate inputs, call agents/services, and return validated responses.
- Agents orchestrate multiple services (DB queries, vector search, LLM prompts). Example flow for an RFI query:
  1. Router `/api/rfi/query` receives a `query`.

2.  Router calls `agents.rfi_knowledge_agent.answer_rfi_query(query)`.
3.  Agent calls `vector_store.search_rfis(...)` to fetch relevant RFIs or spec clauses.
4.  Agent formats a prompt combining the retrieved chunks and domain instructions and calls `services.llm_client.call_claude_json()` (or `call_claude`) to generate the response.
5.  Agent returns structured data which the router converts to the `RFIQueryResponse` model.

Data flow: upload → parse → index

- Uploads land at `routers.upload` (critical router). Upload flow:
  - File saved under `UPLOADS_PATH` and static files mounted at `/uploads`.
  - `pdf_extractor` extracts text; `spec_parser` breaks the document into clauses with ids.
  - Each clause is indexed via `vector_store.index_spec_clause(clause_id, text, metadata)`.

Database and persistence

- SQLite is used via `database/connection.py`. Initialization and migrations live in `database/schema.py` and `database/migrate_add_columns.py`.
- The startup lifecycle in `main.py` calls `init_db()` during application startup.

Configuration and environment variables

- Important env vars (checked in `main.py` and `llm_client.py`):
  - `GROQ_API_KEY` / `GROQ_API_KEYS` — comma-separated keys
  - `GROQ_MODEL`, `GROQ_TIMEOUT_SECONDS`, `GROQ_MAX_RETRIES`
  - `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_SECONDS`
  - `CHROMA_PATH`, `EMBEDDING_MODEL`, `UPLOADS_PATH`, `CORS_ORIGINS`

Startup and lifecycle

- On startup (`lifespan` in `main.py`):
  1. Create directories (`uploads`, `chroma_db`).
  2. Initialize DB via `init_db()`.
  3. Attempt to initialize ChromaDB collections (non-fatal on failure).
  4. Register routers; `routers.upload` is critical and will abort on failure.
  5. Expose `/docs`, `/health`, and `/` endpoints.

Health and observability

- `main.py` exposes `/health` which performs DB connectivity test and queries `services.vector_store.check_health()`.
- Request middleware adds `X-Request-ID` and `X-Process-Time` headers for tracing.

Extensibility notes for an LLM

- To add a new domain agent:
  1. Add a router under `backend/routers/` that validates inputs and delegates to the agent.

2. Add agent logic in `backend/agents/` which uses `services.vector_store` and `services.llm_client`.
3. Use `call_claude_json` when you need structured JSON output from the model; include strict JSON instructions and a schema in the prompt.

Prompt engineering and safety

- Keep system prompts short and include explicit required JSON schema when using `call_claude_json`.
- When instructing LLMs to output JSON, prefer fenced code block markers (`json ... `) to improve `llm_client._parse_json_robust` success.

Where to start reading code (recommended order)

1. [backend/main.py](backend/main.py) — startup, router registration, and lifecyle.
2. [backend/services/llm_client.py](backend/services/llm_client.py) — provider selection, JSON parsing, and public APIs.
3. [backend/services/vector_store.py](backend/services/vector_store.py) — embedding, indexing, and search behavior.
4. [backend/agents/rfi_knowledge_agent.py](backend/agents/rfi_knowledge_agent.py) — example agent orchestration.
5. [backend/routers/rfi.py](backend/routers/rfi.py) — example router and request models.

Example request/response (RFI query)

- Request: POST `/api/rfi/query` with JSON `{ "query": "How to handle cable containment?" }`.
- Flow: router → agent → `vector_store.search_rfis` → compose prompt → `llm_client.call_claude_json` → parse → return structured `RFIQueryResponse`.

Operational tips

- If ChromaDB or sentence-transformers are not installed, vector features will be disabled but the API will still start (with warnings). Seed data is required to get non-empty vector collections; run `backend/seed_data.py` to populate sample collections.
- Run the service locally with an Ollama dev instance (if Groq keys are not available) to develop prompt/agent logic.

Next steps (for an LLM)

- Use this doc to answer questions about where to add features or to generate code changes: modify agents, add router endpoints, or change prompt templates in `agents/*`.
- If you need line-level context, open the files listed in the "Where to start reading code" section.

---

Generated: a machine-oriented architecture overview for programmatic consumption.
