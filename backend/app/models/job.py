import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    niche = Column(String(100), nullable=False, index=True)
    state = Column(String(10), nullable=False, index=True)
    suburb = Column(String(100), nullable=True, index=True)
    radius_km = Column(Integer, default=25, nullable=True)
    no_website_only = Column(String(10), default="false", nullable=True)
    status = Column(String(20), default="pending", index=True)  # pending, running, completed, failed
    total_leads = Column(Integer, default=0)
    found_count = Column(Integer, default=0)
    enriched_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    leads = relationship("Lead", back_populates="job", cascade="all, delete-orphan")
