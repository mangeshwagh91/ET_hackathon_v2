"""
Workforce Router — DCPI.
Exposes workforce demand curves and resource conflict detection.
"""

import asyncio
import logging
from fastapi import APIRouter, HTTPException

from agents.workforce_agent import calculate_workforce_demand, get_resource_conflicts

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/calculate")
async def calculate_demand():
    """
    Calculate workforce demand from all active schedule tasks.
    Returns weekly demand by discipline and flags resource conflicts.
    Persists results to workforce_demand table.
    """
    try:
        result = await asyncio.to_thread(calculate_workforce_demand)
        return result
    except Exception as e:
        logger.error(f"Workforce demand calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/demand")
async def get_demand():
    """
    Recalculate and return the current workforce demand curve.
    """
    try:
        result = await asyncio.to_thread(calculate_workforce_demand)
        return result
    except Exception as e:
        logger.error(f"Workforce demand endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conflicts")
async def get_conflicts():
    """
    Return all weeks with resource over-allocation conflicts
    from the workforce_demand table.
    """
    try:
        result = await asyncio.to_thread(get_resource_conflicts)
        return result
    except Exception as e:
        logger.error(f"Workforce conflicts endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
