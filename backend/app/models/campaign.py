import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    campaign_id = Column(String(36), ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True, index=True)
    lead_id = Column(String(36), ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    recipient_email = Column(String(255), nullable=False, index=True)
    subject = Column(String(500), nullable=False)
    body_html = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="sent", index=True)  # sent, failed, pending, skipped
    error_message = Column(Text, nullable=True)
    sender_email = Column(String(255), nullable=True)
    attached_pdf = Column(Boolean, default=False)
    
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lead = relationship("Lead", backref="email_logs")
    campaign = relationship("Campaign", back_populates="logs")

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(255), nullable=False)
    subject_template = Column(String(500), nullable=False)
    body_template = Column(Text, nullable=False)
    status = Column(String(50), default="queued", index=True)  # queued, running, paused, completed, cancelled
    
    attach_pdf = Column(Boolean, default=True)
    delay_min_seconds = Column(Integer, default=45)
    delay_max_seconds = Column(Integer, default=90)
    
    total_leads = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    logs = relationship("EmailLog", back_populates="campaign", cascade="all, delete-orphan", order_by="EmailLog.sent_at.desc()")

