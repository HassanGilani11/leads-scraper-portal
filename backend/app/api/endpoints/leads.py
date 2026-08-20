import io
import csv
import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_

from app.core.database import get_db
from app.models.lead import Lead
from app.models.job import Job
from app.models.user import User
from app.schemas.lead import LeadResponse, LeadsPaginationResponse
from app.api.deps import get_current_active_user, require_admin

router = APIRouter(prefix="/leads", tags=["Leads"])

# 18 Standard Lead Columns
CSV_COLUMNS = [
    "Business Name",
    "URL",
    "Website",
    "Business Email",
    "Office Location",
    "Office Contact",
    "Contact Person",
    "E-mail",
    "Phone Number",
    "Linkedin URL",
    "Company Description",
    "Industries",
    "Keywords",
    "Founding Year",
    "Employee Count",
    "Technologies Used",
    "Company Rating/Score",
    "Subsidiaries",
]

@router.get("/", response_model=LeadsPaginationResponse)
def get_leads(
    job_id: Optional[str] = None,
    state: Optional[str] = None,
    niche: Optional[str] = None,
    search: Optional[str] = None,
    has_email: Optional[bool] = None,
    has_phone: Optional[bool] = None,
    has_linkedin: Optional[bool] = None,
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", description="asc or desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get paginated leads with full-text search, multi-criteria filtering, and sorting.
    """
    query = db.query(Lead)

    if job_id:
        query = query.filter(Lead.job_id == job_id)
    if state:
        query = query.filter(Lead.state == state.upper())
    if niche:
        query = query.filter(Lead.niche.ilike(f"%{niche}%"))
    if search:
        search_filter = or_(
            Lead.business_name.ilike(f"%{search}%"),
            Lead.contact_person.ilike(f"%{search}%"),
            Lead.email.ilike(f"%{search}%"),
            Lead.business_email.ilike(f"%{search}%"),
            Lead.office_location.ilike(f"%{search}%"),
            Lead.industries.ilike(f"%{search}%"),
            Lead.keywords.ilike(f"%{search}%"),
        )
        query = query.filter(search_filter)

    if has_email is True:
        query = query.filter(or_(Lead.email != "", Lead.business_email != ""))
    if has_phone is True:
        query = query.filter(or_(Lead.phone_number != "", Lead.office_contact != ""))
    if has_linkedin is True:
        query = query.filter(Lead.linkedin_url != "")

    # Sorting
    sort_column = getattr(Lead, sort_by, Lead.created_at)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    offset = (page - 1) * limit
    items = query.offset(offset).limit(limit).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
    }


@router.get("/export")
def export_leads_csv(
    job_id: Optional[str] = None,
    state: Optional[str] = None,
    niche: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Download CSV export of leads mapped to the standard 18 columns.
    """
    query = db.query(Lead)

    if job_id:
        query = query.filter(Lead.job_id == job_id)
    if state:
        query = query.filter(Lead.state == state.upper())
    if niche:
        query = query.filter(Lead.niche.ilike(f"%{niche}%"))
    if search:
        search_filter = or_(
            Lead.business_name.ilike(f"%{search}%"),
            Lead.contact_person.ilike(f"%{search}%"),
            Lead.email.ilike(f"%{search}%"),
            Lead.office_location.ilike(f"%{search}%"),
        )
        query = query.filter(search_filter)

    leads = query.order_by(desc(Lead.created_at)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write 18 column header
    writer.writerow(CSV_COLUMNS)

    for lead in leads:
        writer.writerow([
            lead.business_name or "",
            lead.url or "",
            lead.website or "",
            lead.business_email or "",
            lead.office_location or "",
            lead.office_contact or "",
            lead.contact_person or "",
            lead.email or "",
            lead.phone_number or "",
            lead.linkedin_url or "",
            lead.company_description or "",
            lead.industries or "",
            lead.keywords or "",
            lead.founding_year or "",
            lead.employee_count or "",
            lead.technologies_used or "",
            lead.company_rating or "",
            lead.subsidiaries or "",
        ])

    output.seek(0)
    
    filename_prefix = f"leads_{state.lower()}" if state else "leads_export"
    if job_id:
        filename_prefix = f"job_{job_id[:8]}_leads"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename_prefix}.csv"
        }
    )


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead_by_id(
    lead_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get detailed profile of a single lead.
    """
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.delete("/{lead_id}")
def delete_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Delete a single lead.
    """
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()
    return {"message": "Lead deleted successfully", "id": lead_id}
