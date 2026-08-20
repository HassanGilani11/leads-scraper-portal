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
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "*"
    ]

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
            
    if key == "APOLLO_API_KEY":
        settings.APOLLO_API_KEY = value
        os.environ["APOLLO_API_KEY"] = value
