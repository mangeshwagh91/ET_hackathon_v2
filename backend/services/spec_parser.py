"""
Specification Document Parser Service — DCPI.
Parses data centre EPC specification PDFs into structured clause requirements
using LLM-powered extraction with concurrent batch processing.
"""

import os
import re
import json
import uuid
import logging
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any, Tuple

logger = logging.getLogger(__name__)

# ── Configuration ──────────────────────────────────────────────────────────────
MAX_CLAUSE_TEXT_LENGTH = int(os.getenv("MAX_CLAUSE_TEXT_LENGTH", "3000"))
MAX_PARALLEL_EXTRACTIONS = int(os.getenv("MAX_PARALLEL_EXTRACTIONS", "5"))
MIN_WORDS_FOR_EXTRACTION = int(os.getenv("MIN_WORDS_FOR_EXTRACTION", "15"))

# ── Imports with graceful degradation ─────────────────────────────────────────
try:
    from services.pdf_extractor import extract_text_from_pdf
except ImportError as e:
    logger.error(f"Failed to import pdf_extractor: {e}")
    raise

try:
    from services.llm_client import call_claude_json, call_claude_json_batch, has_available_provider
    LLM_AVAILABLE = True
except ImportError as e:
    logger.warning(f"LLM client not available: {e}")
    LLM_AVAILABLE = False

try:
    from services.vector_store import index_spec_clause, CHROMADB_AVAILABLE
    VECTOR_STORE_AVAILABLE = bool(CHROMADB_AVAILABLE)
except ImportError as e:
    logger.warning(f"Vector store not available: {e}")
    VECTOR_STORE_AVAILABLE = False

try:
    from database.connection import get_db
    DATABASE_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Database not available: {e}")
    DATABASE_AVAILABLE = False


# ── Prompt ─────────────────────────────────────────────────────────────────────
CLAUSE_EXTRACTION_SYSTEM = """You are a technical specification analyst for data centre EPC projects.
Extract structured requirements from the following specification clause text.

Return a JSON object with EXACTLY these fields and no others:
{
  "equipment_class": "UPS",
  "clause_type": "TECHNICAL",
  "applicable_tier": "TIER_IV",
  "requirements": [
    {
      "attribute": "efficiency_pct",
      "required_value": 96.5,
      "tolerance_type": "MIN",
      "tolerance_pct": null,
      "unit": "%",
      "mandatory": true,
      "description": "Minimum efficiency at full load in VFI mode"
    }
  ],
  "ambiguity_flags": [],
  "standards_referenced": ["IEC 62040-3"],
  "confidence_score": 0.9
}

Rules:
- equipment_class: UPS | CRAC | GENERATOR | SWITCHGEAR | TRANSFORMER | PDU | COOLING | OTHER
- clause_type: TECHNICAL | QUALITY | SAFETY | ENVIRONMENTAL | INSTALLATION | MAINTENANCE | COMPLIANCE | GENERAL
- applicable_tier: TIER_I | TIER_II | TIER_III | TIER_IV | BOTH | N/A
- tolerance_type: MIN | MAX | EXACT | RANGE
- attribute: snake_case (e.g. efficiency_pct, battery_autonomy_min, ip_rating)
- required_value: number only — no units in the value field
- mandatory: true if text says "shall" or "must", false for "should" or "may"
- confidence_score: 0.0-1.0

Return ONLY valid JSON. No markdown. No preamble. No explanation."""


# ── Main entry points ──────────────────────────────────────────────────────────

def parse_spec_document(document_id: str, file_path: str) -> List[Dict[str, Any]]:
    """
    Synchronous entry point. Called by upload router.
    Alias for parse_spec_document_sync for backward compatibility.
    """
    return parse_spec_document_sync(document_id, file_path)


async def parse_spec_document_async(document_id: str, file_path: str) -> List[Dict[str, Any]]:
    """
    Async wrapper for the synchronous parser.

    Runs the CPU/IO-heavy parse work in a worker thread so async request
    handlers can await it without blocking the event loop.
    """
    return await asyncio.to_thread(parse_spec_document_sync, document_id, file_path)


