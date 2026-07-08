"""
Main Orchestrator Agent (Brain) — DCPI.
Central supervisor that receives high-level requests, decides which specialized agent(s) to call,
combines outputs, and formats the final response.
"""

import os
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List

from database.connection import get_db
from services.llm_client import call_claude_json, has_available_provider

from agents.knowledge_agent import answer_query as run_knowledge_query, ingest_document_memory
from agents.procurement_agent import analyze_bids
from agents.compliance_agent import run_compliance_check
from agents.schedule_agent import run_schedule_risk_analysis, update_timeline_dynamic

logger = logging.getLogger(__name__)

AGENT_NAME = "orchestrator_brain"
AGENT_VERSION = "2.0.0"

ORCHESTRATOR_SYSTEM = """You are the Main Orchestrator Agent for the DCPI (Data Centre Project Intelligence) platform.
Your task is to classify the user's intent to determine which specialized agent out of the 5-Agent Architecture should handle their request.

The 5-Agent Architecture:
1. Orchestrator (You) - Central supervisor.
2. Knowledge Agent - Handles "KNOWLEDGE": RFI queries, document memory, delay precedents, specs.
3. Procurement Agent - Handles "PROCUREMENT": Bidding, purchase orders, supply chain, lead times.
4. Quality & Compliance Agent - Handles "QUALITY": Spec compliance, NCRs, deviations.
5. Risk & Schedule Agent - Handles "SCHEDULE": Schedule risk, critical path, float, commissioning tests.

Return ONLY valid JSON:
{
  "intent": "KNOWLEDGE|PROCUREMENT|QUALITY|SCHEDULE|GENERAL",
  "confidence": 0.95,
  "extracted_parameters": {
    "po_id": "extract if present",
    "bids": "extract if present",
    "event_details": "extract if present"
  },
  "reasoning": "Short justification for routing choice"
}"""

def process_request(query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Main entry point for chatbot queries and multi-agent workflows.
    Classifies intent and routes to the appropriate specialized agent.
    """
    agent_run_id = str(uuid.uuid4())
    started_ts = datetime.now(timezone.utc).isoformat()
    start_time = datetime.now()
    
    context = context or {}

    logger.info(f"Orchestrator received query [{agent_run_id[:8]}]: {query[:100]}")

    try:
        if not has_available_provider():
            intent_data = _fallback_classification(query)
        else:
            try:
                user_message = f"Query: {query}\nContext: {json.dumps(context)}"
                intent_data = call_claude_json(ORCHESTRATOR_SYSTEM, user_message, max_tokens=500)
            except Exception as e:
                logger.error(f"LLM routing failed: {e}")
                intent_data = _fallback_classification(query)

        intent = intent_data.get("intent", "KNOWLEDGE").upper()
        extracted_params = intent_data.get("extracted_parameters", {})
        
        # Merge context parameters
        for k, v in context.items():
            if k not in extracted_params:
                extracted_params[k] = v

        logger.info(f"Routed to {intent} with confidence {intent_data.get('confidence')}")

        # Execute Specialized Agent
        response_data = {}
        if intent == "KNOWLEDGE":
            response_data = run_knowledge_query(query)
        elif intent == "PROCUREMENT":
            bids = extracted_params.get("bids", [])
            if bids:
                response_data = analyze_bids(bids)
            else:
                response_data = {"error": "No bids provided in context for procurement analysis."}
        elif intent == "QUALITY":
            po_id = extracted_params.get("po_id")
            if po_id:
                response_data = run_compliance_check(po_id)
            else:
                response_data = {"error": "po_id is required for quality compliance checks."}
        elif intent == "SCHEDULE":
            event_details = extracted_params.get("event_details")
            if event_details:
                response_data = update_timeline_dynamic(event_details)
            else:
                response_data = run_schedule_risk_analysis()
        else:
            # Multi-agent or fallback. Let's run knowledge as default, and then format a generic response.
            response_data = run_knowledge_query(query)
            response_data["orchestrator_note"] = "Treated as a general knowledge query."

        processing_ms = round((datetime.now() - start_time).total_seconds() * 1000, 1)
        _log_agent_run(agent_run_id, started_ts, query, intent, "completed", processing_ms)

        return {
            "query": query,
            "intent": intent,
            "agent_response": response_data,
            "agent_run_id": agent_run_id,
            "processing_time_ms": processing_ms
        }

    except Exception as e:
        logger.error(f"Orchestrator processing failed [{agent_run_id[:8]}]: {e}")
        _log_agent_run(agent_run_id, started_ts, query, "UNKNOWN", "failed", error=str(e))
        return {
            "query": query,
            "intent": "ERROR",
            "error": str(e),
            "agent_run_id": agent_run_id
        }


def _fallback_classification(query: str) -> Dict[str, Any]:
    q = query.lower()
    if "bid" in q or "vendor" in q or "procurement" in q:
        intent = "PROCUREMENT"
    elif "schedule" in q or "risk" in q or "float" in q or "timeline" in q:
        intent = "SCHEDULE"
    elif "compliance" in q or "ncr" in q or "spec" in q or "deviation" in q:
        intent = "QUALITY"
    else:
        intent = "KNOWLEDGE"
        
    return {
        "intent": intent,
        "confidence": 0.5,
        "extracted_parameters": {},
        "reasoning": "Heuristic fallback classification"
    }


def _log_agent_run(agent_run_id: str, started_ts: str, query: str, intent: str, status: str, processing_ms: float = 0.0, error: str = None) -> None:
    db = get_db()
    try:
        db.execute('''
            INSERT OR REPLACE INTO agent_runs
            (id, agent_name, agent_version, trigger_event, input_summary, output_summary, status, started_ts, completed_ts, records_processed, records_created, error_text, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            agent_run_id, AGENT_NAME, AGENT_VERSION, "orchestrator_routing", f"Query: {query[:150]}",
            f"Routed to {intent} | {processing_ms:.0f}ms" if status == "completed" else f"Failed: {(error or '')[:200]}",
            status, started_ts, datetime.now(timezone.utc).isoformat(), 1, 0, error, json.dumps({"intent": intent})
        ))
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log orchestrator agent run: {e}")
    finally:
        db.close()
