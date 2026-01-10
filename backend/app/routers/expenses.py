import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Request
from sqlalchemy.orm import Session
from typing import Optional, List
from decimal import Decimal
import aiofiles
import os
from datetime import datetime

from ..database import get_db
from ..schemas import ExpenseNoteCreate, ExpenseNoteResponse
from ..crud import create_expense_note, update_expense_file_paths, get_expense_note as get_expense
from ..email_service import EmailService
from ..bot_notification import notify_expense_submitted
from ..config import settings
from ..token_verification import verify_access_token
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/expenses", tags=["expenses"])
limiter = Limiter(key_func=get_remote_address)


async def verify_public_access(access: Optional[str] = Query(None)) -> Optional[dict]:
    """Verify access token for public endpoints"""
    # If no token provided
    if not access:
        if settings.ACCESS_TOKEN_REQUIRED:
            logger.warning("Access attempt without token (token required)")
            raise HTTPException(status_code=401, detail="Access token required")
        return None

    # Try to verify token if we have a public key
    if not settings.ACCESS_TOKEN_PUBLIC_KEY:
        if settings.ACCESS_TOKEN_REQUIRED:
            logger.error("Token verification required but public key not configured")
            raise HTTPException(status_code=500, detail="Server not configured for token verification")
        return None

    payload = verify_access_token(access, settings.ACCESS_TOKEN_PUBLIC_KEY)
    if not payload:
        if settings.ACCESS_TOKEN_REQUIRED:
            logger.warning("Invalid or expired access token")
            raise HTTPException(status_code=401, detail="Invalid or expired access token")
        return None

    return payload

async def save_upload_file(upload_file: UploadFile, subfolder: str) -> str:
    """Save uploaded file and return relative path"""
    file_extension = upload_file.filename.split(".")[-1].lower()
    if file_extension not in settings.ALLOWED_EXTENSIONS.split(","):
        logger.warning(f"Rejected file upload with invalid extension: {upload_file.filename}")
        raise HTTPException(status_code=400, detail="Invalid file type")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{upload_file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, subfolder, filename)

    try:
        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await upload_file.read()
            if len(content) > settings.MAX_FILE_SIZE:
                logger.warning(f"Rejected file upload exceeding size limit: {upload_file.filename} ({len(content)} bytes)")
                raise HTTPException(status_code=400, detail="File too large")
            await out_file.write(content)
        return f"{subfolder}/{filename}"
    except IOError as e:
        logger.error(f"Failed to save file {file_path}: {e}")
        raise HTTPException(status_code=500, detail="Failed to save file")

@router.post("/", response_model=ExpenseNoteResponse)
@limiter.limit("10/minute")
async def submit_expense_note(
    request: Request,
    description: str = Form(...),
    amount: Decimal = Form(...),
    member_email: str = Form(...),
    member_name: Optional[str] = Form(None),
    payment_method: Optional[str] = Form('iban'),
    iban: Optional[str] = Form(None),
    photos: List[UploadFile] = File(None),
    db: Session = Depends(get_db),
    token_payload: Optional[dict] = Depends(verify_public_access)
):
    """Submit a new expense note (requires access token in production)"""
    username = token_payload.get('u') if token_payload else None

    try:
        expense_data = ExpenseNoteCreate(
            member_name=member_name,
            description=description,
            amount=amount,
            member_email=member_email,
            payment_method=payment_method,
            iban=iban,
            date_entered=datetime.utcnow()
        )

        expense = create_expense_note(db, expense_data)

        # Store Mattermost username from token if available
        if username:
            expense.mattermost_username = username
            db.commit()
            db.refresh(expense)

        # Handle multiple photo uploads
        if photos:
            photo_paths_list = []
            for photo in photos:
                if photo.filename:  # Check if file was actually uploaded
                    try:
                        photo_path = await save_upload_file(photo, "photos")
                        photo_paths_list.append(photo_path)
                    except Exception as e:
                        logger.error(f"Failed to save photo {photo.filename}: {e}")

            if photo_paths_list:
                photo_paths = ",".join(photo_paths_list)
                expense = update_expense_file_paths(
                    db, expense.id, photo_paths=photo_paths
                )

        # Build view URL for submitter
        view_url = f"{settings.FRONTEND_URL}/view/{expense.view_token}"

        # Send notification email to admin
        display_name = member_name or expense.mattermost_username or "Unknown"
        try:
            await EmailService.send_new_expense_notification(
                expense.id, display_name, float(amount)
            )
        except Exception as e:
            logger.error(f"Failed to send admin email notification: {e}")

        # Send DM confirmation to user
        if expense.mattermost_username:
            try:
                result = await notify_expense_submitted(
                    expense.mattermost_username,
                    float(amount),
                    description,
                    view_url
                )
                if not result:
                    logger.warning(f"DM notification failed for {expense.mattermost_username}")
            except Exception as e:
                logger.error(f"Failed to send DM notification to {expense.mattermost_username}: {e}")

        return expense

    except Exception as e:
        logger.error(f"Failed to submit expense: {e}")
        raise

@router.get("/view/{view_token}")
async def view_expense_by_token(
    view_token: str,
    db: Session = Depends(get_db)
):
    """View expense details by secret view token (for submitters)"""
    from ..models import ExpenseNote

    expense = db.query(ExpenseNote).filter(
        ExpenseNote.view_token == view_token,
        ExpenseNote.deleted == False
    ).first()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Return limited public-safe fields
    return {
        "id": expense.id,
        "status": expense.status,
        "member_name": expense.member_name,
        "description": expense.description,
        "amount": float(expense.amount),
        "date_entered": expense.date_entered.isoformat() if expense.date_entered else None,
        "payment_method": expense.payment_method,
        "created_at": expense.created_at.isoformat() if expense.created_at else None,
        "pay_date": expense.pay_date.isoformat() if expense.pay_date else None,
    }
