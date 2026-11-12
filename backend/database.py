import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./brandproof.db")

# Normalise PostgreSQL dialects (e.g. from Neon / Render) for SQLAlchemy 2.x
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# For SQLite, check_same_thread is required to allow multithreaded FastAPI access
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    future=True,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def migrate_columns(target_engine=None):
    """Idempotently ensures newly added model columns exist in database tables."""
    eng = target_engine or engine
    from sqlalchemy import inspect, text
    try:
        inspector = inspect(eng)
        table_names = inspector.get_table_names()
        with eng.connect() as conn:
            if "review_findings" in table_names:
                rf_cols = {col["name"] for col in inspector.get_columns("review_findings")}
                new_rf_cols = [
                    ("reject_reason", "VARCHAR(100)"),
                    ("reject_note", "TEXT"),
                    ("engine_source", "VARCHAR(50) DEFAULT 'deterministic'"),
                    ("is_ai_assisted", "BOOLEAN DEFAULT 0"),
                    ("needs_human_look", "BOOLEAN DEFAULT 0"),
                ]
                for col_name, col_type in new_rf_cols:
                    if col_name not in rf_cols:
                        conn.execute(text(f"ALTER TABLE review_findings ADD COLUMN {col_name} {col_type}"))

            if "review_comments" in table_names:
                rc_cols = {col["name"] for col in inspector.get_columns("review_comments")}
                new_rc_cols = [
                    ("finding_id", "INTEGER"),
                    ("comment_type", "VARCHAR(50) DEFAULT 'general'"),
                ]
                for col_name, col_type in new_rc_cols:
                    if col_name not in rc_cols:
                        conn.execute(text(f"ALTER TABLE review_comments ADD COLUMN {col_name} {col_type}"))

            if "organizations" in table_names:
                org_cols = {col["name"] for col in inspector.get_columns("organizations")}
                new_org_cols = [
                    ("confidential_mode_default", "BOOLEAN DEFAULT 0"),
                    ("confidential_terms", "TEXT DEFAULT '[]'"),
                ]
                for col_name, col_type in new_org_cols:
                    if col_name not in org_cols:
                        conn.execute(text(f"ALTER TABLE organizations ADD COLUMN {col_name} {col_type}"))

            if "content_reviews" in table_names:
                cr_cols = {col["name"] for col in inspector.get_columns("content_reviews")}
                new_cr_cols = [
                    ("confidential_mode", "BOOLEAN DEFAULT 0"),
                    ("redaction_summary", "TEXT"),
                    ("report_fingerprint", "VARCHAR(64)"),
                ]
                for col_name, col_type in new_cr_cols:
                    if col_name not in cr_cols:
                        conn.execute(text(f"ALTER TABLE content_reviews ADD COLUMN {col_name} {col_type}"))

            if "audit_logs" in table_names:
                al_cols = {col["name"] for col in inspector.get_columns("audit_logs")}
                new_al_cols = [
                    ("prev_hash", "VARCHAR(64)"),
                    ("entry_hash", "VARCHAR(64)"),
                ]
                for col_name, col_type in new_al_cols:
                    if col_name not in al_cols:
                        conn.execute(text(f"ALTER TABLE audit_logs ADD COLUMN {col_name} {col_type}"))
            conn.commit()

        # Backfill existing audit logs with sha256 chain
        try:
            from backend.audit_chain import backfill_audit_chain
            from sqlalchemy.orm import Session
            with Session(engine) as session:
                backfill_audit_chain(session)
        except Exception as e:
            print(f"[Migration] Audit backfill notice: {e}")
    except Exception as e:
        print(f"[Migration] Notice: {e}")

