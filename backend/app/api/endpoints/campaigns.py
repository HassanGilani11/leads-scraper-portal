import time
import random
import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db, SessionLocal
from app.models.lead import Lead
from app.models.campaign import EmailLog, Campaign
from app.models.user import User
from app.schemas.campaign import (
    TestSmtpRequest,
    SendPitchEmailRequest,
    CreateCampaignRequest,
    EmailLogResponse,
    CampaignResponse,
    CampaignDetailResponse,
    CampaignStatsResponse
)
from app.services.smtp_service import smtp_service
from app.services.pdf_report import generate_audit_pdf_bytes
from app.api.deps import get_current_active_user, require_admin

logger = logging.getLogger("campaigns")
router = APIRouter(prefix="/campaigns", tags=["Campaigns & Outreach"])

def render_template(template_str: str, lead: Lead) -> str:
    """
    Interpolate dynamic personalization tags into email subject and HTML body.
    """
    if not template_str:
        return ""
    
    first_name = "Business Owner"
    if lead.contact_person:
        parts = lead.contact_person.strip().split()
        if parts:
            first_name = parts[0]

    replacements = {
        "{{company_name}}": lead.business_name or "your team",
        "{{business_name}}": lead.business_name or "your team",
        "{{contact_name}}": lead.contact_person or "Business Owner",
        "{{first_name}}": first_name,
        "{{city}}": lead.office_location.split(",")[0].strip() if lead.office_location else "Australia",
        "{{state}}": lead.state or "Australia",
        "{{website}}": lead.website or "your website",
        "{{phone}}": lead.phone or "",
        "{{audit_score}}": str(lead.lead_score or 78),
    }

    rendered = template_str
    for tag, val in replacements.items():
        rendered = rendered.replace(tag, str(val))
    return rendered

def run_campaign_background_task(campaign_id: str, lead_ids: List[str]):
    """
    Background worker that iterates through target leads, personalizes pitch emails,
    generates PDF Technical Audit Dossiers, and enforces randomized jitter delays
    to safeguard domain reputation and prevent spam blacklisting.
    """
    db = SessionLocal()
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            logger.error(f"Campaign {campaign_id} not found in background worker")
            return

        campaign.status = "running"
        db.commit()

        leads = db.query(Lead).filter(Lead.id.in_(lead_ids)).all()
        logger.info(f"Starting Campaign '{campaign.name}' ({campaign.id}) targeting {len(leads)} leads with jitter {campaign.delay_min_seconds}s-{campaign.delay_max_seconds}s")

        for idx, lead in enumerate(leads):
            # Refresh campaign status to check for user cancellation
            db.refresh(campaign)
            if campaign.status == "cancelled":
                logger.info(f"Campaign {campaign_id} was cancelled by user. Stopping worker.")
                break

            recipient_email = lead.email
            if not recipient_email or "@" not in recipient_email:
                logger.warning(f"Skipping lead {lead.id} ({lead.business_name}): No valid email")
                continue

            # Render personalized subject & body
            rendered_subject = render_template(campaign.subject_template, lead)
            rendered_body = render_template(campaign.body_template, lead)

            # Generate PDF Audit Dossier if requested
            pdf_bytes = None
            pdf_filename = None
            if campaign.attach_pdf:
                try:
                    pdf_bytes, pdf_filename = generate_audit_pdf_bytes(lead.id)
                except Exception as e:
                    logger.warning(f"Could not generate PDF dossier for lead {lead.id}: {e}")

            # Create Email Log record
            email_log = EmailLog(
                campaign_id=campaign.id,
                lead_id=lead.id,
                recipient_email=recipient_email,
                subject=rendered_subject,
                body_html=rendered_body,
                attached_pdf=bool(pdf_bytes),
                status="pending"
            )
            db.add(email_log)
            db.commit()
            db.refresh(email_log)

            # Dispatch via Microsoft Graph API / SMTP
            try:
                smtp_service.send_email(
                    to_email=recipient_email,
                    subject=rendered_subject,
                    body_html=rendered_body,
                    pdf_bytes=pdf_bytes,
                    pdf_filename=pdf_filename or "Website_Technical_Audit_Dossier.pdf"
                )
                email_log.status = "sent"
                campaign.sent_count += 1
                logger.info(f"[{idx+1}/{len(leads)}] Successfully sent campaign email to {recipient_email}")
            except Exception as e:
                email_log.status = "failed"
                email_log.error_message = str(e)
                campaign.failed_count += 1
                logger.error(f"[{idx+1}/{len(leads)}] Failed to send campaign email to {recipient_email}: {e}")

            db.commit()

            # Apply domain-protection jitter delay between consecutive emails (unless it's the last lead)
            if idx < len(leads) - 1:
                delay = random.uniform(campaign.delay_min_seconds, campaign.delay_max_seconds)
                logger.info(f"Applying domain safety pacing: sleeping for {delay:.1f}s before next email...")
                time.sleep(delay)

        campaign.status = "completed" if campaign.status != "cancelled" else "cancelled"
        campaign.completed_at = datetime.now(timezone.utc)
        db.commit()
        logger.info(f"Campaign '{campaign.name}' finished with status '{campaign.status}'. Sent: {campaign.sent_count}, Failed: {campaign.failed_count}")

    except Exception as e:
        logger.exception(f"Unhandled error in campaign worker: {e}")
        try:
            campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
            if campaign:
                campaign.status = "failed"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.post("/test-smtp")
