import os
import re
import urllib.parse
import concurrent.futures
import time
from datetime import datetime, timezone
import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

from app.core.config import settings
from app.core.database import SessionLocal, Base, engine
from app.models.job import Job
from app.models.lead import Lead
from app.models.apollo_cache import get_cached_apollo_data, save_apollo_cache, ApolloCache
from app.services.locations import AUSTRALIA_LOCATIONS
from app.services.websocket_manager import WebSocketManager, websocket_manager as default_ws_manager

# Ensure tables are created
Base.metadata.create_all(bind=engine)

# In-memory Apollo rate limiter tracker
APOLLO_CALL_TIMESTAMPS = []
MAX_APOLLO_PER_HOUR = 180  # Safe threshold below Apollo's 200/hr hard limit

def get_apollo_api_key() -> str:
    """Get the most up-to-date Apollo API key from runtime settings or environment."""
    return settings.APOLLO_API_KEY or os.getenv("APOLLO_API_KEY", "")

def can_call_apollo() -> bool:
    """Checks whether we have available API calls in our rolling 1-hour window."""
    global APOLLO_CALL_TIMESTAMPS
    now = time.time()
    # Keep only timestamps within last 3600 seconds (1 hour)
    APOLLO_CALL_TIMESTAMPS = [t for t in APOLLO_CALL_TIMESTAMPS if now - t < 3600]
    return len(APOLLO_CALL_TIMESTAMPS) < MAX_APOLLO_PER_HOUR

def record_apollo_call():
    global APOLLO_CALL_TIMESTAMPS
    APOLLO_CALL_TIMESTAMPS.append(time.time())

def clean_text(text: str) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", text)
    cleaned = cleaned.replace("\xa0", " ").replace("\u202f", " ")
    return re.sub(r"\s+", " ", cleaned).strip()

def extract_australian_phone(text: str) -> str:
    """Extract Australian mobile or landline phone numbers from text snippet."""
    if not text:
        return ""
    clean = text.replace("\u202f", " ").replace("\xa0", " ")
    patterns = [
        r"(\+?61\s?4\d{2}\s?\d{3}\s?\d{3})",
        r"(\+?61\s?[2378]\s?\d{4}\s?\d{4})",
        r"(\+?61\s?1300\s?\d{3}\s?\d{3})",
        r"(\+?61\s?1800\s?\d{3}\s?\d{3})",
        r"(04\d{2}\s?\d{3}\s?\d{3})",
        r"(0[2378]\s?\d{4}\s?\d{4})",
        r"(\(0[2378]\)\s?\d{4}\s?\d{4})",
        r"(1300\s?\d{3}\s?\d{3})",
        r"(1800\s?\d{3}\s?\d{3})",
        r"(\+?61\s?\d{1,4}\s?\d{3,4}\s?\d{3,4})"
    ]
    for pat in patterns:
        m = re.search(pat, clean)
        if m:
            return m.group(1).strip()
    return ""

IGNORE_EMAIL_PATTERNS = [
    r"sentry", r"wixpress", r"wix\.com", r"squarespace", r"cloudflare",
    r"bugsnag", r"webpack", r"example\.com", r"your@email\.com",
    r"domain@example\.com", r"schema\.org", r"wordpress", r"shopify\.com",
    r"email@email\.com", r"user\.js", r"\.png$", r"\.jpg$", r"\.webp$",
    r"\.svg$", r"\.css$", r"\.js$", r"\.woff$"
]

