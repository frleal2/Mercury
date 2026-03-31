"""
Step 9.5 — Operational Alert Triggers

Helper functions called from views after key operational events.
Each creates Notification records (and optionally a unified Notification
record) that get dispatched by the 5-minute `dispatch_pending_notifications`
beat task.

All functions are non-blocking best-effort: failures are logged but never
raised back to the caller so the main business logic is unaffected.
"""
import logging

from django.utils import timezone

from .models import (
    Notification, NotificationPreference, UserProfile,
    Tenant, Company,
)

logger = logging.getLogger(__name__)


# ── Load lifecycle alerts ───────────────────────────────────────────────

def notify_load_dispatched(load, driver=None, carrier=None, dispatched_by=None):
    """
    Called from dispatch_load() after a load transitions to 'dispatched'.
    Notifies company users about the dispatch assignment.
    """
    try:
        tenant = load.company.tenant
        company = load.company

        if driver:
            details = f"Driver: {driver.first_name} {driver.last_name}"
        elif carrier:
            details = f"Carrier: {carrier.name}"
        else:
            details = "Assignment details unavailable"

        subject = f"Load {load.load_number} dispatched"
        message = (
            f"Load {load.load_number} has been dispatched.\n\n"
            f"{details}\n"
            f"Route: {load.pickup_location_display} → {load.delivery_location_display}\n"
            f"Pickup: {load.pickup_date.strftime('%m/%d/%Y') if load.pickup_date else 'TBD'}\n"
        )
        if dispatched_by:
            message += f"Dispatched by: {dispatched_by.get_full_name() or dispatched_by.username}\n"

        _notify_company_users(
            tenant, company, 'operations', subject, message,
            related_type='Load', related_id=load.id,
            exclude_user=dispatched_by,
            metadata={'load_number': load.load_number, 'event': 'dispatched'},
        )
    except Exception:
        logger.exception("notify_load_dispatched failed for load %s", load.id)


def notify_load_status_change(load, old_status, new_status, changed_by=None):
    """
    Called from LoadViewSet.perform_update / trip start / trip complete
    when a load changes status.  Skips 'dispatched' (handled by notify_load_dispatched).
    """
    try:
        if new_status == 'dispatched':
            return  # handled separately

        tenant = load.company.tenant
        company = load.company

        subject = f"Load {load.load_number} — {load.get_status_display()}"
        message = (
            f"Load {load.load_number} status changed: "
            f"{old_status} → {new_status}\n\n"
            f"Route: {load.pickup_location_display} → {load.delivery_location_display}\n"
        )

        _notify_company_users(
            tenant, company, 'load', subject, message,
            related_type='Load', related_id=load.id,
            exclude_user=changed_by,
            metadata={
                'load_number': load.load_number,
                'old_status': old_status,
                'new_status': new_status,
            },
        )
    except Exception:
        logger.exception("notify_load_status_change failed for load %s", load.id)


def notify_load_reassigned(load, old_driver, new_driver, reassigned_by=None):
    """Called from reassign_load() when a load's driver/truck is changed."""
    try:
        tenant = load.company.tenant
        company = load.company

        old_name = f"{old_driver.first_name} {old_driver.last_name}" if old_driver else "None"
        new_name = f"{new_driver.first_name} {new_driver.last_name}" if new_driver else "None"

        subject = f"Load {load.load_number} reassigned"
        message = (
            f"Load {load.load_number} has been reassigned.\n\n"
            f"Previous driver: {old_name}\n"
            f"New driver: {new_name}\n"
            f"Route: {load.pickup_location_display} → {load.delivery_location_display}\n"
        )

        _notify_company_users(
            tenant, company, 'operations', subject, message,
            related_type='Load', related_id=load.id,
            exclude_user=reassigned_by,
            metadata={
                'load_number': load.load_number,
                'event': 'reassigned',
                'old_driver': old_name,
                'new_driver': new_name,
            },
        )
    except Exception:
        logger.exception("notify_load_reassigned failed for load %s", load.id)


# ── Vehicle status alerts ──────────────────────────────────────────────

