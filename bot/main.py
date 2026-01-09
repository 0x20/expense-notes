import os
import asyncio
from flask import Flask, request, jsonify
from mattermostdriver import Driver
from token_generator import generate_access_token
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration from environment
MATTERMOST_URL = os.getenv('MATTERMOST_URL', 'https://mattermost.hackerspace.gent')
MATTERMOST_TOKEN = os.getenv('MATTERMOST_TOKEN')
BOT_USERNAME = os.getenv('BOT_USERNAME', 'expense-bot')
PRIVATE_KEY = os.getenv('ACCESS_TOKEN_PRIVATE_KEY')
EXPENSE_URL = os.getenv('EXPENSE_URL', 'https://expenses.hackerspace.gent')

# Initialize Mattermost driver
mm = Driver({
    'url': MATTERMOST_URL,
    'token': MATTERMOST_TOKEN,
    'scheme': 'https',
    'port': 443,
    'verify': True
})

app = Flask(__name__)


def generate_expense_link(username: str) -> str:
    """Generate expense submission link with access token"""
    token = generate_access_token(PRIVATE_KEY, username)
    return f"{EXPENSE_URL}?access={token}"


def handle_help_command(channel_id: str, user_id: str):
    """Send help message"""
    help_text = """**Expense Notes Bot - Commands**

`!expenses` - Get a link to submit an expense note (valid for 7 days)
`!help` - Show this help message

**About**
This bot provides secure access links to the expense submission form. Each link is valid for 7 days from the time it's generated.
"""
    mm.posts.create_post({
        'channel_id': channel_id,
        'message': help_text
    })


def handle_expenses_command(channel_id: str, user_id: str, username: str):
    """Generate and send expense link"""
    try:
        link = generate_expense_link(username)
        message = f"""**Your Expense Submission Link**

{link}

This link is valid for 7 days. Click it to submit an expense note.

If you need help, use `!help` or contact an admin.
"""
        mm.posts.create_post({
            'channel_id': channel_id,
            'message': message
        })
        logger.info(f"Generated expense link for user {username}")
    except Exception as e:
        logger.error(f"Error generating link: {e}")
        mm.posts.create_post({
            'channel_id': channel_id,
            'message': "Sorry, there was an error generating your link. Please try again or contact an admin."
        })


@app.route('/webhook', methods=['POST'])
def webhook():
    """Handle incoming webhooks from Mattermost"""
    data = request.json

    # Ignore messages from the bot itself
    if data.get('user_name') == BOT_USERNAME:
        return jsonify({'status': 'ignored'}), 200

    text = data.get('text', '').strip()
    channel_id = data.get('channel_id')
    user_id = data.get('user_id')
    username = data.get('user_name')

    # Handle commands
    if text.startswith('!help'):
        handle_help_command(channel_id, user_id)
    elif text.startswith('!expenses'):
        handle_expenses_command(channel_id, user_id, username)
    else:
        # Unknown command - send help
        mm.posts.create_post({
            'channel_id': channel_id,
            'message': f"Unknown command: `{text}`. Type `!help` for available commands."
        })

    return jsonify({'status': 'ok'}), 200


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200


def init_bot():
    """Initialize Mattermost connection"""
    try:
        mm.login()
        logger.info(f"Bot connected to Mattermost at {MATTERMOST_URL}")
        logger.info(f"Bot username: {BOT_USERNAME}")
    except Exception as e:
        logger.error(f"Failed to connect to Mattermost: {e}")
        raise


if __name__ == '__main__':
    if not MATTERMOST_TOKEN:
        logger.error("MATTERMOST_TOKEN not set!")
        exit(1)

    if not PRIVATE_KEY:
        logger.error("ACCESS_TOKEN_PRIVATE_KEY not set!")
        exit(1)

    init_bot()

    # Run Flask app
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
