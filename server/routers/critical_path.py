"""
Critical Path Router — DCPI.
Exposes the CPM analysis results to the client.
"""

import asyncio
import logging
from fastapi import APIRouter, HTTPException

from agents.critical_path_agent import run_critical_path_analysis, get_critical_chain

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/analyze")
async def analyze_critical_path():
    """
    Run a full CPM (Critical Path Method) analysis over all schedule tasks.
    Computes ES, EF, LS, LF, Total Float, Free Float, and identifies the critical chain.
    Persists results to the schedule_tasks table.
    """
    try:
        result = await asyncio.to_thread(run_critical_path_analysis)
        return result
    except Exception as e:
        logger.error(f"Critical path analysis endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chain")
async def get_chain():
    """
    Return the current critical path chain from the database.
    Tasks where is_critical_path=1, ordered by planned_start.
    Run /analyze first to compute.
    """
    try:
        result = await asyncio.to_thread(get_critical_chain)
        return result
    except Exception as e:
        logger.error(f"Critical chain endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
