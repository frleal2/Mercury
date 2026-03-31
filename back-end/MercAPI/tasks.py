from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_task(self, subject, message, recipient_list, from_email=None, html_message=None):
    """
    Generic async email sending task with retry logic.
    """
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email or settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Email sent to {recipient_list}: {subject}")
    except Exception as exc:
        logger.error(f"Email send failed to {recipient_list}: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_invitation_email_task(self, email, tenant_name, email_context):
    """
    Send user invitation email asynchronously.
    """
    try:
        html_message = render_to_string('emails/user_invitation.html', email_context)
        plain_message = render_to_string('emails/user_invitation.txt', email_context)

        send_mail(
            subject=f"You're invited to {tenant_name} - Fleetly Fleet Management",
            message=plain_message,
            html_message=html_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        logger.info(f"Invitation email sent to {email}")
    except Exception as exc:
        logger.error(f"Invitation email failed to {email}: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_email_task(self, email, subject, message):
    """
    Send password reset email asynchronously.
    """
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        logger.info(f"Password reset email sent to {email}")
    except Exception as exc:
        logger.error(f"Password reset email failed to {email}: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_load_notification_email_task(self, notification_id, subject, message, recipient_email):
    """
    Send load milestone notification email asynchronously.
    Updates the LoadNotification record with sent/failed status.
    """
    from MercAPI.models import LoadNotification
    from django.utils import timezone

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )

        LoadNotification.objects.filter(id=notification_id).update(
            status='sent',
            sent_at=timezone.now(),
        )
        logger.info(f"Load notification email sent to {recipient_email}: {subject}")

    except Exception as exc:
        LoadNotification.objects.filter(id=notification_id).update(
            status='failed',
            error_message=str(exc),
        )
        logger.error(f"Load notification email failed to {recipient_email}: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_tracking_link_email_task(self, subject, message, recipient_email):
    """
    Send tracking link email to customer asynchronously.
    """
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        logger.info(f"Tracking link email sent to {recipient_email}")
    except Exception as exc:
        logger.error(f"Tracking link email failed to {recipient_email}: {exc}")
        raise self.retry(exc=exc)
