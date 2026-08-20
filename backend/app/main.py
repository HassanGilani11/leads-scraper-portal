import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.security import get_password_hash
import app.models  # Ensure models are registered with Base.metadata
from app.api.endpoints import (
    scrapes_router,
    leads_router,
    settings_router,
    ws_router,
    audit_router,
    auth_router,
    schedules_router
)
from app.services.websocket_manager import websocket_manager
from app.services.scheduler_service import scheduler_loop

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if not existing
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed default Super Admin if no users exist
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            admin_email = settings.DEFAULT_ADMIN_EMAIL.strip().lower()
            admin_user = User(
                email=admin_email,
                full_name=settings.DEFAULT_ADMIN_NAME,
                hashed_password=get_password_hash(settings.DEFAULT_ADMIN_PASSWORD),
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print(f"[AUTH] Initial Admin ready: {admin_email} / {settings.DEFAULT_ADMIN_PASSWORD}")
    except Exception as e:
        print(f"[AUTH] Warning seeding admin user: {e}")
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

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
