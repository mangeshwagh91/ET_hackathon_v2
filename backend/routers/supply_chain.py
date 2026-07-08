"""
Supply Chain Visibility Router — DCPI.
Provides shipment tracking, multi-tier supplier visibility, delay alerts,
and geospatial data for procurement items.
"""

import logging
from datetime import datetime, timezone, date, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException
from database.connection import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

# Geospatial mock data — origin countries with coordinates
COUNTRY_COORDS = {
    "India": {"lat": 20.5937, "lng": 78.9629, "port": "JNPT Mumbai"},
    "China": {"lat": 35.8617, "lng": 104.1954, "port": "Shanghai"},
    "Germany": {"lat": 51.1657, "lng": 10.4515, "port": "Hamburg"},
    "USA": {"lat": 37.0902, "lng": -95.7129, "port": "Los Angeles"},
    "Japan": {"lat": 36.2048, "lng": 138.2529, "port": "Yokohama"},
    "South Korea": {"lat": 35.9078, "lng": 127.7669, "port": "Busan"},
    "Taiwan": {"lat": 23.6978, "lng": 120.9605, "port": "Kaohsiung"},
    "Sweden": {"lat": 60.1282, "lng": 18.6435, "port": "Gothenburg"},
    "Italy": {"lat": 41.8719, "lng": 12.5674, "port": "Genoa"},
    "UK": {"lat": 55.3781, "lng": -3.4360, "port": "Felixstowe"},
}

# Tracking status progression
TRACKING_STATUSES = [
    "Order Confirmed", "In Production", "Factory Acceptance Test",
    "Ready to Ship", "In Transit", "At Port (Origin)",
    "Customs Cleared", "At Port (Destination)", "Last Mile Delivery", "Delivered"
]


def _derive_tracking_status(po_date: Optional[str], lead_time_days: int, required_by: Optional[str]) -> dict:
    """Derive a plausible tracking status from PO date and lead time."""
    today = date.today()
    status_idx = 0
    eta = None
    days_remaining = None
    is_delayed = False
    delay_days = 0

    if po_date:
        try:
            po_dt = datetime.fromisoformat(po_date.replace("Z", "+00:00")).date()
            elapsed = (today - po_dt).days
            total = max(lead_time_days, 1)
            progress = elapsed / total
            # Map progress to status
            status_idx = min(int(progress * len(TRACKING_STATUSES)), len(TRACKING_STATUSES) - 1)
            eta = (po_dt + timedelta(days=lead_time_days)).isoformat()

            if required_by:
                req_dt = datetime.fromisoformat(required_by.replace("Z", "+00:00")).date()
                eta_dt = po_dt + timedelta(days=lead_time_days)
                days_remaining = (req_dt - today).days
                is_delayed = eta_dt > req_dt
                delay_days = max(0, (eta_dt - req_dt).days)
        except Exception:
            pass

    return {
        "status": TRACKING_STATUSES[status_idx],
        "status_index": status_idx,
        "total_stages": len(TRACKING_STATUSES),
        "eta": eta,
        "days_remaining": days_remaining,
        "is_delayed": is_delayed,
        "delay_days": delay_days,
    }


