"""
Vendor Scoring Router — DCPI.
Exposes vendor performance scores, tier assignments, and preferred vendor recommendations.
"""

import asyncio
import logging
from fastapi import APIRouter, HTTPException, Query

from agents.vendor_agent import (
    score_all_vendors,
    get_vendor_score,
    get_all_vendor_scores,
    get_preferred_vendors,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/score-all")
async def score_all():
    """
    Run vendor scoring for all registered vendors.
    Computes compliance, delivery, quality, and win-rate scores.
    Persists results to vendor_scores table.
    """
    try:
        result = await asyncio.to_thread(score_all_vendors)
        return result
    except Exception as e:
        logger.error(f"Vendor scoring endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scores")
async def get_scores():
    """Return the latest performance score for all vendors, ordered by overall score."""
    try:
        result = await asyncio.to_thread(get_all_vendor_scores)
        return result
    except Exception as e:
        logger.error(f"Get vendor scores error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preferred")
async def get_preferred(min_score: float = Query(7.0, ge=0.0, le=10.0)):
    """Return vendors with an overall score >= min_score (default 7.0)."""
    try:
        result = await asyncio.to_thread(get_preferred_vendors, min_score)
        return result
    except Exception as e:
        logger.error(f"Get preferred vendors error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{vendor_id}/score")
async def get_single_vendor_score(vendor_id: str):
    """Return the latest performance score for a specific vendor."""
    try:
        result = await asyncio.to_thread(get_vendor_score, vendor_id)
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"No score found for vendor {vendor_id}. Run POST /score-all first."
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get vendor score error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
