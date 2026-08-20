from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class JobCreateRequest(BaseModel):
    niche: str = Field(..., min_length=2, max_length=100, description="Target industry or niche (e.g. Plumber, Dentist)")
    state: str = Field(..., min_length=2, max_length=10, description="Australian state code (e.g. NSW, VIC, QLD)")

class JobResponse(BaseModel):
    id: str
    niche: str
    state: str
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
