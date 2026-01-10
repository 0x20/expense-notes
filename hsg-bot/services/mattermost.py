import os
import logging
from mattermostdriver import Driver

logger = logging.getLogger(__name__)

MATTERMOST_URL = os.getenv('MATTERMOST_URL', 'https://mattermost.hackerspace.gent')
MATTERMOST_TOKEN = os.getenv('MATTERMOST_TOKEN')

_driver = None
_bot_id = None


def get_driver() -> Driver:
    """Get Mattermost driver, initializing if needed."""
    global _driver
    if _driver is None:
        if not MATTERMOST_TOKEN:
            logger.error("MATTERMOST_TOKEN not configured")
            return None
        try:
            _driver = Driver({
                'url': MATTERMOST_URL.replace('https://', '').replace('http://', ''),
                'token': MATTERMOST_TOKEN,
                'scheme': 'https',
                'port': 443,
                'verify': True
            })
            _driver.login()
        except Exception as e:
            logger.error(f"Failed to connect to Mattermost at {MATTERMOST_URL}: {e}")
            _driver = None
            return None
    return _driver


def get_bot_id() -> str:
    """Get the bot's user ID."""
    global _bot_id
    if _bot_id is None:
        driver = get_driver()
        if not driver:
            logger.error("Cannot get bot ID: driver not available")
            return None
        try:
            bot_user = driver.users.get_user('me')
            _bot_id = bot_user['id']
        except Exception as e:
            logger.error(f"Failed to get bot user info: {e}")
            return None
    return _bot_id


def get_user_by_username(username: str) -> dict:
    """Look up user by username."""
    driver = get_driver()
    if not driver:
        return None
    try:
        return driver.users.get_user_by_username(username)
    except Exception as e:
        logger.error(f"Failed to find user {username}: {e}")
        return None


def get_dm_channel(user_id: str) -> str:
    """Get or create DM channel with user."""
    driver = get_driver()
    if not driver:
        logger.error(f"Cannot create DM channel for user {user_id}: driver not available")
        return None

    bot_id = get_bot_id()
    if not bot_id:
        logger.error(f"Cannot create DM channel for user {user_id}: bot ID not available")
        return None

    try:
        channel = driver.channels.create_direct_message_channel([bot_id, user_id])
        return channel['id']
    except Exception as e:
        logger.error(f"Failed to create DM channel for user {user_id}: {e}")
        return None


def send_dm(user_id: str, message: str) -> bool:
    """Send a DM to a user by their user ID."""
    driver = get_driver()
    if not driver:
        logger.error(f"Cannot send DM to user {user_id}: Mattermost not configured")
        return False

    try:
        channel_id = get_dm_channel(user_id)
        if not channel_id:
            logger.error(f"Cannot send DM to user {user_id}: failed to get channel")
            return False

        driver.posts.create_post({
            'channel_id': channel_id,
            'message': message
        })
        return True
    except Exception as e:
        logger.error(f"Failed to send DM to user {user_id}: {e}")
        return False


def send_dm_to_username(username: str, message: str) -> bool:
    """Send a DM to a user by their username."""
    user = get_user_by_username(username)
    if not user:
        logger.error(f"Cannot send DM: user not found: {username}")
        return False
    return send_dm(user['id'], message)
