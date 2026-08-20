import time
import requests
import json
from sqlalchemy import Column, String, Text, DateTime
from datetime import datetime, timezone
from app.core.database import Base, SessionLocal

class ApolloCache(Base):
    """Stores cached Apollo API responses by domain to avoid repeating API calls."""
    __tablename__ = "apollo_cache"

    domain = Column(String(255), primary_key=True, index=True)
    org_data_json = Column(Text, nullable=True)
    people_data_json = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

def get_cached_apollo_data(domain: str) -> tuple[dict | None, dict | None]:
    if not domain:
        return None, None
    db = SessionLocal()
    try:
        cache_entry = db.query(ApolloCache).filter(ApolloCache.domain == domain.lower().strip()).first()
        if cache_entry:
            org = json.loads(cache_entry.org_data_json) if cache_entry.org_data_json else None
            people = json.loads(cache_entry.people_data_json) if cache_entry.people_data_json else None
            return org, people
    except Exception:
        pass
    finally:
        db.close()
    return None, None

def save_apollo_cache(domain: str, org_data: dict = None, people_data: dict = None):
    if not domain:
        return
    db = SessionLocal()
    try:
        domain_key = domain.lower().strip()
        entry = db.query(ApolloCache).filter(ApolloCache.domain == domain_key).first()
        if not entry:
            entry = ApolloCache(
                domain=domain_key,
                org_data_json=json.dumps(org_data) if org_data else None,
                people_data_json=json.dumps(people_data) if people_data else None
            )
            db.add(entry)
        else:
            if org_data:
                entry.org_data_json = json.dumps(org_data)
            if people_data:
                entry.people_data_json = json.dumps(people_data)
            entry.updated_at = datetime.now(timezone.utc)
        db.commit()
    except Exception:
        pass
    finally:
        db.close()
