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


# ==================== MULTI-CHANNEL NOTIFICATION TASKS ====================

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_notification_task(self, notification_id):
    """
    Send a Notification record via its configured channel.
    Delegates to services.send_notification() which handles email/WhatsApp/SMS.
    """
    from MercAPI.services import send_notification
    try:
        send_notification(notification_id)
    except Exception as exc:
        logger.error(f"Notification {notification_id} send failed: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_whatsapp_task(self, to_number, message, template_sid=None):
    """
    Send a WhatsApp message asynchronously via Celery.
    """
    from MercAPI.services import send_whatsapp
    try:
        result = send_whatsapp(to_number, message, template_sid=template_sid)
        if not result['success']:
            raise Exception(result['error'])
        return result
    except Exception as exc:
        logger.error(f"WhatsApp task failed to {to_number}: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_sms_task(self, to_number, message):
    """
    Send an SMS message asynchronously via Celery.
    """
    from MercAPI.services import send_sms
    try:
        result = send_sms(to_number, message)
        if not result['success']:
            raise Exception(result['error'])
        return result
    except Exception as exc:
        logger.error(f"SMS task failed to {to_number}: {exc}")
        raise self.retry(exc=exc)


# ==================== COMPLIANCE SCANNER TASKS ====================

@shared_task(bind=True, max_retries=1, default_retry_delay=300)
def run_compliance_scan(self):
    """
    Daily compliance scanner — finds expiring documents, certifications,
    and insurance across all tenants and creates Notification records.
    Scheduled via django-celery-beat.
    """
    from MercAPI.scanners import scan_all_compliance
    try:
        results = scan_all_compliance()
        logger.info("Compliance scan results: %s", results)
        return results
    except Exception as exc:
        logger.error("Compliance scan failed: %s", exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=2, default_retry_delay=120)
def dispatch_pending_notifications(self):
    """
    Pick up all pending Notification records and send them via the
    appropriate channel (email / WhatsApp / SMS).
    Runs every 5 minutes via django-celery-beat.
    """
    from MercAPI.models import Notification
    pending = Notification.objects.filter(status='pending').order_by('created_at')[:200]
    sent = 0
    failed = 0
    for notification in pending:
        try:
            send_notification_task.delay(notification.id)
            sent += 1
        except Exception as exc:
            logger.error("Failed to queue notification %d: %s", notification.id, exc)
            failed += 1
    logger.info("Dispatched %d notifications (%d queue failures)", sent, failed)
    return {'dispatched': sent, 'failed': failed}
