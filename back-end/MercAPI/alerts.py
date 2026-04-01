"""
Operational Alert Triggers

Helper functions called from views after key operational events.
Each creates Notification records that get dispatched by the 5-minute
`dispatch_pending_notifications` beat task.

Recipient routing (company-wide settings control which channels fire):
  - Load status changes  → email to customer, in-app to company users
  - Driver assigned/reassigned → in-app/email to the driver only
  - Trip started          → in-app/email to the user who dispatched the load
  - Compliance/safety     → in-app/email to all company users

All functions are non-blocking best-effort: failures are logged but never
raised back to the caller so the main business logic is unaffected.
"""
import logging

from django.utils import timezone
from django.conf import settings

from .models import (
    Notification, UserProfile,
    Tenant, Company, CompanyNotificationSetting,
)

logger = logging.getLogger(__name__)


# ── settings lookup ────────────────────────────────────────────────────

def _get_setting(company, key):
    """
    Return (in_app_enabled, email_enabled) for a
    company + notification_key pair. Defaults to all-False if not found.
    """
    try:
        s = CompanyNotificationSetting.objects.only(
            'in_app_enabled', 'email_enabled'
        ).get(company=company, notification_key=key)
        return s.in_app_enabled, s.email_enabled
    except CompanyNotificationSetting.DoesNotExist:
        return False, False


# ── Load status notifications → customer (email/WA) + company (in-app) ─

# Maps load status values to notification keys
_LOAD_STATUS_KEY = {
    'quoted':     'load_quoted_customer',
    'booked':     'load_booked_customer',
    'dispatched': 'load_dispatched_customer',
    'in_transit': 'load_in_transit_customer',
    'delivered':  'load_delivered_customer',
    'invoiced':   'load_invoiced_customer',
    'paid':       'load_paid_customer',
    'cancelled':  'load_cancelled_customer',
}

_CUSTOMER_SUBJECT = {
    'quoted':     "Your shipment {num} has been quoted",
    'booked':     "Your shipment {num} has been booked",
    'dispatched': "Your shipment {num} is on its way",
    'in_transit': "Your shipment {num} is now in transit",
    'delivered':  "Your shipment {num} has been delivered",
    'invoiced':   "Invoice ready for shipment {num}",
    'paid':       "Payment confirmed for shipment {num}",
    'cancelled':  "Your shipment {num} has been cancelled",
}


def _tracking_url(load):
    base = getattr(settings, 'FRONTEND_URL', 'https://myfleetly.com')
    return f"{base}/tracking/{load.tracking_token}"


def notify_load_dispatched(load, driver=None, carrier=None, dispatched_by=None):
    """
    Called from dispatch_load() after a load transitions to 'dispatched'.
    Delegates to notify_load_status_change so the single status-key
    controls both internal (in-app) and customer (email/WA) channels.
    """
    notify_load_status_change(load, 'booked', 'dispatched', changed_by=dispatched_by)


def notify_load_status_change(load, old_status, new_status, changed_by=None):
    """
    Unified handler for all load status changes.
    - in_app  → all company users (bell icon), excluding the actor
    - email   → load.customer.email
    """
    try:
        key = _LOAD_STATUS_KEY.get(new_status)
        if not key:
            return

        company = load.company
        in_app, email = _get_setting(company, key)
        if not (in_app or email):
            return

        tenant = company.tenant
        today = timezone.now().date()

        # Build messages
        num = load.load_number
        route = f"{load.pickup_location_display} → {load.delivery_location_display}"

        internal_subject = f"Load {num} — {load.get_status_display()}"
        internal_message = (
            f"Load {num} status changed to {load.get_status_display()}.\n\n"
            f"Route: {route}\n"
        )

        customer_subject = _CUSTOMER_SUBJECT.get(new_status, internal_subject).format(num=num)
        customer_message = (
            f"{customer_subject}.\n\n"
            f"Route: {route}\n"
            f"Pickup: {load.pickup_date.strftime('%m/%d/%Y') if load.pickup_date else 'TBD'}\n"
            f"Delivery: {load.delivery_date.strftime('%m/%d/%Y') if load.delivery_date else 'TBD'}\n"
            f"\nTrack your shipment: {_tracking_url(load)}\n"
        )

        metadata = {
            'load_number': num,
            'old_status': old_status,
            'new_status': new_status,
        }

        # in-app → all company users (bell), excluding actor
        if in_app:
            _notify_company_users_inapp(
                tenant, company, 'load',
                internal_subject, internal_message,
                'Load', load.id, today, metadata,
                exclude_user=changed_by,
            )

        # email → customer
        if email and load.customer and load.customer.email:
            _create_notification(
                tenant, None, 'load', 'email',
                customer_subject, customer_message,
                'Load', load.id, today, metadata,
                recipient_email=load.customer.email,
            )

    except Exception:
        logger.exception("notify_load_status_change failed for load %s", load.id)


