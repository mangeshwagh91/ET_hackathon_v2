from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
import logging

from database.connection import get_db
from agents.orchestrator_agent import simulate_supply_chain_shock
from agents.langgraph_orchestrator import run_langgraph_cascade

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/orchestrator", tags=["Orchestrator"])

@router.post("/trigger-shock")
def trigger_supply_chain_shock(payload: Dict[str, Any]):
    """
    Triggers a multi-agent cascade based on a supply chain event.
    """
    try:
        item_name = payload.get("item_name", "UPS - 500kVA")
        delay_weeks = payload.get("delay_weeks", 14)
        
        result = simulate_supply_chain_shock(item_name, delay_weeks)
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Failed to trigger shock: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/trigger-langgraph")
def trigger_supply_chain_shock_langgraph(payload: Dict[str, Any]):
    """
    Triggers the LangGraph multi-agent cascade based on a supply chain event.
    """
    try:
        item_name = payload.get("item_name", "UPS - 500kVA")
        delay_weeks = payload.get("delay_weeks", 14)
        
        result = run_langgraph_cascade(item_name, delay_weeks)
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Failed to trigger LangGraph shock: {e}")
        raise HTTPException(status_code=500, detail=str(e))
