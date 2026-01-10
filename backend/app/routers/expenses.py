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
from ..config import settings
from ..token_verification import verify_access_token
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/api/expenses", tags=["expenses"])
limiter = Limiter(key_func=get_remote_address)


async def verify_public_access(access: Optional[str] = Query(None)) -> Optional[dict]:
    """Verify access token for public endpoints"""
    if not settings.ACCESS_TOKEN_REQUIRED:
        return None  # Skip verification in dev mode

    if not access:
        raise HTTPException(status_code=401, detail="Access token required")

    if not settings.ACCESS_TOKEN_PUBLIC_KEY:
        raise HTTPException(status_code=500, detail="Server not configured for token verification")

    payload = verify_access_token(access, settings.ACCESS_TOKEN_PUBLIC_KEY)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired access token")

    return payload

async def save_upload_file(upload_file: UploadFile, subfolder: str) -> str:
    """Save uploaded file and return relative path"""
    file_extension = upload_file.filename.split(".")[-1].lower()
    if file_extension not in settings.ALLOWED_EXTENSIONS.split(","):
        raise HTTPException(status_code=400, detail="Invalid file type")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{upload_file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, subfolder, filename)

    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await upload_file.read()
        if len(content) > settings.MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large")
        await out_file.write(content)

    return f"{subfolder}/{filename}"

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
    if token_payload and token_payload.get('u'):
        expense.mattermost_username = token_payload['u']
        db.commit()
        db.refresh(expense)

    # Handle multiple photo uploads
    if photos:
        photo_paths_list = []
        for photo in photos:
            if photo.filename:  # Check if file was actually uploaded
                photo_path = await save_upload_file(photo, "photos")
                photo_paths_list.append(photo_path)

        if photo_paths_list:
            photo_paths = ",".join(photo_paths_list)
            expense = update_expense_file_paths(
                db, expense.id, photo_paths=photo_paths
            )

    # Send notification email to admin
    display_name = member_name or expense.mattermost_username or "Unknown"
    await EmailService.send_new_expense_notification(
        expense.id, display_name, float(amount)
    )

    return expense

# NOTE: Public GET endpoint removed for security
# Expense data now only accessible through admin-authenticated endpoints
