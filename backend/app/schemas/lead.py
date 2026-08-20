from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class LeadResponse(BaseModel):
    id: str
    job_id: str
    niche: Optional[str] = None
    state: Optional[str] = None
    
    # 18 Fields
    business_name: Optional[str] = None
    url: Optional[str] = None
    website: Optional[str] = None
    business_email: Optional[str] = None
    office_location: Optional[str] = None
    office_contact: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    linkedin_url: Optional[str] = None
    company_description: Optional[str] = None
    industries: Optional[str] = None
    keywords: Optional[str] = None
    founding_year: Optional[str] = None
    employee_count: Optional[str] = None
    technologies_used: Optional[str] = None
    company_rating: Optional[str] = None
    subsidiaries: Optional[str] = None
    
    created_at: datetime

    class Config:
        from_attributes = True

class LeadsPaginationResponse(BaseModel):
    items: list[LeadResponse]
    total: int
    page: int
    limit: int
    pages: int
