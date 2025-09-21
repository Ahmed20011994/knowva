"""
Email service for sending invitation emails
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails"""
    
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_username)
        self.app_url = os.getenv("APP_URL", "http://4.236.228.13:3000/")
    
    async def send_invitation_email(
        self, 
        to_email: str, 
        inviter_name: str,
        company_name: str,
        team_name: str,
        role: str,
        invitation_token: str
    ) -> bool:
        """Send invitation email to a user"""
        
        if not self.smtp_username or not self.smtp_password:
            logger.warning("SMTP credentials not configured. Email not sent.")
            return False
        
        try:
            # Create invitation link
            invitation_link = f"{self.app_url}/users/signup?token={invitation_token}"
            
            # Create email content
            subject = f"You're invited to join {company_name} on Knowva"
            
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #823BE3; margin-bottom: 10px;">Knowva</h1>
                        <h2 style="color: #202020; margin-top: 0;">You're invited to join {company_name}</h2>
                    </div>
                    
                    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <p>Hi there!</p>
                        <p><strong>{inviter_name}</strong> has invited you to join <strong>{company_name}</strong> on Knowva as a <strong>{role}</strong> in the <strong>{team_name}</strong> team.</p>
                        <p>Knowva connects tools, syncs context, and helps everyone stay aligned with AI-powered knowledge management.</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{invitation_link}" 
                           style="background-color: #823BE3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                            Accept Invitation
                        </a>
                    </div>
                    
                    <div style="background-color: #f0f0f0; padding: 15px; border-radius: 6px; font-size: 14px; color: #666;">
                        <p><strong>What's next?</strong></p>
                        <ul>
                            <li>Click the button above to create your account</li>
                            <li>Set up your password</li>
                            <li>Start collaborating with your team</li>
                        </ul>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center;">
                        <p>This invitation will expire in 7 days. If you have any questions, please contact your team administrator.</p>
                        <p>If you can't click the button above, copy and paste this link into your browser:</p>
                        <p style="word-break: break-all;">{invitation_link}</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_body = f"""
You're invited to join {company_name} on Knowva

Hi there!

{inviter_name} has invited you to join {company_name} on Knowva as a {role} in the {team_name} team.

Knowva connects tools, syncs context, and helps everyone stay aligned with AI-powered knowledge management.

To accept this invitation, click the link below or copy and paste it into your browser:
{invitation_link}

What's next?
- Click the link above to create your account
- Set up your password  
- Start collaborating with your team

This invitation will expire in 7 days. If you have any questions, please contact your team administrator.
            """
            
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = to_email
            
            # Create the plain-text and HTML version of your message
            part1 = MIMEText(text_body, "plain")
            part2 = MIMEText(html_body, "html")
            
            # Add HTML/plain-text parts to MIMEMultipart message
            msg.attach(part1)
            msg.attach(part2)
            
            # Send the email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Invitation email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send invitation email to {to_email}: {str(e)}")
            return False

# Global email service instance
email_service = EmailService()
