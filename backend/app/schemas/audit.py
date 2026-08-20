from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AuditReportResponse(BaseModel):
    id: str
    lead_id: str
    website_url: str
    health_score: int
    ssl_active: str
    mobile_optimized: str
    load_time_seconds: str
    cms_platform: str
    payment_gateways: str
    shipping_carriers: str
    marketing_pixels: str
    technologies_used: str
    outdated_issues: str
    pitch_opportunities: str
    cold_email_draft: str
    created_at: datetime

    class Config:
        from_attributes = True
