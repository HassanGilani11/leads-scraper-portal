from pydantic import BaseModel
from typing import Optional

class SettingsResponse(BaseModel):
    apollo_api_key_set: bool
    apollo_api_key_masked: str
    database_url: str
    playwright_ready: bool
    total_jobs: int
    total_leads: int
    apollo_hourly_requests_left: Optional[int] = None
    apollo_hourly_limit: Optional[int] = None
    apollo_rate_limit_status: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_encryption: Optional[str] = None
    smtp_username: Optional[str] = None
    smtp_password_set: Optional[bool] = None
    sender_email: Optional[str] = None
    sender_name: Optional[str] = None
    email_provider: Optional[str] = "GRAPH"
    azure_tenant_id: Optional[str] = None
    azure_client_id: Optional[str] = None
    azure_client_secret_set: Optional[bool] = None

class UpdateSettingsRequest(BaseModel):
    apollo_api_key: Optional[str] = None
    email_provider: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_encryption: Optional[str] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    sender_email: Optional[str] = None
    sender_name: Optional[str] = None
    azure_tenant_id: Optional[str] = None
    azure_client_id: Optional[str] = None
    azure_client_secret: Optional[str] = None

class StatsSummaryResponse(BaseModel):
    total_leads: int
    total_jobs: int
    completed_jobs: int
    running_jobs: int
    failed_jobs: int
    leads_with_email: int
    leads_with_phone: int
    leads_with_linkedin: int
    leads_with_company_info: int
    state_breakdown: dict[str, int]
