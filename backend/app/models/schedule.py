import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Integer
from app.core.database import Base

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    niche = Column(String(100), nullable=False, index=True)
    state = Column(String(10), nullable=False, index=True)
    frequency = Column(String(20), default="weekly", nullable=False)  # daily, weekly, biweekly, monthly
    day_of_week = Column(Integer, default=0, nullable=False)  # 0=Monday, 6=Sunday
    hour_of_day = Column(Integer, default=8, nullable=False)  # 0-23
    is_active = Column(Boolean, default=True, nullable=False)
    last_run_at = Column(DateTime, nullable=True)
    next_run_at = Column(DateTime, nullable=False, index=True)
    total_runs_count = Column(Integer, default=0, nullable=False)
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