def extract_deep_website_data(website_url: str, business_name: str = "") -> dict:
    """
    Scrapes website directly to extract real business emails, decision maker contacts,
    social links, Australian ABN & license numbers, founding year, tech stack, and description.
    """
    data = {
        "business_email": "",
        "phone_number": "",
        "contact_person": "",
        "linkedin_url": "",
        "facebook_url": "",
        "instagram_url": "",
        "abn": "",
        "license": "",
        "founding_year": "",
        "company_description": "",
        "technologies_detected": [],
        "keywords": []
    }
    if not website_url or not website_url.startswith("http"):
        return data

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        res = requests.get(website_url, headers=headers, timeout=6)
        if res.status_code != 200:
            return data

        html = res.text
        soup = BeautifulSoup(html, "html.parser")
        parsed_url = urllib.parse.urlparse(website_url)
        domain = parsed_url.netloc.replace("www.", "").lower()
        domain_root = domain.split(".")[0] if domain else ""

        # 1. Clean Business Email Extraction
        candidate_emails = []
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if href.lower().startswith("mailto:"):
                clean_mail = href.split("?")[0].replace("mailto:", "").strip()
                if clean_mail and "@" in clean_mail:
                    candidate_emails.append(clean_mail)

        raw_regex_emails = re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", html)
        candidate_emails.extend(raw_regex_emails)

        valid_emails = []
        for e in candidate_emails:
            e_lower = e.lower().strip()
            if any(re.search(pat, e_lower) for pat in IGNORE_EMAIL_PATTERNS):
                continue
            if len(e_lower) > 40:
                continue
            if e_lower not in valid_emails:
                valid_emails.append(e_lower)

        def email_priority_score(e: str) -> int:
            score = 0
            if domain_root and domain_root in e:
                score += 20
            if any(e.startswith(p) for p in ["admin@", "info@", "contact@", "enquiries@", "hello@", "office@", "sales@", "service@"]):
                score += 10
            return score

        if valid_emails:
            valid_emails.sort(key=email_priority_score, reverse=True)
            data["business_email"] = valid_emails[0]

        # 2. Social Links
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            href_lower = href.lower()
            if "linkedin.com/" in href_lower and not data["linkedin_url"]:
                if not any(x in href_lower for x in ["sharing", "shareArticle"]):
                    data["linkedin_url"] = href
            elif "facebook.com/" in href_lower and not data["facebook_url"]:
                if not any(x in href_lower for x in ["sharer", "facebook.com/tr", "plugins"]):
                    data["facebook_url"] = href
            elif "instagram.com/" in href_lower and not data["instagram_url"]:
                data["instagram_url"] = href

        text_content = clean_text(soup.get_text(separator=" "))

        # 3. Australian ABN & Contractor License
        abn_match = re.search(r"\bABN\b\s*[:\s]*([0-9]{2,4}(?:\s?[0-9]{3,4}){2,3})", text_content, re.I)
        if abn_match:
            data["abn"] = f"ABN: {abn_match.group(1).strip()}"
            data["keywords"].append(data["abn"])

        lic_match = re.search(r"\b(?:License|Licence)\s*(?:Number|No\.?|#)\s*[:\s]*([0-9A-Za-z\-]+)", text_content, re.I)
        if lic_match:
            lic_val = lic_match.group(1).strip()
            if len(lic_val) >= 4 and not lic_val.lower() in ["number", "required", "details"]:
                data["license"] = f"Lic: {lic_val}"
                data["keywords"].append(data["license"])

        # 4. Founding Year / Experience
        est_match = re.search(r"\b(?:est\.?|established|founded|since)\s*[:\s]*(\d{4})\b", text_content, re.I)
        if est_match:
            yr = int(est_match.group(1))
            if 1900 <= yr <= datetime.now().year:
                data["founding_year"] = str(yr)

        if not data["founding_year"]:
            exp_match = re.search(r"(?:with\s+)?(?:over\s+)?(\d+)\s*\+?\s*years\s+(?:of\s+)?(?:industry\s+)?experience", text_content, re.I)
            if exp_match:
                years_exp = int(exp_match.group(1))
                if 1 <= years_exp <= 80:
                    data["founding_year"] = str(datetime.now().year - years_exp)

        if not data["founding_year"]:
            copy_match = re.search(r"Copyright\s*(?:©|&copy;|\(c\))?\s*(\d{4})", text_content, re.I)
            if copy_match:
                yr = int(copy_match.group(1))
                if 1990 <= yr <= datetime.now().year:
                    data["founding_year"] = str(yr)

        # 5. Company Description from Meta Tags or About paragraph
        meta_desc = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
        if meta_desc and meta_desc.get("content"):
            data["company_description"] = clean_text(meta_desc.get("content"))
        else:
            p_tags = [clean_text(p.text) for p in soup.find_all("p") if len(clean_text(p.text)) > 40]
            if p_tags:
                data["company_description"] = p_tags[0][:300]

        # 6. Tech Stack Detection
        techs = []
        html_lower = html.lower()
        if "wp-content" in html or "wordpress" in html_lower:
            techs.append("WordPress")
        if "wix.com" in html or "wixstatic" in html_lower:
            techs.append("Wix")
        if "squarespace" in html_lower:
            techs.append("Squarespace")
        if "shopify" in html_lower:
            techs.append("Shopify")
        if "elementor" in html_lower:
            techs.append("Elementor")
        if "google-analytics.com" in html or "googletagmanager.com" in html:
            techs.append("Google Analytics")
        if "react" in html_lower or "_next" in html:
            techs.append("React")
        if "cloudflare" in html_lower:
            techs.append("Cloudflare")
        data["technologies_detected"] = techs

    except Exception:
        pass

    return data


