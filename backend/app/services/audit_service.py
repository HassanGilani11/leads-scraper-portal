import re
import time
import urllib.parse
from datetime import datetime, timezone
import requests
from bs4 import BeautifulSoup

from app.core.database import SessionLocal
from app.models.lead import Lead
from app.models.audit import AuditReport

PAYMENT_SIGNATURES = {
    "Stripe": [r"js\.stripe\.com", r"stripe-button", r"data-stripe", r"stripe\.payment"],
    "PayPal": [r"paypal\.com/sdk", r"paypal-button", r"paypalobjects\.com"],
    "Square": [r"squareup\.com", r"square-payment", r"sq-payment"],
    "Afterpay": [r"afterpay\.js", r"afterpay-button", r"portal\.afterpay\.com", r"afterpay-placement"],
    "ZipPay / Zip": [r"zipmoney\.com\.au", r"static\.zipmoney", r"zip-widget", r"quadpay"],
    "Klarna": [r"klarna\.js", r"klarna-placement", r"klarna\.com"],
    "Shopify Payments": [r"shopify_pay", r"shop-pay", r"shopify-payment"],
    "eWAY": [r"eway\.com\.au", r"eway-rapid"],
    "Apple Pay": [r"apple-pay", r"applepay"],
    "Google Pay": [r"google-pay", r"googlepay", r"pay\.google\.com"],
    "WooCommerce Payments": [r"woocommerce-payments", r"wc-stripe"],
    "Braintree": [r"braintree-web", r"braintreegateway\.com"],
}

SHIPPING_SIGNATURES = {
    "Australia Post": [r"auspost\.com\.au", r"australia-post", r"eparcels", r"auspost"],
    "StarTrack": [r"startrack\.com\.au", r"star-track"],
    "Sendle": [r"sendle\.com", r"sendle-shipping"],
    "DHL Express": [r"dhl\.com", r"dhl-express", r"dhl\.svg"],
    "FedEx": [r"fedex\.com", r"fedex-shipping"],
    "CouriersPlease": [r"couriersplease\.com\.au"],
    "Shippit": [r"shippit\.com"],
    "ShipStation": [r"shipstation\.com"],
}

MARKETING_PIXEL_SIGNATURES = {
    "Google Analytics 4": [r"gtag\(['\"]config['\"],\s*['\"]G-", r"google-analytics\.com/g/collect"],
    "Google Tag Manager": [r"googletagmanager\.com/gtm\.js", r"GTM-[A-Z0-9]+"],
    "Meta Pixel (Facebook)": [r"connect\.facebook\.net/.*fbevents\.js", r"fbq\(['\"]init['\"]"],
    "HubSpot": [r"js\.hs-scripts\.com", r"hubspot\.js"],
    "Klaviyo": [r"static\.klaviyo\.com", r"_learnq"],
    "Mailchimp": [r"chimpstatic\.com", r"mailchimp\.com"],
    "Hotjar": [r"static\.hotjar\.com", r"_hjSettings"],
    "TikTok Pixel": [r"analytics\.tiktok\.com", r"ttq\.load"],
    "Intercom / LiveChat": [r"widget\.intercom\.io", r"livechatinc\.com", r"client\.crisp\.chat", r"tidio\.co"],
}

CMS_SIGNATURES = {
    "WordPress": [r"wp-content", r"wp-includes", r"wordpress"],
    "Shopify": [r"cdn\.shopify\.com", r"Shopify\.theme"],
    "WooCommerce": [r"woocommerce", r"wc-ajax"],
    "Squarespace": [r"squarespace\.com", r"squarespace-cdn"],
    "Wix": [r"wix\.com", r"wixstatic\.com"],
    "Webflow": [r"assets\.webflow\.com", r"webflow\.js"],
    "Magento": [r"static/_requirejs", r"mage/cookies\.js"],
    "BigCommerce": [r"cdn11\.bigcommerce\.com"],
    "Next.js / React": [r"/_next/", r"react-dom"],
}


