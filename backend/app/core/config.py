import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Base backend directory
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BACKEND_DIR / ".env"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Lead Scraper & Enrichment Portal"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = f"sqlite:///{BACKEND_DIR}/leads.db"
    APOLLO_API_KEY: str = ""
    JWT_SECRET_KEY: str = "leadpulse-secret-key-super-secure-change-in-prod-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DEFAULT_ADMIN_EMAIL: str = "admin@leadpulse.local"
    DEFAULT_ADMIN_PASSWORD: str = "Admin@LeadPulse2026!"
    DEFAULT_ADMIN_NAME: str = "Super Admin"
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "*"
    ]

    # Email Outreach Provider Settings (SMTP or GRAPH)
    EMAIL_PROVIDER: str = "GRAPH"  # "GRAPH" or "SMTP"
    SMTP_HOST: str = "smtp.office365.com"
    SMTP_PORT: int = 587
    SMTP_ENCRYPTION: str = "STARTTLS"
    SMTP_USERNAME: str = "sales@syntexdev.com"
    SMTP_PASSWORD: str = ""
    SENDER_EMAIL: str = "dev@syntexdev.com"
    SENDER_NAME: str = "SyntexDev Dev"

    # Microsoft Graph API OAuth2 (For M365 tenants with Security Defaults)
    AZURE_TENANT_ID: str = ""
    AZURE_CLIENT_ID: str = ""
    AZURE_CLIENT_SECRET: str = ""

    class Config:
        env_file = str(ENV_PATH)
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()

def update_env_variable(key: str, value: str):
    """Update or append an environment variable in backend/.env file and runtime settings."""
    env_dict = {}
    if ENV_PATH.exists():
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env_dict[k.strip()] = v.strip()
    
    env_dict[key] = value
    with open(ENV_PATH, "w", encoding="utf-8") as f:
        for k, v in env_dict.items():
            f.write(f"{k}={v}\n")
            
    os.environ[key] = value
    if hasattr(settings, key):
        if key == "SMTP_PORT":
            try:
                setattr(settings, key, int(value))
            except ValueError:
                pass
        else:
            setattr(settings, key, value)

