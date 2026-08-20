from app.api.endpoints.scrapes import router as scrapes_router
from app.api.endpoints.leads import router as leads_router
from app.api.endpoints.settings import router as settings_router
from app.api.endpoints.ws import router as ws_router
from app.api.endpoints.audit import router as audit_router

__all__ = ["scrapes_router", "leads_router", "settings_router", "ws_router", "audit_router"]
