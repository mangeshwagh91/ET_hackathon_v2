"""
Report Router — DCPI.
Generates and retrieves project health reports.
"""

import asyncio
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from agents.report_agent import generate_project_health_report, get_latest_report

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate")
async def generate_report(project_id: Optional[str] = Query(None)):
    """
    Generate a full project health report.
    Aggregates data from all system modules and produces an LLM executive summary.
    Persists to the reports table.
    """
    try:
        result = await asyncio.to_thread(generate_project_health_report, project_id)
        return result
    except Exception as e:
        logger.error(f"Report generation endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/latest")
async def get_latest(project_id: Optional[str] = Query(None)):
    """
    Return the most recently generated project health report from cache.
    Call /generate first if no report exists.
    """
    try:
        result = await asyncio.to_thread(get_latest_report, project_id)
        if not result:
            raise HTTPException(
                status_code=404,
                detail="No report found. Call POST /api/report/generate to create one."
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get latest report endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
