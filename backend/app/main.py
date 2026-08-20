import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
import app.models  # Ensure models are registered with Base.metadata
from app.api.endpoints import scrapes_router, leads_router, settings_router, ws_router, audit_router
from app.services.websocket_manager import websocket_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if not existing
    Base.metadata.create_all(bind=engine)
    # Register active event loop for WebSocket thread-safe log dispatches
    loop = asyncio.get_running_loop()
    websocket_manager.set_event_loop(loop)
    print("=" * 60)
    print(f"🚀 {settings.PROJECT_NAME} Backend Started Successfully")
    print(f"📁 Database: {settings.DATABASE_URL}")
    print(f"🔑 Apollo API Key Configured: {'Yes' if settings.APOLLO_API_KEY else 'No'}")
    print("=" * 60)
    yield
    # Shutdown

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
app.include_router(scrapes_router, prefix=settings.API_V1_STR)
app.include_router(leads_router, prefix=settings.API_V1_STR)
app.include_router(settings_router, prefix=settings.API_V1_STR)
app.include_router(ws_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)

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
