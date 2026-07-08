import logging
from database.connection import get_db

logger = logging.getLogger(__name__)


def init_db():
    db = get_db()
    try:
        db.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                doc_type TEXT NOT NULL,
                upload_ts TEXT NOT NULL,
                file_path TEXT,
                status TEXT NOT NULL DEFAULT 'uploaded',
                page_count INTEGER DEFAULT 0
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS spec_clauses (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL REFERENCES documents(id),
                clause_number TEXT NOT NULL,
                clause_title TEXT,
                equipment_class TEXT NOT NULL DEFAULT 'UPS',
                clause_type TEXT DEFAULT 'TECHNICAL',
                raw_text TEXT,
                requirements_json TEXT NOT NULL DEFAULT '[]',
                tier TEXT DEFAULT 'TIER_IV',
                page_refs_json TEXT DEFAULT '[]',
                extracted_ts TEXT,
                confidence_score REAL DEFAULT 0.5
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS equipment_items (
                id TEXT PRIMARY KEY,
                item_code TEXT NOT NULL,
                description TEXT NOT NULL,
                equipment_class TEXT NOT NULL,
                design_zone TEXT,
                quantity INTEGER DEFAULT 1,
                unit TEXT DEFAULT 'EA',
                required_by_date TEXT,
                spec_clause_ids_json TEXT DEFAULT '[]',
                criticality TEXT DEFAULT 'HIGH',
                compliance_score REAL DEFAULT 1.0
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS purchase_orders (
                id TEXT PRIMARY KEY,
                po_number TEXT NOT NULL,
                vendor_name TEXT NOT NULL,
                vendor_country TEXT DEFAULT 'India',
                document_id TEXT REFERENCES documents(id),
                equipment_item_id TEXT REFERENCES equipment_items(id),
                po_date TEXT,
                technical_attributes_json TEXT DEFAULT '{}',
                compliance_status TEXT DEFAULT 'PENDING',
                deviation_count INTEGER DEFAULT 0,
                conformance_score REAL DEFAULT 1.0,
                checked_ts TEXT
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS deviations (
                id TEXT PRIMARY KEY,
                po_id TEXT NOT NULL REFERENCES purchase_orders(id),
                spec_clause_id TEXT REFERENCES spec_clauses(id),
                attribute_name TEXT NOT NULL,
                specified_value TEXT NOT NULL,
                submitted_value TEXT NOT NULL,
                deviation_pct REAL,
                severity TEXT NOT NULL,
                deviation_type TEXT DEFAULT 'VALUE',
                w_conform REAL DEFAULT 0.5,
                justification TEXT,
                recommended_action TEXT,
                detected_ts TEXT NOT NULL
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS ncrs (
                id TEXT PRIMARY KEY,
                deviation_id TEXT NOT NULL REFERENCES deviations(id),
                po_id TEXT NOT NULL REFERENCES purchase_orders(id),
                equipment_item_id TEXT REFERENCES equipment_items(id),
                title TEXT NOT NULL,
                description TEXT,
                severity TEXT NOT NULL,
                status TEXT DEFAULT 'open',
                raised_ts TEXT NOT NULL,
                due_date TEXT,
                assigned_to TEXT DEFAULT 'Quality Manager',
                resolution_text TEXT,
                spec_clause_ref TEXT,
                page_ref TEXT,
                schedule_impact_json TEXT DEFAULT '{}',
                actions_json TEXT DEFAULT '[]'
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS schedule_tasks (
                id TEXT PRIMARY KEY,
                task_code TEXT NOT NULL,
                description TEXT NOT NULL,
                planned_start TEXT NOT NULL,
                planned_finish TEXT NOT NULL,
                total_float_days INTEGER NOT NULL DEFAULT 0,
                original_float_days INTEGER NOT NULL DEFAULT 0,
                predecessor_ids_json TEXT DEFAULT '[]',
                equipment_item_id TEXT REFERENCES equipment_items(id),
                percent_complete REAL DEFAULT 0.0,
                risk_score REAL DEFAULT 0.0,
                delay_probability REAL DEFAULT 0.0,
                risk_level TEXT DEFAULT 'negligible',
                is_critical_path INTEGER DEFAULT 0,
                mitigation_text TEXT,
                risk_checked_ts TEXT,
                actual_start TEXT,
                actual_finish TEXT,
                actual_delay_days INTEGER DEFAULT 0,
                predicted_delay_days INTEGER DEFAULT 0,
                historical_avg_delay REAL DEFAULT 0.0
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS commissioning_records (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL REFERENCES schedule_tasks(id),
                step_number INTEGER NOT NULL,
                step_name TEXT NOT NULL,
                step_type TEXT DEFAULT 'CHECK',
                acceptance_criteria TEXT,
                actual_value TEXT,
                status TEXT DEFAULT 'pending',
                pass_fail TEXT DEFAULT 'pending',
                flagged_ncr_id TEXT REFERENCES ncrs(id),
                checked_by TEXT DEFAULT 'System',
                checked_ts TEXT,
                notes TEXT
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS rfis (
                id TEXT PRIMARY KEY,
                rfi_code TEXT NOT NULL,
                rfi_type TEXT DEFAULT 'TECHNICAL',
                title TEXT NOT NULL,
                description TEXT,
                raised_by TEXT,
                raised_ts TEXT NOT NULL,
                status TEXT DEFAULT 'open',
                response_due_ts TEXT,
                resolution_text TEXT,
                equipment_item_ids_json TEXT DEFAULT '[]',
                spec_clause_refs_json TEXT DEFAULT '[]',
                chroma_doc_id TEXT,
                is_resolved INTEGER DEFAULT 0
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS agent_runs (
                id TEXT PRIMARY KEY,
                agent_name TEXT NOT NULL,
                agent_version TEXT DEFAULT '1.0.0',
                trigger_event TEXT,
                input_summary TEXT,
                output_summary TEXT,
                status TEXT NOT NULL DEFAULT 'running',
                started_ts TEXT NOT NULL,
                completed_ts TEXT,
                error_text TEXT,
                records_processed INTEGER DEFAULT 0,
                records_created INTEGER DEFAULT 0,
                metadata_json TEXT
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                size_mw REAL,
                deadline TEXT,
                budget REAL,
                status TEXT DEFAULT 'active',
                created_at TEXT NOT NULL
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS vendors (
                id TEXT PRIMARY KEY,
                company_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                registered_at TEXT NOT NULL
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS bids (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL REFERENCES projects(id),
                vendor_id TEXT NOT NULL REFERENCES vendors(id),
                price REAL NOT NULL,
                lead_time_days INTEGER NOT NULL,
                equipment_catalog_json TEXT DEFAULT '{}',
                status TEXT DEFAULT 'submitted',
                created_at TEXT NOT NULL
            )
        """)

        # Indexes
        db.execute("CREATE INDEX IF NOT EXISTS idx_spec_clauses_doc ON spec_clauses(document_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_spec_clauses_class ON spec_clauses(equipment_class)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_deviations_po ON deviations(po_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_deviations_severity ON deviations(severity)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_deviations_clause ON deviations(spec_clause_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_ncrs_severity ON ncrs(severity)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_ncrs_status ON ncrs(status)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_ncrs_po ON ncrs(po_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_ncrs_equipment ON ncrs(equipment_item_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_schedule_risk ON schedule_tasks(risk_score)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_schedule_equipment ON schedule_tasks(equipment_item_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_schedule_critical ON schedule_tasks(is_critical_path)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_rfis_resolved ON rfis(is_resolved)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_po_equipment ON purchase_orders(equipment_item_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_agent_runs_name ON agent_runs(agent_name)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_bids_project ON bids(project_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_bids_vendor ON bids(vendor_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_commissioning_task ON commissioning_records(task_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_commissioning_status ON commissioning_records(status)")
        
        # Seed default projects if none exist removed as per user request

        db.commit()
        # Migrate existing tables to add new columns if missing
        _migrate_schedule_tasks(db)
        _migrate_projects(db)
    finally:
        db.close()


def _migrate_projects(db) -> None:
    """Add new columns to projects if they don't exist (migration-safe)."""
    new_cols = [
        ("location", "TEXT"),
    ]
    existing = {row[1] for row in db.execute("PRAGMA table_info(projects)").fetchall()}
    for col_name, col_type in new_cols:
        if col_name not in existing:
            try:
                db.execute(f"ALTER TABLE projects ADD COLUMN {col_name} {col_type}")
                logger.info(f"Migrated projects: added column {col_name}")
            except Exception as e:
                logger.warning(f"Could not add column {col_name}: {e}")
    db.commit()


def _migrate_schedule_tasks(db) -> None:
    """Add new columns to schedule_tasks if they don't exist (migration-safe)."""
    new_cols = [
        ("actual_start", "TEXT"),
        ("actual_finish", "TEXT"),
        ("actual_delay_days", "INTEGER DEFAULT 0"),
        ("predicted_delay_days", "INTEGER DEFAULT 0"),
        ("historical_avg_delay", "REAL DEFAULT 0.0"),
    ]
    existing = {row[1] for row in db.execute("PRAGMA table_info(schedule_tasks)").fetchall()}
    for col_name, col_type in new_cols:
        if col_name not in existing:
            try:
                db.execute(f"ALTER TABLE schedule_tasks ADD COLUMN {col_name} {col_type}")
                logger.info(f"Migrated schedule_tasks: added column {col_name}")
            except Exception as e:
                logger.warning(f"Could not add column {col_name}: {e}")
    db.commit()