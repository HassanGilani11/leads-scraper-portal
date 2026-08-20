from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class ScheduleCreateRequest(BaseModel):
    niche: str = Field(..., min_length=2, max_length=100, description="Target niche (e.g. Plumber, Dentist)")
    state: str = Field(..., min_length=2, max_length=10, description="Australian state code (e.g. NSW, VIC)")
    frequency: str = Field(default="weekly", description="daily, weekly, biweekly, or monthly")
    day_of_week: int = Field(default=0, ge=0, le=6, description="0=Monday, 6=Sunday")
    hour_of_day: int = Field(default=8, ge=0, le=23, description="Hour to run (0-23)")
    is_active: bool = True

class ScheduleUpdateRequest(BaseModel):
    frequency: Optional[str] = None
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    hour_of_day: Optional[int] = Field(None, ge=0, le=23)
    is_active: Optional[bool] = None

class ScheduleResponse(BaseModel):
    id: str
    niche: str
    state: str
    frequency: str
    day_of_week: int
    hour_of_day: int
    is_active: bool
    last_run_at: Optional[datetime] = None
    next_run_at: datetime
    total_runs_count: int
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ScheduleListResponse(BaseModel):
    schedules: list[ScheduleResponse]
    total: int
