from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from .models import ExpenseNote, AdminUser
from .schemas import ExpenseNoteCreate, ExpenseNoteUpdate

def create_expense_note(db: Session, expense: ExpenseNoteCreate) -> ExpenseNote:
    db_expense = ExpenseNote(**expense.model_dump())
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

def get_expense_note(db: Session, expense_id: str) -> Optional[ExpenseNote]:
    return db.query(ExpenseNote).filter(ExpenseNote.id == expense_id).first()

def get_all_expense_notes(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None
) -> List[ExpenseNote]:
    query = db.query(ExpenseNote)

    if status == 'deleted':
        # Show only deleted expenses
        query = query.filter(ExpenseNote.deleted == True)
    elif status == 'all':
        # Show all expenses including deleted
        pass
    elif status:
        # Show only non-deleted expenses with specific status
        query = query.filter(ExpenseNote.status == status, ExpenseNote.deleted == False)
    else:
        # Default: show only non-deleted expenses
        query = query.filter(ExpenseNote.deleted == False)

    return query.order_by(desc(ExpenseNote.created_at)).offset(skip).limit(limit).all()

def update_expense_note(
    db: Session,
    expense_id: str,
    expense_update: ExpenseNoteUpdate
) -> Optional[ExpenseNote]:
    db_expense = get_expense_note(db, expense_id)
    if not db_expense:
        return None

    update_data = expense_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_expense, field, value)

    db.commit()
    db.refresh(db_expense)
    return db_expense

def update_expense_file_paths(
    db: Session,
    expense_id: str,
    photo_paths: Optional[str] = None,
    signature_path: Optional[str] = None,
    signature_financial_path: Optional[str] = None,
    attachment_paths: Optional[str] = None
) -> Optional[ExpenseNote]:
    db_expense = get_expense_note(db, expense_id)
    if not db_expense:
        return None

    if photo_paths is not None:
        db_expense.photo_paths = photo_paths
    if signature_path is not None:
        db_expense.signature_path = signature_path
    if signature_financial_path is not None:
        db_expense.signature_financial_path = signature_financial_path
    if attachment_paths is not None:
        db_expense.attachment_paths = attachment_paths

    db.commit()
    db.refresh(db_expense)
    return db_expense

def get_admin_user(db: Session) -> Optional[AdminUser]:
    return db.query(AdminUser).first()

def create_admin_user(db: Session, password_hash: str) -> AdminUser:
    admin = AdminUser(password_hash=password_hash)
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin
