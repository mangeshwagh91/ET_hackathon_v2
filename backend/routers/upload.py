import os
import uuid
import logging
import json
import sys
import asyncio
import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from database.connection import get_db
from services.pdf_extractor import extract_full_text
from services.llm_client import call_claude_json, has_available_provider

load_dotenv()
logger = logging.getLogger(__name__)

# Create the router - THIS IS CRITICAL
router = APIRouter()

UPLOADS_PATH = os.getenv("UPLOADS_PATH", "./uploads")

SUBMITTAL_EXTRACTION_SYSTEM = """You are a procurement engineer analyzing a vendor technical submittal for a data centre EPC project.
Extract all technical performance attributes from the submittal document text.

Return a JSON object where keys are snake_case attribute names and values are numeric or string values.
Do NOT include units in the key name — put them in a separate _unit field only if needed.

Common attributes to extract:
- rated_kva: rated power capacity as a number
- input_voltage_vac: input voltage as a number (VAC)
- input_frequency_hz: input frequency as a number (Hz)
- input_thdi_pct: input total harmonic distortion as a percentage number
- output_voltage_vac: output voltage as a number (VAC)
- output_frequency_hz: output frequency as a number (Hz)
- output_thdu_pct: output voltage harmonic distortion as a percentage number
- efficiency_pct: efficiency percentage at full load as a number
- transfer_time_ms: transfer time in milliseconds as a number
- battery_autonomy_min: battery backup time in minutes as a number
- ip_rating: ingress protection rating as a string (e.g. "IP31")

Return ONLY valid JSON with extracted values. No preamble. No markdown."""


