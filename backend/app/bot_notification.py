import httpx
import logging
from .config import settings

logger = logging.getLogger(__name__)


async def notify_user_via_bot(username: str, message: str) -> bool:
    """
    Send a DM notification to a Mattermost user via the bot.

    Args:
        username: Mattermost username
        message: Message to send

    Returns:
        True if notification was sent, False otherwise
    """
    if not settings.BOT_NOTIFY_URL or not settings.BOT_NOTIFY_SECRET:
        return False

    if not username:
        return False

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                settings.BOT_NOTIFY_URL,
                json={
                    "secret": settings.BOT_NOTIFY_SECRET,
                    "username": username,
                    "message": message
                }
            )

            if response.status_code == 200:
                return True
            else:
                logger.warning(f"Bot notification failed: {response.status_code} - {response.text}")
                return False

    except Exception as e:
        logger.error(f"Failed to send bot notification: {e}")
        return False


async def notify_expense_status_change(
    username: str,
    status: str,
    amount: float,
    description: str,
    admin_notes: str = None
) -> bool:
    """
    Notify user that their expense status changed.
    """
    status_emoji = {
        "paid": ":white_check_mark:",
        "denied": ":x:",
        "pending": ":hourglass:"
    }.get(status, "")

    status_text = {
        "paid": "approved and paid",
        "denied": "denied",
        "pending": "set back to pending"
    }.get(status, status)

    admin_notes_line = f"\n\n:memo: **Message from Admin:**\n> {admin_notes}" if admin_notes else ""

    message = f"""{status_emoji} **Expense Update**

Your expense for **€{amount:.2f}** has been **{status_text}**.

> {description[:100]}{"..." if len(description) > 100 else ""}{admin_notes_line}

Use `/expenses` to submit a new expense."""

    return await notify_user_via_bot(username, message)


async def notify_expense_submitted(
    username: str,
    amount: float,
    description: str,
    view_url: str = None
) -> bool:
    """
    Notify user that their expense was submitted.
    """
    view_line = f"\n\n:link: [View your expense]({view_url})" if view_url else ""

    message = f""":inbox_tray: **Expense Submitted**

Your expense for **€{amount:.2f}** has been submitted and is pending review.

> {description[:100]}{"..." if len(description) > 100 else ""}{view_line}

You'll receive a DM when it's processed."""

    return await notify_user_via_bot(username, message)
