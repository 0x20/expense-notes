import os
import hmac
import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from commands.expenses import handle_expenses, notify_status_change
from services.mattermost import send_dm_to_username

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Config
SLASH_TOKEN = os.getenv('MATTERMOST_SLASH_TOKEN')
NOTIFY_SECRET = os.getenv('NOTIFY_SECRET')

app = FastAPI(title="HSG Bot", description="Hackerspace Gent Mattermost Bot")


# --- Slash Command Handlers ---

@app.post("/expenses")
async def slash_expenses(request: Request):
    """Handle /expenses slash command."""
    form = await request.form()

    # Verify request is from Mattermost
    token = form.get('token', '')
    if not SLASH_TOKEN:
        logger.error("MATTERMOST_SLASH_TOKEN not configured")
        return JSONResponse({'response_type': 'ephemeral', 'text': 'Bot configuration error.'}, status_code=500)

    if not hmac.compare_digest(token, SLASH_TOKEN):
        logger.warning(f"Invalid slash token from {request.client.host}")
        raise HTTPException(status_code=401)

    username = form.get('user_name', 'unknown')
    text = form.get('text', '')

    response = handle_expenses(username, text)
    return JSONResponse(response)


# --- Notification Endpoint (called by backend) ---

class NotifyRequest(BaseModel):
    secret: str
    username: str
    message: str = None
    # For expense notifications
    type: str = None
    status: str = None
    amount: float = None
    description: str = None


@app.post("/notify")
async def notify(request: Request, data: NotifyRequest):
    """
    Receive notification from backend and DM the user.

    Supports two modes:
    1. Direct message: {"secret": "...", "username": "...", "message": "..."}
    2. Expense update: {"secret": "...", "username": "...", "type": "expense_status", "status": "paid", "amount": 50.0, "description": "..."}
    """
    if not NOTIFY_SECRET:
        logger.error("NOTIFY_SECRET not configured")
        raise HTTPException(status_code=500, detail="Not configured")

    if not hmac.compare_digest(data.secret, NOTIFY_SECRET):
        logger.warning(f"Invalid notify secret from {request.client.host}")
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Build message
    if data.message:
        message = data.message
    elif data.type == "expense_status" and data.status and data.amount is not None:
        message = notify_status_change(data.username, data.status, data.amount, data.description or "")
    else:
        raise HTTPException(status_code=400, detail="Missing message or expense data")

    # Send DM
    if send_dm_to_username(data.username, message):
        return {"status": "sent"}
    else:
        logger.error(f"Failed to send notification to {data.username}")
        raise HTTPException(status_code=404, detail="User not found or DM failed")


# --- Health Check ---

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "bot": "hsg-bot",
        "slash_token_configured": bool(SLASH_TOKEN),
        "notify_secret_configured": bool(NOTIFY_SECRET),
        "mattermost_configured": bool(os.getenv('MATTERMOST_TOKEN'))
    }


if __name__ == '__main__':
    import uvicorn

    missing = []
    if not os.getenv('ACCESS_TOKEN_PRIVATE_KEY'):
        missing.append('ACCESS_TOKEN_PRIVATE_KEY')
    if not SLASH_TOKEN:
        missing.append('MATTERMOST_SLASH_TOKEN')
    if not os.getenv('MATTERMOST_TOKEN'):
        missing.append('MATTERMOST_TOKEN')
    if not NOTIFY_SECRET:
        missing.append('NOTIFY_SECRET')

    if missing:
        logger.warning(f"Missing config: {', '.join(missing)}")

    logger.info("Starting HSG Bot")
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv('PORT', 5000)))
