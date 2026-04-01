"""
Notification services for sending email notifications.
Uses Django's email backend for email delivery.
"""
import logging
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def send_notification(notification_id):
    """
    Send a Notification record via its configured channel (email or in-app).
    Updates the Notification record with delivery status.

    Args:
        notification_id: ID of the Notification model instance
    """
    from MercAPI.models import Notification

    try:
        notification = Notification.objects.get(id=notification_id)
    except Notification.DoesNotExist:
        logger.error(f"Notification {notification_id} not found")
        return

    if notification.status == 'sent':
        logger.info(f"Notification {notification_id} already sent, skipping")
        return

    # In-app notifications are already "sent" once created
    if notification.channel == 'in_app':
        notification.status = 'sent'
        notification.sent_at = timezone.now()
        notification.error_message = ''
        notification.save(update_fields=['status', 'sent_at', 'error_message'])
        return

    result = {'success': False, 'error': 'Unknown channel'}

    if notification.channel == 'email':
        from django.core.mail import send_mail as django_send_mail
        try:
            django_send_mail(
                subject=notification.subject,
                message=notification.message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[notification.recipient_email],
                fail_silently=False,
            )
            result = {'success': True, 'error': None}
        except Exception as e:
            result = {'success': False, 'error': str(e)}

    # Update notification record
    if result['success']:
        notification.status = 'sent'
        notification.sent_at = timezone.now()
        notification.error_message = ''
    else:
        notification.status = 'failed'
        notification.error_message = result.get('error', 'Unknown error')

    notification.save(update_fields=['status', 'sent_at', 'error_message'])
