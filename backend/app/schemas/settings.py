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

class UpdateSettingsRequest(BaseModel):
    apollo_api_key: str

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