def parse_spec_document_sync(document_id: str, file_path: str) -> List[Dict[str, Any]]:
    """
    Parse a specification PDF into structured clauses.

    Steps:
    1. Extract text from PDF (PyMuPDF, OCR fallback)
    2. Segment into clauses by numbered header pattern
    3. Filter clauses that contain technical requirements
    4. Extract structured requirements from each clause via LLM (concurrent batch)
    5. Save to SQLite and index in ChromaDB
    6. Return extracted clause list
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Specification file not found: {file_path}")

    logger.info(f"Parsing specification: doc={document_id} file={file_path}")

    try:
        pages = extract_text_from_pdf(file_path)
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        raise ValueError(f"PDF extraction failed: {e}") from e

    if not pages:
        logger.warning(f"No text extracted from {file_path}")
        return []

    logger.info(f"Extracted {len(pages)} pages")

    clauses = segment_into_clauses(pages)
    logger.info(f"Found {len(clauses)} clause segments")

    if not clauses:
        return []

    filtered = [c for c in clauses if should_extract(c)]
    logger.info(f"Filtered {len(filtered)}/{len(clauses)} clauses for LLM extraction")

    if not filtered:
        return []

    if len(filtered) == 1:
        result = extract_clause_requirements(filtered[0], document_id)
        extracted = [result] if result else []
    else:
        extracted = _extract_clauses_concurrent(filtered, document_id)

    if extracted:
        try:
            _save_clauses_to_db(document_id, extracted)
        except Exception as e:
            logger.error(f"Failed to save clauses to DB: {e}")

        if VECTOR_STORE_AVAILABLE:
            try:
                _index_extracted_clauses(extracted, document_id)
            except Exception as e:
                logger.error(f"Failed to index clauses in ChromaDB: {e}")

    logger.info(
        f"Parsed document {document_id}: "
        f"{len(extracted)} clauses extracted from {len(pages)} pages"
    )
    return extracted


# ── Segmentation ───────────────────────────────────────────────────────────────

def segment_into_clauses(pages: List[Dict]) -> List[Dict[str, Any]]:
    """
    Split document text into clauses based on numbered clause headers.
    Handles formats: 4.1, 4.1.1, Section 4.1, [4.1]
    """
    full_text_parts = []
    page_map = []

    for page in pages:
        page_text = page.get("text", "")
        if page_text.strip():
            start_pos = sum(len(p) + 1 for p in full_text_parts)
            full_text_parts.append(page_text)
            page_map.append({
                "start": start_pos,
                "end": start_pos + len(page_text),
                "page_num": page.get("page_num", 1)
            })

    full_text = "\n".join(full_text_parts)
    if not full_text.strip():
        return []

    patterns = [
        re.compile(r"(?m)^\s*(\d+(?:\.\d+)+)\s+([A-Z][^\n]{2,150})$", re.MULTILINE),
        re.compile(
            r"(?m)^\s*(?:Section|Clause|Article)\s+(\d+(?:\.\d+)+)\s*[-:.]?\s*([A-Z][^\n]{2,150})$",
            re.MULTILINE | re.IGNORECASE
        ),
        re.compile(r"(?m)^\s*[[(](\d+(?:\.\d+)+)[])]\s+([A-Z][^\n]{2,150})$", re.MULTILINE),
    ]

    matches = []
    for pattern in patterns:
        matches = list(pattern.finditer(full_text))
        if matches:
            logger.debug(f"Found {len(matches)} clauses using pattern")
            break

    if not matches:
        logger.info("No clause headers found — treating full document as single clause")
        return [{
            "clause_number": "1.0",
            "clause_title": "Full Document",
            "text": full_text[:MAX_CLAUSE_TEXT_LENGTH * 3],
            "pages": [p.get("page_num", 1) for p in pages]
        }]

    clauses = []
    for i, match in enumerate(matches):
        start_pos = match.start()
        end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(full_text)
        clause_text = full_text[start_pos:end_pos].strip()

        clause_pages = [
            pm["page_num"]
            for pm in page_map
            if start_pos <= pm["end"] and pm["start"] <= end_pos
        ]

        title = re.sub(r'\s+', ' ', match.group(2).strip()).rstrip('.')
        clauses.append({
            "clause_number": match.group(1),
            "clause_title": title[:200],
            "text": clause_text[:MAX_CLAUSE_TEXT_LENGTH * 3],
            "pages": sorted(set(clause_pages)) if clause_pages else [1]
        })

    return clauses


def should_extract(clause: Dict[str, Any]) -> bool:
    """Return True if the clause likely contains technical requirements worth extracting."""
    text = clause.get("text", "")
    words = text.split()

    if len(words) < MIN_WORDS_FOR_EXTRACTION:
        return False

    text_lower = text.lower()

    skip_keywords = [
        "table of contents", "list of figures", "revision history",
        "document control", "acknowledgments", "preface", "glossary"
    ]
    if any(kw in text_lower for kw in skip_keywords):
        return False

    has_requirement = any(kw in text_lower for kw in [
        "shall", "must", "required", "minimum", "maximum", "rating",
        "efficiency", "voltage", "current", "frequency", "power",
        "capacity", "protection", "autonomy", "transfer", "performance",
        "compliance", "conform", "tolerance", "rated", "nominal", "specified"
    ])

    has_numbers = bool(re.search(r'\d+(?:\.\d+)?', text))

    return has_requirement or (has_numbers and len(words) >= 20)


# ── LLM extraction ─────────────────────────────────────────────────────────────

def _build_extraction_user_message(clause: Dict[str, Any]) -> str:
    clause_number = clause.get("clause_number", "?")
    clause_title = clause.get("clause_title", "")
    clause_text = clause.get("text", "")[:MAX_CLAUSE_TEXT_LENGTH]
    return f"""Extract structured requirements from this specification clause.

