import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Sequence(Base):
    __tablename__ = "sequences"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="active", index=True)  # active, paused, archived
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    steps = relationship("SequenceStep", back_populates="sequence", cascade="all, delete-orphan", order_by="SequenceStep.step_number")
    enrollments = relationship("SequenceEnrollment", back_populates="sequence", cascade="all, delete-orphan")


class SequenceStep(Base):
    __tablename__ = "sequence_steps"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    sequence_id = Column(String(36), ForeignKey("sequences.id", ondelete="CASCADE"), nullable=False, index=True)
    step_number = Column(Integer, nullable=False, default=1)  # 1, 2, 3...
    delay_days = Column(Integer, default=0)                  # Days to wait after previous step (0 for Step 1)
    delay_hours = Column(Integer, default=0)                 # Additional hours to wait
    subject_template = Column(String(255), nullable=False)
    body_template = Column(Text, nullable=False)
    attach_pdf = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    sequence = relationship("Sequence", back_populates="steps")


class SequenceEnrollment(Base):
    __tablename__ = "sequence_enrollments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    sequence_id = Column(String(36), ForeignKey("sequences.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id = Column(String(36), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    current_step_number = Column(Integer, default=1)
    status = Column(String(50), default="active", index=True)  # active, paused, completed, replied, cancelled
    next_run_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    last_sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    sequence = relationship("Sequence", back_populates="enrollments")
    lead = relationship("Lead")
