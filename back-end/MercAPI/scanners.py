"""
Step 9.4 — Compliance Scanner
Periodic scanner that detects expiring documents, certifications, and insurance
across all tenants and creates Notification records for company users.
"""
from datetime import date
from django.db.models import Q
import logging

from .models import (
    Tenant, Company, Driver, DriverTest, Truck, Trailer,
    AnnualInspection, MaintenanceRecord, Carrier,
    Notification, NotificationPreference, UserProfile,
)

logger = logging.getLogger(__name__)

# Days-before-expiration that trigger a notification
THRESHOLDS = [30, 14, 7, 1, 0]


# ── public entry point ──────────────────────────────────────────────────

def scan_all_compliance():
    """Iterate every tenant and run the full compliance scan."""
    today = date.today()
    results = {'tenants_scanned': 0, 'notifications_created': 0, 'errors': []}

    for tenant in Tenant.objects.all():
        try:
            count = _scan_tenant(tenant, today)
            results['notifications_created'] += count
            results['tenants_scanned'] += 1
        except Exception as e:
            logger.exception("Compliance scan failed for tenant %s", tenant.id)
            results['errors'].append(f"Tenant {tenant.id}: {e}")

    logger.info(
        "Compliance scan complete — tenants=%d  notifications=%d  errors=%d",
        results['tenants_scanned'],
        results['notifications_created'],
        len(results['errors']),
    )
    return results


# ── per-tenant orchestrator ─────────────────────────────────────────────

def _scan_tenant(tenant, today):
    count = 0
    for company in Company.objects.filter(tenant=tenant):
        count += _scan_driver_compliance(tenant, company, today)
        count += _scan_driver_tests(tenant, company, today)
        count += _scan_truck_compliance(tenant, company, today)
        count += _scan_annual_inspections(tenant, company, today)
        count += _scan_carrier_insurance(tenant, company, today)
        count += _scan_maintenance(tenant, company, today)
    return count


# ── individual scanners ─────────────────────────────────────────────────

def _scan_driver_compliance(tenant, company, today):
    """CDL, DOT physical, annual MVR."""
    count = 0
    for driver in Driver.objects.filter(company=company):
        label = f"{driver.first_name} {driver.last_name}"
        count += _check_and_notify(
            tenant, company, 'compliance', 'CDL License',
            label, driver.cdl_expiration_date, 'Driver', driver.id, today,
        )
        count += _check_and_notify(
            tenant, company, 'compliance', 'DOT Physical / Medical Card',
            label, driver.physical_date, 'Driver', driver.id, today,
        )
        count += _check_and_notify(
            tenant, company, 'compliance', 'Annual MVR',
            label, driver.annual_vmr_date, 'Driver', driver.id, today,
        )
    return count


def _scan_driver_tests(tenant, company, today):
    """Drug & alcohol test scheduling."""
    count = 0
    tests = DriverTest.objects.filter(
        driver__company=company,
        next_scheduled_test_date__isnull=False,
    ).select_related('driver')
    for test in tests:
        label = f"{test.driver.first_name} {test.driver.last_name}"
        count += _check_and_notify(
            tenant, company, 'compliance', 'Drug/Alcohol Test',
            label, test.next_scheduled_test_date, 'DriverTest', test.id, today,
        )
    return count


def _scan_truck_compliance(tenant, company, today):
    """Registration, insurance, license plate."""
    count = 0
    for truck in Truck.objects.filter(company=company):
        label = f"Truck {truck.unit_number}"
        count += _check_and_notify(
            tenant, company, 'compliance', 'Registration',
            label, truck.registration_expiration, 'Truck', truck.id, today,
        )
        count += _check_and_notify(
            tenant, company, 'insurance', 'Insurance',
            label, truck.insurance_expiration, 'Truck', truck.id, today,
        )
        count += _check_and_notify(
            tenant, company, 'compliance', 'License Plate',
            label, truck.license_plate_expiration, 'Truck', truck.id, today,
        )
    return count


def _scan_annual_inspections(tenant, company, today):
    """CFR 396.17 annual inspection due dates."""
    count = 0
    inspections = AnnualInspection.objects.filter(
        Q(truck__company=company) | Q(trailer__company=company),
    ).select_related('truck', 'trailer')

    for insp in inspections:
        if insp.truck:
            label = f"Truck {insp.truck.unit_number}"
        elif insp.trailer:
            label = f"Trailer {insp.trailer.unit_number}"
        else:
            continue
        count += _check_and_notify(
            tenant, company, 'compliance', 'Annual DOT Inspection',
            label, insp.next_inspection_due, 'AnnualInspection', insp.id, today,
        )
    return count


