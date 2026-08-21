from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TestSmtpRequest(BaseModel):
    recipient_email: str

class SendPitchEmailRequest(BaseModel):
    lead_id: str
    recipient_email: str
    subject: str
    body_html: str
    attach_pdf: bool = True

class CreateCampaignRequest(BaseModel):
    name: str
    subject_template: str
    body_template: str
    lead_ids: Optional[List[str]] = None
    state_filter: Optional[str] = None
    niche_filter: Optional[str] = None
    min_score: Optional[int] = None
    attach_pdf: bool = True
    delay_min_seconds: int = 45
    delay_max_seconds: int = 90

class EmailLogResponse(BaseModel):
    id: str
    campaign_id: Optional[str] = None
    lead_id: Optional[str] = None
    business_name: Optional[str] = None
    recipient_email: str
    subject: str
    status: str
    error_message: Optional[str] = None
    attached_pdf: Optional[bool] = False
    sent_at: datetime

    class Config:
        from_attributes = True

class CampaignResponse(BaseModel):
    id: str
    name: str
    subject_template: str
    body_template: str
    status: str
    total_leads: int
    sent_count: int
    failed_count: int
    attach_pdf: bool
    delay_min_seconds: int
    delay_max_seconds: int
    created_by: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CampaignDetailResponse(CampaignResponse):
    logs: List[EmailLogResponse] = []

class CampaignStatsResponse(BaseModel):
    total_campaigns: int
    total_emails_sent: int
    successful_deliveries: int
    failed_deliveries: int
    success_rate_percentage: float

