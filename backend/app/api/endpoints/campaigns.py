from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.lead import Lead
from app.models.campaign import EmailLog, Campaign
from app.models.user import User
from app.schemas.campaign import (
    TestSmtpRequest,
    SendPitchEmailRequest,
    EmailLogResponse,
    CampaignStatsResponse
)
from app.services.smtp_service import smtp_service
from app.services.pdf_report import generate_audit_pdf_bytes
from app.api.deps import get_current_active_user, require_admin

router = APIRouter(prefix="/campaigns", tags=["Campaigns & Outreach"])

@router.post("/test-smtp")
def test_smtp_connection(
    payload: TestSmtpRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Test Microsoft 365 / SMTP connectivity and deliverability by sending a test message.
    """
    try:
        res = smtp_service.send_test_email(payload.recipient_email)
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SMTP Connection Error: {str(e)}"
        )

@router.post("/send-audit-pitch", response_model=EmailLogResponse)
def send_audit_pitch(
    payload: SendPitchEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Send a personalized cold pitch email to a lead with optional PDF Audit Dossier attached.
    """
    lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    pdf_bytes = None
    pdf_filename = None

    if payload.attach_pdf:
        try:
            pdf_bytes, pdf_filename = generate_audit_pdf_bytes(lead.id)
        except Exception as e:
            print(f"Warning: Could not generate PDF attachment: {e}")

    email_log = EmailLog(
        lead_id=lead.id,
        recipient_email=payload.recipient_email,
        subject=payload.subject,
        body_html=payload.body_html,
        status="pending"
    )
    db.add(email_log)
    db.commit()
    db.refresh(email_log)

    try:
        smtp_service.send_email(
            to_email=payload.recipient_email,
            subject=payload.subject,
            body_html=payload.body_html,
            pdf_bytes=pdf_bytes,
            pdf_filename=pdf_filename or "Website_Technical_Audit_Dossier.pdf"
        )
        email_log.status = "sent"
        db.commit()
        db.refresh(email_log)
        return email_log
    except Exception as e:
        email_log.status = "failed"
        email_log.error_message = str(e)
        db.commit()
        db.refresh(email_log)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to dispatch email via SMTP: {str(e)}"
        )

@router.get("/logs", response_model=List[EmailLogResponse])
def get_email_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve historical logs of all dispatched cold email outreach campaigns.
    """
    logs = db.query(EmailLog).order_by(EmailLog.sent_at.desc()).limit(limit).all()
    return logs

@router.get("/stats", response_model=CampaignStatsResponse)
def get_campaign_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get aggregate email outreach deliverability statistics.
    """
    total = db.query(EmailLog).count()
    successful = db.query(EmailLog).filter(EmailLog.status == "sent").count()
    failed = db.query(EmailLog).filter(EmailLog.status == "failed").count()
    
    rate = (successful / total * 100.0) if total > 0 else 0.0

    return {
        "total_emails_sent": total,
        "successful_deliveries": successful,
        "failed_deliveries": failed,
        "success_rate_percentage": round(rate, 1)
    }
