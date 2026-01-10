# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack expense note management system where club members submit expense claims with receipts, and admins review and process them. Built with React + Vite frontend and FastAPI + SQLite backend.

## Development Commands

### Quick Start (First Time)
```bash
./setup-all.sh              # Setup backend + frontend
cd backend && python setup.py  # Create admin user (prompts for password)
./dev.sh                    # Start both servers
```

### Daily Development
```bash
./dev.sh                    # Start both backend (8000) and frontend (5173)
```

### Individual Services
```bash
./start-backend.sh          # Backend only on :8000
./start-frontend.sh         # Frontend only on :5173
```

### Backend (from backend/)
```bash
source .venv/bin/activate   # Activate venv
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
python setup.py             # Create/reset admin user
```

### Frontend (from frontend/)
```bash
npm run dev                 # Development server
npm run build               # Production build
```

### Database Operations
The database auto-initializes on first run. To manually recreate:
```bash
cd backend
rm -rf data/expense_notes.db
python -c "from app.database import init_db; init_db()"
python setup.py  # Recreate admin
```

### Database Migrations
Schema changes require running migrations after deployment:
```bash
# Locally
cd backend && python migrate.py

# In Docker
docker exec -it expense-notes-backend python migrate.py
```
Add new migrations to `backend/migrate.py`. The script is idempotent (safe to run multiple times).

## Architecture

### Key Design Patterns

**Status Flow**: Expenses follow `pending` → `paid`/`denied` lifecycle. Status change triggers email notification to submitter.

**Soft Deletes**: Expenses marked as `deleted=True` (not removed from DB). Accessible via "deleted" filter, restorable by admins.

**File Storage**: All uploads go to `backend/uploads/{photos,signatures,attachments}/` with timestamp-prefixed filenames. Paths stored comma-separated in DB text fields (`photo_paths`, `attachment_paths`).

**Authentication**: Single admin user with bcrypt-hashed password. JWT tokens (8hr expiry) stored in localStorage, added to requests via axios interceptor in `frontend/src/services/api.js`.

### Data Model

**ExpenseNote** (main entity):
- User fields: `member_name`, `member_email`, `description`, `amount`, `date_entered`, `photo_paths`, `signature_path`, `mattermost_username`
- Admin fields: `status`, `pay_date`, `paid_from`, `paid_to`, `financial_responsible`, `admin_notes`, `attachment_paths`
- System fields: `id` (UUID), `created_at`, `updated_at`, `deleted`

**Deprecated fields still in models.py**: `paid`, `expense_type`, `signature_financial_path` (no longer used in UI/API but exist in schema)

### HSG Bot (hsg-bot/)

Mattermost bot for secure expense link generation and notifications:
- `/expenses` slash command returns ephemeral link with signed Ed25519 token
- Backend calls `/notify` endpoint to DM users on status changes
- Modular structure: `commands/` for handlers, `services/` for Mattermost API and token generation

### Frontend Architecture

**Component Hierarchy**:
- `App.jsx` → routes to `ExpenseForm` (public) or `AdminLogin`/`AdminDashboard` (admin)
- `AdminDashboard` → contains `ExpenseList` (1/3 width) + `ExpenseDetails` (2/3 width)
- `ExpenseDetails` → contains `PhotoGallery` for viewing/deleting photos

**State Management**: No global state. Admin dashboard holds selected expense and passes via props. List/detail sync managed through callbacks (`onUpdate` triggers list refresh).

**Auto-upload Pattern**: File selection immediately uploads (no separate upload button). Used in `ExpenseDetails` for adding receipt photos.

**Edit Mode Logic**: Expenses with status != "pending" are locked by default. "Edit" button toggles edit mode for locked expenses. Deleted expenses show standalone "Restore" button outside edit form.

### API Structure

**Public routes** (`/api/expenses/`):
- POST `/` - Submit expense (multipart with photos/signature)

**Admin routes** (`/api/admin/`, requires Bearer token):
- POST `/login` - Get JWT token
- GET `/expenses?status={filter}` - List expenses (filters: all/pending/paid/denied/deleted)
- PATCH `/expenses/{id}` - Update expense (triggers email if status changes)
- POST `/expenses/{id}/attachments` - Upload admin files
- DELETE `/expenses/{id}/photos/{filename}` - Delete specific photo
- DELETE `/expenses/{id}` - Soft delete (sets deleted=True)
- POST `/expenses/{id}/restore` - Restore deleted expense

**File serving**: `/uploads/{photos,signatures,attachments}/{filename}` - Public read access (no auth)

### Design System (Strictly Followed)

