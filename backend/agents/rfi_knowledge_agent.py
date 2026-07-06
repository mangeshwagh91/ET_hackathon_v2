"""
RFI Knowledge Agent — DCPI.
RAG-powered agent that answers project RFI queries by searching
specification clauses and precedent resolved RFIs using ChromaDB.
Fully synchronous. Uses call_claude only (Groq primary, Ollama fallback).
"""

import os
import json
import uuid
import logging
import re
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field

from database.connection import get_db
from services.llm_client import call_claude, has_available_provider
from services.vector_store import search_spec_clauses, search_rfis, CHROMADB_AVAILABLE

logger = logging.getLogger(__name__)

# ── Configuration ──────────────────────────────────────────────────────────────
MAX_SPEC_RESULTS = int(os.getenv("RFI_MAX_SPEC_RESULTS", "5"))
MAX_RFI_RESULTS = int(os.getenv("RFI_MAX_RFI_RESULTS", "5"))
PRECEDENT_THRESHOLD = float(os.getenv("RFI_PRECEDENT_THRESHOLD", "0.82"))
MAX_CONTEXT_CHARS = int(os.getenv("RFI_MAX_CONTEXT_CHARS", "700"))
MAX_ANSWER_WORDS = int(os.getenv("RFI_MAX_ANSWER_WORDS", "400"))

AGENT_NAME = "rfi_knowledge"
AGENT_VERSION = "2.0.0"

# ── Data Classes ───────────────────────────────────────────────────────────────

@dataclass
class RetrievedSource:
    rank: int
    doc_id: str
    doc_type: str
    text: str
    score: float
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def label(self) -> str:
        if self.doc_type == "spec_clause":
            clause_num = self.metadata.get("clause_number", "N/A")
            doc_id = self.metadata.get("document_id", "N/A")
            return f"SPEC CLAUSE {clause_num} | doc:{doc_id}"
        else:
            rfi_code = self.metadata.get("rfi_code", "N/A")
            return f"RFI {rfi_code}"


# ── System Prompt ──────────────────────────────────────────────────────────────

RAG_SYSTEM = """You are a senior technical manager on a Tier IV hyperscale data centre EPC project with 15+ years of experience.

Answer questions from the project team using ONLY the information provided in the CONTEXT below.

STRICT RULES:
1. Answer ONLY from the provided context. Do not use general knowledge.
2. Cite EVERY factual claim using [SOURCE N] where N is the source number from the context.
3. If a precedent RFI resolved a similar issue, LEAD your answer with it.
4. If the context does NOT contain sufficient information, explicitly state: "The project documents do not contain a definitive answer. Recommend raising a formal RFI."
5. Be DIRECT and ACTIONABLE. Engineers need decisions, not discussions.
6. Keep your answer under {max_words} words.
7. Structure: (a) Precedent resolution if any, (b) Specification requirements, (c) Recommended action.
8. End with: [Confidence: HIGH/MEDIUM/LOW]"""


# ── Main Entry Point ───────────────────────────────────────────────────────────

