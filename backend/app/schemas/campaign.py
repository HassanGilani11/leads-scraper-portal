from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TestSmtpRequest(BaseModel):
    recipient_email: str

class SendPitchEmailRequest(BaseModel):
    lead_id: str
    recipient_email: str
    subject: str
    body_html: str
    attach_pdf: bool = True


class EmailLogResponse(BaseModel):
    id: str
    lead_id: Optional[str] = None
    recipient_email: str
    subject: str

    status: str
    error_message: Optional[str] = None
    sent_at: datetime

    class Config:
        from_attributes = True

class CampaignStatsResponse(BaseModel):
    total_emails_sent: int
    successful_deliveries: int
    failed_deliveries: int
    success_rate_percentage: float
