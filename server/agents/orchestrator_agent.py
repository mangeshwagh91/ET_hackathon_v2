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
from agents.cost_agent import calculate_delay_impact

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


def simulate_supply_chain_shock(item_name: str = "UPS - 500kVA", delay_days: int = 14) -> Dict[str, Any]:
    """
    Simulates the Master Orchestrator event-driven chaining.
    1. Supply Chain Event (Delay)
    2. -> Schedule Agent (Critical Path impact)
    3. -> Cost Agent (Financial impact)
    4. -> Compliance Agent (Commissioning impact)
    """
    run_id = str(uuid.uuid4())
    logger.info(f"Orchestrator [{run_id[:8]}]: Triggering Supply Chain Shock for {item_name}")

    logs = []
    
    def log_step(agent, message, data=None):
        logs.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "agent": agent,
            "message": message,
            "data": data
        })

    # Step 1: Supply Chain Event
    log_step("RabbitMQ Event Bus", f"Published event: supply_chain.delay.created (Topic: {item_name})")
    log_step("Supply Chain Agent", f"🚨 CRITICAL ALERT: {item_name} delayed by {delay_days} weeks at origin port.", {"delay_weeks": delay_days})

    # Step 2: Schedule Agent
    log_step("RabbitMQ Event Bus", "Published event: orchestrator.route_to_schedule")
    log_step("Orchestrator", "Routing delay event to Schedule Risk Agent for critical path analysis.")
    # We call the schedule agent (mocking the exact response for speed, or using the actual function)
    # Using actual function where possible, but since we are mocking a specific cascade, we can simulate the agent response payload
    schedule_impact = {
        "critical_path_affected": True,
        "new_project_end_date": "2024-11-15",
        "float_erosion": f"{delay_days} weeks",
        "affected_tasks": ["Install UPS", "Commissioning Phase 1"]
    }
    log_step("Schedule Risk Agent", "Critical path recalculated. Project completion delayed.", schedule_impact)

    # Step 3: Cost Agent
    log_step("RabbitMQ Event Bus", "Published event: orchestrator.route_to_cost")
    log_step("Orchestrator", "Routing schedule impact to Cost Estimation Agent.")
    cost_impact = calculate_delay_impact(item_name, delay_days * 7) # assuming delay_days was weeks, convert to days for LDs
    log_step("Cost Estimation Agent", f"Financial impact calculated: ${cost_impact['total_financial_impact']:,.2f}", cost_impact)

    # Step 4: Compliance / QA Agent
    log_step("RabbitMQ Event Bus", "Published event: orchestrator.route_to_compliance")
    log_step("Orchestrator", "Routing to Compliance Agent to check commissioning dependencies.")
    qa_impact = {
        "commissioning_risk": "HIGH",
        "ncr_status": "AUTO-GENERATED: Submittal Delay NCR-082",
        "mitigation": "Perform factory acceptance test (FAT) virtually to save 1 week."
    }
    log_step("Commissioning QA Agent", "Commissioning timeline at risk. Virtual FAT recommended.", qa_impact)

    # Final Step: Synthesis
    synthesis = {
        "alert_level": "CRITICAL",
        "summary": f"A {delay_days}-week delay in {item_name} delivery has pushed the critical path. Estimated LDs are ${cost_impact['total_financial_impact']:,.2f}. Recommend virtual FAT and air-freight mitigation to recover schedule.",
        "actions": [
            "Approve air freight budget ($250k)",
            "Reschedule Phase 1 Commissioning teams",
            "Notify Client of potential timeline variance"
        ]
    }
    log_step("Master Orchestrator", "Executive Summary generated and sent to Project Manager.", synthesis)
    log_step("RabbitMQ Event Bus", "Published event: orchestrator.synthesis.completed")

    return {
        "run_id": run_id,
        "trigger": f"Supply Chain Shock: {item_name}",
        "execution_log": logs,
        "final_report": synthesis
    }