**Colors**:
- Background: `rgb(17, 24, 39)`
- Card/elevated: `rgb(31, 41, 55)`
- Accent (primary): `rgb(255, 173, 179)` - used for borders, buttons, highlights
- Text primary: `rgb(243, 244, 246)`
- Text secondary: `rgb(156, 163, 175)`
- Borders: `rgb(55, 65, 81)` (neutral), `rgb(30, 35, 43)` (muted for unselected items)

**Button Styling**: Outlined (1px border), transparent background, default text color. Status-specific colors: green for paid, red for denied, blue for save.

**List Selection**: Unselected items have dark muted background (`rgb(24, 30, 40)`) with nearly invisible border. Selected items brighten to card color with accent border.

**Photo Gallery**: Grid layout (200px min, 4:3 aspect). Hover shows delete button (× in accent color circle). Click opens lightbox for images. PDFs show with dashed accent border, document icon, "PDF Document" label, and filename - click opens in new tab. During upload, shows animated "Uploading..." tile.

## Important Conventions

### File Path Handling

**Path normalization critical**: Frontend may send paths like `photos/photos/file.jpg` (duplicate prefix). Backend normalizes before DB operations:
```python
normalized = filename.replace('photos/photos/', 'photos/')
```

**Comma-separated storage**: Multiple files stored as `"path1,path2,path3"` in TEXT columns. Split/filter/rejoin when modifying.

**Photo deletion logic** (backend/app/routers/admin.py:120-176):
1. Normalize filename to remove duplicate prefixes
2. Check photo_paths, split by comma, filter out matching path
3. If not found, check attachment_paths similarly
4. Set field to None if empty string after removal (not empty string)

### Import Patterns

**jsPDF v4 requires named import**:
```javascript
import { jsPDF } from 'jspdf';  // NOT: import jsPDF from 'jspdf'
```

**Don't inline imports**: Always import at file top (per user preference in ~/.claude/CLAUDE.md)

### Date Handling

**Pay date format**: Display as `yyyy/MM/dd` for easy keyboard editing (using react-datepicker). Stored as ISO datetime in DB.

**Date filtering**: PDF export filters by date_entered range. Creates one page per expense with full details and embedded images.

**PDF Export Architecture**: Uses pdf-lib (not jsPDF) to generate detailed reports. Each expense gets own page(s) with:
- Member info and description
- Admin fields (status, payment details, notes)
- Receipt photos embedded maintaining aspect ratio
- PDF attachments: all pages copied into export (merged seamlessly)

### Email Notifications

Configured via SMTP settings in backend/.env (optional). Triggered on:
- New submission → admin receives notification
- Status change → submitter receives notification

Email service in `backend/app/email_service.py` uses aiosmtplib. Fails silently if SMTP not configured.

## Common Pitfalls

1. **Modal z-index issues**: Date pickers need `z-index: 9999` to appear above modals (1000). Set in global CSS.

2. **Selected expense disappears after update**: When updating an expense (e.g., restore from deleted), it may no longer match current filter. Solution: `loadExpenses()` auto-selects first available expense if current selection not in new list.

3. **Empty string vs None in DB**: When removing last item from comma-separated field, set to `None` (not `""`). Empty string causes UI issues.

4. **PDF export**: jsPDF import must be named. Dialog needs `e.stopPropagation()` on content div to prevent closing when interacting with date pickers.

5. **File upload accepts**: Both images and PDFs. Backend validates against `ALLOWED_EXTENSIONS` config (default: jpg,jpeg,png,pdf).

## File Organization

**Backend critical files**:
- `app/main.py` - FastAPI app setup, CORS, static file mounting
- `app/routers/admin.py` - All admin endpoints, photo deletion logic
- `app/routers/expenses.py` - Public submission endpoint, file upload helper
- `app/crud.py` - Database queries with soft delete filtering
- `app/models.py` - SQLAlchemy schemas (note: has deprecated fields)
- `app/auth.py` - JWT token creation/validation, password hashing

**Frontend critical files**:
- `src/components/AdminDashboard.jsx` - Main admin view, handles PDF export
- `src/components/ExpenseDetails.jsx` - Edit form, file upload, delete/restore
- `src/components/PhotoGallery.jsx` - Photo display, deletion, lightbox, PDF preview
- `src/components/ExpenseList.jsx` - Expense cards with selection styling
- `src/services/api.js` - Axios client with auth interceptor, all API methods
- `src/index.css` - Dark theme for react-datepicker, global styles

**Database location**: `backend/data/expense_notes.db` (SQLite)

**Uploads directory**: `backend/uploads/{photos,signatures,attachments}/`

## Testing Notes

No automated tests exist. Manual testing workflow:
1. Submit expense via public form
2. Login to admin dashboard
3. Verify expense appears, details display correctly
4. Test status changes, file uploads, photo deletion
5. Test soft delete → deleted filter → restore
6. Test PDF export with date range
