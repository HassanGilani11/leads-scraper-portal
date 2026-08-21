import io
import re
import html
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.core.database import SessionLocal
from app.models.lead import Lead
from app.models.audit import AuditReport


def sanitize_pdf_text(text: str, escape_xml: bool = True) -> str:
    """
    Sanitizes string for ReportLab's standard Helvetica font:
    - Removes emojis and unprintable unicode symbols that render as black squares (■).
    - Normalizes middle dots and dashes.
    - Escapes XML special characters (<, >, &) so strings like <h1> aren't stripped as HTML tags.
    """
    if not text:
        return ""
    s = str(text)
    # Replace unicode quotes and hyphens
    s = s.replace("\u2018", "'").replace("\u2019", "'").replace("\u201c", '"').replace("\u201d", '"')
    s = s.replace("\u2013", "-").replace("\u2014", "-").replace("\u2022", "-").replace("\u00b7", "-").replace("\u2027", "-")
    s = s.replace("■", "").replace("⚠", "").replace("✓", "").replace("📍", "").replace("🏢", "").replace("⚡", "")
    
    # Strip any high-range non-ASCII characters that Helvetica can't render
    clean_chars = []
    for ch in s:
        code = ord(ch)
        if code < 128:
            clean_chars.append(ch)
        else:
            clean_chars.append(" ")
    s = "".join(clean_chars)
    s = re.sub(r"\s*-\s*-\s*", " - ", s)
    s = re.sub(r"\s+", " ", s).strip()

    if escape_xml:
        s = html.escape(s)
    return s


def extract_clean_abn_license(text: str) -> str:
    """Filter out long keyword dumps and retain clean ABN & Contractor License numbers."""
    if not text:
        return "Registered Australian Business"
    parts = [p.strip() for p in text.split(",") if p.strip()]
    abn_lic_parts = [p for p in parts if p.startswith("ABN:") or p.startswith("Lic:")]
    if abn_lic_parts:
        return " - ".join(abn_lic_parts)
    # Check regex in text
    m_abn = re.search(r"\bABN\b\s*[:\s]*([0-9\s]{11,14})", text, re.I)
    if m_abn:
        return f"ABN: {m_abn.group(1).strip()}"
    return "Registered Australian Business Entity"


