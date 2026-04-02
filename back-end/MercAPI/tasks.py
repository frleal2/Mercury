from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
import logging

logger = logging.getLogger(__name__)


@shared_task
def sync_eld_locations():
    """
    Periodic task: Poll all connected ELD providers for GPS locations.
    Runs every 90 seconds via Celery Beat.
    """
    from .models import ELDProvider, ELDVehicleMapping, VehicleLocation, Load
    from .eld_adapters import get_adapter
    from django.utils import timezone

    providers = ELDProvider.objects.filter(status='connected', sync_enabled=True)
    total_synced = 0

    for provider in providers:
        try:
            adapter = get_adapter(provider.provider, provider.api_key, provider.access_token)
            locations = adapter.fetch_vehicle_locations()

            mappings = {
                m.external_vehicle_id: m
                for m in provider.vehicle_mappings.select_related('truck').all()
            }

            for loc in locations:
                mapping = mappings.get(loc.external_vehicle_id)
                if not mapping:
                    continue

                driver = None
                if loc.driver_external_id:
                    dm = provider.driver_mappings.filter(
                        external_driver_id=loc.driver_external_id
                    ).select_related('driver').first()
                    if dm:
                        driver = dm.driver

                active_load = Load.objects.filter(
                    trip__truck=mapping.truck,
                    status='in_transit',
                ).first()

                VehicleLocation.objects.create(
                    truck=mapping.truck,
                    load=active_load,
                    driver=driver,
                    latitude=loc.latitude,
                    longitude=loc.longitude,
                    speed_mph=loc.speed_mph,
                    heading=loc.heading,
                    odometer_miles=loc.odometer_miles,
                    engine_hours=loc.engine_hours,
                    recorded_at=loc.recorded_at or timezone.now(),
                    source_provider=provider.provider,
                )
                total_synced += 1

                if active_load:
                    active_load.last_known_latitude = loc.latitude
                    active_load.last_known_longitude = loc.longitude
                    active_load.save(update_fields=['last_known_latitude', 'last_known_longitude'])

            provider.last_sync_at = timezone.now()
            provider.last_error = ''
            provider.save(update_fields=['last_sync_at', 'last_error', 'updated_at'])

        except Exception as e:
            logger.error(f'ELD location sync failed for {provider}: {e}')
            provider.last_error = str(e)[:500]
            provider.save(update_fields=['last_error', 'updated_at'])

    logger.info(f'ELD location sync complete: {total_synced} positions updated from {providers.count()} providers')


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
    Delegates to services.send_notification() which handles email.
    """
    from MercAPI.services import send_notification
    try:
        send_notification(notification_id)
    except Exception as exc:
        logger.error(f"Notification {notification_id} send failed: {exc}")
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
    appropriate channel (email).
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


# ==================== FMCSA SAFETY & COMPLIANCE TASKS ====================

@shared_task(bind=True, max_retries=2, default_retry_delay=300)
def fetch_all_fmcsa_data(self):
    """
    Nightly task: fetch FMCSA data for all companies with DOT numbers
    and all active carriers with DOT numbers.
    """
    from MercAPI.models import Company, Carrier
    from MercAPI.fmcsa_client import fetch_and_store

    fetched = 0
    failed = 0

    # Companies (asset/hybrid with DOT numbers)
    companies = Company.objects.filter(
        active=True, company_type__in=['asset', 'hybrid']
    ).exclude(dot_number='')
    for company in companies.iterator():
        try:
            result = fetch_and_store(dot_number=company.dot_number, company=company)
            if result:
                fetched += 1
            else:
                failed += 1
        except Exception:
            logger.exception("FMCSA fetch failed for company %s (DOT %s)", company.name, company.dot_number)
            failed += 1

    # Carriers (active with DOT numbers)
    carriers = Carrier.objects.filter(status='active').exclude(dot_number='')
    for carrier in carriers.iterator():
        try:
            result = fetch_and_store(dot_number=carrier.dot_number, carrier=carrier)
            if result:
                fetched += 1
            else:
                failed += 1
        except Exception:
            logger.exception("FMCSA fetch failed for carrier %s (DOT %s)", carrier.name, carrier.dot_number)
            failed += 1

    logger.info("FMCSA fetch complete: %d fetched, %d failed", fetched, failed)
    return {'fetched': fetched, 'failed': failed}


@shared_task(bind=True, max_retries=1, default_retry_delay=300)
def compute_all_compliance_metrics(self):
    """
    Nightly task: compute internal compliance metrics for all active companies.
    """
    from MercAPI.compliance_metrics import compute_all
    try:
        count = compute_all()
        logger.info("Compliance metrics computed for %d companies", count)
        return {'companies_processed': count}
    except Exception as exc:
        logger.error("Compliance metrics computation failed: %s", exc)
        raise self.retry(exc=exc)
