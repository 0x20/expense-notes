# HSG Bot

Hackerspace Gent Mattermost bot. Modular design for adding new commands.

## Commands

| Command | Description |
|---------|-------------|
| `/expenses` | Get a personal expense submission link (valid 7 days) |
| `/expenses help` | Show help for expense command |

## Architecture

```
hsg-bot/
├── main.py              # FastAPI app, routes slash commands
├── commands/
│   ├── expenses.py      # /expenses command handler
│   └── ...              # Add new commands here
├── services/
│   ├── mattermost.py    # Mattermost API (DMs, user lookup)
│   └── tokens.py        # Ed25519 token generation
├── Dockerfile
└── requirements.txt
```

## Setup

### 1. Generate Ed25519 Keypair

```bash
python -m services.tokens
```

### 2. Create Bot Account

1. Mattermost → System Console → Integrations → Bot Accounts
2. Add Bot Account:
   - Username: `hsg-bot`
   - Display Name: `Hackerspace Gent Bot`
3. Copy the token

### 3. Create Slash Command

1. Mattermost → Integrations → Slash Commands
2. Add Slash Command:
   - Trigger Word: `expenses`
   - Request URL: `https://expenses.hackerspace.gent/bot/expenses`
   - Request Method: POST
3. Copy the token

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
ACCESS_TOKEN_PRIVATE_KEY=<from step 1>
MATTERMOST_SLASH_TOKEN=<from step 3>
MATTERMOST_URL=https://mattermost.hackerspace.gent
MATTERMOST_TOKEN=<from step 2>
NOTIFY_SECRET=<generate with: openssl rand -hex 32>
EXPENSE_URL=https://expenses.hackerspace.gent
```

### 5. Run

**Development:**
```bash
pip install -r requirements.txt
python main.py
```

**Production:**
```bash
docker compose up -d --build hsg-bot
```

## Adding New Commands

1. Create `commands/yourcommand.py`:

```python
def handle_yourcommand(username: str, args: str) -> dict:
    return {
        'response_type': 'ephemeral',  # or 'in_channel'
        'text': 'Your response here'
    }
```

2. Add route in `main.py`:

```python
from commands.yourcommand import handle_yourcommand

@app.post("/yourcommand")
async def slash_yourcommand(request: Request):
    form = await request.form()
    # ... verify token ...
    response = handle_yourcommand(form.get('user_name'), form.get('text'))
    return JSONResponse(response)
```

3. Create slash command in Mattermost pointing to `/bot/yourcommand`

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/expenses` | POST | Slash command: expense link |
| `/notify` | POST | Backend calls this to DM users |
| `/health` | GET | Health check |

## Notifications

Backend can send DMs to users via POST `/notify`:

```json
{
  "secret": "<NOTIFY_SECRET>",
  "username": "mattermost_username",
  "message": "Your message here"
}
```

Or for expense status updates:

```json
{
  "secret": "<NOTIFY_SECRET>",
  "username": "mattermost_username",
  "type": "expense_status",
  "status": "paid",
  "amount": 50.0,
  "description": "Office supplies"
}
```
