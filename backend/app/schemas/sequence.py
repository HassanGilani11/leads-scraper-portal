from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class SequenceStepSchema(BaseModel):
    id: Optional[str] = None
    step_number: int
    delay_days: int = 0
    delay_hours: int = 0
    subject_template: str
    body_template: str
    attach_pdf: bool = False

    class Config:
        from_attributes = True

class CreateSequenceStepRequest(BaseModel):
    step_number: int
    delay_days: int = 0
    delay_hours: int = 0
    subject_template: str
    body_template: str
    attach_pdf: bool = False

class CreateSequenceRequest(BaseModel):
    name: str
    description: Optional[str] = None
    steps: List[CreateSequenceStepRequest]

class UpdateSequenceRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None  # active, paused, archived
    steps: Optional[List[CreateSequenceStepRequest]] = None

class EnrollLeadsRequest(BaseModel):
    lead_ids: Optional[List[str]] = None
    state_filter: Optional[str] = None
    niche_filter: Optional[str] = None

class SequenceEnrollmentResponse(BaseModel):
    id: str
    sequence_id: str
    lead_id: str
    business_name: Optional[str] = None
    recipient_email: Optional[str] = None
    current_step_number: int
    status: str
    next_run_at: datetime
    last_sent_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SequenceResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    status: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    steps: List[SequenceStepSchema] = []
    total_enrolled: int = 0
    active_count: int = 0
    completed_count: int = 0
    replied_count: int = 0

    class Config:
        from_attributes = True

class SequenceDetailResponse(SequenceResponse):
    enrollments: List[SequenceEnrollmentResponse] = []
