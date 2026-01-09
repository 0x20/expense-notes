# Expense Notes Management System

A modern, full-stack expense note management system built with React and FastAPI.

## Features

- **User-Facing Form**: Submit expense notes with receipt photos and digital signatures
- **Admin Dashboard**: Review, approve/deny, and manage expense submissions
- **Email Notifications**:
  - Admin receives notification when new expense is submitted
  - User receives notification when their expense is approved/denied
- **Mobile-Optimized**: Responsive design with dark theme
- **Secure**: JWT-based admin authentication, file upload validation

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Python FastAPI
- **Database**: SQLite with SQLAlchemy ORM
- **Email**: SMTP (configurable)

## Design System

- Background: rgb(17, 24, 39)
- Card background: rgb(31, 41, 55)
- Accent: rgb(255, 173, 179)
- Borders: rgb(55, 65, 81)
- Modern, minimalistic, spacious design

## Quick Setup (Recommended)

Use the provided shell scripts for easy setup:

```bash
# Setup everything (backend + frontend)
./setup-all.sh

# Create admin user
cd backend && python setup.py

# Start both servers
./dev.sh
```

That's it! The app will be running at:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Manual Setup Instructions

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment and install dependencies with uv**:
   ```bash
   uv venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   uv pip install -r requirements.txt
   ```

4. **Configure environment**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:
   - `SECRET_KEY`: Generate with `python -c "import secrets; print(secrets.token_hex(32))"`
   - SMTP settings (optional, can configure later):
     - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`
     - `SMTP_FROM_EMAIL`, `ADMIN_EMAIL`

5. **Initialize database and create admin user**:
   ```bash
   python setup.py
   ```
   Follow the prompts to set an admin password.

6. **Start the backend server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at `http://localhost:8000`
   API documentation at `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` if your API URL differs from `http://localhost:8000`:
   ```
   VITE_API_URL=http://localhost:8000
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

## Usage

### User Submission Flow

1. Navigate to `http://localhost:5173`
2. Fill in the expense form:
   - Member name (required)
   - Description (required)
   - Amount in EUR (required)
   - Email (required)
   - Upload receipt photo (optional)
   - Draw digital signature (optional)
3. Submit the form
4. Admin receives email notification

### Admin Dashboard

1. Navigate to `http://localhost:5173/admin`
2. Enter admin password (set during setup)
3. View all expense submissions
4. Filter by status (all/pending/approved/denied)
5. Click on an expense to view details
6. Edit admin fields:
   - Change status (pending/approved/denied)
   - Mark as paid
   - Set expense type (GERA or other)
   - Set pay date
   - Set payed from (KBC/Cash/Bar/Other)
   - Set payed to
   - Set financial responsible
   - Add admin notes
7. Save changes
8. User receives email notification when status changes

## API Endpoints

### Public Endpoints
- `POST /api/expenses/` - Submit expense note
- `GET /api/expenses/{id}` - Get expense details

### Admin Endpoints (require Bearer token)
- `POST /api/admin/login` - Login
- `GET /api/admin/expenses` - List expenses (optional status filter)
- `GET /api/admin/expenses/{id}` - Get expense details
- `PATCH /api/admin/expenses/{id}` - Update expense
- `POST /api/admin/expenses/{id}/signature` - Upload financial signature
- `GET /api/admin/files/{type}/{filename}` - View uploaded files

## Email Configuration

To enable email notifications, configure the following in `backend/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Expense Notes System
ADMIN_EMAIL=admin@example.com
```

**For Gmail**: Use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password.

## File Uploads

- **Allowed formats**: JPG, JPEG, PNG, PDF
- **Max file size**: 10MB (configurable in `.env`)
- **Storage location**: `backend/uploads/`

## Security Features

- Admin password hashed with bcrypt
- JWT token-based authentication (expires after 8 hours)
- File upload validation (type and size)
- CORS restricted to frontend URL
- SQL injection prevention via ORM
- Input validation via Pydantic schemas

## Shell Scripts Reference

All scripts are executable and have built-in error checking.

### Root Directory Scripts

- **`./setup-all.sh`** - Setup both backend and frontend
- **`./dev.sh`** - Start both servers (backend + frontend)
- **`./start-backend.sh`** - Start backend only
- **`./start-frontend.sh`** - Start frontend only

### Backend Scripts (`backend/`)

- **`./setup.sh`** - Create venv, install dependencies, generate SECRET_KEY
- **`./start.sh`** - Start development server
- **`./create-admin.sh`** - Create/reset admin user

### Frontend Scripts (`frontend/`)

- **`./setup.sh`** - Install npm dependencies, create .env
- **`./start.sh`** - Start development server
- **`./build.sh`** - Build for production

## Development Workflows

### First Time Setup
```bash
./setup-all.sh
cd backend && python setup.py  # Create admin user
./dev.sh  # Start both servers
```

### Daily Development
```bash
./dev.sh  # Starts both backend and frontend
```

### Backend Only
```bash
./start-backend.sh
```

### Frontend Only
```bash
./start-frontend.sh
```

### Production Build
```bash
cd frontend
./build.sh
```

## Troubleshooting

### Backend Issues

**"ModuleNotFoundError"**: Ensure virtual environment is activated and dependencies are installed
```bash
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
uv pip install -r requirements.txt
```

**"SECRET_KEY not set"**: Generate and set SECRET_KEY in `.env`
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Frontend Issues

**"Failed to fetch"**: Ensure backend is running and VITE_API_URL is correct

**Missing dependencies**: Reinstall node modules
```bash
rm -rf node_modules package-lock.json
npm install
```

## Project Structure

```
expense-notes/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── config.py            # Configuration
│   │   ├── database.py          # Database setup
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── crud.py              # Database operations
│   │   ├── auth.py              # Authentication
│   │   ├── email_service.py     # Email notifications
│   │   └── routers/
│   │       ├── expenses.py      # Public API
│   │       └── admin.py         # Admin API
│   ├── setup.py                 # Admin creation script
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── App.jsx              # Main app
    │   ├── components/
    │   │   ├── ExpenseForm.jsx
    │   │   ├── SignatureCanvas.jsx
    │   │   ├── AdminLogin.jsx
    │   │   ├── AdminDashboard.jsx
    │   │   ├── ExpenseList.jsx
    │   │   ├── ExpenseDetails.jsx
    │   │   └── PhotoViewer.jsx
    │   └── services/
    │       └── api.js           # API client
    └── package.json
```

## License

Private project for 0x20
