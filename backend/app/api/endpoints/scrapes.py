import uuid
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.job import Job
from app.models.user import User
from app.schemas.job import JobCreateRequest, JobResponse, JobListResponse
from app.services.leads_scraper import run_scrape_job
from app.services.websocket_manager import websocket_manager
from app.api.deps import get_current_active_user, require_admin, require_member_or_admin

router = APIRouter(prefix="/scrapes", tags=["Scrapes"])

# Thread pool for non-blocking execution of scraper
executor = ThreadPoolExecutor(max_workers=5)

def run_job_in_thread(niche: str, state: str, job_id: str):
    run_scrape_job(niche=niche, state=state, job_id=job_id, ws_manager=websocket_manager)

@router.post("/start", response_model=JobResponse)
async def start_scrape_job(
    request: JobCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_member_or_admin)
):
    """
    Trigger a new Australian niche scrape & enrichment job in the background.
    """
    niche = request.niche.strip()
    state = request.state.strip().upper()

    job = Job(
        id=str(uuid.uuid4()),
        niche=niche,
        state=state,
        status="pending",
        total_leads=0,
        found_count=0,
        enriched_count=0,
        error_count=0
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Launch in thread pool via background tasks to not block FastAPI
    background_tasks.add_task(run_job_in_thread, niche, state, job.id)

    return job

@router.get("/", response_model=JobListResponse)
def get_all_jobs(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get list of all scraping jobs sorted by creation date descending.
    """
    total = db.query(Job).count()
    jobs = db.query(Job).order_by(desc(Job.created_at)).offset(offset).limit(limit).all()
    return {"jobs": jobs, "total": total}

@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get detailed status of a specific scraping job.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.delete("/{job_id}")
def delete_job(
    job_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Delete a job and all its associated leads.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"message": "Job deleted successfully", "job_id": job_id}
