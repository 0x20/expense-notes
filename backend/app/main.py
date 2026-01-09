from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .database import init_db
from .routers import expenses, admin
from .config import settings
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Expense Notes API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# Initialize database
@app.on_event("startup")
def startup_event():
    init_db()

# Include routers
app.include_router(expenses.router)
app.include_router(admin.router)

# NOTE: Public file serving removed for security
# Files now only accessible through admin-authenticated endpoints

@app.get("/")
def root():
    return {"message": "Expense Notes API", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
