"""
Bids Router
Handles vendor bid submissions and procurement intelligence (bid recommendations).
"""
import uuid
import json
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException

from models.schemas import BidCreate, BidResponse
from database.connection import get_db
from agents.procurement_agent import analyze_bids

router = APIRouter()

@router.post("/create", response_model=BidResponse)
def create_bid(bid: BidCreate):
    # For a real implementation, vendor_id would come from JWT Auth Token.
    # We will simulate it by taking vendor_id from a header or just using a dummy one for now,
    # or actually we should add vendor_id to the schema since we are keeping it simple.
    
    db = get_db()
    try:
        # In a real app, we verify vendor_id exists
        
        bid_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        db.execute(
            "INSERT INTO bids (id, project_id, vendor_id, price, lead_time_days, equipment_catalog_json, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (bid_id, bid.project_id, bid.vendor_id, bid.price, bid.lead_time_days, bid.equipment_catalog_json, "submitted", now)
        )
        db.commit()
        
        return {
            "id": bid_id,
            "project_id": bid.project_id,
            "vendor_id": bid.vendor_id,
            "price": bid.price,
            "lead_time_days": bid.lead_time_days,
            "equipment_catalog_json": bid.equipment_catalog_json,
            "status": "submitted",
            "created_at": now
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("/{project_id}", response_model=List[BidResponse])
def get_project_bids(project_id: str):
    db = get_db()
    try:
        rows = db.execute("SELECT * FROM bids WHERE project_id = ?", (project_id,)).fetchall()
        return [dict(row) for row in rows]
    finally:
        db.close()


@router.post("/recommend")
def recommend_bids(project_id: str):
    """Uses the Procurement Agent to analyze all bids for a project from DB."""
    from agents.procurement_agent import analyze_bids
    from database.connection import get_db
    
    db = get_db()
    try:
        rows = db.execute("SELECT * FROM bids WHERE project_id = ?", (project_id,)).fetchall()
        bids = [dict(row) for row in rows]
    finally:
        db.close()
        
    if not bids:
        raise HTTPException(status_code=404, detail="No bids found for this project")

    try:
        result = analyze_bids(bids)
        if result.get("bids_analyzed", 0) == 0:
            raise HTTPException(status_code=404, detail="No bids found for this project")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