def answer_rfi_query(query: str) -> Dict[str, Any]:
    """
    Answer an RFI query using RAG over spec clauses and precedent RFIs.
    Synchronous. Called by POST /api/rfi/query.
    """
    if not query or not query.strip():
        raise ValueError("Query cannot be empty")

    agent_run_id = str(uuid.uuid4())
    started_ts = datetime.now(timezone.utc).isoformat()
    start_time = datetime.now()

    logger.info(f"RFI query [{agent_run_id[:8]}]: {query[:100]}")

    db = get_db()
    try:
        if not CHROMADB_AVAILABLE:
            spec_results = _fallback_spec_search(query, db, MAX_SPEC_RESULTS)
        else:
            try:
                spec_results = search_spec_clauses(query, n_results=MAX_SPEC_RESULTS)
            except Exception as e:
                logger.warning(f"Vector spec search unavailable, using DB fallback: {e}")
                spec_results = _fallback_spec_search(query, db, MAX_SPEC_RESULTS)

        if not CHROMADB_AVAILABLE:
            rfi_results = _fallback_rfi_search(query, db, MAX_RFI_RESULTS)
        else:
            try:
                rfi_results = search_rfis(query, n_results=MAX_RFI_RESULTS)
            except Exception as e:
                logger.warning(f"Vector RFI search unavailable, using DB fallback: {e}")
                rfi_results = _fallback_rfi_search(query, db, MAX_RFI_RESULTS)

        logger.info(
            f"Retrieved {len(spec_results)} spec clauses, {len(rfi_results)} RFIs"
        )

        all_chunks = _build_source_list(spec_results, rfi_results)
        precedent_rfis = _find_precedent_rfis(rfi_results, db)

        if precedent_rfis:
            logger.info(f"Found {len(precedent_rfis)} precedent RFIs")

        if not all_chunks:
            answer_text = (
                "The project documents do not contain any relevant information "
                "to answer this query. Recommend submitting a formal RFI with "
                "specific technical details referencing applicable standards."
            )
            confidence = 0.0
        else:
            context_text = _build_context_text(all_chunks)
            precedent_text = _build_precedent_text(precedent_rfis)
            user_message = _build_user_message(context_text, precedent_text, query)

            if not has_available_provider():
                answer_text = _fallback_answer(all_chunks, precedent_rfis)
            else:
                try:
                    answer_text = call_claude(
                        RAG_SYSTEM.format(max_words=MAX_ANSWER_WORDS),
                        user_message,
                        max_tokens=1200
                    )
                except Exception as e:
                    logger.error(f"LLM call failed for RFI query: {e}")
                    answer_text = _fallback_answer(all_chunks, precedent_rfis)

            confidence = _compute_confidence(all_chunks)

        sources = []
        for chunk in all_chunks[:10]:
            sources.append({
                "doc_id": chunk.doc_id,
                "doc_type": chunk.doc_type,
                "clause_number": (
                    chunk.metadata.get("clause_number", "")
                    or chunk.metadata.get("rfi_code", "")
                ),
                "page_ref": chunk.metadata.get("document_id", ""),
                "score": chunk.score,
                "text_preview": chunk.text[:150]
            })

        processing_ms = round(
            (datetime.now() - start_time).total_seconds() * 1000, 1
        )
        _log_agent_run(
            agent_run_id=agent_run_id,
            started_ts=started_ts,
            query=query,
            confidence=confidence,
            num_precedents=len(precedent_rfis),
            num_sources=len(all_chunks),
            processing_ms=processing_ms,
            status="completed"
        )

        logger.info(
            f"RFI query complete [{agent_run_id[:8]}]: "
            f"confidence={confidence:.2f}, {len(precedent_rfis)} precedents, "
            f"{processing_ms:.0f}ms"
        )

        return {
            "answer": answer_text,
            "sources": sources,
            "precedent_rfis": [
                {
                    "rfi_id": p["rfi_id"],
                    "rfi_code": p["rfi_code"],
                    "title": p["title"],
                    "resolution_summary": p["resolution_summary"],
                    "similarity_score": p["similarity_score"]
                }
                for p in precedent_rfis
            ],
            "confidence": confidence,
            "agent_run_id": agent_run_id
        }

    except Exception as e:
        logger.error(f"RFI query failed [{agent_run_id[:8]}]: {e}")
        _log_agent_run(
            agent_run_id=agent_run_id,
            started_ts=started_ts,
            query=query,
            status="failed",
            error=str(e)
        )
        raise RuntimeError(f"RFI query processing failed: {e}") from e

    finally:
        db.close()


# ── Source Building ────────────────────────────────────────────────────────────

