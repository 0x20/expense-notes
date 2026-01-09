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

### 4. Create Admin User

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

### 5. Deploy

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
