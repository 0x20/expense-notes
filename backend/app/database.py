import logging
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .config import settings
from .models import Base, AdminUser

logger = logging.getLogger(__name__)

# Create data directory if it doesn't exist
os.makedirs("./data", exist_ok=True)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(f"{settings.UPLOAD_DIR}/photos", exist_ok=True)
os.makedirs(f"{settings.UPLOAD_DIR}/signatures", exist_ok=True)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}  # Only for SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
    _ensure_admin_exists()


def _ensure_admin_exists():
    """Create admin user if none exists and ADMIN_PASSWORD is set."""
    from .auth import get_password_hash

    db = SessionLocal()
    try:
        admin = db.query(AdminUser).first()
        if admin:
            return

        if not settings.ADMIN_PASSWORD:
            logger.warning("No admin user exists and ADMIN_PASSWORD not set in .env")
            logger.warning("Set ADMIN_PASSWORD in .env or run: python setup.py")
            return

        admin = AdminUser(password_hash=get_password_hash(settings.ADMIN_PASSWORD))
        db.add(admin)
        db.commit()
        logger.info("Admin user created from ADMIN_PASSWORD")
    finally:
        db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