def _build_source_list(
    spec_results: List[Dict],
    rfi_results: List[Dict]
) -> List[RetrievedSource]:
    all_chunks = []
    rank = 0
    for chunk in spec_results:
        rank += 1
        all_chunks.append(RetrievedSource(
            rank=rank,
            doc_id=chunk.get("id", ""),
            doc_type="spec_clause",
            text=chunk.get("text", ""),
            score=chunk.get("score", 0.0),
            metadata=chunk.get("metadata", {})
        ))
    for chunk in rfi_results:
        rank += 1
        all_chunks.append(RetrievedSource(
            rank=rank,
            doc_id=chunk.get("id", ""),
            doc_type="rfi",
            text=chunk.get("text", ""),
            score=chunk.get("score", 0.0),
            metadata=chunk.get("metadata", {})
        ))
    all_chunks.sort(key=lambda x: x.score, reverse=True)
    for i, chunk in enumerate(all_chunks):
        chunk.rank = i + 1
    return all_chunks


def _score_text_match(query: str, text: str) -> float:
    q_terms = [t for t in re.findall(r"[a-z0-9]+", query.lower()) if len(t) > 2]
    if not q_terms or not text:
        return 0.0
    haystack = text.lower()
    hits = sum(1 for term in q_terms if term in haystack)
    return round(hits / len(q_terms), 4)


def _fallback_spec_search(query: str, db, limit: int) -> List[Dict[str, Any]]:
    rows = db.execute(
        "SELECT id, raw_text, clause_number, clause_title, document_id, requirements_json, page_refs_json, equipment_class, tier FROM spec_clauses"
    ).fetchall()
    scored = []
    for row in rows:
        item = dict(row)
        text = " ".join([
            item.get("clause_number", ""),
            item.get("clause_title", ""),
            item.get("raw_text", ""),
            item.get("requirements_json", "")
        ])
        score = _score_text_match(query, text)
        if score <= 0:
            continue
        scored.append({
            "id": item.get("id", ""),
            "text": item.get("raw_text", ""),
            "score": score,
            "metadata": {
                "clause_number": item.get("clause_number", ""),
                "clause_title": item.get("clause_title", ""),
                "document_id": item.get("document_id", ""),
                "page_refs_json": item.get("page_refs_json", "[]"),
            }
        })
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]


def _fallback_rfi_search(query: str, db, limit: int) -> List[Dict[str, Any]]:
    rows = db.execute(
        "SELECT id, rfi_code, title, description, resolution_text, status, is_resolved FROM rfis"
    ).fetchall()
    scored = []
    for row in rows:
        item = dict(row)
        text = " ".join([
            item.get("rfi_code", ""),
            item.get("title", ""),
            item.get("description", ""),
            item.get("resolution_text", "")
        ])
        score = _score_text_match(query, text)
        if score <= 0:
            continue
        scored.append({
            "id": item.get("id", ""),
            "text": item.get("resolution_text", item.get("description", "")),
            "score": score,
            "metadata": {
                "rfi_code": item.get("rfi_code", ""),
                "title": item.get("title", ""),
                "is_resolved": str(item.get("is_resolved", "false")),
            }
        })
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]


def _find_precedent_rfis(
    rfi_results: List[Dict],
    db
) -> List[Dict[str, Any]]:
    precedents = []
    for chunk in rfi_results:
        score = chunk.get("score", 0.0)
        metadata = chunk.get("metadata", {})
        is_resolved = metadata.get("is_resolved", "false")

        if score < PRECEDENT_THRESHOLD:
            continue
        if str(is_resolved).lower() not in {"true", "1", "yes"}:
            continue

        rfi_id = chunk.get("id", "")
        if not rfi_id:
            continue

        try:
            row = db.execute(
                "SELECT id, rfi_code, title, resolution_text FROM rfis WHERE id = ?",
                (rfi_id,)
            ).fetchone()

            if row:
                row = dict(row)
                precedents.append({
                    "rfi_id": row["id"],
                    "rfi_code": row.get("rfi_code", "N/A"),
                    "title": row.get("title", "Untitled RFI"),
                    "resolution_summary": (row.get("resolution_text") or "")[:300],
                    "similarity_score": score
                })
        except Exception as e:
            logger.warning(f"Failed to fetch RFI {rfi_id}: {e}")

    precedents.sort(key=lambda x: x["similarity_score"], reverse=True)
    return precedents


# ── Context Building ───────────────────────────────────────────────────────────

