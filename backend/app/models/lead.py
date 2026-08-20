import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Lead(Base):
    __tablename__ = "leads"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    niche = Column(String(100), nullable=True, index=True)
    state = Column(String(10), nullable=True, index=True)
    
    # 18 Standard Lead & Enrichment Fields
    business_name = Column(String(255), nullable=True, index=True)
    url = Column(Text, nullable=True)
    website = Column(Text, nullable=True)
    business_email = Column(String(255), nullable=True, index=True)
    office_location = Column(Text, nullable=True)
    office_contact = Column(String(100), nullable=True)
    contact_person = Column(String(255), nullable=True, index=True)
    email = Column(String(255), nullable=True, index=True)
    phone_number = Column(String(100), nullable=True)
    linkedin_url = Column(Text, nullable=True)
    company_description = Column(Text, nullable=True)
    industries = Column(Text, nullable=True)
    keywords = Column(Text, nullable=True)
    founding_year = Column(String(50), nullable=True)
    employee_count = Column(String(50), nullable=True)
    technologies_used = Column(Text, nullable=True)
    company_rating = Column(String(50), nullable=True)
    subsidiaries = Column(String(50), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    job = relationship("Job", back_populates="leads")