# No-ops: these are now folded into notify_load_status_change
def notify_customer_load_dispatched(load):
    pass


def notify_customer_trip_started(trip):
    pass


def notify_customer_trip_completed(trip):
    pass


# ── Driver-facing alerts ────────────────────────────────────────────────

def notify_driver_load_assigned(load, driver):
    """
    Notify a driver that a load has been assigned to them.
    Recipient: the driver only (in-app, email).
    """
    try:
        company = load.company
        in_app, email = _get_setting(company, 'driver_load_assigned')
        if not (in_app or email):
            return
        if not driver or not driver.user_account:
            return

        tenant = company.tenant
        today = timezone.now().date()

        subject = f"Load {load.load_number} assigned to you"
        message = (
            f"You have been assigned Load {load.load_number}.\n\n"
            f"Route: {load.pickup_location_display} → {load.delivery_location_display}\n"
            f"Pickup: {load.pickup_date.strftime('%m/%d/%Y') if load.pickup_date else 'TBD'}\n"
            f"Delivery: {load.delivery_date.strftime('%m/%d/%Y') if load.delivery_date else 'TBD'}\n"
        )
        if hasattr(load, 'special_instructions') and load.special_instructions:
            message += f"\nSpecial instructions: {load.special_instructions}\n"

        metadata = {'load_number': load.load_number, 'event': 'assigned'}

        if in_app:
            _create_notification(
                tenant, driver.user_account, 'operations', 'in_app',
                subject, message, 'Load', load.id, today, metadata,
            )
        if email and driver.user_account.email:
            _create_notification(
                tenant, driver.user_account, 'operations', 'email',
                subject, message, 'Load', load.id, today, metadata,
                recipient_email=driver.user_account.email,
            )
    except Exception:
        logger.exception("notify_driver_load_assigned failed for load %s", load.id)


def notify_driver_load_reassigned_away(load, old_driver):
    """
    Notify the driver that a load has been reassigned away from them.
    Recipient: the displaced driver only.
    """
    try:
        company = load.company
        in_app, email = _get_setting(company, 'driver_load_reassigned')
        if not (in_app or email):
            return
        if not old_driver or not old_driver.user_account:
            return

        tenant = company.tenant
        today = timezone.now().date()

        subject = f"Load {load.load_number} has been reassigned"
        message = (
            f"Load {load.load_number} ({load.pickup_location_display} → "
            f"{load.delivery_location_display}) has been reassigned to another driver."
        )
        metadata = {'load_number': load.load_number, 'event': 'reassigned_away'}

        if in_app:
            _create_notification(
                tenant, old_driver.user_account, 'operations', 'in_app',
                subject, message, 'Load', load.id, today, metadata,
            )
        if email and old_driver.user_account.email:
            _create_notification(
                tenant, old_driver.user_account, 'operations', 'email',
                subject, message, 'Load', load.id, today, metadata,
                recipient_email=old_driver.user_account.email,
            )
    except Exception:
        logger.exception("notify_driver_load_reassigned_away failed for load %s", load.id)


def notify_load_reassigned(load, old_driver, new_driver, reassigned_by=None):
    """
    Called from reassign_load(). Notifies the displaced driver only.
    No company-wide broadcast in the new design.
    """
    if old_driver:
        notify_driver_load_reassigned_away(load, old_driver)


# ── Trip alerts ─────────────────────────────────────────────────────────

def notify_trip_started(trip, started_by=None):
    """
    Called from start_trip(). Notifies the user who dispatched the load
    (trip.created_by), not all company users.
    """
    try:
        company = trip.company
        in_app, email = _get_setting(company, 'trip_started_dispatcher')
        if not (in_app or email):
            return

        dispatcher = getattr(trip, 'created_by', None)
        if not dispatcher:
            return

        tenant = company.tenant
        today = timezone.now().date()
        driver_name = (
            f"{trip.driver.first_name} {trip.driver.last_name}"
            if trip.driver else "your driver"
        )

        subject = f"Trip {trip.trip_number} started"
        message = (
            f"Trip {trip.trip_number} is now in progress.\n\n"
            f"Driver: {driver_name}\n"
            f"Route: {trip.start_location} → {trip.end_location}\n"
            f"Started: {timezone.now().strftime('%m/%d/%Y %I:%M %p')}\n"
        )
        metadata = {'trip_number': trip.trip_number, 'event': 'started'}

        if in_app:
            _create_notification(
                tenant, dispatcher, 'operations', 'in_app',
                subject, message, 'Trips', trip.id, today, metadata,
            )
        if email and dispatcher.email:
            _create_notification(
                tenant, dispatcher, 'operations', 'email',
                subject, message, 'Trips', trip.id, today, metadata,
                recipient_email=dispatcher.email,
            )
    except Exception:
        logger.exception("notify_trip_started failed for trip %s", trip.id)


def notify_trip_completed(trip, completed_by=None):
    """
    Trip completion is surfaced through the load status change
    (in_transit → delivered). No separate company broadcast needed.
    """
    pass


