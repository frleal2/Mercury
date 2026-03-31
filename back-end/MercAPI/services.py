"""
Notification services for sending WhatsApp and email notifications.
Uses Twilio for WhatsApp and Django's email backend for email.
"""
import logging
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def _get_twilio_client():
    """Get configured Twilio client. Returns None if not configured."""
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        logger.warning("Twilio credentials not configured")
        return None
    from twilio.rest import Client
    return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)


def send_whatsapp(to_number, message, template_sid=None, template_variables=None):
    """
    Send a WhatsApp message via Twilio.

    Args:
        to_number: Recipient phone with country code (e.g., '+1234567890')
        message: Message body (for session messages or template fallback)
        template_sid: Twilio Content Template SID for pre-approved templates
        template_variables: Dict of template variable values

    Returns:
        dict with 'success', 'message_sid', and 'error' keys
    """
    client = _get_twilio_client()
    if not client:
        return {'success': False, 'message_sid': None, 'error': 'Twilio not configured'}

    if not settings.TWILIO_WHATSAPP_NUMBER:
        return {'success': False, 'message_sid': None, 'error': 'WhatsApp sender number not configured'}

    try:
        msg_params = {
            'from_': f'whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}',
            'to': f'whatsapp:{to_number}',
        }

        if template_sid:
            # Use pre-approved content template
            msg_params['content_sid'] = template_sid
            if template_variables:
                msg_params['content_variables'] = str(template_variables)
        else:
            # Free-form message (only works within 24h session window)
            msg_params['body'] = message

        twilio_message = client.messages.create(**msg_params)

        logger.info(f"WhatsApp sent to {to_number}: SID={twilio_message.sid}")
        return {
            'success': True,
            'message_sid': twilio_message.sid,
            'error': None,
        }

    except Exception as e:
        logger.error(f"WhatsApp send failed to {to_number}: {e}")
        return {
            'success': False,
            'message_sid': None,
            'error': str(e),
        }


def send_notification(notification_id):
    """
    Send a Notification record via its configured channel (email or WhatsApp).
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

    result = {'success': False, 'error': 'Unknown channel'}

    if notification.channel == 'whatsapp':
        template_sid = None
        if notification.template and notification.template.whatsapp_template_id:
            template_sid = notification.template.whatsapp_template_id
        result = send_whatsapp(
            to_number=notification.recipient_phone,
            message=notification.message,
            template_sid=template_sid,
        )

    elif notification.channel == 'email':
        from django.core.mail import send_mail as django_send_mail
        try:
            django_send_mail(
                subject=notification.subject,
                message=notification.message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[notification.recipient_email],
                fail_silently=False,
            )
            result = {'success': True, 'message_sid': None, 'error': None}
        except Exception as e:
            result = {'success': False, 'message_sid': None, 'error': str(e)}

    # Update notification record
    if result['success']:
        notification.status = 'sent'
        notification.sent_at = timezone.now()
        notification.external_id = result.get('message_sid') or ''
        notification.error_message = ''
    else:
        notification.status = 'failed'
        notification.error_message = result.get('error', 'Unknown error')

    notification.save(update_fields=['status', 'sent_at', 'external_id', 'error_message'])
