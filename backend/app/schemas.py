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

    @field_validator('pay_date', mode='before')
    @classmethod
    def parse_pay_date(cls, v):
        # Frontend sends pay_date as a calendar date ('yyyy-MM-dd') to avoid a
        # UTC day shift. pydantic's datetime type rejects a date-only string, so
        # parse it to local midnight here. Treat empty string as no date.
        if v is None or (isinstance(v, str) and v.strip() == ''):
            return None
        if isinstance(v, str) and len(v.strip()) == 10:
            return datetime.strptime(v.strip(), '%Y-%m-%d')
        return v

class ExpenseNoteResponse(BaseModel):
    id: str
    status: str
    member_name: Optional[str]
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
