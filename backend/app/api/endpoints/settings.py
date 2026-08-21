import requests
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import settings, update_env_variable
from app.core.database import get_db
from app.models.job import Job
from app.models.lead import Lead
from app.models.user import User
from app.schemas.settings import SettingsResponse, UpdateSettingsRequest, StatsSummaryResponse
from app.api.deps import get_current_active_user, require_admin

router = APIRouter(prefix="/settings", tags=["Settings"])

def mask_api_key(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 6:
        return "***"
    return key[:3] + "*" * (len(key) - 6) + key[-3:]

def check_apollo_quota(api_key: str) -> dict:
    if not api_key:
        return {"hourly_left": None, "hourly_limit": None, "status": "Not configured"}
    try:
        url = "https://api.apollo.io/v1/organizations/enrich"
        res = requests.get(url, params={"domain": "google.com"}, headers={"X-Api-Key": api_key}, timeout=4)
        hourly_left = res.headers.get("x-hourly-requests-left")
        hourly_limit = res.headers.get("x-rate-limit-hourly")
        
        if res.status_code == 429:
            return {
                "hourly_left": 0,
                "hourly_limit": int(hourly_limit) if hourly_limit else 200,
                "status": "Rate Limited (200 requests/hour limit reached)"
            }
        elif res.status_code in [200, 404]:
            return {
                "hourly_left": int(hourly_left) if hourly_left else None,
                "hourly_limit": int(hourly_limit) if hourly_limit else 200,
                "status": f"Active ({hourly_left}/{hourly_limit} hourly calls available)" if hourly_left else "Active"
            }
        elif res.status_code == 401:
            return {"hourly_left": None, "hourly_limit": None, "status": "Invalid API Key"}
    except Exception:
        pass
    return {"hourly_left": None, "hourly_limit": None, "status": "Ready"}

@router.get("/", response_model=SettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current configuration status, masked API keys, system diagnostics, and live Apollo quota.
    """
    key = settings.APOLLO_API_KEY
    total_jobs = db.query(Job).count()
    total_leads = db.query(Lead).count()

    quota_info = check_apollo_quota(key)

    return {
        "apollo_api_key_set": bool(key),
        "apollo_api_key_masked": mask_api_key(key),
        "database_url": "SQLite (local leads.db)",
        "playwright_ready": True,
        "total_jobs": total_jobs,
        "total_leads": total_leads,
        "apollo_hourly_requests_left": quota_info["hourly_left"],
        "apollo_hourly_limit": quota_info["hourly_limit"],
        "apollo_rate_limit_status": quota_info["status"],
        "smtp_host": settings.SMTP_HOST,
        "smtp_port": settings.SMTP_PORT,
        "smtp_encryption": settings.SMTP_ENCRYPTION,
        "smtp_username": settings.SMTP_USERNAME,
        "smtp_password_set": bool(settings.SMTP_PASSWORD),
        "sender_email": settings.SENDER_EMAIL,
        "sender_name": settings.SENDER_NAME,
        "email_provider": settings.EMAIL_PROVIDER,
        "azure_tenant_id": settings.AZURE_TENANT_ID,
        "azure_client_id": settings.AZURE_CLIENT_ID,
        "azure_client_secret_set": bool(settings.AZURE_CLIENT_SECRET),
    }

@router.post("/", response_model=SettingsResponse)
def update_settings(
    payload: UpdateSettingsRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Update Apollo API key, SMTP settings, and Microsoft Graph OAuth settings (Admin only).
    """
    if payload.apollo_api_key is not None:
        update_env_variable("APOLLO_API_KEY", payload.apollo_api_key.strip())
    if payload.email_provider is not None:
        update_env_variable("EMAIL_PROVIDER", payload.email_provider.strip())
    if payload.smtp_host is not None:
        update_env_variable("SMTP_HOST", payload.smtp_host.strip())
    if payload.smtp_port is not None:
        update_env_variable("SMTP_PORT", str(payload.smtp_port))
    if payload.smtp_encryption is not None:
        update_env_variable("SMTP_ENCRYPTION", payload.smtp_encryption.strip())
    if payload.smtp_username is not None:
        update_env_variable("SMTP_USERNAME", payload.smtp_username.strip())
    if payload.smtp_password is not None and payload.smtp_password.strip():
        update_env_variable("SMTP_PASSWORD", payload.smtp_password.strip())
    if payload.sender_email is not None:
        update_env_variable("SENDER_EMAIL", payload.sender_email.strip())
    if payload.sender_name is not None:
        update_env_variable("SENDER_NAME", payload.sender_name.strip())
    if payload.azure_tenant_id is not None:
        update_env_variable("AZURE_TENANT_ID", payload.azure_tenant_id.strip())
    if payload.azure_client_id is not None:
        update_env_variable("AZURE_CLIENT_ID", payload.azure_client_id.strip())
    if payload.azure_client_secret is not None and payload.azure_client_secret.strip():
        update_env_variable("AZURE_CLIENT_SECRET", payload.azure_client_secret.strip())
    
    total_jobs = db.query(Job).count()
    total_leads = db.query(Lead).count()
    quota_info = check_apollo_quota(settings.APOLLO_API_KEY)

    return {
        "apollo_api_key_set": bool(settings.APOLLO_API_KEY),
        "apollo_api_key_masked": mask_api_key(settings.APOLLO_API_KEY),
        "database_url": "SQLite (local leads.db)",
        "playwright_ready": True,
        "total_jobs": total_jobs,
        "total_leads": total_leads,
        "apollo_hourly_requests_left": quota_info["hourly_left"],
        "apollo_hourly_limit": quota_info["hourly_limit"],
        "apollo_rate_limit_status": quota_info["status"],
        "smtp_host": settings.SMTP_HOST,
        "smtp_port": settings.SMTP_PORT,
        "smtp_encryption": settings.SMTP_ENCRYPTION,
        "smtp_username": settings.SMTP_USERNAME,
        "smtp_password_set": bool(settings.SMTP_PASSWORD),
        "sender_email": settings.SENDER_EMAIL,
        "sender_name": settings.SENDER_NAME,
        "email_provider": settings.EMAIL_PROVIDER,
        "azure_tenant_id": settings.AZURE_TENANT_ID,
        "azure_client_id": settings.AZURE_CLIENT_ID,
        "azure_client_secret_set": bool(settings.AZURE_CLIENT_SECRET),
    }


@router.get("/stats", response_model=StatsSummaryResponse)
def get_stats_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get high-level dashboard aggregate analytics across all jobs and leads.
    """
    total_leads = db.query(Lead).count()
    total_jobs = db.query(Job).count()
    completed_jobs = db.query(Job).filter(Job.status == "completed").count()
    running_jobs = db.query(Job).filter(Job.status == "running").count()
    failed_jobs = db.query(Job).filter(Job.status == "failed").count()

    leads_with_email = db.query(Lead).filter(
        (Lead.email != "") | (Lead.business_email != "")
    ).count()

    leads_with_phone = db.query(Lead).filter(
        (Lead.phone_number != "") | (Lead.office_contact != "")
    ).count()

    leads_with_linkedin = db.query(Lead).filter(
        Lead.linkedin_url != ""
    ).count()

    leads_with_company_info = db.query(Lead).filter(
        (Lead.company_description != "") | (Lead.technologies_used != "")
    ).count()

    state_counts = (
        db.query(Lead.state, func.count(Lead.id))
        .group_by(Lead.state)
        .all()
    )
    state_breakdown = {state: count for state, count in state_counts if state}

    return {
        "total_leads": total_leads,
        "total_jobs": total_jobs,
        "completed_jobs": completed_jobs,
        "running_jobs": running_jobs,
        "failed_jobs": failed_jobs,
        "leads_with_email": leads_with_email,
        "leads_with_phone": leads_with_phone,
        "leads_with_linkedin": leads_with_linkedin,
        "leads_with_company_info": leads_with_company_info,
        "state_breakdown": state_breakdown,
    }
