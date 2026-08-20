from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse

from app.services.audit_service import perform_website_audit
from app.services.pdf_report import generate_audit_pdf_bytes
from app.schemas.audit import AuditReportResponse

router = APIRouter(prefix="/audit", tags=["Audit & Pitch"])

@router.get("/{lead_id}", response_model=AuditReportResponse)
def get_or_run_audit(lead_id: str):
    """
    Run an in-depth website technical audit & cold email pitch generation for a lead.
    """
    try:
        report = perform_website_audit(lead_id)
        return report
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audit scan failed: {str(e)}")

@router.get("/{lead_id}/pdf")
def download_audit_pdf(lead_id: str):
    """
    Generate and download a professional client-ready Website Audit PDF Report.
    """
    try:
        pdf_bytes, filename = generate_audit_pdf_bytes(lead_id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation error: {str(e)}")
