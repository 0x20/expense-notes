import logging
from sqlalchemy.orm import Session
from sqlalchemy import desc
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional
from .models import ExpenseNote, AdminUser
from .schemas import ExpenseNoteCreate, ExpenseNoteUpdate

logger = logging.getLogger(__name__)


def create_expense_note(db: Session, expense: ExpenseNoteCreate) -> ExpenseNote:
    try:
        db_expense = ExpenseNote(**expense.model_dump())
        db.add(db_expense)
        db.commit()
        db.refresh(db_expense)
        return db_expense
    except SQLAlchemyError as e:
        logger.error(f"Failed to create expense note: {e}")
        db.rollback()
        raise

def get_expense_note(db: Session, expense_id: str) -> Optional[ExpenseNote]:
    try:
        return db.query(ExpenseNote).filter(ExpenseNote.id == expense_id).first()
    except SQLAlchemyError as e:
        logger.error(f"Failed to get expense note {expense_id}: {e}")
        raise

def get_all_expense_notes(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None
) -> List[ExpenseNote]:
    try:
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
    except SQLAlchemyError as e:
        logger.error(f"Failed to get expense notes (status={status}): {e}")
        raise

def update_expense_note(
    db: Session,
    expense_id: str,
    expense_update: ExpenseNoteUpdate
) -> Optional[ExpenseNote]:
    try:
        db_expense = get_expense_note(db, expense_id)
        if not db_expense:
            logger.warning(f"Cannot update expense note {expense_id}: not found")
            return None

        update_data = expense_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_expense, field, value)

        db.commit()
        db.refresh(db_expense)
        return db_expense
    except SQLAlchemyError as e:
        logger.error(f"Failed to update expense note {expense_id}: {e}")
        db.rollback()
        raise

def update_expense_file_paths(
    db: Session,
    expense_id: str,
    photo_paths: Optional[str] = None,
    signature_path: Optional[str] = None,
    signature_financial_path: Optional[str] = None,
    attachment_paths: Optional[str] = None
) -> Optional[ExpenseNote]:
    try:
        db_expense = get_expense_note(db, expense_id)
        if not db_expense:
            logger.warning(f"Cannot update file paths for expense {expense_id}: not found")
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
    except SQLAlchemyError as e:
        logger.error(f"Failed to update file paths for expense {expense_id}: {e}")
        db.rollback()
        raise

def get_admin_user(db: Session) -> Optional[AdminUser]:
    try:
        return db.query(AdminUser).first()
    except SQLAlchemyError as e:
        logger.error(f"Failed to get admin user: {e}")
        raise


def create_admin_user(db: Session, password_hash: str) -> AdminUser:
    try:
        admin = AdminUser(password_hash=password_hash)
        db.add(admin)
        db.commit()
        db.refresh(admin)
        return admin
    except SQLAlchemyError as e:
        logger.error(f"Failed to create admin user: {e}")
        db.rollback()
        raise
