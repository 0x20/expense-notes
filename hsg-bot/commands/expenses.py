import os
import logging
from services.tokens import generate_access_token

logger = logging.getLogger(__name__)

PRIVATE_KEY = os.getenv('ACCESS_TOKEN_PRIVATE_KEY')
EXPENSE_URL = os.getenv('EXPENSE_URL', 'https://expenses.hackerspace.gent')


def handle_expenses(username: str, args: str) -> dict:
    """
    Handle /expenses command.

    Args:
        username: Mattermost username of requester
        args: Command arguments (e.g., "help")

    Returns:
        Ephemeral response dict
    """
    args = args.strip().lower()

    if args == 'help':
        return help_response()

    return generate_link_response(username)


def help_response() -> dict:
    """Return help text."""
    return {
        'response_type': 'ephemeral',
        'text': """**Expense Notes - Help**

**Commands:**
- `/expenses` - Get a personal link to submit an expense note (valid for 7 days)
- `/expenses help` - Show this help message

**How it works:**
1. Type `/expenses` in any channel or DM
2. You'll receive a private link (only you can see it)
3. Click the link to open the expense submission form
4. Fill in your expense details and submit

You'll receive a DM when your expense status changes.

_This message is only visible to you._"""
    }


def generate_link_response(username: str) -> dict:
    """Generate expense link for user."""
    if not PRIVATE_KEY:
        logger.error("ACCESS_TOKEN_PRIVATE_KEY not configured")
        return {
            'response_type': 'ephemeral',
            'text': "Bot configuration error. Please contact an admin."
        }

    try:
        token = generate_access_token(PRIVATE_KEY, username)
        url = f"{EXPENSE_URL}?access={token}"
        logger.info(f"Generated expense link for {username}")

        return {
            'response_type': 'ephemeral',
            'text': f"""**Your Expense Submission Link**

{url}

This link is valid for **7 days**. Click it to submit an expense note.

_This message is only visible to you._"""
        }

    except Exception as e:
        logger.error(f"Error generating link for {username}: {e}")
        return {
            'response_type': 'ephemeral',
            'text': "Sorry, there was an error generating your link. Please try again."
        }


def notify_status_change(username: str, status: str, amount: float, description: str) -> str:
    """
    Build notification message for expense status change.

    Returns:
        Formatted message string
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

    desc_preview = description[:100] + "..." if len(description) > 100 else description

    return f"""{status_emoji} **Expense Update**

Your expense for **€{amount:.2f}** has been **{status_text}**.

> {desc_preview}

Use `/expenses` to submit a new expense."""
