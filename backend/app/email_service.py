import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from .config import settings
from typing import Optional

class EmailService:
    @staticmethod
    async def send_email(
        to_email: str,
        subject: str,
        html_content: str,
        plain_content: Optional[str] = None
    ):
        if not settings.SMTP_HOST:
            print(f"Email service not configured. Would send to {to_email}: {subject}")
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
            print(f"Failed to send email: {e}")

    @staticmethod
    async def send_new_expense_notification(expense_id: str, member_name: str, amount: float):
        if not settings.ADMIN_EMAIL:
            print(f"Admin email not configured. Would notify about expense {expense_id}")
            return

        subject = f"New Expense Submission: {member_name}"
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color: rgb(255, 173, 179);">New Expense Submitted</h2>
                <p><strong>Member:</strong> {member_name}</p>
                <p><strong>Amount:</strong> €{amount:.2f}</p>
                <p><strong>Expense ID:</strong> {expense_id}</p>
                <p>Please review this expense in the admin dashboard.</p>
            </body>
        </html>
        """
        await EmailService.send_email(settings.ADMIN_EMAIL, subject, html_content)

    @staticmethod
    async def send_status_update(
        member_email: str,
        member_name: str,
        status: str,
        amount: float,
        description: str
    ):
        status_text = "Paid" if status == "paid" else "Denied"
        subject = f"Expense {status_text}: {description[:50]}"

        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color: rgb(255, 173, 179);">Expense {status_text}</h2>
                <p>Hello {member_name},</p>
                <p>Your expense submission has been <strong>{status.lower()}</strong>.</p>
                <p><strong>Description:</strong> {description}</p>
                <p><strong>Amount:</strong> €{amount:.2f}</p>
            </body>
        </html>
        """
        await EmailService.send_email(member_email, subject, html_content)