def fetch_apollo_company_data(clean_domain: str, business_name: str, api_key: str = "") -> dict:
    """Fetch organization enrichment data with cache lookup and rate budget protection."""
    key = api_key or get_apollo_api_key()
    company_info = {
        "company_description": "",
        "industries": "",
        "keywords": "",
        "founding_year": "",
        "employee_count": "",
        "technologies_used": "",
        "company_rating": "",
        "subsidiaries": "",
    }

    if not key or not clean_domain:
        return company_info

    # 1. Check local cache first (0 credits, instant response)
    cached_org, _ = get_cached_apollo_data(clean_domain)
    if cached_org:
        company_info["company_description"] = clean_text(cached_org.get("short_description", ""))
        company_info["industries"] = ", ".join(cached_org.get("industries", []))
        company_info["keywords"] = ", ".join(cached_org.get("keywords", []))
        company_info["founding_year"] = str(cached_org.get("founded_year") or "")
        company_info["employee_count"] = str(cached_org.get("estimated_num_employees") or "")
        company_info["technologies_used"] = ", ".join(cached_org.get("technology_names", []))
        company_info["company_rating"] = str(cached_org.get("alexa_ranking") or "")
        company_info["subsidiaries"] = (
            str(len(cached_org.get("sub_organizations", [])))
            if cached_org.get("sub_organizations")
            else ""
        )
        return company_info

    # 2. Check rate limit budget
    if not can_call_apollo():
        return company_info

    url = "https://api.apollo.io/v1/organizations/enrich"
    headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": key,
    }

    params = {
        "domain": clean_domain if clean_domain else None,
        "name": business_name if not clean_domain else None,
    }

    try:
        record_apollo_call()
        res = requests.get(url, params=params, headers=headers, timeout=6)
        if res.status_code == 200:
            org = res.json().get("organization") or {}
            save_apollo_cache(clean_domain, org_data=org)

            company_info["company_description"] = clean_text(org.get("short_description", ""))
            company_info["industries"] = ", ".join(org.get("industries", []))
            company_info["keywords"] = ", ".join(org.get("keywords", []))
            company_info["founding_year"] = str(org.get("founded_year") or "")
            company_info["employee_count"] = str(org.get("estimated_num_employees") or "")
            company_info["technologies_used"] = ", ".join(org.get("technology_names", []))
            company_info["company_rating"] = str(org.get("alexa_ranking") or "")
            company_info["subsidiaries"] = (
                str(len(org.get("sub_organizations", [])))
                if org.get("sub_organizations")
                else ""
            )
    except Exception:
        pass

    return company_info


