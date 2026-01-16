import aiosmtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from .config import settings
from typing import Optional

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    async def send_email(
        to_email: str,
        subject: str,
        html_content: str,
        plain_content: Optional[str] = None
    ):
        if not settings.SMTP_HOST:
            logger.warning(f"Email service not configured. Would send to {to_email}: {subject}")
            return

        message = MIMEMultipart("alternative")
        message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        message["To"] = to_email
        message["Subject"] = subject

        if plain_content:
            message.attach(MIMEText(plain_content, "plain"))
        message.attach(MIMEText(html_content, "html"))

        try:
            await aiosmtplib.send(
                message,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                start_tls=True
            )
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")

    @staticmethod
    async def send_new_expense_notification(expense_id: str, member_name: str, amount: float):
        if not settings.ADMIN_EMAIL:
            logger.warning(f"Admin email not configured. Would notify about expense {expense_id}")
            return

        admin_url = settings.FRONTEND_URL.rstrip('/') + '/admin/dashboard'
        subject = f"New Expense Submission: {member_name}"
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color: rgb(255, 173, 179);">New Expense Submitted</h2>
                <p><strong>Member:</strong> {member_name}</p>
                <p><strong>Amount:</strong> €{amount:.2f}</p>
                <p><strong>Expense ID:</strong> {expense_id}</p>
                <p style="margin-top: 20px;">
                    <a href="{admin_url}" style="display: inline-block; padding: 12px 24px; background-color: rgb(255, 173, 179); color: #111827; text-decoration: none; border-radius: 6px; font-weight: bold;">Review in Admin Dashboard</a>
                </p>
            </body>
        </html>
        """
        await EmailService.send_email(settings.ADMIN_EMAIL, subject, html_content)

    @staticmethod
    async def send_status_update(
        member_email: str,
        member_name: Optional[str],
        status: str,
        amount: float,
        description: str,
        admin_notes: Optional[str] = None
    ):
        status_text = "Paid" if status == "paid" else "Denied"
        subject = f"Expense {status_text}: {description[:50]}"
        greeting = f"Hello {member_name}," if member_name else "Hello,"

        admin_notes_html = ""
        if admin_notes:
            admin_notes_html = f"""
                <p style="margin-top: 20px; padding: 12px; background-color: #f5f5f5; border-left: 4px solid rgb(255, 173, 179);">
                    <strong>Message from Admin:</strong><br/>
                    {admin_notes}
                </p>
            """

        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color: rgb(255, 173, 179);">Expense {status_text}</h2>
                <p>{greeting}</p>
                <p>Your expense submission has been <strong>{status.lower()}</strong>.</p>
                <p><strong>Description:</strong> {description}</p>
                <p><strong>Amount:</strong> €{amount:.2f}</p>{admin_notes_html}
            </body>
        </html>
        """
        await EmailService.send_email(member_email, subject, html_content)
