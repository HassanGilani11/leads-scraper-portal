from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class JobCreateRequest(BaseModel):
    niche: str = Field(..., min_length=2, max_length=100, description="Target industry or niche (e.g. Plumber, Dentist)")
    state: str = Field(..., min_length=2, max_length=10, description="Australian state code (e.g. NSW, VIC, QLD, ALL)")
    suburb: Optional[str] = Field(None, max_length=100, description="Specific suburb, city, or postcode (e.g. Parramatta, Bondi Beach)")
    radius_km: Optional[int] = Field(25, description="Search radius in kilometers (5, 10, 25, 50, 100)")
    no_website_only: Optional[bool] = Field(False, description="Filter exclusively for businesses with no website")

class JobResponse(BaseModel):
    id: str
    niche: str
    state: str
    suburb: Optional[str] = None
    radius_km: Optional[int] = 25
    no_website_only: Optional[str] = "false"
    status: str
    total_leads: int
    found_count: int
    enriched_count: int
    error_count: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class JobListResponse(BaseModel):
    jobs: list[JobResponse]
    total: int