# ── Vehicle safety alerts ───────────────────────────────────────────────

def notify_vehicle_status_change(vehicle_status, old_status=None):
    """
    Called when a VehicleOperationStatus changes to prohibited, out_of_service,
    or recovers to safe/conditional. Notifies all company users.
    """
    try:
        new_status = vehicle_status.current_status
        if new_status in ('safe', 'conditional') and old_status not in ('prohibited', 'out_of_service'):
            return  # only alert on danger statuses or recovery from danger

        if vehicle_status.truck:
            label = f"Truck {vehicle_status.truck.unit_number}"
            company = vehicle_status.truck.company
        elif vehicle_status.trailer:
            label = f"Trailer {vehicle_status.trailer.unit_number}"
            company = vehicle_status.trailer.company
        else:
            return

        # Determine the setting key
        if new_status == 'prohibited':
            key = 'safety_vehicle_prohibited'
        elif new_status == 'out_of_service':
            key = 'safety_vehicle_oos'
        else:
            key = 'safety_vehicle_cleared'

        in_app, email, whatsapp = _get_setting(company, key)
        if not (in_app or email or whatsapp):
            return

        tenant = company.tenant

        if new_status in ('prohibited', 'out_of_service'):
            subject = f"ALERT: {label} — {vehicle_status.get_current_status_display()}"
            message = (
                f"{label} has been placed {vehicle_status.get_current_status_display()}.\n\n"
                f"Reason: {vehicle_status.status_reason or 'Not specified'}\n"
            )
            if vehicle_status.clear_status_date:
                message += f"Expected clearance: {vehicle_status.clear_status_date}\n"
        else:
            subject = f"{label} — returned to {vehicle_status.get_current_status_display()}"
            message = (
                f"{label} is now {vehicle_status.get_current_status_display()}.\n"
                f"Previous status: {old_status}\n"
            )

        metadata = {
            'vehicle': label,
            'new_status': new_status,
            'old_status': old_status,
        }

        _notify_company_users_all_channels(
            tenant, company, 'compliance', subject, message,
            'VehicleOperationStatus', vehicle_status.id,
            metadata=metadata,
            in_app=in_app, email=email, whatsapp=whatsapp,
        )
    except Exception:
        logger.exception("notify_vehicle_status_change failed for %s", vehicle_status.id)


# ── Shared helpers ──────────────────────────────────────────────────────

def _notify_company_users_inapp(tenant, company, category, subject, message,
                                related_type, related_id, today, metadata,
                                exclude_user=None):
    """Create in-app Notification records for every user in *company*."""
    profiles = (
        UserProfile.objects
        .filter(companies=company)
        .select_related('user')
        .only('user__id')
    )
    for profile in profiles:
        if exclude_user and profile.user_id == exclude_user.id:
            continue
        _create_notification(
            tenant, profile.user, category, 'in_app',
            subject, message, related_type, related_id, today, metadata,
        )


def _notify_company_users_all_channels(tenant, company, category, subject, message,
                                       related_type, related_id,
                                       metadata=None, exclude_user=None,
                                       in_app=False, email=False, whatsapp=False):
    """
    Notify all company users across the enabled channels.
    Used for compliance and safety alerts.
    """
    profiles = (
        UserProfile.objects
        .filter(companies=company)
        .select_related('user')
        .only('user__id', 'user__email')
    )
    today = timezone.now().date()

    for profile in profiles:
        if exclude_user and profile.user_id == exclude_user.id:
            continue

        if in_app:
            _create_notification(
                tenant, profile.user, category, 'in_app',
                subject, message, related_type, related_id, today, metadata,
            )
        if email and profile.user.email:
            _create_notification(
                tenant, profile.user, category, 'email',
                subject, message, related_type, related_id, today, metadata,
                recipient_email=profile.user.email,
            )
        if whatsapp:
            phone = _get_whatsapp_phone(profile.user)
            if phone:
                _create_notification(
                    tenant, profile.user, category, 'whatsapp',
                    subject, message, related_type, related_id, today, metadata,
                    recipient_phone=phone,
                )


def _create_notification(tenant, user, category, channel, subject, message,
                         related_type, related_id, today, metadata,
                         recipient_email='', recipient_phone=''):
    """Create a single Notification (de-duped by subject + channel + object + day)."""
    exists = Notification.objects.filter(
        tenant=tenant,
        recipient=user,
        channel=channel,
        related_object_type=related_type,
        related_object_id=related_id,
        subject=subject,
        created_at__date=today,
    ).exists()
    if exists:
        return

    Notification.objects.create(
        tenant=tenant,
        recipient=user,
        category=category,
        channel=channel,
        subject=subject,
        message=message,
        recipient_email=recipient_email,
        recipient_phone=recipient_phone,
        status='pending',
        related_object_type=related_type,
        related_object_id=related_id,
        metadata=metadata or {},
    )