def _build_context_text(chunks: List[RetrievedSource]) -> str:
    if not chunks:
        return "No relevant documents found in project corpus."
    blocks = []
    for chunk in chunks[:12]:
        label = f"[SOURCE {chunk.rank} | {chunk.label}]"
        text = chunk.text[:MAX_CONTEXT_CHARS]
        blocks.append(f"{label}\n{text}")
    return "\n\n---\n\n".join(blocks)


def _build_precedent_text(precedents: List[Dict]) -> str:
    if not precedents:
        return ""
    lines = [f"PRECEDENT RFIs (similarity > {PRECEDENT_THRESHOLD}):"]
    for i, p in enumerate(precedents[:3], 1):
        lines.append(
            f"{i}. {p['rfi_code']}: {p['title']}\n"
            f"   Resolution: {p['resolution_summary'][:250]}\n"
            f"   Similarity: {p['similarity_score']:.0%}"
        )
    return "\n".join(lines)


def _build_user_message(
    context_text: str,
    precedent_text: str,
    query: str
) -> str:
    parts = [f"CONTEXT FROM PROJECT DOCUMENTS:\n{context_text}"]
    if precedent_text:
        parts.append(precedent_text)
    parts.append(f"QUERY FROM PROJECT TEAM:\n{query}")
    parts.append(
        "Answer using ONLY the context above. "
        "Cite sources using [SOURCE N]. "
        "Lead with any precedent RFI if found. "
        "Be specific and actionable."
    )
    return "\n\n".join(parts)


def _fallback_answer(
    chunks: List[RetrievedSource],
    precedents: List[Dict]
) -> str:
    parts = []
    if precedents:
        parts.append("Precedent RFIs Found:")
        for p in precedents[:3]:
            parts.append(f"- {p['rfi_code']}: {p['resolution_summary'][:200]}")
    if chunks:
        top = chunks[0]
        parts.append(
            f"\nMost Relevant Specification:\n[{top.label}]\n{top.text[:300]}..."
        )
    parts.append(
        "\n⚠️ Automated fallback response — LLM unavailable. "
        "Review documents above and consult technical team."
    )
    return "\n".join(parts)


# ── Confidence Scoring ─────────────────────────────────────────────────────────

def _compute_confidence(chunks: List[RetrievedSource]) -> float:
    if not chunks:
        return 0.0
    top_score = max(c.score for c in chunks)
    source_boost = min(0.15, len(chunks) * 0.03)
    precedent_boost = 0.1 if any(
        c.doc_type == "rfi" and c.score > PRECEDENT_THRESHOLD
        for c in chunks
    ) else 0.0
    return round(min(1.0, top_score + source_boost + precedent_boost), 4)


# ── Agent Run Logging ──────────────────────────────────────────────────────────

def _log_agent_run(
    agent_run_id: str,
    started_ts: str,
    query: str,
    status: str = "completed",
    confidence: float = 0.0,
    num_precedents: int = 0,
    num_sources: int = 0,
    processing_ms: float = 0.0,
    error: str = None
) -> None:
    db = get_db()
    try:
        input_summary = f"Query: {query[:150]}"
        if status == "completed":
            output_summary = (
                f"Confidence={confidence:.2f} | "
                f"{num_precedents} precedents | "
                f"{num_sources} sources | "
                f"{processing_ms:.0f}ms"
            )
        else:
            output_summary = f"Failed: {(error or 'Unknown error')[:200]}"

        db.execute("""
            INSERT OR REPLACE INTO agent_runs
            (id, agent_name, agent_version, trigger_event,
             input_summary, output_summary, status,
             started_ts, completed_ts, records_processed,
             records_created, error_text, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            agent_run_id, AGENT_NAME, AGENT_VERSION, "rfi_query",
            input_summary, output_summary, status,
            started_ts, datetime.now(timezone.utc).isoformat(),
            num_sources, 0, error,
            json.dumps({
                "confidence": confidence,
                "num_precedents": num_precedents,
                "processing_ms": processing_ms
            })
        ))
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log agent run: {e}")
    finally:
        db.close()