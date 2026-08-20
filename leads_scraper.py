import os
from dotenv import load_dotenv
import argparse
import concurrent.futures
import re
import urllib.parse
from bs4 import BeautifulSoup
from locations import AUSTRALIA_LOCATIONS
import pandas as pd
from playwright.sync_api import sync_playwright
import requests

load_dotenv()  # Loads variables from .env file

APOLLO_API_KEY = os.getenv("APOLLO_API_KEY")


def clean_text(text: str) -> str:
    if not text:
        return ""
    return re.sub(r"[^\x00-\x7F]+", "", text).strip()


def extract_website_details(website_url: str):
    data = {"business_email": "", "linkedin_url": ""}
    if not website_url or not website_url.startswith("http"):
        return data

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    try:
        res = requests.get(website_url, headers=headers, timeout=4)
        if res.status_code == 200:
            html_text = res.text
            soup = BeautifulSoup(html_text, "html.parser")
            raw_emails = set(
                re.findall(
                    r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", html_text
                )
            )
            ignore_list = {
                "your@email.com",
                "example@email.com",
                "domain@example.com",
            }
            valid_emails = [
                e
                for e in raw_emails
                if e.lower() not in ignore_list
                and not e.lower().endswith(
                    (
                        ".png",
                        ".jpg",
                        ".jpeg",
                        ".svg",
                        ".gif",
                        ".webp",
                        ".css",
                        ".js",
                    )
                )
            ]
            if valid_emails:
                data["business_email"] = valid_emails[0]
            li = soup.find(
                "a", href=re.compile(r"linkedin\.com/(in|company)/", re.I)
            )
            if li:
                data["linkedin_url"] = li["href"]
    except Exception:
        pass
    return data


def fetch_apollo_company_data(domain: str, business_name: str):
    if not APOLLO_API_KEY:
        return {}

    url = "https://api.apollo.io/v1/organizations/enrich"
    headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": APOLLO_API_KEY,
    }

    clean_domain = ""
    if domain:
        parsed = urllib.parse.urlparse(domain)
        clean_domain = parsed.netloc.replace("www.", "").strip()

    params = {
        "domain": clean_domain if clean_domain else None,
        "name": business_name if not clean_domain else None,
    }

    company_info = {
        "Company Description": "",
        "Industries": "",
        "Keywords": "",
        "Founding Year": "",
        "Employee Count": "",
        "Technologies Used": "",
        "Company Rating/Score": "",
        "Subsidiaries": "",
    }

    try:
        res = requests.get(url, params=params, headers=headers, timeout=6)
        if res.status_code == 200:
            org = res.json().get("organization") or {}
            company_info["Company Description"] = org.get(
                "short_description", ""
            )
            company_info["Industries"] = ", ".join(org.get("industries", []))
            company_info["Keywords"] = ", ".join(org.get("keywords", []))
            company_info["Founding Year"] = org.get("founded_year", "")
            company_info["Employee Count"] = org.get(
                "estimated_num_employees", ""
            )
            company_info["Technologies Used"] = ", ".join(
                org.get("technology_names", [])
            )
            company_info["Company Rating/Score"] = org.get("alexa_ranking", "")
            company_info["Subsidiaries"] = (
                len(org.get("sub_organizations", []))
                if org.get("sub_organizations")
                else ""
            )
    except Exception:
        pass

    return company_info


def fetch_apollo_person_data(domain: str, business_name: str):
    if not APOLLO_API_KEY:
        return {}

    url = "https://api.apollo.io/v1/mixed_people/search"
    headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": APOLLO_API_KEY,
    }

    clean_domain = ""
    if domain:
        parsed = urllib.parse.urlparse(domain)
        clean_domain = parsed.netloc.replace("www.", "").strip()

    payload = {
        "q_organization_domains": (
            clean_domain if clean_domain else business_name
        ),
        "page": 1,
        "per_page": 5,
        "person_titles": [
            "Owner",
            "Director",
            "Managing Director",
            "Founder",
            "Manager",
            "Business Development Manager",
            "General Manager",
            "Estimator",
            "Coordinator",
        ],
    }

    person_info = {"Contact Person": "", "E-mail": "", "Linkedin URL": ""}

    try:
        res = requests.post(url, json=payload, headers=headers, timeout=6)
        if res.status_code == 200:
            people = res.json().get("people", [])
            if people:
                selected = people[0]
                for p in people:
                    title = (p.get("title") or "").lower()
                    if any(
                        t in title for t in ["owner", "director", "founder"]
                    ):
                        selected = p
                        break

                person_info["Contact Person"] = selected.get("name", "")
                person_info["E-mail"] = selected.get("email", "")
                person_info["Linkedin URL"] = selected.get("linkedin_url", "")
    except Exception:
        pass

    return person_info


