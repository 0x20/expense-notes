# Deployment Guide

This guide covers deploying the Expense Notes system to production using Docker and Traefik.

## Prerequisites

- Docker and Docker Compose installed on your server
- Traefik reverse proxy running with:
  - Network named `traefik_public`
  - Entrypoint named `public`
  - Let's Encrypt certificate resolver named `letsencrypt`

## Quick Start

### 1. Clone Repository

```bash
git clone <your-repo-url> expense-notes
cd expense-notes
```

### 2. Configure Domain

Edit `docker-compose.yml` and replace `expenses.hackerspace.gent` with your domain in:
- Backend Traefik labels (line 13)
- Frontend Traefik labels (line 33)
- Frontend build args (line 28)

### 3. Configure Backend Environment

Copy the production environment template:

```bash
cp backend/.env.production backend/.env
```

Edit `backend/.env` and update:
- `SECRET_KEY`: Generate with `openssl rand -hex 32`
- `SMTP_PASSWORD`: Your email password
- `FRONTEND_URL`: Your production domain

### 4. Generate Ed25519 Keypair for Access Tokens

The system uses Ed25519 signed tokens to secure the public expense submission form.

```bash
cd hsg-bot
python -m services.tokens
```

This outputs:
- **Private key** - Add to `hsg-bot/.env` as `ACCESS_TOKEN_PRIVATE_KEY`
- **Public key** - Add to `backend/.env` as `ACCESS_TOKEN_PUBLIC_KEY`

### 5. Configure HSG Bot

```bash
cp hsg-bot/.env.example hsg-bot/.env
```

**Create bot account in Mattermost:**
1. System Console → Integrations → Bot Accounts → Add Bot Account
2. Username: `hsg-bot`
3. Display Name: `Hackerspace Gent Bot`
4. Copy the generated **bot token**

**Create slash command in Mattermost:**
1. Integrations → Slash Commands → Add Slash Command
2. Command Trigger Word: `expenses`
3. Request URL: `https://expenses.hackerspace.gent/bot/expenses`
4. Request Method: POST
5. Autocomplete: Enable, Hint: `[help]`
6. Copy the generated **slash token**

**Generate shared secret:**
```bash
openssl rand -hex 32
```

**Edit `hsg-bot/.env`:**
```env
ACCESS_TOKEN_PRIVATE_KEY=<private key from step 4>
MATTERMOST_SLASH_TOKEN=<slash token from above>
MATTERMOST_URL=https://mattermost.hackerspace.gent
MATTERMOST_TOKEN=<bot token from above>
NOTIFY_SECRET=<shared secret>
EXPENSE_URL=https://expenses.hackerspace.gent
```

**Edit `backend/.env` and add:**
```env
BOT_NOTIFY_URL=http://hsg-bot:5000/notify
BOT_NOTIFY_SECRET=<same shared secret>
```

Users can then use `/expenses` for a link or `/expenses help` for help.
When their expense status changes, they'll receive a DM from the bot.

### 6. Create Admin User

Before first deployment, you need to create the admin user. You can either:

**Option A: Create locally then copy database**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python setup.py  # Follow prompts to set admin password
# Database will be created at backend/data/expense_notes.db
```

**Option B: Create after deployment**
```bash
docker exec -it expense-notes-backend python setup.py
```

### 7. Deploy

Build and start the containers:

```bash
docker compose up -d --build
```

### 6. Verify Deployment

Check that services are running:

```bash
docker compose ps
docker compose logs -f
```

Visit your domain:
- Frontend: `https://expenses.hackerspace.gent`
- Backend API docs: `https://expenses.hackerspace.gent/docs`
- Bot health: `https://expenses.hackerspace.gent/bot/health`

**Test the bot:**
In Mattermost, type `/expenses` to get a private access link (only you see the response).

## Security Features

The system includes multiple security layers:

### 1. Token-Based Access Control
- Public expense form requires a signed Ed25519 token
- Tokens valid for 7 days from generation
- Distributed via Mattermost bot (prevents public spam/DDoS)
- In development mode (`ACCESS_TOKEN_REQUIRED=false`), tokens are optional

### 2. Rate Limiting
- Expense submissions: 10 per minute per IP
- Admin login: 5 attempts per minute per IP
- Prevents brute force attacks and spam