def fetch_apollo_person_data(clean_domain: str, business_name: str, api_key: str = "") -> dict:
    """Fetch decision makers using api_search with cache lookup and rate budget protection."""
    key = api_key or get_apollo_api_key()
    person_info = {"contact_person": "", "email": "", "linkedin_url": ""}

    if not key or not clean_domain:
        return person_info

    # 1. Check local cache first
    _, cached_people = get_cached_apollo_data(clean_domain)
    if cached_people:
        if cached_people.get("contact_person"):
            person_info["contact_person"] = cached_people["contact_person"]
        if cached_people.get("email"):
            person_info["email"] = cached_people["email"]
        if cached_people.get("linkedin_url"):
            person_info["linkedin_url"] = cached_people["linkedin_url"]
        return person_info

    # 2. Check rate limit budget
    if not can_call_apollo():
        return person_info

    url = "https://api.apollo.io/v1/mixed_people/api_search"
    headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": key,
    }

    payload = {
        "q_organization_domains": clean_domain,
        "page": 1,
        "per_page": 5,
        "person_titles": [
            "Owner",
            "Director",
            "Managing Director",
            "Founder",
            "Principal",
            "Partner",
            "Manager",
            "General Manager",
        ],
    }

    try:
        record_apollo_call()
        res = requests.post(url, json=payload, headers=headers, timeout=6)
        if res.status_code == 200:
            people = res.json().get("people", [])
            if people:
                selected = people[0]
                for p in people:
                    title = (p.get("title") or "").lower()
                    if any(t in title for t in ["owner", "director", "founder", "principal", "partner"]):
                        selected = p
                        break

                p_name = selected.get("name") or f"{selected.get('first_name', '')} {selected.get('last_name', '')}".strip()
                p_title = selected.get("title") or ""
                full_display = f"{p_name} ({p_title})" if p_title and p_name else (p_name or p_title)
                
                person_info["contact_person"] = clean_text(full_display)
                person_info["email"] = selected.get("email", "")
                person_info["linkedin_url"] = selected.get("linkedin_url", "")

                save_apollo_cache(clean_domain, people_data=person_info)
    except Exception:
        pass

    return person_info


def process_single_enrichment(item: dict, api_key: str = "") -> dict:
    """
    Hybrid Dual-Layer Enrichment Worker:
    1. Deep Website Crawler extracts direct email, phone, ABN, license, socials, and tech.
    2. Apollo.io REST API extracts executive names, titles, firmographics, and keywords.
    3. Respects hourly rate limits and caches results to preserve Apollo quota.
    """
    domain = item.get("website", "")
    name = item.get("business_name", "")

    clean_domain = ""
    if domain and domain.startswith("http"):
        parsed = urllib.parse.urlparse(domain)
        clean_domain = parsed.netloc.replace("www.", "").strip().lower()

    # 1. Deep Website Crawl
    if domain:
        web_details = extract_deep_website_data(domain, name)
        if web_details.get("business_email"):
            item["business_email"] = web_details["business_email"]
        if web_details.get("linkedin_url") and not item.get("linkedin_url"):
            item["linkedin_url"] = web_details["linkedin_url"]
        if web_details.get("founding_year") and not item.get("founding_year"):
            item["founding_year"] = web_details["founding_year"]
        if web_details.get("company_description") and not item.get("company_description"):
            item["company_description"] = web_details["company_description"]
        if web_details.get("technologies_detected"):
            existing_techs = item.get("technologies_used", "").split(", ") if item.get("technologies_used") else []
            combined_techs = list(dict.fromkeys(existing_techs + web_details["technologies_detected"]))
            item["technologies_used"] = ", ".join(combined_techs)
        if web_details.get("keywords"):
            item["keywords"] = ", ".join(web_details["keywords"])

    # 2. Apollo Executive & Decision Maker Search
    if clean_domain:
        person_data = fetch_apollo_person_data(clean_domain, name, api_key=api_key)
        if person_data.get("contact_person"):
            item["contact_person"] = person_data["contact_person"]
        if person_data.get("email"):
            item["email"] = person_data["email"]
        if person_data.get("linkedin_url") and not item.get("linkedin_url"):
            item["linkedin_url"] = person_data["linkedin_url"]

    # Fallback email
    if not item.get("email") and item.get("business_email"):
        item["email"] = item["business_email"]

    # 3. Apollo Company Firmographics & 47+ Keywords
    if clean_domain:
        company_data = fetch_apollo_company_data(clean_domain, name, api_key=api_key)
        for k, v in company_data.items():
            if v:
                if k == "keywords" and item.get("keywords"):
                    # Combine ABN/Lic with Apollo keywords
                    item["keywords"] = f"{item['keywords']}, {v}"
                elif not item.get(k):
                    item[k] = v

    if not item.get("industries"):
        item["industries"] = item.get("niche", "Local Commercial Services")

    return item


