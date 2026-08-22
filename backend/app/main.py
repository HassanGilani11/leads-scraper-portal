import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal, is_sqlite
from app.core.security import get_password_hash
import app.models  # Ensure models are registered with Base.metadata
from app.models.user import User
from app.api.endpoints import (
    scrapes_router,
    leads_router,
    settings_router,
    ws_router,
    audit_router,
    auth_router,
    schedules_router,
    campaigns_router,
    sequences_router
)

from app.services.websocket_manager import websocket_manager
from app.services.scheduler_service import scheduler_loop

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if not existing
    Base.metadata.create_all(bind=engine)
    
    # Auto-migrate schema columns across SQLite and PostgreSQL
    with engine.connect() as conn:
        if not is_sqlite:
            try:
                conn.execute(text("ALTER TABLE audit_reports ALTER COLUMN ssl_active TYPE VARCHAR(100);"))
                conn.execute(text("ALTER TABLE audit_reports ALTER COLUMN mobile_optimized TYPE VARCHAR(100);"))
                conn.execute(text("ALTER TABLE audit_reports ALTER COLUMN load_time_seconds TYPE VARCHAR(100);"))
                conn.execute(text("ALTER TABLE audit_reports ALTER COLUMN cms_platform TYPE VARCHAR(255);"))
                conn.commit()
            except Exception as mig_err:
                print(f"[DB MIGRATION] Schema check note: {mig_err}")

        for migration_sql in [
            "ALTER TABLE campaigns ADD COLUMN attach_pdf BOOLEAN DEFAULT 1;",
            "ALTER TABLE campaigns ADD COLUMN delay_min_seconds INTEGER DEFAULT 45;",
            "ALTER TABLE campaigns ADD COLUMN delay_max_seconds INTEGER DEFAULT 90;",
            "ALTER TABLE campaigns ADD COLUMN total_leads INTEGER DEFAULT 0;",
            "ALTER TABLE campaigns ADD COLUMN sent_count INTEGER DEFAULT 0;",
            "ALTER TABLE campaigns ADD COLUMN failed_count INTEGER DEFAULT 0;",
            "ALTER TABLE campaigns ADD COLUMN created_by VARCHAR(255);",
            "ALTER TABLE campaigns ADD COLUMN completed_at TIMESTAMP;",
            "ALTER TABLE email_logs ADD COLUMN campaign_id VARCHAR(36);",
            "ALTER TABLE email_logs ADD COLUMN attached_pdf BOOLEAN DEFAULT 0;",
        ]:
            try:
                conn.execute(text(migration_sql))
                conn.commit()
            except Exception:
                pass

    # Auto-seed and verify Super Admin credentials
    db = SessionLocal()
    try:
        admin_email = (settings.DEFAULT_ADMIN_EMAIL or "admin@leadpulse.local").strip().lower()
        admin_user = db.query(User).filter(User.email == admin_email).first()
        if not admin_user:
            admin_user = User(
                email=admin_email,
                full_name=settings.DEFAULT_ADMIN_NAME or "Super Admin",
                hashed_password=get_password_hash(settings.DEFAULT_ADMIN_PASSWORD),
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print(f"[AUTH] Initial Admin ready: {admin_email} / {settings.DEFAULT_ADMIN_PASSWORD}")
        else:
            admin_user.hashed_password = get_password_hash(settings.DEFAULT_ADMIN_PASSWORD)
            admin_user.is_active = True
            admin_user.role = "admin"
            db.commit()
            print(f"[AUTH] Super Admin verified: {admin_email}")
    except Exception as e:
        print(f"[AUTH] Warning ensuring admin user: {e}")
    finally:
        db.close()

    # Register active event loop for WebSocket thread-safe log dispatches
    loop = asyncio.get_running_loop()
    websocket_manager.set_event_loop(loop)

    # Start background scheduler periodic worker
    scheduler_task = asyncio.create_task(scheduler_loop())

    print("=" * 60)
    print(f"[SERVER] {settings.PROJECT_NAME} Backend Started Successfully")
    print(f"[SERVER] Database: {settings.DATABASE_URL}")
    print(f"[SERVER] Apollo API Key Configured: {'Yes' if settings.APOLLO_API_KEY else 'No'}")
    print("=" * 60)
    yield
    # Shutdown
    scheduler_task.cancel()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Australian Local Business Lead Scraper & Apollo Enrichment SaaS Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration supporting wildcard regex with credentials
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(scrapes_router, prefix=settings.API_V1_STR)
app.include_router(leads_router, prefix=settings.API_V1_STR)
app.include_router(settings_router, prefix=settings.API_V1_STR)
app.include_router(ws_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(schedules_router, prefix=settings.API_V1_STR)
app.include_router(campaigns_router, prefix=settings.API_V1_STR)
app.include_router(sequences_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "message": "Lead Scraper & Enrichment Portal API is running",
        "docs": "/docs",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
