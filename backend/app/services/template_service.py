from app.models.lead import Lead

def render_template(template_str: str, lead: Lead) -> str:
    """
    Interpolate dynamic personalization tags into email subject and HTML body.
    """
    if not template_str:
        return ""
    
    first_name = "Business Owner"
    if lead.contact_person:
        parts = lead.contact_person.strip().split()
        if parts:
            first_name = parts[0]

    replacements = {
        "{{company_name}}": lead.business_name or "your team",
        "{{business_name}}": lead.business_name or "your team",
        "{{contact_name}}": lead.contact_person or "Business Owner",
        "{{first_name}}": first_name,
        "{{city}}": lead.office_location.split(",")[0].strip() if lead.office_location else "Australia",
        "{{state}}": lead.state or "Australia",
        "{{website}}": lead.website or "your website",
        "{{phone}}": lead.phone_number or lead.office_contact or "",
        "{{audit_score}}": "85",
    }

    rendered = template_str
    for tag, val in replacements.items():
        rendered = rendered.replace(tag, str(val))
    return rendered
