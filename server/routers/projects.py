"""
Projects Router
Handles CRUD operations for projects, including vendor-facing open projects.
"""
import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException

from models.schemas import ProjectCreate, ProjectResponse
from database.connection import get_db

router = APIRouter()

@router.post("/", response_model=ProjectResponse)
def create_project(project: ProjectCreate):
    db = get_db()
    try:
        project_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        db.execute(
            "INSERT INTO projects (id, name, size_mw, deadline, budget, status, created_at, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (project_id, project.name, project.size_mw, project.deadline, project.budget, "active", now, project.location)
        )
        db.commit()
        
        return {
            "id": project_id,
            "name": project.name,
            "size_mw": project.size_mw,
            "deadline": project.deadline,
            "budget": project.budget,
            "status": "active",
            "created_at": now,
            "location": project.location
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("/", response_model=List[ProjectResponse])
def get_all_projects():
    """List all projects (internal team)"""
    db = get_db()
    try:
        rows = db.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
        return [dict(row) for row in rows]
    finally:
        db.close()


@router.get("/open", response_model=List[ProjectResponse])
def get_open_projects():
    """List open projects for vendors"""
    db = get_db()
    try:
        rows = db.execute("SELECT * FROM projects WHERE status = 'active' ORDER BY created_at DESC").fetchall()
        return [dict(row) for row in rows]
    finally:
        db.close()


@router.patch("/{project_id}/status", response_model=ProjectResponse)
def update_project_status(project_id: str, status: str):
    """Update project status (active, paused, completed)"""
    db = get_db()
    try:
        if status not in ["active", "paused", "completed"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        row = db.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")
            
        db.execute("UPDATE projects SET status = ? WHERE id = ?", (status, project_id))
        db.commit()
        
        row = db.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        return dict(row)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
