import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.schedule import Schedule
from app.models.job import Job
from app.services.leads_scraper import run_scrape_job
from app.services.websocket_manager import websocket_manager
from app.services.sequence_worker import process_due_sequence_enrollments
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=5)

def calculate_next_run(
    frequency: str,
    day_of_week: int = 0,
    hour_of_day: int = 8,
    from_time: Optional[datetime] = None
) -> datetime:
    """Calculate the next execution timestamp based on frequency, weekday, and hour."""
    now = from_time or datetime.now(timezone.utc)
    # Start with today at the specified hour
    target = now.replace(hour=hour_of_day, minute=0, second=0, microsecond=0)

    if frequency == "daily":
        if target <= now:
            target += timedelta(days=1)
    elif frequency == "weekly":
        # day_of_week: 0 = Monday, 6 = Sunday
        days_ahead = day_of_week - target.weekday()
        if days_ahead < 0 or (days_ahead == 0 and target <= now):
            days_ahead += 7
        target += timedelta(days=days_ahead)
    elif frequency == "biweekly":
        days_ahead = day_of_week - target.weekday()
        if days_ahead < 0 or (days_ahead == 0 and target <= now):
            days_ahead += 14
        else:
            days_ahead += 7
        target += timedelta(days=days_ahead)
    elif frequency == "monthly":
        # Next 30 days
        target = target + timedelta(days=30)
    else:
        # Default daily
        if target <= now:
            target += timedelta(days=1)

    return target

def execute_scheduled_job(schedule_id: str, niche: str, state: str, job_id: str):
    """Worker task executed in background thread."""
    try:
        run_scrape_job(niche=niche, state=state, job_id=job_id, ws_manager=websocket_manager)
    except Exception as e:
        print(f"[SCHEDULER] Error executing scheduled job {job_id}: {e}")

async def scheduler_loop():
    """Periodic loop checking active schedules every 30 seconds."""
    print("[SCHEDULER] Background recurring scraper engine initialized")
    while True:
        try:
            await asyncio.sleep(30)
            db: Session = SessionLocal()
            try:
                now = datetime.now(timezone.utc)
                due_schedules = (
                    db.query(Schedule)
                    .filter(Schedule.is_active == True, Schedule.next_run_at <= now)
                    .all()
                )

                for sched in due_schedules:
                    # Check collision: is another identical job actively running?
                    running_job = (
                        db.query(Job)
                        .filter(
                            Job.niche == sched.niche,
                            Job.state == sched.state,
                            Job.status.in_(["pending", "running"])
                        )
                        .first()
                    )

                    if running_job:
                        # Postpone 10 minutes to avoid overlapping scraper instances
                        sched.next_run_at = now + timedelta(minutes=10)
                        db.commit()
                        print(f"[SCHEDULER] Postponed schedule #{sched.id[:8]} - duplicate scrape job already running")
                        continue

                    # Create and launch new job
                    job = Job(
                        id=str(uuid.uuid4()),
                        niche=sched.niche,
                        state=sched.state,
                        status="pending",
                        total_leads=0,
                        found_count=0,
                        enriched_count=0,
                        error_count=0
                    )
                    db.add(job)

                    # Update schedule metadata
                    sched.last_run_at = now
                    sched.total_runs_count += 1
                    sched.next_run_at = calculate_next_run(
                        frequency=sched.frequency,
                        day_of_week=sched.day_of_week,
                        hour_of_day=sched.hour_of_day,
                        from_time=now
                    )
                    db.commit()

                    # Trigger scraper in thread
                    executor.submit(execute_scheduled_job, sched.id, sched.niche, sched.state, job.id)
                    print(f"[SCHEDULER] Auto-triggered scheduled scrape #{job.id[:8]} for '{sched.niche}' in {sched.state}")

            finally:
                db.close()

            # Process due sequence email follow-up steps asynchronously
            executor.submit(process_due_sequence_enrollments)

        except asyncio.CancelledError:
            print("[SCHEDULER] Background scheduler stopped.")
            break
        except Exception as err:
            print(f"[SCHEDULER] Error in scheduler tick: {err}")
