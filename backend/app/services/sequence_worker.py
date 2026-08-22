import time
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from app.core.database import SessionLocal
from app.models.sequence import Sequence, SequenceStep, SequenceEnrollment
from app.models.lead import Lead
from app.models.campaign import EmailLog
from app.services.smtp_service import smtp_service
from app.services.pdf_report import generate_audit_pdf_bytes
from app.services.template_service import render_template

logger = logging.getLogger("sequence_worker")

def process_due_sequence_enrollments():
    """
    Periodic worker that scans for due sequence enrollments, personalizes emails,
    attaches PDF audit dossiers if required, and automatically advances leads to the next step.
    """
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        due_enrollments = (
            db.query(SequenceEnrollment)
            .join(Sequence, SequenceEnrollment.sequence_id == Sequence.id)
            .filter(
                SequenceEnrollment.status == "active",
                Sequence.status == "active",
                SequenceEnrollment.next_run_at <= now
            )
            .limit(20)  # Safe batch limit per tick
            .all()
        )

        if not due_enrollments:
            return

        logger.info(f"[SEQUENCE WORKER] Found {len(due_enrollments)} sequence enrollments due for dispatch.")

        for idx, enrollment in enumerate(due_enrollments):
            # Refresh status in case cancelled externally
            db.refresh(enrollment)
            if enrollment.status != "active":
                continue

            lead = enrollment.lead
            if not lead or not lead.email or "@" not in lead.email:
                enrollment.status = "cancelled"
                db.commit()
                continue

            # Find the current step
            current_step = (
                db.query(SequenceStep)
                .filter(
                    SequenceStep.sequence_id == enrollment.sequence_id,
                    SequenceStep.step_number == enrollment.current_step_number
                )
                .first()
            )

            if not current_step:
                # No step found for this number - sequence is completed
                enrollment.status = "completed"
                db.commit()
                continue

            # Render personalized subject & body
            rendered_subject = render_template(current_step.subject_template, lead)
            rendered_body = render_template(current_step.body_template, lead)

            # Generate PDF Audit Dossier if required
            pdf_bytes = None
            pdf_filename = None
            if current_step.attach_pdf:
                try:
                    pdf_bytes, pdf_filename = generate_audit_pdf_bytes(lead.id)
                except Exception as e:
                    logger.warning(f"Could not generate PDF for lead {lead.id}: {e}")

            # Create Email Log record
            email_log = EmailLog(
                lead_id=lead.id,
                recipient_email=lead.email,
                subject=rendered_subject,
                body_html=rendered_body,
                attached_pdf=bool(pdf_bytes),
                status="pending"
            )
            db.add(email_log)
            db.commit()
            db.refresh(email_log)

            # Dispatch email via Microsoft Graph / SMTP
            try:
                smtp_service.send_email(
                    to_email=lead.email,
                    subject=rendered_subject,
                    body_html=rendered_body,
                    pdf_bytes=pdf_bytes,
                    pdf_filename=pdf_filename or "Website_Technical_Audit_Dossier.pdf"
                )
                email_log.status = "sent"
                enrollment.last_sent_at = datetime.now(timezone.utc)
                logger.info(f"[SEQUENCE] Sent Step {current_step.step_number} to {lead.email} ({lead.business_name})")

                # Check if there is a next step
                next_step = (
                    db.query(SequenceStep)
                    .filter(
                        SequenceStep.sequence_id == enrollment.sequence_id,
                        SequenceStep.step_number == enrollment.current_step_number + 1
                    )
                    .first()
                )

                if next_step:
                    delay_delta = timedelta(days=next_step.delay_days, hours=next_step.delay_hours)
                    # If delay is 0, add at least 1 day as safe default for follow-up steps
                    if delay_delta.total_seconds() <= 0:
                        delay_delta = timedelta(days=3)
                    
                    enrollment.current_step_number += 1
                    enrollment.next_run_at = datetime.now(timezone.utc) + delay_delta
                    logger.info(f"[SEQUENCE] Advanced {lead.email} to Step {enrollment.current_step_number}. Next run at {enrollment.next_run_at}")
                else:
                    enrollment.status = "completed"
                    logger.info(f"[SEQUENCE] Completed sequence for {lead.email}")

            except Exception as e:
                email_log.status = "failed"
                email_log.error_message = str(e)
                logger.error(f"[SEQUENCE] Failed to dispatch Step {current_step.step_number} to {lead.email}: {e}")

            db.commit()

            # Apply domain-protection jitter delay between consecutive drip emails
            if idx < len(due_enrollments) - 1:
                delay = random.uniform(15, 30)
                time.sleep(delay)

    except Exception as e:
        logger.exception(f"[SEQUENCE WORKER] Error processing sequence enrollments: {e}")
    finally:
        db.close()
