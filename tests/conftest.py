import os
import tempfile
import pytest

# Ensure isolated temporary test database environment
_test_dir = tempfile.TemporaryDirectory(prefix="brandproof_test_")
_test_db_path = os.path.join(_test_dir.name, "test_brandproof.db")

os.environ["DATABASE_URL"] = f"sqlite:///{_test_db_path}"
os.environ["ENV"] = "test"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key-brandproof-round3"

from backend.database import Base, engine, SessionLocal
from backend.seed import seed_database

@pytest.fixture(scope="session", autouse=True)
def initialize_test_database():
    """Initializes and seeds the isolated temporary test database."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    try:
        _test_dir.cleanup()
    except Exception:
        pass