def scrape_suburb(page, query: str, suburb: str = "", state_code: str = "") -> list[dict]:
    """
    High-performance Google Maps search scraper.
    Extracts all listings directly from search feed cards with zero per-place round trips.
    """
    search_url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"
    page.goto(search_url, wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(2000)

    # Handle Google Cookie Consent popup if present
    try:
        consent_btn = page.locator("button:has-text('Accept all'), button:has-text('I agree'), button:has-text('Agree')").first
        if consent_btn.count() > 0 and consent_btn.is_visible():
            consent_btn.click()
            page.wait_for_timeout(1000)
    except Exception:
        pass

    scroll_feed = page.locator("div[role='feed']")
    if scroll_feed.count() > 0:
        for _ in range(5):
            scroll_feed.evaluate("el => el.scrollTop = el.scrollHeight")
            page.wait_for_timeout(700)

    card_elements = page.locator("div.Nv2PK").all()
    suburb_leads = []

    for card in card_elements:
        try:
            name_el = card.locator("a.hfpxzc").first
            name = name_el.get_attribute("aria-label") if name_el.count() > 0 else ""
            if not name:
                title_el = card.locator("div.fontHeadlineSmall, div.qBF1Pd").first
                name = title_el.text_content().strip() if title_el.count() > 0 else ""
            
            if not name or name.lower() in ["results", "search results", "directions"]:
                continue

            map_url = name_el.get_attribute("href") if name_el.count() > 0 else ""

            website_el = card.locator("a[data-value='Website'], a[aria-label*='website'], a[aria-label*='Website'], a.lcr4fd").first
            website = website_el.get_attribute("href") if website_el.count() > 0 else ""

            card_text = card.inner_text()
            phone = extract_australian_phone(card_text)

            lines = [clean_text(l) for l in card_text.split("\n") if clean_text(l)]
            address = ""
            for line in lines:
                lower_l = line.lower()
                if any(kw in lower_l for kw in ["open", "closed", "closes", "opens", "website", "directions", "share"]):
                    continue
                if any(kw in lower_l for kw in [" st", " rd", " ave", " pty", " cct", " dr", " cnr", " hwy", " cway", " lane", " blvd", " suite", " level", " floor"]) or re.search(r"\d+\s+[A-Za-z]+", line):
                    address = line
                    break
            
            if not address:
                address = f"{suburb}, {state_code} Australia" if suburb else f"{state_code}, Australia"

            suburb_leads.append({
                "business_name": clean_text(name),
                "url": map_url,
                "website": website,
                "business_email": "",
                "office_location": clean_text(address),
                "office_contact": phone,
                "contact_person": "",
                "email": "",
                "phone_number": phone,
                "linkedin_url": "",
                "company_description": "",
                "industries": "",
                "keywords": "",
                "founding_year": "",
                "employee_count": "",
                "technologies_used": "",
                "company_rating": "",
                "subsidiaries": "",
                "state": state_code,
            })
        except Exception:
            continue

    return suburb_leads


def run_scrape_job(
    niche: str,
    state: str,
    job_id: str,
    ws_manager: WebSocketManager = default_ws_manager,
    custom_suburbs: list[str] = None
) -> dict:
    """
    Main job executor for scraping and enriching leads.
    Streams real-time updates through ws_manager and updates the SQLite database.
    """
    state_code = state.strip().upper()
    suburbs = custom_suburbs if custom_suburbs is not None else AUSTRALIA_LOCATIONS.get(state_code, [])

    db = SessionLocal()
    job = db.query(Job).filter(Job.id == job_id).first()

    def log(message: str, level: str = "info", data: dict = None):
        ws_manager.send_log_threadsafe(job_id, message, level=level, data=data)

    if not suburbs:
        msg = f"Invalid or unsupported Australian state code '{state_code}'."
        log(f"[!] Error: {msg}", level="error")
        if job:
            job.status = "failed"
            job.error_message = msg
            db.commit()
        db.close()
        return {"status": "failed", "error": msg}

    if job:
        job.status = "running"
        db.commit()

    log(f"[*] Initialized Scrape Job [{job_id[:8]}]", level="info", data={"status": "running"})
    log(f"[*] Target Niche: '{niche}' | State: {state_code} ({len(suburbs)} suburbs queued)", level="info")
    
    apollo_key = get_apollo_api_key()
    if apollo_key:
        log("[✓] Apollo API key detected. Safe Rate-Budgeted Dual Enrichment active.", level="info")
    else:
        log("[!] Warning: Apollo API key is not configured. Deep Website Crawler will be used.", level="warning")

    all_raw_leads = []
    total_suburbs = len(suburbs)

    try:
        log("[*] Launching headless browser crawler...", level="info")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 900},
                locale="en-AU"
            )
            page = context.new_page()

            for idx, suburb in enumerate(suburbs, 1):
                query = f"{niche} {suburb} {state_code}"
                log(
                    f"[{idx}/{total_suburbs}] Scraping suburb: '{suburb}' -> Query: '{query}'...",
                    level="progress",
                    data={"suburb_index": idx, "total_suburbs": total_suburbs, "suburb": suburb}
                )

                suburb_leads = scrape_suburb(page, query, suburb=suburb, state_code=state_code)
                all_raw_leads.extend(suburb_leads)

                log(
                    f"  ↳ Extracted {len(suburb_leads)} listings in '{suburb}' (Running Total: {len(all_raw_leads)})",
                    level="info",
                    data={"found_count": len(all_raw_leads)}
                )

                if job:
                    job.found_count = len(all_raw_leads)
                    db.commit()

            browser.close()

    except Exception as e:
        err_msg = f"Browser scraping error: {str(e)}"
        log(f"[!] {err_msg}", level="error")
        if job:
            job.status = "failed"
            job.error_message = err_msg
            db.commit()
        db.close()
        return {"status": "failed", "error": err_msg}

    if not all_raw_leads:
        log("[!] No listings discovered across the specified locations.", level="warning")
        if job:
            job.status = "completed"
            job.total_leads = 0
            job.found_count = 0
            job.enriched_count = 0
            db.commit()
        db.close()
        return {"status": "completed", "total_leads": 0}

    # Deduplicate leads cleanly by Business Name
    seen = set()
    raw_leads_list = []
    for lead in all_raw_leads:
        key = (lead.get("business_name") or "").lower().strip()
        if not key:
            continue
        if key not in seen:
            seen.add(key)
            raw_leads_list.append(lead)

    unique_count = len(raw_leads_list)
    log(
        f"[✓] Extracted {unique_count} unique commercial listings. Starting multi-threaded Apollo & Deep Web enrichment...",
        level="success",
        data={"unique_count": unique_count}
    )

    enriched_leads = []
    enriched_counter = 0
    error_counter = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_lead = {
            executor.submit(process_single_enrichment, lead, apollo_key): lead
            for lead in raw_leads_list
        }
        for future in concurrent.futures.as_completed(future_to_lead):
            try:
                res = future.result()
                enriched_leads.append(res)
                enriched_counter += 1
                if enriched_counter % 5 == 0 or enriched_counter == unique_count:
                    log(
                        f"  ↳ Enriched {enriched_counter}/{unique_count} leads ({(enriched_counter/unique_count)*100:.1f}%)",
                        level="progress",
                        data={"enriched_count": enriched_counter, "total": unique_count}
                    )
            except Exception as e:
                error_counter += 1
                lead_data = future_to_lead[future]
                enriched_leads.append(lead_data)
                log(f"[!] Error enriching lead: {str(e)}", level="warning")

    # Persist leads into SQLite database
    log(f"[*] Persisting {len(enriched_leads)} leads to the database...", level="info")
    try:
        for lead_dict in enriched_leads:
            lead_model = Lead(
                job_id=job_id,
                niche=niche,
                state=state_code,
                business_name=lead_dict.get("business_name") or "",
                url=lead_dict.get("url") or "",
                website=lead_dict.get("website") or "",
                business_email=lead_dict.get("business_email") or "",
                office_location=lead_dict.get("office_location") or "",
                office_contact=lead_dict.get("office_contact") or "",
                contact_person=lead_dict.get("contact_person") or "",
                email=lead_dict.get("email") or "",
                phone_number=lead_dict.get("phone_number") or "",
                linkedin_url=lead_dict.get("linkedin_url") or "",
                company_description=lead_dict.get("company_description") or "",
                industries=lead_dict.get("industries") or "",
                keywords=lead_dict.get("keywords") or "",
                founding_year=str(lead_dict.get("founding_year") or ""),
                employee_count=str(lead_dict.get("employee_count") or ""),
                technologies_used=lead_dict.get("technologies_used") or "",
                company_rating=str(lead_dict.get("company_rating") or ""),
                subsidiaries=str(lead_dict.get("subsidiaries") or ""),
            )
            db.add(lead_model)

        if job:
            job.status = "completed"
            job.total_leads = len(enriched_leads)
            job.found_count = len(all_raw_leads)
            job.enriched_count = enriched_counter
            job.error_count = error_counter
            job.updated_at = datetime.now(timezone.utc)
            db.commit()

        log(
            f"[✓] Job Completed Successfully! Saved {len(enriched_leads)} leads with 18 enriched fields to Database.",
            level="success",
            data={"status": "completed", "total_leads": len(enriched_leads)}
        )
    except Exception as e:
        err_msg = f"Database save error: {str(e)}"
        log(f"[!] {err_msg}", level="error")
        if job:
            job.status = "failed"
            job.error_message = err_msg
            db.commit()
    finally:
        db.close()

    return {
        "status": "completed",
        "job_id": job_id,
        "total_leads": len(enriched_leads),
        "found_count": len(all_raw_leads),
        "enriched_count": enriched_counter,
        "error_count": error_counter,
    }


if __name__ == "__main__":
    import argparse
    import uuid

    parser = argparse.ArgumentParser(description="Fast Multi-Threaded Lead Scraper & Enricher")
    parser.add_argument("--niche", type=str, required=True, help="Target niche (e.g. Plumber)")
    parser.add_argument("--state", type=str, required=True, help="State code (e.g. NSW)")
    args = parser.parse_args()

    test_job_id = str(uuid.uuid4())
    print(f"Starting standalone scrape for '{args.niche}' in {args.state} (Job ID: {test_job_id})...")
    res = run_scrape_job(niche=args.niche, state=args.state, job_id=test_job_id)
    print("Result:", res)