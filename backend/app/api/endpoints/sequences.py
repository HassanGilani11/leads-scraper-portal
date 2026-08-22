import uuid
import logging
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.sequence import Sequence, SequenceStep, SequenceEnrollment
from app.models.lead import Lead
from app.models.user import User
from app.schemas.sequence import (
    CreateSequenceRequest,
    UpdateSequenceRequest,
    EnrollLeadsRequest,
    SequenceResponse,
    SequenceDetailResponse,
    SequenceEnrollmentResponse,
    SequenceStepSchema
)
from app.services.sequence_worker import process_due_sequence_enrollments
from app.api.deps import get_current_active_user

logger = logging.getLogger("sequences_api")
router = APIRouter(prefix="/sequences", tags=["Follow-up Sequences & Drip Campaigns"])

@router.post("/", response_model=SequenceResponse)
def create_sequence(
    payload: CreateSequenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new multi-step automated email follow-up sequence.
    """
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Sequence name is required.")
    if not payload.steps or len(payload.steps) == 0:
        raise HTTPException(status_code=400, detail="At least one sequence step is required.")

    sequence = Sequence(
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        status="active",
        created_by=current_user.email
    )
    db.add(sequence)
    db.commit()
    db.refresh(sequence)

    for idx, step_data in enumerate(payload.steps):
        step = SequenceStep(
            sequence_id=sequence.id,
            step_number=idx + 1,
            delay_days=step_data.delay_days,
            delay_hours=step_data.delay_hours,
            subject_template=step_data.subject_template.strip(),
            body_template=step_data.body_template.strip(),
            attach_pdf=step_data.attach_pdf
        )
        db.add(step)

    db.commit()
    db.refresh(sequence)

    return SequenceResponse(
        id=sequence.id,
        name=sequence.name,
        description=sequence.description,
        status=sequence.status,
        created_by=sequence.created_by,
        created_at=sequence.created_at,
        updated_at=sequence.updated_at,
        steps=[SequenceStepSchema.from_orm(s) for s in sequence.steps],
        total_enrolled=0,
        active_count=0,
        completed_count=0,
        replied_count=0
    )

@router.get("/", response_model=List[SequenceResponse])
def list_sequences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all multi-step email sequences with enrollment metrics.
    """
    sequences = db.query(Sequence).order_by(Sequence.created_at.desc()).all()
    results = []

    for seq in sequences:
        total = db.query(SequenceEnrollment).filter(SequenceEnrollment.sequence_id == seq.id).count()
        active = db.query(SequenceEnrollment).filter(SequenceEnrollment.sequence_id == seq.id, SequenceEnrollment.status == "active").count()
        completed = db.query(SequenceEnrollment).filter(SequenceEnrollment.sequence_id == seq.id, SequenceEnrollment.status == "completed").count()
        replied = db.query(SequenceEnrollment).filter(SequenceEnrollment.sequence_id == seq.id, SequenceEnrollment.status == "replied").count()

        results.append(SequenceResponse(
            id=seq.id,
            name=seq.name,
            description=seq.description,
            status=seq.status,
            created_by=seq.created_by,
            created_at=seq.created_at,
            updated_at=seq.updated_at,
            steps=[SequenceStepSchema.from_orm(s) for s in seq.steps],
            total_enrolled=total,
            active_count=active,
            completed_count=completed,
            replied_count=replied
        ))

    return results

@router.get("/{sequence_id}", response_model=SequenceDetailResponse)
def get_sequence_detail(
    sequence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get detailed breakdown of a sequence including its steps and enrolled prospects.
    """
    sequence = db.query(Sequence).filter(Sequence.id == sequence_id).first()
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found.")

    total = db.query(SequenceEnrollment).filter(SequenceEnrollment.sequence_id == sequence.id).count()
    active = db.query(SequenceEnrollment).filter(SequenceEnrollment.sequence_id == sequence.id, SequenceEnrollment.status == "active").count()
    completed = db.query(SequenceEnrollment).filter(SequenceEnrollment.sequence_id == sequence.id, SequenceEnrollment.status == "completed").count()
    replied = db.query(SequenceEnrollment).filter(SequenceEnrollment.sequence_id == sequence.id, SequenceEnrollment.status == "replied").count()

    enrollments_data = []
    for enr in sequence.enrollments:
        b_name = enr.lead.business_name if enr.lead else None
        rec_email = enr.lead.email if enr.lead else None
        enrollments_data.append(SequenceEnrollmentResponse(
            id=enr.id,
            sequence_id=enr.sequence_id,
            lead_id=enr.lead_id,
            business_name=b_name,
            recipient_email=rec_email,
            current_step_number=enr.current_step_number,
            status=enr.status,
            next_run_at=enr.next_run_at,
            last_sent_at=enr.last_sent_at,
            created_at=enr.created_at
        ))

    return SequenceDetailResponse(
        id=sequence.id,
        name=sequence.name,
        description=sequence.description,
        status=sequence.status,
        created_by=sequence.created_by,
        created_at=sequence.created_at,
        updated_at=sequence.updated_at,
        steps=[SequenceStepSchema.from_orm(s) for s in sequence.steps],
        total_enrolled=total,
        active_count=active,
        completed_count=completed,
        replied_count=replied,
        enrollments=enrollments_data
    )

@router.put("/{sequence_id}", response_model=SequenceResponse)
def update_sequence(
    sequence_id: str,
    payload: UpdateSequenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update sequence properties, status, or modify its follow-up steps.
    """
    sequence = db.query(Sequence).filter(Sequence.id == sequence_id).first()
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found.")

    if payload.name is not None:
        sequence.name = payload.name.strip()
    if payload.description is not None:
        sequence.description = payload.description.strip() if payload.description else None
    if payload.status is not None:
        sequence.status = payload.status

    if payload.steps is not None:
        # Replace steps
        db.query(SequenceStep).filter(SequenceStep.sequence_id == sequence.id).delete()
        for idx, step_data in enumerate(payload.steps):
            step = SequenceStep(
                sequence_id=sequence.id,
                step_number=idx + 1,
                delay_days=step_data.delay_days,
                delay_hours=step_data.delay_hours,
                subject_template=step_data.subject_template.strip(),
                body_template=step_data.body_template.strip(),
                attach_pdf=step_data.attach_pdf
            )
            db.add(step)

    sequence.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(sequence)

    total = db.query(SequenceEnrollment).filter(SequenceEnrollment.sequence_id == sequence.id).count()
    active = db.query(SequenceEnrollment).filter(SequenceEnrollment.sequence_id == sequence.id, SequenceEnrollment.status == "active").count()
    completed = db.query(SequenceEnrollment).filter(SequenceEnrollment.sequence_id == sequence.id, SequenceEnrollment.status == "completed").count()
    replied = db.query(SequenceEnrollment).filter(SequenceEnrollment.sequence_id == sequence.id, SequenceEnrollment.status == "replied").count()

    return SequenceResponse(
        id=sequence.id,
        name=sequence.name,
        description=sequence.description,
        status=sequence.status,
        created_by=sequence.created_by,
        created_at=sequence.created_at,
        updated_at=sequence.updated_at,
        steps=[SequenceStepSchema.from_orm(s) for s in sequence.steps],
        total_enrolled=total,
        active_count=active,
        completed_count=completed,
        replied_count=replied
    )

@router.delete("/{sequence_id}")
def delete_sequence(
    sequence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a sequence and all its associated steps and enrollments.
    """
    sequence = db.query(Sequence).filter(Sequence.id == sequence_id).first()
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found.")

    db.delete(sequence)
    db.commit()
    return {"status": "success", "message": f"Sequence '{sequence.name}' deleted successfully."}

@router.post("/{sequence_id}/enroll")
def enroll_leads_in_sequence(
    sequence_id: str,
    payload: EnrollLeadsRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Enroll selected or filtered leads into a sequence starting at Step 1 immediately.
    """
    sequence = db.query(Sequence).filter(Sequence.id == sequence_id).first()
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found.")
    if sequence.status != "active":
        raise HTTPException(status_code=400, detail="Cannot enroll leads into an inactive or paused sequence.")

    # Determine leads
    if payload.lead_ids and len(payload.lead_ids) > 0:
        leads_query = db.query(Lead).filter(Lead.id.in_(payload.lead_ids))
    else:
        leads_query = db.query(Lead).filter(Lead.email.isnot(None), Lead.email != "")
        if payload.state_filter and payload.state_filter != "ALL":
            leads_query = leads_query.filter(Lead.state == payload.state_filter)
        if payload.niche_filter and payload.niche_filter.strip():
            leads_query = leads_query.filter(Lead.business_name.ilike(f"%{payload.niche_filter.strip()}%"))

    leads = leads_query.all()
    valid_leads = [l for l in leads if l.email and "@" in l.email]
    if not valid_leads:
        raise HTTPException(status_code=400, detail="No leads with valid email addresses found.")

    enrolled_count = 0
    now = datetime.now(timezone.utc)

    for lead in valid_leads:
        # Check if already actively enrolled in this sequence
        existing = (
            db.query(SequenceEnrollment)
            .filter(
                SequenceEnrollment.sequence_id == sequence.id,
                SequenceEnrollment.lead_id == lead.id,
                SequenceEnrollment.status.in_(["active", "paused"])
            )
            .first()
        )
        if existing:
            continue

        enrollment = SequenceEnrollment(
            sequence_id=sequence.id,
            lead_id=lead.id,
            current_step_number=1,
            status="active",
            next_run_at=now  # Step 1 fires immediately or on next worker tick
        )
        db.add(enrollment)
        enrolled_count += 1

    db.commit()

    # Trigger background worker to start processing
    background_tasks.add_task(process_due_sequence_enrollments)

    return {
        "status": "success",
        "message": f"Successfully enrolled {enrolled_count} leads into '{sequence.name}'.",
        "enrolled_count": enrolled_count
    }

@router.post("/enrollments/{enrollment_id}/status")
def update_enrollment_status(
    enrollment_id: str,
    new_status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a prospect's sequence state: 'paused', 'active', 'replied', or 'cancelled'.
    """
    valid_statuses = ["active", "paused", "completed", "replied", "cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    enrollment = db.query(SequenceEnrollment).filter(SequenceEnrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found.")

    enrollment.status = new_status
    enrollment.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {"status": "success", "message": f"Enrollment status updated to '{new_status}'."}

@router.post("/trigger-worker")
def trigger_sequence_worker_manually(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user)
):
    """
    Manually trigger an immediate scan and dispatch tick for all due sequence enrollments.
    """
    background_tasks.add_task(process_due_sequence_enrollments)
    return {"status": "success", "message": "Sequence worker tick triggered in background."}
