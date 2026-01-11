from sqlalchemy import Column, String, DateTime, Boolean, Numeric, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid
import secrets

Base = declarative_base()

def generate_view_token():
    return secrets.token_urlsafe(32)

class ExpenseNote(Base):
    __tablename__ = "expense_notes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    view_token = Column(String(64), unique=True, default=generate_view_token, nullable=False)
    status = Column(String(20), default="pending", nullable=False)

    # User-submitted fields
    member_name = Column(String(255), nullable=True)  # Required for IBAN, optional for cash
    date_entered = Column(DateTime, default=datetime.utcnow, nullable=False)
    description = Column(Text, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    member_email = Column(String(255), nullable=False)
    photo_paths = Column(Text, nullable=True)  # Comma-separated file paths
    signature_path = Column(String(500), nullable=True)
    mattermost_username = Column(String(255), nullable=True)  # From access token
    payment_method = Column(String(50), nullable=True, default='iban')  # iban, cash
    iban = Column(String(50), nullable=True)

    # Admin fields
    paid = Column(Boolean, default=False)
    expense_type = Column(String(50), nullable=True)
    pay_date = Column(DateTime, nullable=True)
    paid_from = Column(String(100), nullable=True)
    paid_to = Column(String(255), nullable=True)
    financial_responsible = Column(String(255), nullable=True)
    signature_financial_path = Column(String(500), nullable=True)
    attachment_paths = Column(Text, nullable=True)  # Comma-separated admin file paths

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    admin_notes = Column(Text, nullable=True)
    deleted = Column(Boolean, default=False)

# DEPRECATED: AdminUser table no longer used
# Auth now uses ADMIN_PASSWORD env var directly
# Table kept for backward compatibility with existing databases
class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