def _scan_carrier_insurance(tenant, company, today):
    """Carrier insurance expirations."""
    count = 0
    for carrier in Carrier.objects.filter(company=company):
        label = f"Carrier {carrier.name}"
        count += _check_and_notify(
            tenant, company, 'insurance', 'Insurance',
            label, carrier.insurance_expiration, 'Carrier', carrier.id, today,
        )
    return count


def _scan_maintenance(tenant, company, today):
    """Upcoming / overdue scheduled maintenance (uncompleted only)."""
    count = 0
    records = MaintenanceRecord.objects.filter(
        Q(truck__company=company) | Q(trailer__company=company),
        status__in=['scheduled', 'in_progress'],
    ).select_related('truck', 'trailer')

    for rec in records:
        if rec.truck:
            label = f"Truck {rec.truck.unit_number}"
        elif rec.trailer:
            label = f"Trailer {rec.trailer.unit_number}"
        else:
            continue
        count += _check_and_notify(
            tenant, company, 'maintenance',
            f'Scheduled Maintenance ({rec.get_maintenance_type_display()})',
            label, rec.scheduled_date, 'MaintenanceRecord', rec.record_id, today,
        )
    return count


# ── core helper ─────────────────────────────────────────────────────────

def _check_and_notify(tenant, company, category, field_label, item_label,
                      expiration_date, related_type, related_id, today):
    """
    If *expiration_date* falls on a warning threshold, create Notification
    records for every eligible user in *company*.
    Returns the number of notifications created.
    """
    if not expiration_date:
        return 0

    days_left = (expiration_date - today).days

    # Build subject / message based on urgency
    if days_left < 0:
        subject = f"EXPIRED: {field_label} for {item_label}"
        message = (
            f"{field_label} for {item_label} expired {abs(days_left)} day(s) ago "
            f"on {expiration_date}. Immediate action required."
        )
        urgency = 'expired'
    elif days_left == 0:
        subject = f"EXPIRES TODAY: {field_label} for {item_label}"
        message = (
            f"{field_label} for {item_label} expires today ({expiration_date}). "
            f"Immediate action required."
        )
        urgency = 'today'
    elif days_left in THRESHOLDS:
        if days_left <= 7:
            subject = f"URGENT: {field_label} for {item_label} — {days_left} days"
            urgency = 'urgent'
        else:
            subject = f"Upcoming: {field_label} for {item_label} — {days_left} days"
            urgency = 'warning'
        message = (
            f"{field_label} for {item_label} expires on {expiration_date} "
            f"({days_left} days remaining). Please schedule renewal."
        )
    else:
        return 0  # not on a threshold day

    # Find users in this company
    profiles = UserProfile.objects.filter(
        companies=company,
    ).select_related('user')

    metadata = {
        'urgency': urgency,
        'days_left': days_left,
        'expiration_date': str(expiration_date),
        'company_id': company.id,
        'company_name': company.name,
    }

    count = 0
    for profile in profiles:
        pref = NotificationPreference.objects.filter(
            user=profile.user, category=category,
        ).first()

        # ── email (default channel) ──
        email_enabled = pref.email_enabled if pref else True
        if email_enabled:
            count += _create_if_new(
                tenant, profile.user, category, 'email', subject, message,
                related_type, related_id, today, metadata,
                recipient_email=profile.user.email,
            )

        # ── WhatsApp ──
        if pref and pref.whatsapp_enabled and pref.whatsapp_phone:
            count += _create_if_new(
                tenant, profile.user, category, 'whatsapp', subject, message,
                related_type, related_id, today, metadata,
                recipient_phone=pref.whatsapp_phone,
            )

        # ── SMS ──
        if pref and pref.sms_enabled and pref.sms_phone:
            count += _create_if_new(
                tenant, profile.user, category, 'sms', subject, message,
                related_type, related_id, today, metadata,
                recipient_phone=pref.sms_phone,
            )

    return count


def _create_if_new(tenant, user, category, channel, subject, message,
                   related_type, related_id, today, metadata,
                   recipient_email='', recipient_phone=''):
    """Create a Notification only if one with the same fingerprint doesn't exist today."""
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
        return 0

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
        metadata=metadata,
    )
    return 1