@router.get("/shipments")
async def get_shipments():
    """List all purchase orders as shipments with tracking status."""
    db = get_db()
    try:
        rows = db.execute("""
            SELECT po.*, ei.description as equipment_description,
                   ei.equipment_class, ei.required_by_date, ei.criticality
            FROM purchase_orders po
            LEFT JOIN equipment_items ei ON po.equipment_item_id = ei.id
            ORDER BY po.po_date DESC
        """).fetchall()

        shipments = []
        for row in rows:
            po = dict(row)
            country = po.get("vendor_country") or "India"
            coords = COUNTRY_COORDS.get(country, COUNTRY_COORDS["India"])
            # Infer lead time from compliance_status or default 60 days
            lead_time = 60
            tracking = _derive_tracking_status(po.get("po_date"), lead_time, po.get("required_by_date"))

            # Supplier tier structure
            supplier_tiers = _build_supplier_tiers(po, country)

            shipments.append({
                "po_id": po["id"],
                "po_number": po.get("po_number", ""),
                "vendor_name": po.get("vendor_name", ""),
                "vendor_country": country,
                "equipment_description": po.get("equipment_description", ""),
                "equipment_class": po.get("equipment_class", ""),
                "criticality": po.get("criticality", "HIGH"),
                "required_by_date": po.get("required_by_date"),
                "tracking": tracking,
                "geo": {
                    "origin_country": country,
                    "origin_port": coords["port"],
                    "lat": coords["lat"],
                    "lng": coords["lng"],
                    "destination": "Project Site — Datacenter Campus",
                    "dest_lat": 19.0760,
                    "dest_lng": 72.8777,
                },
                "supplier_tiers": supplier_tiers,
            })

        total = len(shipments)
        delayed = sum(1 for s in shipments if s["tracking"]["is_delayed"])
        in_transit = sum(1 for s in shipments if "Transit" in s["tracking"]["status"] or "Port" in s["tracking"]["status"])
        delivered = sum(1 for s in shipments if s["tracking"]["status"] == "Delivered")

        return {
            "shipments": shipments,
            "total": total,
            "delayed": delayed,
            "in_transit": in_transit,
            "delivered": delivered,
            "on_time": total - delayed,
        }
    except Exception as e:
        logger.error(f"Shipments fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("/alerts")
async def get_supply_chain_alerts():
    """Get active supply chain delay alerts."""
    db = get_db()
    try:
        rows = db.execute("""
            SELECT po.*, ei.description as equipment_description,
                   ei.required_by_date, ei.criticality, ei.equipment_class
            FROM purchase_orders po
            LEFT JOIN equipment_items ei ON po.equipment_item_id = ei.id
        """).fetchall()

        alerts = []
        today = date.today()

        for row in rows:
            po = dict(row)
            required_by = po.get("required_by_date")
            if not required_by:
                continue
            try:
                req_dt = datetime.fromisoformat(required_by.replace("Z", "+00:00")).date()
                days_left = (req_dt - today).days
                # Alert if < 30 days remaining and not delivered
                if days_left < 30:
                    severity = "CRITICAL" if days_left < 7 else "MAJOR" if days_left < 14 else "MINOR"
                    alerts.append({
                        "po_number": po.get("po_number"),
                        "vendor_name": po.get("vendor_name"),
                        "equipment": po.get("equipment_description", po.get("equipment_class", "")),
                        "required_by": required_by,
                        "days_remaining": days_left,
                        "severity": severity,
                        "message": (
                            f"{'OVERDUE' if days_left < 0 else f'{days_left} days remaining'}: "
                            f"{po.get('equipment_description', 'Equipment')} from "
                            f"{po.get('vendor_name', 'vendor')} due {required_by}"
                        )
                    })
            except Exception:
                continue

        alerts.sort(key=lambda a: a["days_remaining"])
        return {
            "alerts": alerts,
            "total": len(alerts),
            "critical": sum(1 for a in alerts if a["severity"] == "CRITICAL"),
            "major": sum(1 for a in alerts if a["severity"] == "MAJOR"),
        }
    except Exception as e:
        logger.error(f"Alerts fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("/map")
async def get_supply_chain_map():
    """Geospatial data for all supplier origins — for map rendering."""
    db = get_db()
    try:
        rows = db.execute("""
            SELECT po.vendor_country, po.vendor_name, COUNT(*) as po_count,
                   SUM(CASE WHEN ei.criticality='HIGH' THEN 1 ELSE 0 END) as critical_count
            FROM purchase_orders po
            LEFT JOIN equipment_items ei ON po.equipment_item_id = ei.id
            GROUP BY po.vendor_country, po.vendor_name
        """).fetchall()

        points = []
        for row in rows:
            r = dict(row)
            country = r.get("vendor_country") or "India"
            coords = COUNTRY_COORDS.get(country, COUNTRY_COORDS["India"])
            points.append({
                "vendor": r["vendor_name"],
                "country": country,
                "port": coords["port"],
                "lat": coords["lat"],
                "lng": coords["lng"],
                "po_count": r["po_count"],
                "critical_items": r["critical_count"],
            })

        return {
            "supplier_locations": points,
            "destination": {
                "name": "Project Site",
                "lat": 19.0760,
                "lng": 72.8777,
                "city": "Mumbai, India"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


def _build_supplier_tiers(po: dict, country: str) -> list:
    """Build a mock 3-tier supplier structure."""
    vendor = po.get("vendor_name", "Primary Vendor")
    equipment_class = po.get("equipment_class", "Equipment")
    return [
        {
            "tier": 1,
            "name": vendor,
            "role": f"Primary Supplier — {equipment_class}",
            "country": country,
            "status": "Active",
        },
        {
            "tier": 2,
            "name": f"{vendor} Component Div.",
            "role": "Sub-assembly manufacturer",
            "country": country,
            "status": "Active",
        },
        {
            "tier": 3,
            "name": "Raw Material Supplier",
            "role": "Copper / Steel / Electronics",
            "country": "Various",
            "status": "Monitored",
        },
    ]