CLAUSE {clause_number}: {clause_title}

TEXT:
{clause_text}

Return a single JSON object as specified in the system prompt."""


def _llm_unavailable_stub(clause: Dict[str, Any], document_id: str) -> Dict[str, Any]:
    return {
        "equipment_class": "OTHER",
        "clause_type": "GENERAL",
        "applicable_tier": "N/A",
        "requirements": [],
        "ambiguity_flags": ["llm_unavailable"],
        "standards_referenced": [],
        "confidence_score": 0.1,
        "clause_number": clause.get("clause_number", "?"),
        "clause_title": clause.get("clause_title", ""),
        "document_id": document_id,
        "pages": clause.get("pages", []),
        "id": str(uuid.uuid4()),
        "text": clause.get("text", "")[:MAX_CLAUSE_TEXT_LENGTH],
    }


def _postprocess_extraction(
    result: Optional[Dict[str, Any]],
    clause: Dict[str, Any],
    document_id: str
) -> Optional[Dict[str, Any]]:
    """Apply field defaults/validation to a raw LLM extraction result for one clause."""
    clause_number = clause.get("clause_number", "?")
    clause_title = clause.get("clause_title", "")
    clause_text = clause.get("text", "")[:MAX_CLAUSE_TEXT_LENGTH]

    if not isinstance(result, dict):
        logger.warning(f"No usable extraction for clause {clause_number}; using stub")
        return _llm_unavailable_stub(clause, document_id)

    result.setdefault("equipment_class", "UPS")
    result.setdefault("clause_type", "TECHNICAL")
    result.setdefault("applicable_tier", "TIER_IV")
    result.setdefault("requirements", [])
    result.setdefault("ambiguity_flags", [])
    result.setdefault("standards_referenced", [])
    result.setdefault("confidence_score", 0.5)

    requirements = result.get("requirements", [])
    if not isinstance(requirements, list):
        requirements = []

    validated = []
    for req in requirements:
        if isinstance(req, dict) and req.get("attribute"):
            validated.append({
                "attribute": str(req.get("attribute", "unknown")),
                "required_value": req.get("required_value"),
                "tolerance_type": req.get("tolerance_type", "EXACT"),
                "tolerance_pct": req.get("tolerance_pct"),
                "unit": str(req.get("unit", "")),
                "mandatory": bool(req.get("mandatory", False)),
                "description": str(req.get("description", ""))
            })

    result["requirements"] = validated
    result["clause_number"] = clause_number
    result["clause_title"] = clause_title
    result["document_id"] = document_id
    result["pages"] = clause.get("pages", [])
    result["id"] = str(uuid.uuid4())
    result["text"] = clause_text

    logger.debug(
        f"Extracted {len(validated)} requirements from clause {clause_number} "
        f"(confidence={result.get('confidence_score', 0):.2f})"
    )
    return result


def extract_clause_requirements(
    clause: Dict[str, Any],
    document_id: str
) -> Optional[Dict[str, Any]]:
    """
    Extract structured requirements from a single clause via LLM.
    Used for single-clause documents; batch documents use
    _extract_clauses_concurrent instead.
    """
    if not LLM_AVAILABLE:
        logger.error("LLM client not available — cannot extract requirements")
        return None

    clause_number = clause.get("clause_number", "?")

    if not has_available_provider():
        return _llm_unavailable_stub(clause, document_id)

    user_message = _build_extraction_user_message(clause)

    try:
        result = call_claude_json(CLAUSE_EXTRACTION_SYSTEM, user_message, max_tokens=1500)
        return _postprocess_extraction(result, clause, document_id)
    except Exception as e:
        logger.error(
            f"Failed to extract requirements from clause {clause_number}: {e}",
            exc_info=True
        )
        return _llm_unavailable_stub(clause, document_id)


def _extract_clauses_concurrent(
    clauses: List[Dict[str, Any]],
    document_id: str
) -> List[Dict[str, Any]]:
    """
    Concurrent clause extraction using call_claude_json_batch.
    Replaces the old ThreadPoolExecutor-of-sequential-calls approach —
    that pattern only helped once Groq was actually reachable, since a
    single local Ollama instance serializes generation regardless of how
    many app-level threads are waiting on it.
    """
    if not LLM_AVAILABLE:
        logger.error("LLM client not available — cannot extract requirements")
        return []

    if not has_available_provider():
        logger.warning("No LLM provider available — returning stubs for all clauses")
        return [_llm_unavailable_stub(c, document_id) for c in clauses]

    batch_items: List[Tuple[str, str]] = [
        (CLAUSE_EXTRACTION_SYSTEM, _build_extraction_user_message(c)) for c in clauses
    ]

    try:
        raw_results = call_claude_json_batch(batch_items, max_tokens=1500)
    except Exception as e:
        logger.error(f"Batch extraction call failed entirely: {e}", exc_info=True)
        raw_results = [None] * len(clauses)

    extracted = []
    for clause, raw_result in zip(clauses, raw_results):
        processed = _postprocess_extraction(raw_result, clause, document_id)
        if processed:
            extracted.append(processed)

    def _parse_num(s: str) -> tuple:
        try:
            return tuple(int(x) for x in s.split("."))
        except (ValueError, AttributeError):
            return (0,)

    extracted.sort(key=lambda x: _parse_num(x.get("clause_number", "0")))
    logger.info(
        f"Concurrent extraction: {len(extracted)}/{len(clauses)} clauses processed"
    )
    return extracted


# ── Database + Vector store ────────────────────────────────────────────────────

def _save_clauses_to_db(document_id: str, clauses: List[Dict[str, Any]]) -> int:
    """Save extracted clauses to SQLite. Returns count saved."""
    if not DATABASE_AVAILABLE:
        raise RuntimeError("Database not available")

    db = get_db()
    saved = 0
    try:
        for clause in clauses:
            clause_id = clause.get("id", str(uuid.uuid4()))
            requirements = clause.get("requirements", [])
            pages = clause.get("pages", [1])

            db.execute("""
                INSERT OR REPLACE INTO spec_clauses (
                    id, document_id, clause_number, clause_title,
                    equipment_class, clause_type, raw_text,
                    requirements_json, tier, page_refs_json,
                    extracted_ts, confidence_score
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                clause_id,
                document_id,
                clause.get("clause_number", "0"),
                (clause.get("clause_title") or "")[:200],
                clause.get("equipment_class", "UPS"),
                clause.get("clause_type", "TECHNICAL"),
                clause.get("text", clause.get("raw_text", ""))[:5000],
                json.dumps(requirements),
                clause.get("applicable_tier", "TIER_IV"),
                json.dumps(pages),
                datetime.now(timezone.utc).isoformat(),
                float(clause.get("confidence_score", 0.5))
            ))
            saved += 1

        db.commit()
        logger.info(f"Saved {saved} clauses to database")
        return saved

    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        logger.error(f"DB save failed: {e}")
        raise
    finally:
        db.close()