### 3. Removed Public Endpoints
- ~~`GET /api/expenses/{id}`~~ - Removed (was information disclosure risk)
- ~~`/uploads/` public mount~~ - Removed (files now admin-only)
- File access requires admin authentication

### 4. Security Headers
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - XSS protection

### 5. Restricted CORS
- Only allows specific HTTP methods (GET, POST, PATCH, DELETE)
- Only allows necessary headers (Content-Type, Authorization)
- Configured for production domain only

### 6. Input Validation
- File type verification (jpg, jpeg, png, pdf only)
- File size limits (10MB default)
- Email validation
- Amount validation (positive numbers only)

## File Structure

```
expense-notes/
├── backend/
│   ├── data/              # SQLite database (persisted)
│   ├── uploads/           # Uploaded files (persisted)
│   └── migrate.py         # Database migrations
├── frontend/
│   └── dist/              # Built static files (in container)
├── hsg-bot/
│   ├── commands/          # Slash command handlers
│   └── services/          # Mattermost API, token generation
└── docker-compose.yml
```

## Volumes

The following directories are persisted on the host:

- `./backend/data` - Contains the SQLite database
- `./backend/uploads` - Contains uploaded photos, signatures, and attachments

**Important:** Back up these directories regularly!

## Updating

### Update Application Code

```bash
git pull
docker compose up -d --build
docker exec -it expense-notes-backend python migrate.py  # Apply any schema changes
```

### Update Dependencies Only

```bash
docker compose build --no-cache
docker compose up -d
```

## Maintenance

### View Logs

```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f backend

# Frontend only
docker compose logs -f frontend
```

### Backup Database

```bash
# Create backup
tar -czf expense-notes-backup-$(date +%Y%m%d).tar.gz backend/data backend/uploads

# Restore from backup
tar -xzf expense-notes-backup-YYYYMMDD.tar.gz
```

### Reset Admin Password

```bash
docker exec -it expense-notes-backend python setup.py
```

### Access Database

```bash
# From host (if sqlite3 installed)
sqlite3 backend/data/expense_notes.db

# Or copy to host first
docker cp expense-notes-backend:/app/data/expense_notes.db ./expense_notes.db
sqlite3 ./expense_notes.db
```

### Run Migrations

After deploying schema changes, run:
```bash
docker exec -it expense-notes-backend python migrate.py
```

## Troubleshooting

### Backend not accessible

1. Check Traefik labels match your setup
2. Verify Traefik network exists: `docker network ls | grep traefik_public`
3. Check backend logs: `docker compose logs backend`

### Frontend shows connection errors

1. Verify `VITE_API_URL` build arg in `docker-compose.yml` matches your domain
2. Rebuild frontend: `docker compose up -d --build frontend`

### Database permission errors

```bash
# Fix permissions
sudo chown -R 1000:1000 backend/data backend/uploads
```

### Email notifications not working

1. Verify SMTP settings in `backend/.env`
2. Check backend logs for SMTP errors
3. Test with a pending → paid status change

## Security Notes

- Never commit `backend/.env` to git (already in `.gitignore`)
- Use a strong, random `SECRET_KEY`
- Keep `backend/.env` readable only by owner: `chmod 600 backend/.env`
- Regularly update Docker images for security patches
- Consider setting up automated database backups

## Customization

### Change Domain

1. Update `docker-compose.yml`:
   - Backend: `traefik.http.routers.expense-backend.rule`
   - Frontend: `traefik.http.routers.expense-frontend.rule`
   - Frontend build arg: `VITE_API_URL`
2. Update `backend/.env`: `FRONTEND_URL`
3. Rebuild: `docker compose up -d --build`

### Change Ports (for development without Traefik)

Comment out all Traefik labels and add port mappings:

```yaml
services:
  backend:
    # ... (comment out labels)
    ports:
      - "8000:8000"

  frontend:
    # ... (comment out labels)
    ports:
      - "80:80"
```

## Production Checklist

- [ ] Domain DNS points to server
- [ ] Traefik is running with correct configuration
- [ ] `backend/.env` is configured with production values
- [ ] SECRET_KEY is randomly generated
- [ ] Admin user created with strong password
- [ ] SMTP credentials are correct
- [ ] Database and uploads directories have correct permissions
- [ ] Backups are scheduled
- [ ] SSL certificates are working (Traefik/Let's Encrypt)