def process_single_enrichment(item: dict):
    """Worker function for concurrent web and Apollo API enrichment."""
    domain = item.get("Website", "")
    name = item.get("Business Name", "")

    # 1. Website Footer Crawl
    if domain:
        web_details = extract_website_details(domain)
        item["Business Email"] = web_details["business_email"]
        if web_details["linkedin_url"]:
            item["Linkedin URL"] = web_details["linkedin_url"]

    # 2. Apollo Person Enrichment
    person_data = fetch_apollo_person_data(domain, name)
    if person_data.get("Contact Person"):
        item["Contact Person"] = person_data["Contact Person"]
    if person_data.get("E-mail"):
        item["E-mail"] = person_data["E-mail"]
    if person_data.get("Linkedin URL") and not item["Linkedin URL"]:
        item["Linkedin URL"] = person_data["Linkedin URL"]

    if not item["E-mail"]:
        item["E-mail"] = item["Business Email"]

    # 3. Apollo Company Enrichment
    company_data = fetch_apollo_company_data(domain, name)
    item.update(company_data)

    return item


def scrape_suburb(page, query: str):
    search_url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"
    page.goto(search_url, timeout=45000)
    page.wait_for_timeout(1500)

    scroll_feed = page.locator("div[role='feed']")
    if scroll_feed.count() > 0:
        for _ in range(8):
            scroll_feed.evaluate("el => el.scrollTop = el.scrollHeight")
            page.wait_for_timeout(800)

    card_links = page.locator("a[href*='/maps/place/']").all()
    place_urls = list(
        set(
            card.get_attribute("href")
            for card in card_links
            if card.get_attribute("href")
        )
    )

    suburb_leads = []
    for map_url in place_urls:
        try:
            page.goto(map_url, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(600)

            name_el = page.locator("h1").first
            name = name_el.text_content().strip() if name_el.count() > 0 else ""
            if not name or name.lower() in [
                "results",
                "search results",
                "directions",
            ]:
                continue

            phone_btn = page.locator(
                "button[data-item-id*='phone'], button[data-tooltip*='phone']"
            ).first
            phone = (
                clean_text(phone_btn.text_content())
                if phone_btn.count() > 0
                else ""
            )

            address_btn = page.locator(
                "button[data-item-id*='address'], button[data-tooltip*='address']"
            ).first
            address = (
                clean_text(address_btn.text_content())
                if address_btn.count() > 0
                else ""
            )

            website_btn = page.locator(
                "a[data-item-id*='authority'], a[data-tooltip*='website']"
            ).first
            website = (
                website_btn.get_attribute("href")
                if website_btn.count() > 0
                else ""
            )

            suburb_leads.append(
                {
                    "Business Name": name,
                    "URL": map_url,
                    "Website": website,
                    "Business Email": "",
                    "Office Location": address,
                    "Office Contact": phone,
                    "Contact Person": "",
                    "E-mail": "",
                    "Phone Number": phone,
                    "Linkedin URL": "",
                }
            )
        except Exception:
            continue

    return suburb_leads


def run_state_scrape(niche: str, state_code: str):
    suburbs = AUSTRALIA_LOCATIONS.get(state_code.upper(), [])
    if not suburbs:
        print(f"[!] Invalid state code '{state_code}'.")
        return

    all_raw_leads = []

    # Run Playwright in background headless mode for speed
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            viewport={"width": 1280, "height": 900},
        )
        page = context.new_page()

        print(
            f"[*] Extracting Niche: '{niche}' across {len(suburbs)} suburbs in {state_code.upper()}..."
        )
        for idx, suburb in enumerate(suburbs, 1):
            query = f"{niche} {suburb} {state_code}"
            print(f"[{idx}/{len(suburbs)}] Scraping query: '{query}'...")
            suburb_leads = scrape_suburb(page, query)
            all_raw_leads.extend(suburb_leads)

        browser.close()

    df_raw = pd.DataFrame(all_raw_leads)
    if df_raw.empty:
        print("[!] No records found.")
        return

    df_clean = df_raw.drop_duplicates(
        subset=["Business Name", "Phone Number"]
    ).copy()
    raw_leads_list = df_clean.to_dict("records")

    print(
        f"\n[✓] Extracted {len(df_clean)} unique listings. Starting multi-threaded Apollo & Web enrichment..."
    )

    # Parallel enrichment using 10 concurrent threads
    enriched_leads = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        results = list(
            executor.map(process_single_enrichment, raw_leads_list)
        )
        enriched_leads = results

    df_final = pd.DataFrame(enriched_leads)
    columns_order = [
        "Business Name",
        "URL",
        "Website",
        "Business Email",
        "Office Location",
        "Office Contact",
        "Contact Person",
        "E-mail",
        "Phone Number",
        "Linkedin URL",
        "Company Description",
        "Industries",
        "Keywords",
        "Founding Year",
        "Employee Count",
        "Technologies Used",
        "Company Rating/Score",
        "Subsidiaries",
    ]
    df_final = df_final[columns_order]

    output_filename = f"{niche.replace(' ', '_')}_{state_code.lower()}_leads.csv"
    df_final.to_csv(output_filename, index=False)
    print(
        f"\n[✓] Scrape complete! Saved {len(df_final)} fully enriched leads to '{output_filename}'."
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Fast Multi-Threaded Lead Scraper"
    )
    parser.add_argument("--niche", type=str, required=True, help="Target niche")
    parser.add_argument(
        "--state", type=str, required=True, help="State code (e.g., NSW)"
    )

    args = parser.parse_args()
    run_state_scrape(niche=args.niche, state_code=args.state)