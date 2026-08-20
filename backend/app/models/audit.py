import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class AuditReport(Base):
    __tablename__ = "audit_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    lead_id = Column(String(36), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    website_url = Column(Text, nullable=False)
    
    # Audit Scores & Status
    health_score = Column(Integer, default=75)  # 0 to 100
    ssl_active = Column(String(10), default="Yes")
    mobile_optimized = Column(String(10), default="Yes")
    load_time_seconds = Column(String(20), default="1.2s")
    
    # JSON or Comma-separated detected items
    cms_platform = Column(String(100), default="Custom")
    payment_gateways = Column(Text, default="")    # e.g. "Stripe, PayPal, Afterpay"
    shipping_carriers = Column(Text, default="")   # e.g. "Australia Post, Sendle"
    marketing_pixels = Column(Text, default="")    # e.g. "Google Analytics 4, Meta Pixel"
    technologies_used = Column(Text, default="")   # e.g. "WordPress, Elementor, React"
    outdated_issues = Column(Text, default="")     # Issues found (e.g. "Outdated jQuery, Missing HSTS")
    pitch_opportunities = Column(Text, default="") # Key sales angles
    cold_email_draft = Column(Text, default="")    # Ready-to-send personalized email
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
