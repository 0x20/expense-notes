from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional
from decimal import Decimal

class ExpenseNoteCreate(BaseModel):
    member_name: Optional[str] = None  # Required for IBAN, optional for cash
    description: str
    amount: Decimal
    member_email: EmailStr
    date_entered: Optional[datetime] = None
    payment_method: Optional[str] = 'iban'
    iban: Optional[str] = None

    @field_validator('amount')
    @classmethod
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v

class ExpenseNoteUpdate(BaseModel):
    status: Optional[str] = None
    pay_date: Optional[datetime] = None
    paid_from: Optional[str] = None
    paid_to: Optional[str] = None
    financial_responsible: Optional[str] = None
    attachment_paths: Optional[str] = None
    admin_notes: Optional[str] = None

class ExpenseNoteResponse(BaseModel):
    id: str
    status: str
    member_name: str
    date_entered: datetime
    description: str
    amount: Decimal
    member_email: str
    photo_paths: Optional[str]
    pay_date: Optional[datetime]
    paid_from: Optional[str]
    paid_to: Optional[str]
    financial_responsible: Optional[str]
    attachment_paths: Optional[str]
    created_at: datetime
    updated_at: datetime
    admin_notes: Optional[str]
    deleted: bool
    mattermost_username: Optional[str]
    payment_method: Optional[str]
    iban: Optional[str]

    class Config:
        from_attributes = True

class AdminLogin(BaseModel):
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