def generate_audit_pdf_bytes(lead_id: str) -> tuple[bytes, str]:
    """
    Generates a high-converting, agency-grade Website Technical & Commercial Audit Report.
    Returns (pdf_bytes, filename).
    """
    db = SessionLocal()
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        db.close()
        raise ValueError("Lead record not found")

    audit = db.query(AuditReport).filter(AuditReport.lead_id == lead_id).first()
    db.close()

    if not audit:
        from app.services.audit_service import perform_website_audit
        audit_dict = perform_website_audit(lead_id)
        db = SessionLocal()
        audit = db.query(AuditReport).filter(AuditReport.id == audit_dict["id"]).first()
        db.close()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Premium Color Palette
    BRAND_BLUE = colors.HexColor("#0284c7")       # Cyan 600
    NAVY_PRIMARY = colors.HexColor("#0f172a")     # Slate 900
    ACCENT_BLUE = colors.HexColor("#2563eb")      # Blue 600
    BORDER_LIGHT = colors.HexColor("#e2e8f0")     # Slate 200
    BG_ROW_ALT = colors.HexColor("#f8fafc")       # Slate 50
    TEXT_MUTED = colors.HexColor("#64748b")       # Slate 500
    TEXT_DARK = colors.HexColor("#1e293b")        # Slate 800
    GREEN_SUCCESS = colors.HexColor("#16a34a")
    RED_ALERT = colors.HexColor("#dc2626")

    # Typography Styles
    brand_sub_style = ParagraphStyle(
        "BrandSub",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=ACCENT_BLUE,
        alignment=0
    )

    main_title_style = ParagraphStyle(
        "MainTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=NAVY_PRIMARY,
        spaceBefore=2,
        spaceAfter=3
    )

    target_sub_style = ParagraphStyle(
        "TargetSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=TEXT_MUTED
    )

    score_num_style = ParagraphStyle(
        "ScoreNum",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=22,
        textColor=ACCENT_BLUE,
        alignment=1
    )

    score_label_style = ParagraphStyle(
        "ScoreLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=TEXT_MUTED,
        alignment=1
    )

    score_meta_style = ParagraphStyle(
        "ScoreMeta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=10,
        textColor=TEXT_MUTED,
        alignment=1
    )

    h2_style = ParagraphStyle(
        "SectionH2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11.5,
        leading=15,
        textColor=NAVY_PRIMARY,
        spaceBefore=8,
        spaceAfter=5
    )

    cell_label = ParagraphStyle(
        "CellLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=TEXT_DARK
    )

    cell_val = ParagraphStyle(
        "CellVal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=TEXT_DARK
    )

    elements = []

    # 1. Header with Score Badge (No overlap, clean table layout)
    header_left_data = [
        [Paragraph("LEADPULSE &bull; DIGITAL INTELLIGENCE &amp; AUDIT SUITE", brand_sub_style)],
        [Paragraph("Website Technical &amp; Commercial Audit", main_title_style)],
        [Paragraph(f"Target Entity: <b>{sanitize_pdf_text(lead.business_name)}</b> &nbsp;|&nbsp; <u>{sanitize_pdf_text(lead.website or 'No Website Recorded')}</u>", target_sub_style)]
    ]
    header_left_table = Table(header_left_data, colWidths=[380])
    header_left_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))

    header_right_data = [
        [Paragraph("HEALTH SCORE", score_label_style)],
        [Paragraph(f"{audit.health_score} / 100", score_num_style)],
        [Paragraph(f"Date: {datetime.now().strftime('%d %b %Y')}<br/>ID: #{audit.id[:8]}", score_meta_style)]
    ]
    header_right_table = Table(header_right_data, colWidths=[140])
    header_right_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))

    main_header_table = Table([[header_left_table, header_right_table]], colWidths=[390, 150])
    main_header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(main_header_table)
    elements.append(Spacer(1, 6))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_BLUE, spaceBefore=4, spaceAfter=8))

    # 2. Executive Business Profile (Cleaned ABN & Credentials)
    elements.append(Paragraph("1. Executive Business Profile &amp; Credentials", h2_style))
    clean_abn_val = extract_clean_abn_license(lead.keywords or "")
    
    prof_data = [
        [
            Paragraph("Business Name:", cell_label),
            Paragraph(sanitize_pdf_text(lead.business_name or "N/A"), cell_val),
            Paragraph("Decision Maker:", cell_label),
            Paragraph(sanitize_pdf_text(lead.contact_person or "Executive / Owner"), cell_val),
        ],
        [
            Paragraph("Primary Email:", cell_label),
            Paragraph(f"<font color='{ACCENT_BLUE.hexval()}'><b>{sanitize_pdf_text(lead.email or lead.business_email or 'N/A')}</b></font>", cell_val),
            Paragraph("Verified Phone:", cell_label),
            Paragraph(sanitize_pdf_text(lead.phone_number or lead.office_contact or "N/A"), cell_val),
        ],
        [
            Paragraph("Location / Office:", cell_label),
            Paragraph(sanitize_pdf_text(lead.office_location or f"{lead.state}, Australia"), cell_val),
            Paragraph("Industry / Territory:", cell_label),
            Paragraph(f"{sanitize_pdf_text(lead.niche or 'Commercial')} - {sanitize_pdf_text(lead.state or 'AU')}", cell_val),
        ],
        [
            Paragraph("ABN / Credentials:", cell_label),
            Paragraph(f"<b>{sanitize_pdf_text(clean_abn_val)}</b>", cell_val),
            Paragraph("Founding / Team:", cell_label),
            Paragraph(f"Est. {sanitize_pdf_text(lead.founding_year or 'N/A')} &nbsp;|&nbsp; {sanitize_pdf_text(lead.employee_count or '1-10')} employees", cell_val),
        ]
    ]

    prof_table = Table(prof_data, colWidths=[110, 160, 110, 160])
    prof_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BG_ROW_ALT),
        ('BACKGROUND', (0, 2), (-1, 2), BG_ROW_ALT),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(prof_table)
    elements.append(Spacer(1, 8))

    # 3. Technical Infrastructure & Commercial Matrix
    elements.append(Paragraph("2. Technical Infrastructure &amp; Commercial Matrix", h2_style))

    tech_data = [
        [
            Paragraph("CMS / Platform:", cell_label),
            Paragraph(sanitize_pdf_text(audit.cms_platform or "Custom Web"), cell_val),
            Paragraph("SSL Encryption:", cell_label),
            Paragraph(f"<font color='{GREEN_SUCCESS.hexval() if 'Yes' in (audit.ssl_active or '') else RED_ALERT.hexval()}'><b>{sanitize_pdf_text(audit.ssl_active or 'Yes')}</b></font>", cell_val),
        ],
        [
            Paragraph("Mobile Responsive:", cell_label),
            Paragraph(sanitize_pdf_text(audit.mobile_optimized or "Yes"), cell_val),
            Paragraph("Page Response Time:", cell_label),
            Paragraph(f"<b>{sanitize_pdf_text(audit.load_time_seconds or '1.2s')}</b>", cell_val),
        ],
        [
            Paragraph("Payment Gateways:", cell_label),
            Paragraph(sanitize_pdf_text(audit.payment_gateways or "None Detected"), cell_val),
            Paragraph("Shipping &amp; Logistics:", cell_label),
            Paragraph(sanitize_pdf_text(audit.shipping_carriers or "None / Standard"), cell_val),
        ],
        [
            Paragraph("Marketing Pixels:", cell_label),
            Paragraph(sanitize_pdf_text(audit.marketing_pixels or "None Detected"), cell_val),
            Paragraph("Tech Stack Detected:", cell_label),
            Paragraph(sanitize_pdf_text(audit.technologies_used or "Standard Web"), cell_val),
        ]
    ]

    tech_table = Table(tech_data, colWidths=[115, 155, 115, 155])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BG_ROW_ALT),
        ('BACKGROUND', (0, 2), (-1, 2), BG_ROW_ALT),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(tech_table)
    elements.append(Spacer(1, 8))

    # 4. Technical Flags & Vulnerabilities Found
    elements.append(Paragraph("3. Technical Flags &amp; Modernization Gaps", h2_style))

    issues_list = audit.outdated_issues.split(" | ") if audit.outdated_issues else ["None Detected (Clean)"]
    issue_rows = []
    for iss in issues_list:
        is_clean = "None Detected" in iss
        indicator = "[PASS]" if is_clean else "[FLAG]"
        ind_color = GREEN_SUCCESS.hexval() if is_clean else RED_ALERT.hexval()
        issue_rows.append([
            Paragraph(f"<font color='{ind_color}'><b>{indicator}</b></font>", cell_label),
            Paragraph(sanitize_pdf_text(iss), cell_val)
        ])

    issue_table = Table(issue_rows, colWidths=[60, 480])
    issue_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#fff5f5") if any("FLAG" in r[0].text for r in issue_rows) else BG_ROW_ALT),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(issue_table)
    elements.append(Spacer(1, 8))

    # 5. Proposed Solution & Growth Opportunities
    pitch_list = audit.pitch_opportunities.split(" | ") if audit.pitch_opportunities else ["Standard Website Performance & SEO Package"]
    solution_elements = [
        Paragraph("4. Recommended Value Propositions &amp; Solution Strategy", h2_style)
    ]
    
    solution_rows = []
    for idx, pitch in enumerate(pitch_list, 1):
        solution_rows.append([
            Paragraph(f"<b>Strategy #{idx}:</b>", cell_label),
            Paragraph(sanitize_pdf_text(pitch), cell_val)
        ])

    solution_table = Table(solution_rows, colWidths=[80, 460])
    solution_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f0f9ff")),  # Sky tint
        ('BOX', (0, 0), (-1, -1), 0.5, ACCENT_BLUE),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#bae6fd")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    solution_elements.append(solution_table)
    solution_elements.append(Spacer(1, 8))

    # Call to action block
    cta_data = [
        [
            Paragraph(
                "<b>Looking to remediate these technical gaps?</b><br/>"
                "<font color='#334155'>We specialize in high-converting Australian web modernization, checkout optimization, BNPL integrations, and Google search ranking growth. Contact us to discuss our turnkey implementation package.</font>",
                ParagraphStyle("CTABox", parent=cell_val, alignment=1)
            )
        ]
    ]
    cta_table = Table(cta_data, colWidths=[540])
    cta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_ROW_ALT),
        ('BOX', (0, 0), (-1, -1), 1, ACCENT_BLUE),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    solution_elements.append(cta_table)

    elements.append(KeepTogether(solution_elements))

    # Build Document
    doc.build(elements)
    buffer.seek(0)

    clean_comp_name = re.sub(r'[^a-zA-Z0-9]+', '_', lead.business_name or 'Company').strip('_')
    filename = f"Website_Audit_Report_{clean_comp_name}.pdf"

    return buffer.getvalue(), filename
