# Expense Notes Mattermost Bot

This bot provides secure access links to the expense submission form via Mattermost commands.

## Features

- **!expenses** - Get a 7-day valid link to submit an expense
- **!help** - Show available commands
- Automatic token signing with Ed25519
- Integration with Traefik for SSL and routing

## Setup

### 1. Generate Ed25519 Keypair

```bash
cd bot
python token_generator.py
```

This will output:
- **Private key** - Add to `bot/.env`
- **Public key** - Add to `backend/.env`

### 2. Create Mattermost Bot Account

1. Go to Mattermost → System Console → Integrations → Bot Accounts
2. Create a new bot:
   - Username: `expense-bot`
   - Display Name: `Expense Notes Bot`
   - Description: `Provides secure links to submit expense notes`
   - Icon: (Optional) Upload a relevant icon
3. Get the **Bot Token** from the created bot

### 3. Configure Outgoing Webhook

The bot can work in two modes:

#### Option A: Outgoing Webhook (Simple, Recommended)

1. Go to Mattermost → Integrations → Outgoing Webhooks
2. Create new webhook:
   - Title: `Expense Bot Commands`
   - Channel: Select a channel (or leave empty for DMs)
   - Trigger Words: `!expenses`, `!help`
   - Callback URLs: `https://expenses.hackerspace.gent/bot/webhook`
   - Trigger When: `First word matches a trigger word`
3. Save and note the token (not needed for this setup)

#### Option B: Slash Commands (Alternative)

1. Go to Mattermost → Integrations → Slash Commands
2. Create command `/expenses`:
   - Request URL: `https://expenses.hackerspace.gent/bot/webhook`
   - Request Method: POST
   - Response Username: `expense-bot`
3. Create command `/expensehelp`:
   - Request URL: `https://expenses.hackerspace.gent/bot/webhook`
   - Request Method: POST

### 4. Configure Bot Environment

Create `bot/.env`:

```env
MATTERMOST_URL=https://mattermost.hackerspace.gent
MATTERMOST_TOKEN=<bot_token_from_step_2>
BOT_USERNAME=expense-bot
ACCESS_TOKEN_PRIVATE_KEY=<private_key_from_step_1>
EXPENSE_URL=https://expenses.hackerspace.gent
PORT=5000
```

### 5. Deploy

```bash
cd ..  # Back to root
docker compose up -d --build bot
```

## Usage

In any Mattermost channel or DM:

```
!expenses
```

Bot replies with:
```
**Your Expense Submission Link**

https://expenses.hackerspace.gent?access=<long_token>

This link is valid for 7 days. Click it to submit an expense note.
```

## Adding Notifications

To enable the bot to send notifications when expenses are submitted or processed, you need to:

1. Update `backend/app/email_service.py` to also notify via Mattermost
2. Configure a webhook URL in the bot for receiving notifications
3. Have the backend POST to the bot's notification endpoint

Example notification endpoint (add to `bot/main.py`):

```python
@app.route('/notify', methods=['POST'])
def notify():
    """Receive notification from backend and post to Mattermost"""
    data = request.json
    event_type = data.get('type')  # 'new_expense', 'status_change'

    if event_type == 'new_expense':
        message = f"New expense submitted by {data['member_name']} for €{data['amount']}"
    elif event_type == 'status_change':
        message = f"Expense #{data['expense_id'][:8]} status changed to {data['status']}"

    # Post to admin channel
    mm.posts.create_post({
        'channel_id': ADMIN_CHANNEL_ID,
        'message': message
    })

    return jsonify({'status': 'ok'}), 200
```

## Troubleshooting

**Bot not responding:**
- Check logs: `docker logs expense-notes-bot`
- Verify webhook URL is accessible: `curl https://expenses.hackerspace.gent/bot/health`
- Ensure bot token is correct

**Token generation fails:**
- Verify private key is set correctly in `.env`
- Check key format (should be base64-encoded)
- Run `python token_generator.py` to generate new keys

**Links not working:**
- Verify public key is set in backend `.env`
- Check `ACCESS_TOKEN_REQUIRED=true` in backend
- Test token verification: check backend logs when submitting

## Security Notes

- Private key must be kept secure (never commit to git)
- Bot runs in Docker with no external dependencies except Mattermost
- Tokens are signed, not encrypted (payload is visible but tamper-proof)
- 7-day expiry limits window of token reuse
