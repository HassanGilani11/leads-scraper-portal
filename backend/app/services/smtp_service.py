import smtplib
import logging
import base64
import requests
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import Optional

from app.core.config import settings

logger = logging.getLogger("smtp_service")

class SMTPService:
    def __init__(self):
        pass

    def get_graph_access_token(self) -> str:
        """
        Obtain OAuth 2.0 Access Token from Microsoft Entra / Azure AD via Client Credentials.
        """
        tenant_id = settings.AZURE_TENANT_ID
        client_id = settings.AZURE_CLIENT_ID
        client_secret = settings.AZURE_CLIENT_SECRET

        if not tenant_id or not client_id or not client_secret:
            raise ValueError("Microsoft Graph API credentials missing. Please enter Azure Tenant ID, Application (Client) ID, and Client Secret in Settings.")

        token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
        data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials"
        }
        for attempt in range(3):
            try:
                res = requests.post(token_url, data=data, timeout=30)
                res_data = res.json()
                if res.status_code != 200:
                    err_desc = res_data.get("error_description", res.text)
                    if "AADSTS700016" in err_desc:
                        raise ValueError(f"Azure Client ID not found in tenant. Make sure you entered the 'Application (client) ID' (not Object ID). Details: {err_desc}")
                    elif "AADSTS7000215" in err_desc:
                        raise ValueError(f"Azure Client Secret invalid or expired. Details: {err_desc}")
                    raise ValueError(f"Microsoft Graph OAuth Token Error ({res.status_code}): {err_desc}")
                return res_data["access_token"]
            except requests.RequestException as e:
                if attempt == 2:
                    raise ValueError(f"Network error contacting Microsoft Entra token endpoint: {str(e)}")
                time.sleep(1.5)

    def send_via_graph(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        pdf_bytes: Optional[bytes] = None,
        pdf_filename: Optional[str] = "Website_Technical_Audit_Dossier.pdf"
    ) -> bool:
        """
        Send an email via Microsoft Graph REST API (v1.0 /users/{sender}/sendMail).
        Bypasses SMTP auth & security defaults restrictions.
        """
        token = self.get_graph_access_token()
        sender_email = settings.SENDER_EMAIL or settings.SMTP_USERNAME or "dev@syntexdev.com"
        
        send_url = f"https://graph.microsoft.com/v1.0/users/{sender_email}/sendMail"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        message_payload = {
            "message": {
                "subject": subject,
                "body": {
                    "contentType": "HTML",
                    "content": body_html
                },
                "toRecipients": [
                    {
                        "emailAddress": {
                            "address": to_email
                        }
                    }
                ]
            },
            "saveToSentItems": "true"
        }

        if pdf_bytes:
            b64_content = base64.b64encode(pdf_bytes).decode("utf-8")
            message_payload["message"]["attachments"] = [
                {
                    "@odata.type": "#microsoft.graph.fileAttachment",
                    "name": pdf_filename or "Website_Technical_Audit_Dossier.pdf",
                    "contentType": "application/pdf",
                    "contentBytes": b64_content
                }
            ]

        try:
            res = requests.post(send_url, json=message_payload, headers=headers, timeout=15)
            if res.status_code in [200, 202]:
                logger.info(f"[Microsoft Graph] Successfully sent email to {to_email} from {sender_email}")
                return True
            else:
                try:
                    err_json = res.json()
                    err_msg = err_json.get("error", {}).get("message", res.text)
                except Exception:
                    err_msg = res.text
                if "ErrorAccessDenied" in err_msg or "Access is denied" in err_msg:
                    raise ValueError(f"Microsoft Graph Permission Error: Ensure 'Mail.Send' Application Permission is added to your App Registration in Entra ID and 'Grant admin consent' was clicked. Details: {err_msg}")
                elif "ResourceNotFound" in err_msg or "ErrorItemNotFound" in err_msg:
                    raise ValueError(f"Sender mailbox '{sender_email}' was not found in your Microsoft 365 tenant. Check Sender Email setting.")
                raise ValueError(f"Microsoft Graph API Error ({res.status_code}): {err_msg}")
        except requests.RequestException as e:
            raise ValueError(f"Network error sending email via Microsoft Graph API: {str(e)}")

    def get_connection(self):
        """
        Establish a connection to the configured SMTP server (e.g. Microsoft 365: smtp.office365.com:587).
        """
        host = settings.SMTP_HOST or "smtp.office365.com"
        port = int(settings.SMTP_PORT or 587)
        encryption = (settings.SMTP_ENCRYPTION or "STARTTLS").upper()
        username = settings.SMTP_USERNAME
        password = settings.SMTP_PASSWORD

        if not username or not password:
            raise ValueError("SMTP Credentials missing. Please enter your Microsoft 365 Password in the Settings form and click 'Save SMTP Settings' before testing.")

        logger.info(f"Connecting to SMTP server {host}:{port} (Encryption: {encryption})...")
        
        try:
            if encryption == "SSL" or port == 465:
                server = smtplib.SMTP_SSL(host, port, timeout=15)
            else:
                server = smtplib.SMTP(host, port, timeout=15)
                if encryption == "STARTTLS" or port == 587:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()

            server.login(username, password)
            return server
        except smtplib.SMTPAuthenticationError as e:
            raw_err = e.smtp_error.decode('utf-8', errors='ignore') if hasattr(e, 'smtp_error') and e.smtp_error else str(e)
            if "5.7.139" in raw_err or "SmtpClientAuthentication is disabled" in raw_err:
                raise ValueError(f"Microsoft 365 SMTP AUTH is disabled for this tenant/mailbox ({username}). To fix: In Microsoft 365 Admin Center -> Users -> Active Users -> '{username}' -> Mail tab -> 'Manage email apps' -> Check 'Authenticated SMTP' and click Save.")
            elif "5.7.57" in raw_err:
                raise ValueError(f"Microsoft 365 Client not authenticated to send mail. Verify sender address matches login account ({username}).")
            else:
                raise ValueError(f"Microsoft 365 Authentication Failed: Please check your password or 2FA App Password. Details: {raw_err}")
        except Exception as e:
            raise ValueError(f"SMTP Connection Failed ({host}:{port}): {str(e)}")


    def send_email(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        pdf_bytes: Optional[bytes] = None,
        pdf_filename: Optional[str] = "Website_Technical_Audit_Dossier.pdf"
    ) -> bool:
        """
        Send an email via configured provider (Microsoft Graph API or SMTP).
        """
        # If Azure Graph credentials are provided, default to Graph API
        if settings.AZURE_TENANT_ID and settings.AZURE_CLIENT_ID and settings.AZURE_CLIENT_SECRET:
            return self.send_via_graph(
                to_email=to_email,
                subject=subject,
                body_html=body_html,
                pdf_bytes=pdf_bytes,
                pdf_filename=pdf_filename
            )

        sender_email = settings.SENDER_EMAIL or settings.SMTP_USERNAME
        sender_name = settings.SENDER_NAME or "LeadPulse Outreach"
        from_header = f"{sender_name} <{sender_email}>"

        msg = MIMEMultipart("mixed")
        msg["From"] = from_header
        msg["To"] = to_email
        msg["Subject"] = subject

        # Create HTML part inside alternative container
        msg_alternative = MIMEMultipart("alternative")
        
        # Plaintext fallback (strip basic tags for plaintext)
        import re
        plain_text = re.sub('<[^<]+?>', '', body_html)
        part_text = MIMEText(plain_text, "plain", "utf-8")
        part_html = MIMEText(body_html, "html", "utf-8")

        msg_alternative.attach(part_text)
        msg_alternative.attach(part_html)
        msg.attach(msg_alternative)

        # Attach PDF if provided
        if pdf_bytes:
            pdf_part = MIMEApplication(pdf_bytes, Name=pdf_filename)
            pdf_part['Content-Disposition'] = f'attachment; filename="{pdf_filename}"'
            msg.attach(pdf_part)

        server = self.get_connection()
        try:
            server.send_message(msg)
            logger.info(f"Successfully sent email to {to_email}")
            return True
        finally:
            try:
                server.quit()
            except Exception:
                pass

    def send_test_email(self, to_email: str) -> dict:
        """
        Send a diagnostic test email to verify M365 / Graph / SMTP configuration.
        """
        is_graph = bool(settings.AZURE_TENANT_ID and settings.AZURE_CLIENT_ID and settings.AZURE_CLIENT_SECRET)
        subject = "LeadPulse • Email Outreach Engine Test Success"
        provider_name = "Microsoft Graph REST API (OAuth2 Enterprise)" if is_graph else "Microsoft 365 SMTP Engine"

        body_html = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; padding-bottom: 20px; border-b: 2px solid #3b82f6;">
                <h2 style="color: #1e293b; margin: 0;">⚡ LeadPulse Outreach Engine</h2>
                <p style="color: #64748b; margin-top: 4px; font-size: 14px;">{provider_name} Verification Test</p>
            </div>
            
            <div style="padding: 20px 0;">
                <p style="color: #334155; font-size: 16px;">Hello,</p>
                <p style="color: #334155; line-height: 1.6;">
                    Your Microsoft 365 email outreach settings have been verified successfully! LeadPulse is now ready to send automated cold outreach email campaigns and pitch dossiers from your shared mailbox.
                </p>
                
                <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
                    <strong style="color: #065f46;">Outreach Configuration:</strong>
                    <ul style="color: #334155; margin: 8px 0 0 0; padding-left: 20px; font-size: 14px;">
                        <li><strong>Engine Protocol:</strong> {provider_name}</li>
                        <li><strong>Sender Mailbox:</strong> {settings.SENDER_EMAIL}</li>
                        <li><strong>Display Name:</strong> {settings.SENDER_NAME}</li>
                    </ul>
                </div>
            </div>

            <div style="text-align: center; border-t: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8;">
                LeadPulse B2B Lead Scraper & Outreach Platform • Australian Market
            </div>
        </div>
        """
        self.send_email(to_email=to_email, subject=subject, body_html=body_html)
        return {"status": "success", "message": f"Test email sent successfully to {to_email} via {provider_name}"}

smtp_service = SMTPService()