def notify_vehicle_status_change(vehicle_status, old_status=None):
    """
    Called when a VehicleOperationStatus record changes to prohibited or
    out_of_service.  These are safety-critical, so we always alert.
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
            # Recovery: back to safe / conditional
            subject = f"{label} — returned to {vehicle_status.get_current_status_display()}"
            message = (
                f"{label} is now {vehicle_status.get_current_status_display()}.\n"
                f"Previous status: {old_status}\n"
            )

        _notify_company_users(
            tenant, company, 'compliance', subject, message,
            related_type='VehicleOperationStatus', related_id=vehicle_status.id,
            metadata={
                'vehicle': label,
                'new_status': new_status,
                'old_status': old_status,
            },
        )
    except Exception:
        logger.exception("notify_vehicle_status_change failed for %s", vehicle_status.id)


# ── Trip alerts ─────────────────────────────────────────────────────────

def notify_trip_started(trip, started_by=None):
    """Called from start_trip() when a trip begins."""
    try:
        tenant = trip.company.tenant
        company = trip.company
        driver_name = f"{trip.driver.first_name} {trip.driver.last_name}" if trip.driver else "Unknown"

        subject = f"Trip {trip.trip_number} started"
        message = (
            f"Trip {trip.trip_number} is now in progress.\n\n"
            f"Driver: {driver_name}\n"
            f"Route: {trip.start_location} → {trip.end_location}\n"
            f"Started: {timezone.now().strftime('%m/%d/%Y %I:%M %p')}\n"
        )

        _notify_company_users(
            tenant, company, 'operations', subject, message,
            related_type='Trips', related_id=trip.id,
            exclude_user=started_by,
            metadata={'trip_number': trip.trip_number, 'event': 'started'},
        )
    except Exception:
        logger.exception("notify_trip_started failed for trip %s", trip.id)


def notify_trip_completed(trip, completed_by=None):
    """Called from complete_trip() when a trip finishes."""
    try:
        tenant = trip.company.tenant
        company = trip.company
        driver_name = f"{trip.driver.first_name} {trip.driver.last_name}" if trip.driver else "Unknown"

        subject = f"Trip {trip.trip_number} completed"
        message = (
            f"Trip {trip.trip_number} has been completed.\n\n"
            f"Driver: {driver_name}\n"
            f"Route: {trip.start_location} → {trip.end_location}\n"
        )
        if trip.miles_driven:
            message += f"Miles driven: {trip.miles_driven}\n"

        _notify_company_users(
            tenant, company, 'operations', subject, message,
            related_type='Trips', related_id=trip.id,
            exclude_user=completed_by,
            metadata={'trip_number': trip.trip_number, 'event': 'completed'},
        )
    except Exception:
        logger.exception("notify_trip_completed failed for trip %s", trip.id)


# ── shared helper ───────────────────────────────────────────────────────

def _notify_company_users(tenant, company, category, subject, message,
                          related_type='', related_id=None,
                          exclude_user=None, metadata=None):
    """
    Create Notification records for each user in *company* respecting their
    NotificationPreference per category.  Skips the *exclude_user* (the person
    who performed the action).
    """
    profiles = (
        UserProfile.objects
        .filter(companies=company)
        .select_related('user')
        .only('user__id', 'user__email', 'user__username')
    )

    # Batch-load preferences
    user_ids = [p.user_id for p in profiles]
    prefs = {
        (p.user_id, p.category): p
        for p in NotificationPreference.objects.filter(
            user_id__in=user_ids, category=category,
        )
    }

    today = timezone.now().date()

    for profile in profiles:
        if exclude_user and profile.user_id == exclude_user.id:
            continue

        pref = prefs.get((profile.user_id, category))

        # Email (default on)
        if pref is None or pref.email_enabled:
            _create_notification(
                tenant, profile.user, category, 'email', subject, message,
                related_type, related_id, today, metadata,
                recipient_email=profile.user.email,
            )

        # WhatsApp
        if pref and pref.whatsapp_enabled and pref.whatsapp_phone:
            _create_notification(
                tenant, profile.user, category, 'whatsapp', subject, message,
                related_type, related_id, today, metadata,
                recipient_phone=pref.whatsapp_phone,
            )


def _create_notification(tenant, user, category, channel, subject, message,
                         related_type, related_id, today, metadata,
                         recipient_email='', recipient_phone=''):
    """Create a single Notification (de-duped by subject + channel + day)."""
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