def test_smtp_connection(
    payload: TestSmtpRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Test Microsoft 365 / Graph / SMTP connectivity and deliverability by sending a test message.
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
    Send a personalized cold pitch email to a single lead with optional PDF Audit Dossier attached.
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
            logger.warning(f"Could not generate PDF attachment: {e}")

    email_log = EmailLog(
        lead_id=lead.id,
        recipient_email=payload.recipient_email,
        subject=payload.subject,
        body_html=payload.body_html,
        attached_pdf=bool(pdf_bytes),
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
        return {
            "id": email_log.id,
            "campaign_id": email_log.campaign_id,
            "lead_id": email_log.lead_id,
            "business_name": lead.business_name,
            "recipient_email": email_log.recipient_email,
            "subject": email_log.subject,
            "status": email_log.status,
            "error_message": email_log.error_message,
            "attached_pdf": email_log.attached_pdf,
            "sent_at": email_log.sent_at
        }
    except Exception as e:
        email_log.status = "failed"
        email_log.error_message = str(e)
        db.commit()
        db.refresh(email_log)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to dispatch email: {str(e)}"
        )

@router.post("/create-and-dispatch", response_model=CampaignResponse)
def create_and_dispatch_campaign(
    payload: CreateCampaignRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new multi-lead cold outreach campaign and launch background worker with domain-safe jitter.
    """
    # 1. Determine target leads
    if payload.lead_ids and len(payload.lead_ids) > 0:
        leads_query = db.query(Lead).filter(Lead.id.in_(payload.lead_ids))
    else:
        leads_query = db.query(Lead).filter(Lead.email.isnot(None), Lead.email != "")
        if payload.state_filter and payload.state_filter != "ALL":
            leads_query = leads_query.filter(Lead.state == payload.state_filter)
        if payload.niche_filter and payload.niche_filter.strip():
            leads_query = leads_query.filter(Lead.business_name.ilike(f"%{payload.niche_filter.strip()}%"))
        if payload.min_score is not None:
            leads_query = leads_query.filter(Lead.lead_score >= payload.min_score)

    target_leads = leads_query.all()
    if not target_leads:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No matching leads with valid email addresses found for this campaign."
        )

    target_lead_ids = [l.id for l in target_leads if l.email and "@" in l.email]
    if not target_lead_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="None of the selected leads have a valid email address."
        )

    # 2. Create Campaign record
    campaign = Campaign(
        name=payload.name.strip(),
        subject_template=payload.subject_template.strip(),
        body_template=payload.body_template.strip(),
        status="queued",
        attach_pdf=payload.attach_pdf,
        delay_min_seconds=max(5, payload.delay_min_seconds),
        delay_max_seconds=max(payload.delay_min_seconds, payload.delay_max_seconds),
        total_leads=len(target_lead_ids),
        sent_count=0,
        failed_count=0,
        created_by=current_user.email
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    # 3. Dispatch to background tasks worker
    background_tasks.add_task(run_campaign_background_task, campaign.id, target_lead_ids)

    return campaign

@router.get("/", response_model=List[CampaignResponse])
def list_campaigns(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all created email campaigns and their current live progress status.
    """
    campaigns = db.query(Campaign).order_by(Campaign.created_at.desc()).limit(limit).all()
    return campaigns

@router.get("/{campaign_id}", response_model=CampaignDetailResponse)
def get_campaign_detail(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get detailed metrics and delivery logs for a specific campaign.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    logs_data = []
    for log in campaign.logs:
        b_name = log.lead.business_name if log.lead else None
        logs_data.append(EmailLogResponse(
            id=log.id,
            campaign_id=log.campaign_id,
            lead_id=log.lead_id,
            business_name=b_name,
            recipient_email=log.recipient_email,
            subject=log.subject,
            status=log.status,
            error_message=log.error_message,
            attached_pdf=log.attached_pdf,
            sent_at=log.sent_at
        ))

    return CampaignDetailResponse(
        id=campaign.id,
        name=campaign.name,
        subject_template=campaign.subject_template,
        body_template=campaign.body_template,
        status=campaign.status,
        total_leads=campaign.total_leads,
        sent_count=campaign.sent_count,
        failed_count=campaign.failed_count,
        attach_pdf=campaign.attach_pdf,
        delay_min_seconds=campaign.delay_min_seconds,
        delay_max_seconds=campaign.delay_max_seconds,
        created_by=campaign.created_by,
        created_at=campaign.created_at,
        completed_at=campaign.completed_at,
        logs=logs_data
    )

@router.post("/{campaign_id}/cancel")
def cancel_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Cancel an active or queued campaign worker immediately.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status in ["queued", "running"]:
        campaign.status = "cancelled"
        campaign.completed_at = datetime.now(timezone.utc)
        db.commit()
        return {"status": "success", "message": "Campaign has been cancelled."}
    else:
        return {"status": "info", "message": f"Campaign is already in '{campaign.status}' state."}

@router.get("/logs/all", response_model=List[EmailLogResponse])
def get_email_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve historical logs of all dispatched cold email outreach pitches.
    """
    logs = db.query(EmailLog).order_by(EmailLog.sent_at.desc()).limit(limit).all()
    results = []
    for log in logs:
        b_name = log.lead.business_name if log.lead else None
        results.append(EmailLogResponse(
            id=log.id,
            campaign_id=log.campaign_id,
            lead_id=log.lead_id,
            business_name=b_name,
            recipient_email=log.recipient_email,
            subject=log.subject,
            status=log.status,
            error_message=log.error_message,
            attached_pdf=log.attached_pdf,
            sent_at=log.sent_at
        ))
    return results

@router.get("/metrics/summary", response_model=CampaignStatsResponse)
def get_campaign_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get aggregate email outreach deliverability statistics.
    """
    total_campaigns = db.query(Campaign).count()
    total = db.query(EmailLog).count()
    successful = db.query(EmailLog).filter(EmailLog.status == "sent").count()
    failed = db.query(EmailLog).filter(EmailLog.status == "failed").count()
    
    rate = (successful / total * 100.0) if total > 0 else 0.0

    return {
        "total_campaigns": total_campaigns,
        "total_emails_sent": total,
        "successful_deliveries": successful,
        "failed_deliveries": failed,
        "success_rate_percentage": round(rate, 1)
    }

