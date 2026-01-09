from pydantic_settings import BaseSettings
from typing import Optional

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

    MAX_FILE_SIZE: int = 10485760  # 10MB
    UPLOAD_DIR: str = "./uploads"
    ALLOWED_EXTENSIONS: str = "jpg,jpeg,png,pdf"

    FRONTEND_URL: str = "http://localhost:3000"

    # Public access token verification (Ed25519)
    ACCESS_TOKEN_PUBLIC_KEY: Optional[str] = None  # Base64-encoded Ed25519 public key
    ACCESS_TOKEN_REQUIRED: bool = False  # Set True in production

    class Config:
        env_file = ".env"

settings = Settings()
