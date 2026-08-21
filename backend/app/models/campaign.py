import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    lead_id = Column(String(36), ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    recipient_email = Column(String(255), nullable=False, index=True)
    subject = Column(String(500), nullable=False)
    body_html = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="sent", index=True) # sent, failed, pending
    error_message = Column(Text, nullable=True)
    sender_email = Column(String(255), nullable=True)
    
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lead = relationship("Lead", backref="email_logs")

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(255), nullable=False)
    subject_template = Column(String(500), nullable=True)
    body_template = Column(Text, nullable=True)
    status = Column(String(50), default="draft") # draft, active, completed, paused
    total_leads = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
