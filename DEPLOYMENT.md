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
cd bot
python3 token_generator.py
```

This outputs:
- **Private key** - Add to `bot/.env` as `ACCESS_TOKEN_PRIVATE_KEY`
- **Public key** - Add to `backend/.env` as `ACCESS_TOKEN_PUBLIC_KEY`

### 5. Configure Mattermost Bot

Create `bot/.env`:

```bash
cp bot/.env.example bot/.env
```

Edit `bot/.env` and set:
- `MATTERMOST_URL`: Your Mattermost server URL
- `MATTERMOST_TOKEN`: Bot token (create bot account in Mattermost first)
- `BOT_USERNAME`: `expense-bot` (or your chosen name)
- `ACCESS_TOKEN_PRIVATE_KEY`: Private key from step 4
- `EXPENSE_URL`: Your production domain

**Create bot account in Mattermost:**
1. System Console → Integrations → Bot Accounts → Add Bot Account
2. Username: `expense-bot`
3. Copy the generated token to `bot/.env`

**Create outgoing webhook:**
1. Integrations → Outgoing Webhooks → Add Outgoing Webhook
2. Trigger Words: `!expenses`, `!help`
3. Callback URL: `https://expenses.hackerspace.gent/bot/webhook`

See `bot/README.md` for detailed setup instructions.

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
- Bot webhook: `https://expenses.hackerspace.gent/bot/webhook`

**Test the bot:**
In Mattermost, send `!expenses` to get an access link.

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
│   └── uploads/           # Uploaded files (persisted)
├── frontend/
│   └── dist/             # Built static files (in container)
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
docker exec -it expense-notes-backend sqlite3 data/expense_notes.db
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
