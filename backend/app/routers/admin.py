from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta
import os
import logging

logger = logging.getLogger(__name__)

from ..database import get_db
from ..schemas import (
    AdminLogin, Token, ExpenseNoteResponse, ExpenseNoteUpdate
)
from ..crud import (
    get_all_expense_notes, get_expense_note, update_expense_note,
    update_expense_file_paths, get_admin_user
)
from ..auth import authenticate_admin, create_access_token, get_current_admin
from ..email_service import EmailService
from ..bot_notification import notify_expense_status_change
from ..config import settings
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/api/admin", tags=["admin"])
limiter = Limiter(key_func=get_remote_address)

@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def admin_login(request: Request, login_data: AdminLogin, db: Session = Depends(get_db)):
    """Admin login endpoint"""
    if not authenticate_admin(db, login_data.password):
        logger.warning(f"Failed admin login attempt from {request.client.host}")
        raise HTTPException(status_code=401, detail="Invalid password")

    admin = get_admin_user(db)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": admin.id}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/expenses", response_model=List[ExpenseNoteResponse])
async def list_expenses(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get all expense notes (admin only)"""
    expenses = get_all_expense_notes(db, skip=skip, limit=limit, status=status)
    return expenses

@router.get("/expenses/{expense_id}", response_model=ExpenseNoteResponse)
async def get_expense_details(
    expense_id: str,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Get expense details (admin only)"""
    expense = get_expense_note(db, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense

@router.patch("/expenses/{expense_id}", response_model=ExpenseNoteResponse)
async def update_expense(
    expense_id: str,
    expense_update: ExpenseNoteUpdate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Update expense note (admin only)"""
    expense = get_expense_note(db, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    old_status = expense.status
    updated_expense = update_expense_note(db, expense_id, expense_update)

    # Send notifications if status changed
    if expense_update.status and expense_update.status != old_status:
        # Email notification
        try:
            await EmailService.send_status_update(
                updated_expense.member_email,
                updated_expense.member_name,
                updated_expense.status,
                float(updated_expense.amount),
                updated_expense.description
            )
        except Exception as e:
            logger.error(f"Failed to send status update email to {updated_expense.member_email}: {e}")

        # Mattermost DM notification
        if updated_expense.mattermost_username:
            try:
                result = await notify_expense_status_change(
                    updated_expense.mattermost_username,
                    updated_expense.status,
                    float(updated_expense.amount),
                    updated_expense.description
                )
                if not result:
                    logger.warning(f"DM notification returned false for {updated_expense.mattermost_username}")
            except Exception as e:
                logger.error(f"Failed to send DM notification to {updated_expense.mattermost_username}: {e}")
    return updated_expense

@router.post("/expenses/{expense_id}/attachments")
async def upload_admin_attachments(
    expense_id: str,
    attachments: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Upload admin attachments (admin only)"""
    from .expenses import save_upload_file

    expense = get_expense_note(db, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Get existing attachments
    existing_paths = expense.attachment_paths.split(",") if expense.attachment_paths else []

    # Upload new files
    new_paths = []
    for attachment in attachments:
        if attachment.filename:
            attachment_path = await save_upload_file(attachment, "attachments")
            new_paths.append(attachment_path)

    # Combine existing and new paths
    all_paths = existing_paths + new_paths
    attachment_paths = ",".join(all_paths)

    update_expense_file_paths(
        db, expense_id, attachment_paths=attachment_paths
    )

    return {"attachment_paths": attachment_paths, "new_files": new_paths}

@router.delete("/expenses/{expense_id}/photos/{filename:path}")
async def delete_photo(
    expense_id: str,
    filename: str,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Delete a photo from an expense (admin only)"""
    expense = get_expense_note(db, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Remove filename from photo_paths or attachment_paths
    # Note: filename may include directory like "photos/xyz.jpg"
    # We need to normalize both the stored path and the incoming filename
    photo_deleted = False

    # Normalize the filename (remove duplicate directory prefixes)
    normalized_filename = filename.replace('photos/photos/', 'photos/').replace('attachments/attachments/', 'attachments/')

    if expense.photo_paths:
        photos = [p.strip() for p in expense.photo_paths.split(",") if p.strip()]
        original_count = len(photos)
        # Filter out the photo that matches
        photos = [p for p in photos if p != normalized_filename]
        if len(photos) < original_count:
            photo_deleted = True
            photo_paths = ",".join(photos) if photos else ""
            expense.photo_paths = photo_paths if photo_paths else None
            db.commit()
            db.refresh(expense)

    if not photo_deleted and expense.attachment_paths:
        attachments = [a.strip() for a in expense.attachment_paths.split(",") if a.strip()]
        original_count = len(attachments)
        # Filter out the attachment that matches
        attachments = [a for a in attachments if a != normalized_filename]
        if len(attachments) < original_count:
            photo_deleted = True
            attachment_paths = ",".join(attachments) if attachments else ""
            expense.attachment_paths = attachment_paths if attachment_paths else None
            db.commit()
            db.refresh(expense)

    if photo_deleted:
        return {"message": "Photo deleted successfully", "expense": expense}
    else:
        logger.warning(f"Photo not found for deletion: {normalized_filename} in expense {expense_id}")
        raise HTTPException(status_code=404, detail="Photo not found")

@router.delete("/expenses/{expense_id}")
async def soft_delete_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Soft delete an expense (admin only)"""
    expense = get_expense_note(db, expense_id)
    if not expense:
        logger.warning(f"Attempted to delete non-existent expense: {expense_id}")
        raise HTTPException(status_code=404, detail="Expense not found")

    expense.deleted = True
    db.commit()
    db.refresh(expense)
    return {"message": "Expense deleted successfully"}

@router.post("/expenses/{expense_id}/restore")
async def restore_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Restore a deleted expense (admin only)"""
    expense = get_expense_note(db, expense_id)
    if not expense:
        logger.warning(f"Attempted to restore non-existent expense: {expense_id}")
        raise HTTPException(status_code=404, detail="Expense not found")

    expense.deleted = False
    db.commit()
    db.refresh(expense)
    return {"message": "Expense restored successfully"}

@router.get("/files/{file_type}/{filename}")
async def get_file(
    file_type: str,
    filename: str,
    current_admin = Depends(get_current_admin)
):
    """Serve uploaded files (admin only)"""
    if file_type not in ["photos", "signatures"]:
        raise HTTPException(status_code=400, detail="Invalid file type")

    file_path = os.path.join(settings.UPLOAD_DIR, file_type, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path)