def save_upload(file: UploadFile) -> str:
    """Save uploaded file and return the file path."""
    os.makedirs(UPLOADS_PATH, exist_ok=True)
    ext = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOADS_PATH, unique_filename)
    
    try:
        content = file.file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        logger.info(f"File saved: {file_path}")
        return file_path
    except Exception as e:
        logger.error(f"Failed to save file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    finally:
        file.file.close()


@router.post("/specification")
async def upload_specification(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    Upload a specification document.
    The document will be parsed and stored in the database.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files accepted for specification upload")

    doc_id = str(uuid.uuid4())
    db = get_db()
    
    try:
        # Save the file
        file_path = save_upload(file)
        
        # Insert document record
        db.execute("""
            INSERT OR REPLACE INTO documents 
            (id, filename, doc_type, upload_ts, file_path, status, page_count)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            doc_id, 
            file.filename, 
            "specification", 
            datetime.utcnow().isoformat(), 
            file_path, 
            "processing", 
            0
        ))
        db.commit()
        logger.info(f"Document record created: {doc_id}")

        # Parse the document
        try:
            from services.spec_parser import parse_spec_document_async
            extracted_clauses = await parse_spec_document_async(doc_id, file_path)
            
            # Update document status
            db.execute(
                "UPDATE documents SET status = ?, page_count = ? WHERE id = ?",
                ("ready", len(extracted_clauses), doc_id)
            )
            db.commit()
            
            logger.info(f"Spec document {doc_id} parsed: {len(extracted_clauses)} clauses")
            
            return {
                "success": True,
                "document_id": doc_id,
                "filename": file.filename,
                "status": "ready",
                "clauses_extracted": len(extracted_clauses),
                "clauses_preview": extracted_clauses[:3] if extracted_clauses else []
            }
            
        except ImportError as e:
            logger.error(f"Failed to import spec_parser: {e}")
            db.execute("UPDATE documents SET status = ? WHERE id = ?", ("failed", doc_id))
            db.commit()
            raise HTTPException(status_code=500, detail=f"Specification parser not available: {str(e)}")
            
        except Exception as e:
            logger.error(f"Spec parsing failed for doc {doc_id}: {str(e)}")
            db.execute("UPDATE documents SET status = ? WHERE id = ?", ("failed", doc_id))
            db.commit()
            raise HTTPException(status_code=500, detail=f"Specification parsing failed: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    finally:
        db.close()


@router.post("/submittal")
async def upload_submittal(
    file: UploadFile = File(...),
    vendor_name: str = Form(...),
    po_number: str = Form(...),
    equipment_item_id: str = Form(default="eq-ups-moda-001")
):
    """
    Upload a vendor submittal document.
    Extracts technical attributes and creates a purchase order.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files accepted for submittal upload")

    doc_id = str(uuid.uuid4())
    po_id = str(uuid.uuid4())
    db = get_db()
    
    try:
        # Save the file
        file_path = save_upload(file)
        
        # Insert document record
        db.execute("""
            INSERT OR REPLACE INTO documents 
            (id, filename, doc_type, upload_ts, file_path, status, page_count)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            doc_id, 
            file.filename, 
            "submittal", 
            datetime.utcnow().isoformat(), 
            file_path, 
            "processing", 
            0
        ))
        db.commit()
        logger.info(f"Document record created: {doc_id}")

        # Extract text from PDF
        try:
            raw_text = await asyncio.to_thread(extract_full_text, file_path)
            if not raw_text:
                logger.warning(f"No text extracted from submittal {doc_id}")
                tech_attrs = {}
            else:
                # Get equipment class
                equipment = db.execute(
                    "SELECT equipment_class FROM equipment_items WHERE id = ?", 
                    (equipment_item_id,)
                ).fetchone()
                equipment_class = dict(equipment)["equipment_class"] if equipment else "UPS"
                
                # Parse attributes
                try:
                    tech_attrs = await asyncio.to_thread(
                        parse_submittal_attributes,
                        raw_text[:5000],
                        equipment_class
                    )
                    logger.info(f"Extracted {len(tech_attrs)} attributes from submittal")
                except Exception as e:
                    logger.warning(f"Attribute extraction failed, using empty dict: {str(e)}")
                    tech_attrs = {}
        except Exception as e:
            logger.error(f"Text extraction failed: {str(e)}")
            tech_attrs = {}

        # Create purchase order
        db.execute("""
            INSERT OR REPLACE INTO purchase_orders
            (id, po_number, vendor_name, document_id, equipment_item_id, po_date,
             technical_attributes_json, compliance_status, deviation_count, checked_ts)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            po_id, 
            po_number, 
            vendor_name, 
            doc_id, 
            equipment_item_id,
            datetime.utcnow().strftime("%Y-%m-%d"), 
            json.dumps(tech_attrs), 
            "PENDING",
            0,
            None
        ))
        db.commit()

        # Update document status
        db.execute("UPDATE documents SET status = 'ready' WHERE id = ?", (doc_id,))
        db.commit()

        logger.info(f"Submittal {doc_id} processed, PO {po_id} created")

        return {
            "success": True,
            "po_id": po_id,
            "document_id": doc_id,
            "vendor_name": vendor_name,
            "po_number": po_number,
            "equipment_item_id": equipment_item_id,
            "attributes_extracted": len(tech_attrs),
            "technical_attributes": tech_attrs,
            "status": "ready"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Submittal upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Submittal upload failed: {str(e)}")
    finally:
        db.close()


@router.get("/documents")
async def get_documents():
    """Get all uploaded documents."""
    db = get_db()
    try:
        rows = db.execute(
            "SELECT * FROM documents ORDER BY upload_ts DESC"
        ).fetchall()
        return {"success": True, "documents": [dict(r) for r in rows]}
    except Exception as e:
        logger.error(f"Failed to get documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("/equipment")
async def get_equipment_items():
    """Get all equipment items."""
    db = get_db()
    try:
        rows = db.execute(
            "SELECT id, item_code, description, equipment_class FROM equipment_items ORDER BY item_code"
        ).fetchall()
        return {"success": True, "equipment_items": [dict(r) for r in rows]}
    except Exception as e:
        logger.error(f"Failed to get equipment items: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("/po/{po_id}")
async def get_purchase_order(po_id: str):
    """Get a specific purchase order by ID."""
    db = get_db()
    try:
        row = db.execute(
            "SELECT * FROM purchase_orders WHERE id = ?", (po_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Purchase order not found")
        
        po = dict(row)
        try:
            po["technical_attributes"] = json.loads(po.get("technical_attributes_json", "{}"))
        except:
            po["technical_attributes"] = {}
        
        return {"success": True, "purchase_order": po}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get PO {po_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.delete("/document/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document and its associated records."""
    db = get_db()
    try:
        doc = db.execute(
            "SELECT file_path, doc_type FROM documents WHERE id = ?", (doc_id,)
        ).fetchone()
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc_dict = dict(doc)
        
        if doc_dict.get("file_path") and os.path.exists(doc_dict["file_path"]):
            try:
                os.remove(doc_dict["file_path"])
                logger.info(f"Deleted file: {doc_dict['file_path']}")
            except Exception as e:
                logger.warning(f"Failed to delete file: {e}")
        
        db.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
        db.commit()
        
        return {"success": True, "message": f"Document {doc_id} deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete document {doc_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


def parse_submittal_attributes(text: str, equipment_class: str) -> dict:
    """Parse technical attributes from submittal text using LLM."""
    if not has_available_provider():
        return _extract_submittal_attributes_heuristic(text)

    user_message = f"""Extract technical performance attributes from this vendor submittal document.
Equipment class: {equipment_class}

SUBMITTAL TEXT:
{text}"""

    try:
        result = call_claude_json(SUBMITTAL_EXTRACTION_SYSTEM, user_message, max_tokens=1000)
        if not isinstance(result, dict):
            logger.warning(f"LLM returned non-dict: {type(result)}")
            return _extract_submittal_attributes_heuristic(text)
        return result
    except Exception as e:
        logger.error(f"Failed to parse submittal attributes: {str(e)}")
        return _extract_submittal_attributes_heuristic(text)


def _extract_submittal_attributes_heuristic(text: str) -> dict:
    """Best-effort attribute extraction when the LLM is unavailable."""
    if not text:
        return {}

    attributes = {}
    lower = text.lower()

    efficiency_match = re.search(r"efficiency[^0-9]{0,20}(\d+(?:\.\d+)?)\s*(?:%|percent)", lower)
    if efficiency_match:
        attributes["efficiency_pct"] = float(efficiency_match.group(1))

    kva_match = re.search(r"(\d+(?:\.\d+)?)\s*kva", lower)
    if kva_match:
        attributes["rated_kva"] = float(kva_match.group(1))

    ip_match = re.search(r"\bip\s?([0-9]{2})\b", lower)
    if ip_match:
        attributes["ip_rating"] = f"IP{ip_match.group(1)}"

    thdi_match = re.search(r"thdi[^0-9]{0,20}(\d+(?:\.\d+)?)\s*%", lower)
    if thdi_match:
        attributes["input_thdi_pct"] = float(thdi_match.group(1))

    transfer_match = re.search(r"transfer[^0-9]{0,20}(\d+(?:\.\d+)?)\s*ms", lower)
    if transfer_match:
        attributes["transfer_time_ms"] = float(transfer_match.group(1))

    autonomy_match = re.search(r"(battery\s+)?(autonomy|backup|runtime)[^0-9]{0,20}(\d+(?:\.\d+)?)\s*min", lower)
    if autonomy_match:
        attributes["battery_autonomy_min"] = float(autonomy_match.group(3))

    voltage_match = re.search(r"(input|output)[^0-9]{0,20}(\d+(?:\.\d+)?)\s*v(?:ac)?", lower)
    if voltage_match:
        key = f"{voltage_match.group(1)}_voltage_vac"
        attributes[key] = float(voltage_match.group(2))

    frequency_match = re.search(r"(input|output)[^0-9]{0,20}(\d+(?:\.\d+)?)\s*hz", lower)
    if frequency_match:
        key = f"{frequency_match.group(1)}_frequency_hz"
        attributes[key] = float(frequency_match.group(2))

    return attributes