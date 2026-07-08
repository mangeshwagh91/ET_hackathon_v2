"""
Procurement & ERP Agent — DCPI.
Handles vendor bidding, purchase orders, inventory, and lead times.
Analyzes bids and gives recommendations (price, compliance, lead time, quality).
"""

import os
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any

from database.connection import get_db
from services.llm_client import call_claude_json, has_available_provider

logger = logging.getLogger(__name__)

AGENT_NAME = "procurement_erp"
AGENT_VERSION = "2.0.0"

BID_ANALYSIS_SYSTEM = """You are a senior procurement manager for a Tier IV data centre EPC project.
Analyze the provided vendor bids. Score each bid out of 10 for price, compliance, lead time, and quality.
Provide an overall recommendation.

Return ONLY valid JSON in this format:
{
  "recommendations": [
    {
      "vendor_name": "Vendor A",
      "price_score": 8.5,
      "compliance_score": 9.0,
      "lead_time_score": 7.0,
      "quality_score": 9.5,
      "overall_score": 8.5,
      "recommendation": "RECOMMENDED|ALTERNATE|NOT_RECOMMENDED",
      "justification": "Short justification text"
    }
  ]
}"""

def analyze_bids(bids: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyzes vendor bids and provides recommendations."""
    agent_run_id = str(uuid.uuid4())
    started_ts = datetime.now(timezone.utc).isoformat()
    start_time = datetime.now()

    logger.info(f"Analyzing {len(bids)} bids [{agent_run_id[:8]}]")

    try:
        if not bids:
            raise ValueError("No bids provided for analysis.")

        if not has_available_provider():
            logger.warning("LLM provider unavailable. Using fallback heuristic.")
            recommendations = _fallback_bid_analysis(bids)
        else:
            user_message = f"Please analyze these bids:\n{json.dumps(bids, indent=2)}"
            try:
                response = call_claude_json(BID_ANALYSIS_SYSTEM, user_message, max_tokens=1500)
                recommendations = response.get("recommendations", [])
            except Exception as e:
                logger.error(f"LLM call failed for bid analysis: {e}")
                recommendations = _fallback_bid_analysis(bids)

        processing_ms = round((datetime.now() - start_time).total_seconds() * 1000, 1)
        _log_agent_run(agent_run_id, started_ts, f"Analyzed {len(bids)} bids", status="completed", num_records=len(recommendations))

        return {
            "bids_analyzed": len(bids),
            "recommendations": recommendations,
            "agent_run_id": agent_run_id
        }

    except Exception as e:
        logger.error(f"Bid analysis failed [{agent_run_id[:8]}]: {e}")
        _log_agent_run(agent_run_id, started_ts, "Bid analysis", status="failed", error=str(e))
        raise RuntimeError(f"Bid analysis failed: {e}") from e

def _fallback_bid_analysis(bids: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    recommendations = []
    for bid in bids:
        price = bid.get("price", 10000)
        lead_time = bid.get("lead_time_days", 30)
        
        # Simple heuristic
        price_score = max(0, 10 - (price / 10000))
        lead_time_score = max(0, 10 - (lead_time / 10))
        overall = (price_score + lead_time_score + 16) / 4  # assuming 8 for compliance and quality
        
        rec = "RECOMMENDED" if overall > 8 else "ALTERNATE"
        
        recommendations.append({
            "vendor_name": bid.get("vendor_name", "Unknown"),
            "price_score": round(price_score, 1),
            "compliance_score": 8.0,
            "lead_time_score": round(lead_time_score, 1),
            "quality_score": 8.0,
            "overall_score": round(overall, 1),
            "recommendation": rec,
            "justification": "Automated heuristic based on price and lead time."
        })
    return recommendations

def _log_agent_run(agent_run_id: str, started_ts: str, input_summary: str, status: str = "completed", num_records: int = 0, error: str = None) -> None:
    db = get_db()
    try:
        output_summary = f"Generated {num_records} recommendations" if status == "completed" else f"Failed: {(error or '')[:200]}"
        db.execute('''
            INSERT OR REPLACE INTO agent_runs
            (id, agent_name, agent_version, trigger_event, input_summary, output_summary, status, started_ts, completed_ts, records_processed, records_created, error_text)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            agent_run_id, AGENT_NAME, AGENT_VERSION, "bid_analysis", input_summary,
            output_summary, status, started_ts, datetime.now(timezone.utc).isoformat(), num_records, num_records, error
        ))
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log procurement agent run: {e}")
    finally:
        db.close()
