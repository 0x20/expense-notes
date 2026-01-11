from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import Optional
import sys

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./data/expense_notes.db"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: str = "Expense Notes System"
    ADMIN_EMAIL: Optional[str] = None
    ADMIN_PASSWORD: str  # Required: admin login password

    MAX_FILE_SIZE: int = 10485760  # 10MB
    UPLOAD_DIR: str = "./uploads"
    ALLOWED_EXTENSIONS: str = "jpg,jpeg,png,pdf"

    FRONTEND_URL: str = "http://localhost:3000"

    # Public access token verification (Ed25519) - REQUIRED
    ACCESS_TOKEN_PUBLIC_KEY: str  # Base64-encoded Ed25519 public key
    ACCESS_TOKEN_REQUIRED: bool = True  # Default to secure

    # Bot notification settings - REQUIRED for DMs
    BOT_NOTIFY_URL: str  # e.g., http://hsg-bot:5000/notify
    BOT_NOTIFY_SECRET: str  # Shared secret with bot

    @model_validator(mode='after')
    def validate_required_settings(self):
        missing = []
        if not self.ACCESS_TOKEN_PUBLIC_KEY:
            missing.append('ACCESS_TOKEN_PUBLIC_KEY')
        if not self.BOT_NOTIFY_URL:
            missing.append('BOT_NOTIFY_URL')
        if not self.BOT_NOTIFY_SECRET:
            missing.append('BOT_NOTIFY_SECRET')
        if not self.ADMIN_PASSWORD:
            missing.append('ADMIN_PASSWORD')
        if missing:
            print(f"FATAL: Missing required environment variables: {', '.join(missing)}", file=sys.stderr)
            print("Add these to backend/.env", file=sys.stderr)
            sys.exit(1)
        return self

    class Config:
        env_file = ".env"

settings = Settings()