def perform_website_audit(lead_id: str) -> dict:
    """
    Crawls and performs an in-depth technical, commercial, and SEO audit on a lead's website.
    Generates cold email angles and pitch opportunities.
    """
    db = SessionLocal()
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        db.close()
        raise ValueError("Lead not found")

    website_url = lead.website or ""
    if not website_url or not website_url.startswith("http"):
        # If lead has clean domain or no http
        if website_url:
            website_url = f"https://{website_url}"
        else:
            db.close()
            raise ValueError("Lead has no valid website URL to audit")

    start_time = time.time()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        res = requests.get(website_url, headers=headers, timeout=10, allow_redirects=True)
        load_time = round(time.time() - start_time, 2)
        html = res.text
        soup = BeautifulSoup(html, "html.parser")
        final_url = res.url
    except Exception as e:
        db.close()
        raise ValueError(f"Could not connect to {website_url}: {str(e)}")

    # 1. SSL / HTTPS & Security Headers
    is_ssl = final_url.startswith("https://")
    has_hsts = "strict-transport-security" in res.headers
    has_xframe = "x-frame-options" in res.headers

    # 2. Mobile Viewport & SEO
    viewport_meta = soup.find("meta", attrs={"name": "viewport"})
    is_mobile = bool(viewport_meta)
    desc_meta = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
    has_meta_desc = bool(desc_meta and desc_meta.get("content"))
    h1_tags = soup.find_all("h1")
    has_h1 = len(h1_tags) > 0

    # 3. Detect CMS Platform
    detected_cms = "Custom Built / Modern Web"
    for cms_name, sigs in CMS_SIGNATURES.items():
        if any(re.search(sig, html, re.I) for sig in sigs):
            detected_cms = cms_name
            break

    # 4. Detect Payment Gateways
    detected_payments = []
    for p_name, sigs in PAYMENT_SIGNATURES.items():
        if any(re.search(sig, html, re.I) for sig in sigs):
            detected_payments.append(p_name)

    # 5. Detect Shipping Carriers
    detected_shipping = []
    for s_name, sigs in SHIPPING_SIGNATURES.items():
        if any(re.search(sig, html, re.I) for sig in sigs):
            detected_shipping.append(s_name)

    # 6. Detect Marketing & Analytics Pixels
    detected_pixels = []
    for pix_name, sigs in MARKETING_PIXEL_SIGNATURES.items():
        if any(re.search(sig, html, re.I) for sig in sigs):
            detected_pixels.append(pix_name)

    # 7. Detect Outdated Versions & Vulnerabilities
    outdated_issues = []
    
    # Check jQuery version
    jq_match = re.search(r"jquery[.-]([0-9]+\.[0-9]+\.[0-9]+)", html, re.I)
    if jq_match:
        ver = jq_match.group(1)
        if ver.startswith("1.") or ver.startswith("2."):
            outdated_issues.append(f"Outdated jQuery v{ver} (Security & CVE Vulnerabilities)")

    if not is_ssl:
        outdated_issues.append("Missing SSL / HTTPS Encryption (Browser Insecure Warning)")
    if not has_hsts:
        outdated_issues.append("Missing HSTS Security Header (Vulnerable to SSL Strip)")
    if not is_mobile:
        outdated_issues.append("Missing Mobile Viewport Meta (Fails Google Mobile Friendly)")
    if not has_meta_desc:
        outdated_issues.append("Missing Meta Description (Lost Google Organic Click-Through)")
    if not has_h1:
        outdated_issues.append("Missing <h1> Tag Hierarchy (Sub-optimal On-Page SEO)")
    if load_time > 2.8:
        outdated_issues.append(f"Slow Page Response Time ({load_time}s > 2.0s standard)")
    if detected_cms == "WordPress" and "wp-json" in html:
        outdated_issues.append("Exposed WordPress REST API Endpoints (User Enumeration Risk)")

    # 8. Calculate Overall Health Score (0 - 100)
    score = 100
    if not is_ssl: score -= 25
    if not is_mobile: score -= 20
    if not has_meta_desc: score -= 10
    if not has_h1: score -= 5
    if not has_hsts: score -= 10
    if load_time > 2.8: score -= 10
    if any("Outdated jQuery" in iss for iss in outdated_issues): score -= 10
    if len(detected_pixels) == 0: score -= 10
    health_score = max(35, min(100, score))

    # 9. Formulate Sales Pitch Opportunities based on findings
    pitch_angles = []
    if not detected_payments and ("shop" in html.lower() or "cart" in html.lower() or detected_cms in ["WooCommerce", "Shopify"]):
        pitch_angles.append("Implement Modern BNPL Checkout (Afterpay, ZipPay, Stripe) to increase customer conversion by 20-30%.")
    elif "Afterpay" not in detected_payments and detected_cms in ["WooCommerce", "Shopify"]:
        pitch_angles.append("Add Afterpay / ZipPay BNPL payment gateway to capture younger Australian demographic.")

    if not any("Google Analytics 4" in p for p in detected_pixels):
        pitch_angles.append("Upgrade to Google Analytics 4 & Conversion Tag Manager to track true ROI from local Google Ads.")

    if not any("Meta Pixel" in p for p in detected_pixels):
        pitch_angles.append("Install Meta & Retargeting Pixels to recover lost website visitors with high-margin remarketing campaigns.")

    if outdated_issues:
        pitch_angles.append(f"Remediate technical & security flags ({', '.join(outdated_issues[:2])}) to protect search ranking and speed.")

    if load_time > 2.0:
        pitch_angles.append(f"Accelerate page load speeds from {load_time}s down to <1.0s to reduce bounce rates and improve Google Core Web Vitals.")

    if not pitch_angles:
        pitch_angles.append("Full Website Speed Optimization, Conversion Rate Audit & Local SEO Dominance Package.")

    # 10. Generate Personalized Cold Outreach Email Draft
    contact_name = lead.contact_person or "Team"
    if "(" in contact_name:
        contact_name = contact_name.split("(")[0].strip()
    
    first_issue = outdated_issues[0] if outdated_issues else "missing modern conversion tracking"
    primary_pitch = pitch_angles[0] if pitch_angles else "improve customer conversion rate"

    cold_email = f"""Subject: Quick question regarding {lead.business_name}'s website

Hi {contact_name},

I was looking at {lead.business_name}'s site ({website_url}) while researching leading {lead.niche or 'local'} businesses across {lead.state or 'Australia'}.

I ran a quick technical and performance scan on your site and noticed a few key opportunities:
• {first_issue}
• {primary_pitch}
• Current Page Response: {load_time}s (Industry benchmark: <1.5s)

We recently helped another local service business solve these exact technical gaps, resulting in an immediate 28% increase in direct quote enquiries.

I've put together a comprehensive technical audit report for your review (attached as PDF).

Would you be open to a brief 5-minute chat this Thursday to see how we can fix this for you?

Best regards,
LeadPulse Growth Solutions
"""

    # Persist or update in database
    existing_report = db.query(AuditReport).filter(AuditReport.lead_id == lead_id).first()
    if not existing_report:
        existing_report = AuditReport(
            lead_id=lead_id,
            website_url=website_url,
            health_score=health_score,
            ssl_active="Yes (Active)" if is_ssl else "No (Insecure)",
            mobile_optimized="Yes (Responsive)" if is_mobile else "No (Missing Viewport)",
            load_time_seconds=f"{load_time}s",
            cms_platform=detected_cms,
            payment_gateways=", ".join(detected_payments) if detected_payments else "None Detected",
            shipping_carriers=", ".join(detected_shipping) if detected_shipping else "None / Standard",
            marketing_pixels=", ".join(detected_pixels) if detected_pixels else "None Detected",
            technologies_used=", ".join(list(dict.fromkeys([detected_cms] + (lead.technologies_used.split(', ') if lead.technologies_used else [])))),
            outdated_issues=" | ".join(outdated_issues) if outdated_issues else "None Detected (Clean)",
            pitch_opportunities=" | ".join(pitch_angles),
            cold_email_draft=cold_email.strip()
        )
        db.add(existing_report)
    else:
        existing_report.health_score = health_score
        existing_report.ssl_active = "Yes (Active)" if is_ssl else "No (Insecure)"
        existing_report.mobile_optimized = "Yes (Responsive)" if is_mobile else "No (Missing Viewport)"
        existing_report.load_time_seconds = f"{load_time}s"
        existing_report.cms_platform = detected_cms
        existing_report.payment_gateways = ", ".join(detected_payments) if detected_payments else "None Detected"
        existing_report.shipping_carriers = ", ".join(detected_shipping) if detected_shipping else "None / Standard"
        existing_report.marketing_pixels = ", ".join(detected_pixels) if detected_pixels else "None Detected"
        existing_report.technologies_used = ", ".join(list(dict.fromkeys([detected_cms] + (lead.technologies_used.split(', ') if lead.technologies_used else []))))
        existing_report.outdated_issues = " | ".join(outdated_issues) if outdated_issues else "None Detected (Clean)"
        existing_report.pitch_opportunities = " | ".join(pitch_angles)
        existing_report.cold_email_draft = cold_email.strip()
        existing_report.created_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(existing_report)
    db.close()

    return {
        "id": existing_report.id,
        "lead_id": existing_report.lead_id,
        "website_url": existing_report.website_url,
        "health_score": existing_report.health_score,
        "ssl_active": existing_report.ssl_active,
        "mobile_optimized": existing_report.mobile_optimized,
        "load_time_seconds": existing_report.load_time_seconds,
        "cms_platform": existing_report.cms_platform,
        "payment_gateways": existing_report.payment_gateways,
        "shipping_carriers": existing_report.shipping_carriers,
        "marketing_pixels": existing_report.marketing_pixels,
        "technologies_used": existing_report.technologies_used,
        "outdated_issues": existing_report.outdated_issues,
        "pitch_opportunities": existing_report.pitch_opportunities,
        "cold_email_draft": existing_report.cold_email_draft,
        "created_at": existing_report.created_at
    }