def _index_extracted_clauses(
    clauses: List[Dict[str, Any]],
    document_id: str
) -> int:
    """Index clauses in ChromaDB for semantic search."""
    if not VECTOR_STORE_AVAILABLE:
        return 0

    indexed = 0
    for clause in clauses:
        try:
            clause_id = clause.get("id", str(uuid.uuid4()))
            requirements = clause.get("requirements", [])

            index_text = (
                f"Clause {clause.get('clause_number', '')}: "
                f"{clause.get('clause_title', '')}. "
                f"Equipment: {clause.get('equipment_class', 'UPS')}. "
                f"Tier: {clause.get('applicable_tier', 'TIER_IV')}. "
            )
            if requirements:
                req_parts = [
                    f"{r.get('attribute', '?')}: {r.get('required_value', '?')} {r.get('unit', '')}"
                    for r in requirements[:5]
                ]
                index_text += "Requirements: " + "; ".join(req_parts) + ". "

            raw = clause.get("text", clause.get("raw_text", ""))
            index_text += raw[:1000]

            index_spec_clause(
                clause_id=clause_id,
                text=index_text,
                metadata={
                    "clause_number": clause.get("clause_number", ""),
                    "clause_title": clause.get("clause_title", ""),
                    "document_id": document_id,
                    "equipment_class": clause.get("equipment_class", "UPS"),
                    "tier": clause.get("applicable_tier", "TIER_IV"),
                    "requirement_count": str(len(requirements)),
                    "confidence_score": str(clause.get("confidence_score", 0.5))
                }
            )
            indexed += 1

        except Exception as e:
            logger.error(
                f"Failed to index clause {clause.get('clause_number', '?')}: {e}"
            )

    logger.info(f"Indexed {indexed}/{len(clauses)} clauses in vector store")
    return indexed