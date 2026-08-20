import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.models.schedule import Schedule
from app.models.job import Job
from app.models.user import User
from app.schemas.schedule import (
    ScheduleCreateRequest,
    ScheduleUpdateRequest,
    ScheduleResponse,
    ScheduleListResponse
)
from app.schemas.job import JobResponse
from app.api.deps import get_current_active_user, require_member_or_admin, require_admin
from app.services.scheduler_service import calculate_next_run, executor, execute_scheduled_job

router = APIRouter(prefix="/schedules", tags=["Schedules"])

@router.get("/", response_model=ScheduleListResponse)
def list_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all recurring automated scraping schedules."""
    schedules = db.query(Schedule).order_by(Schedule.created_at.desc()).all()
    return ScheduleListResponse(
        schedules=[ScheduleResponse.model_validate(s) for s in schedules],
        total=len(schedules)
    )

@router.post("/", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(
    payload: ScheduleCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_member_or_admin)
):
    """Create a new recurring scrape schedule."""
    niche = payload.niche.strip()
    state = payload.state.strip().upper()
    
    now = datetime.now(timezone.utc)
    next_run = calculate_next_run(
        frequency=payload.frequency,
        day_of_week=payload.day_of_week,
        hour_of_day=payload.hour_of_day,
        from_time=now
    )

    schedule = Schedule(
        id=str(uuid.uuid4()),
        niche=niche,
        state=state,
        frequency=payload.frequency,
        day_of_week=payload.day_of_week,
        hour_of_day=payload.hour_of_day,
        is_active=payload.is_active,
        next_run_at=next_run,
        total_runs_count=0,
        created_by=current_user.email
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return ScheduleResponse.model_validate(schedule)

@router.patch("/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(
    schedule_id: str,
    payload: ScheduleUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_member_or_admin)
):
    """Update schedule frequency, run timing, or toggle active/paused status."""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    recalc_needed = False
    if payload.frequency is not None:
        schedule.frequency = payload.frequency
        recalc_needed = True
    if payload.day_of_week is not None:
        schedule.day_of_week = payload.day_of_week
        recalc_needed = True
    if payload.hour_of_day is not None:
        schedule.hour_of_day = payload.hour_of_day
        recalc_needed = True
    if payload.is_active is not None:
        schedule.is_active = payload.is_active

    if recalc_needed and schedule.is_active:
        schedule.next_run_at = calculate_next_run(
            frequency=schedule.frequency,
            day_of_week=schedule.day_of_week,
            hour_of_day=schedule.hour_of_day,
            from_time=datetime.now(timezone.utc)
        )

    db.commit()
    db.refresh(schedule)
    return ScheduleResponse.model_validate(schedule)

@router.delete("/{schedule_id}")
def delete_schedule(
    schedule_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_member_or_admin)
):
    """Delete a recurring scrape schedule."""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
        
    db.delete(schedule)
    db.commit()
    return {"message": "Schedule deleted successfully", "id": schedule_id}

@router.post("/{schedule_id}/run-now", response_model=JobResponse)
def run_schedule_now(
    schedule_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_member_or_admin)
):
    """Manually trigger an immediate scrape run for this scheduled pipeline."""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    now = datetime.now(timezone.utc)
    job = Job(
        id=str(uuid.uuid4()),
        niche=schedule.niche,
        state=schedule.state,
        status="pending",
        total_leads=0,
        found_count=0,
        enriched_count=0,
        error_count=0
    )
    db.add(job)

    schedule.last_run_at = now
    schedule.total_runs_count += 1
    db.commit()
    db.refresh(job)

    # Launch in executor
    executor.submit(execute_scheduled_job, schedule.id, schedule.niche, schedule.state, job.id)

    return JobResponse.model_validate(job)
