# Expense Notes

Expense claim system for 0x20 hackerspace. Members submit expenses via Mattermost, admins review and process payments.

## Features

- **Mattermost Integration**: `/expenses` command generates secure submission link
- **Expense Submission**: Upload receipts (images/PDFs), add description, sign digitally
- **Admin Dashboard**: Review, approve/deny, track payments
- **PDF Export**: Generate reports with cover page, summaries, and embedded attachments
- **Email Notifications**: Notify admins on submission, notify members on status change
- **Dark Theme**: Modern, mobile-friendly interface

## Quick Start

```bash
# 1. Setup
./setup-all.sh

# 2. Configure backend/.env (required vars)
ADMIN_PASSWORD=your-secure-password
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
ACCESS_TOKEN_PUBLIC_KEY=<from-hsg-bot>
BOT_NOTIFY_URL=http://localhost:5000/notify
BOT_NOTIFY_SECRET=shared-secret

# 3. Run
./dev.sh
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Architecture

```
┌─────────────┐     /expenses      ┌─────────────┐
│  Mattermost │◄──────────────────►│   HSG Bot   │
└─────────────┘                    └──────┬──────┘
                                          │ signed token
                                          ▼
┌─────────────┐                    ┌─────────────┐
│   Frontend  │◄──────────────────►│   Backend   │
│  (React)    │      REST API      │  (FastAPI)  │
└─────────────┘                    └──────┬──────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │   SQLite    │
                                   └─────────────┘
```

## Configuration

### Required Environment Variables (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `ADMIN_PASSWORD` | Password for admin login |
| `SECRET_KEY` | JWT signing key (use `python3 -c "import secrets; print(secrets.token_hex(32))"`) |
| `ACCESS_TOKEN_PUBLIC_KEY` | Ed25519 public key for verifying Mattermost tokens |
| `BOT_NOTIFY_URL` | HSG bot endpoint for DM notifications |
| `BOT_NOTIFY_SECRET` | Shared secret with HSG bot |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_HOST` | - | SMTP server for email notifications |
| `SMTP_PORT` | 587 | SMTP port |
| `SMTP_USER` | - | SMTP username |
| `SMTP_PASSWORD` | - | SMTP password |
| `SMTP_FROM_EMAIL` | - | Sender email address |
| `ADMIN_EMAIL` | - | Admin notification recipient |
| `FRONTEND_URL` | http://localhost:3000 | Frontend URL for CORS |
| `MAX_FILE_SIZE` | 10485760 | Max upload size (10MB) |
| `ACCESS_TOKEN_REQUIRED` | true | Require signed token for submissions |

## Usage

### For Members

1. Type `/expenses` in Mattermost
2. Click the private link (valid for your user only)
3. Fill in expense details, upload receipt photos
4. Sign and submit
5. Receive DM when expense is processed

### For Admins

1. Go to `/admin` and login with `ADMIN_PASSWORD`
2. Review pending expenses
3. Update status (pending → paid/denied)
4. Fill payment details (pay date, paid from/to, responsible)
5. Export PDF reports by date range

## API Endpoints

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/expenses/` | Submit expense (requires valid token) |
| GET | `/api/expenses/view/{token}` | View expense by view token |
| GET | `/api/expenses/view/{token}/photo/{file}` | Get photo by view token |

### Admin (Bearer auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Get JWT token |
| GET | `/api/admin/expenses` | List expenses (filter: `?status=pending\|paid\|denied\|deleted`) |
| PATCH | `/api/admin/expenses/{id}` | Update expense |
| DELETE | `/api/admin/expenses/{id}` | Soft delete |
| POST | `/api/admin/expenses/{id}/restore` | Restore deleted |
| POST | `/api/admin/expenses/{id}/attachments` | Upload admin attachments |
| DELETE | `/api/admin/expenses/{id}/photos/{file}` | Delete photo |
| GET | `/api/admin/files/{type}/{file}` | Serve uploaded file |

## Docker Deployment

```bash
docker compose up -d --build
```

Expects `backend/.env` and `hsg-bot/.env` to be configured. Uses Traefik for routing.

## Development

```bash
# Both services
./dev.sh

# Individual
./start-backend.sh   # Backend on :8000
./start-frontend.sh  # Frontend on :5173

# Database reset
cd backend
rm -rf data/expense_notes.db
python -c "from app.database import init_db; init_db()"
```

## Tech Stack

- **Frontend**: React 18, Vite, pdf-lib, react-datepicker
- **Backend**: FastAPI, SQLAlchemy, python-jose
- **Bot**: Flask, Ed25519 signing
- **Database**: SQLite

## Project Structure

```
expense-notes/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app
│   │   ├── config.py         # Settings from env
│   │   ├── database.py       # SQLAlchemy setup
│   │   ├── models.py         # DB models
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── crud.py           # DB operations
│   │   ├── auth.py           # JWT auth
│   │   ├── email_service.py  # SMTP notifications
│   │   ├── bot_notification.py
│   │   └── routers/
│   │       ├── expenses.py   # Public API
│   │       └── admin.py      # Admin API
│   ├── uploads/              # File storage
│   └── data/                 # SQLite DB
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ExpenseForm.jsx
│       │   ├── AdminDashboard.jsx  # Includes PDF export
│       │   ├── ExpenseList.jsx
│       │   ├── ExpenseDetails.jsx
│       │   └── PhotoGallery.jsx
│       └── services/api.js
├── hsg-bot/
│   ├── app.py                # Flask bot
│   ├── commands/             # Slash command handlers
│   └── services/             # Mattermost API, token signing
├── docker-compose.yml
└── CLAUDE.md                 # AI assistant context
```
