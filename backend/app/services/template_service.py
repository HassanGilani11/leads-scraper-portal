from typing import Optional
from app.models.lead import Lead
from app.models.audit import AuditReport
from app.core.database import SessionLocal

def extract_city(location: Optional[str], default_state: Optional[str] = "Australia") -> str:
    """
    Extract a clean Australian city or suburb name from various address formats.
    e.g.
    '123 Queen St, Brisbane QLD 4000' -> 'Brisbane'
    'Level 2, 80 Collins St, Melbourne VIC 3000' -> 'Melbourne'
    'Sydney NSW' -> 'Sydney'
    'Perth' -> 'Perth'
    """
    if not location:
        return default_state or "Australia"
    
    parts = [p.strip() for p in location.split(",") if p.strip()]
    if not parts:
        return default_state or "Australia"
    
    # Check parts in reverse order (city/suburb is almost always in the last or second-to-last part)
    for p in reversed(parts):
        tokens = p.split()
        city_tokens = [
            t for t in tokens 
            if not t.isdigit() and t.upper() not in ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT", "AUSTRALIA", "AU"]
        ]
        if not city_tokens:
            continue
        
        # If it doesn't look like a pure street address part
        street_indicators = {"st", "street", "rd", "road", "ave", "avenue", "dr", "drive", "lvl", "level", "suite", "unit", "bvd", "boulevard", "hwy", "highway", "pl", "place", "ct", "court"}
        if not any(t.lower().rstrip(".,") in street_indicators for t in city_tokens):
            return " ".join(city_tokens)

    # Fallback to cleaning the last component
    last_tokens = [
        t for t in parts[-1].split() 
        if not t.isdigit() and t.upper() not in ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT", "AUSTRALIA"]
    ]
    return " ".join(last_tokens) if last_tokens else parts[-1]


def render_template(template_str: str, lead: Lead, db: Optional[any] = None) -> str:
    """
    Interpolate dynamic personalization tags into email subject and HTML body.
    Supports enriched technical data from AuditReport if available.
    """
    if not template_str:
        return ""
    
    first_name = "Business Owner"
    if lead.contact_person:
        parts = lead.contact_person.strip().split()
        if parts:
            first_name = parts[0]

    city = extract_city(lead.office_location, lead.state)

    # Check for technical audit report
    audit_score = "82"
    cms_platform = "Custom Web Stack"
    load_time = "1.6s"
    top_issue = "Mobile Core Web Vitals and organic speed optimization"
    technologies = "Modern Web Platform"

    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        audit = db.query(AuditReport).filter(AuditReport.lead_id == lead.id).first()
        if audit:
            audit_score = str(audit.health_score) if audit.health_score else "82"
            cms_platform = audit.cms_platform or "Custom Web Stack"
            load_time = audit.load_time_seconds or "1.6s"
            if audit.outdated_issues:
                issue_list = [i.strip() for i in audit.outdated_issues.split(",") if i.strip()]
                if issue_list:
                    top_issue = issue_list[0]
            if audit.technologies_used:
                technologies = audit.technologies_used
    except Exception:
        pass
    finally:
        if close_db:
            db.close()

    niche = lead.niche or "Local Services"
    website_clean = lead.website.replace("https://", "").replace("http://", "").rstrip("/") if lead.website else "your website"

    replacements = {
        "{{company_name}}": lead.business_name or "your team",
        "{{business_name}}": lead.business_name or "your team",
        "{{contact_name}}": lead.contact_person or "Business Owner",
        "{{first_name}}": first_name,
        "{{city}}": city,
        "{{suburb}}": city,
        "{{state}}": lead.state or "Australia",
        "{{website}}": lead.website or "your website",
        "{{website_clean}}": website_clean,
        "{{phone}}": lead.phone_number or lead.office_contact or "",
        "{{niche}}": niche,
        "{{industry}}": niche,
        "{{audit_score}}": audit_score,
        "{{cms}}": cms_platform,
        "{{cms_platform}}": cms_platform,
        "{{load_time}}": load_time,
        "{{top_issue}}": top_issue,
        "{{technologies}}": technologies,
    }

    rendered = template_str
    for tag, val in replacements.items():
        rendered = rendered.replace(tag, str(val))
    return rendered
