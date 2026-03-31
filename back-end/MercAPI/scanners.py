"""
Step 9.4 — Compliance Scanner
Periodic scanner that detects expiring documents, certifications, and insurance
across all tenants and creates Notification records for company users.

Memory-optimised: uses SQL-level date filtering so only rows that actually
hit a warning threshold are loaded.  All querysets use .iterator() and .only()
to keep the working set small (safe for 512 MB worker instances).
"""
from datetime import date, timedelta
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


def _threshold_dates(today):
    """Return the concrete dates that match our warning thresholds."""
    return [today + timedelta(days=d) for d in THRESHOLDS]


def _threshold_date_filter(field_name, today):
    """
    Q filter that matches rows whose *field_name* equals one of the
    threshold dates OR is already in the past (expired).
    """
    dates = _threshold_dates(today)
    return Q(**{f'{field_name}__in': dates}) | Q(**{f'{field_name}__lt': today})


# ── public entry point ──────────────────────────────────────────────────

def scan_all_compliance():
    """Iterate every tenant and run the full compliance scan."""
    today = date.today()
    results = {'tenants_scanned': 0, 'notifications_created': 0, 'errors': []}

    for tenant in Tenant.objects.only('id', 'domain').iterator():
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
    for company in Company.objects.filter(tenant=tenant).only('id', 'name', 'tenant_id').iterator():
        # Pre-fetch users + preferences for this company once
        profiles = list(
            UserProfile.objects.filter(companies=company)
            .select_related('user')
            .only('user__id', 'user__email', 'user__username')
        )
        if not profiles:
            continue

        pref_cache = _load_preferences(profiles)

        count += _scan_driver_compliance(tenant, company, today, profiles, pref_cache)
        count += _scan_driver_tests(tenant, company, today, profiles, pref_cache)
        count += _scan_truck_compliance(tenant, company, today, profiles, pref_cache)
        count += _scan_annual_inspections(tenant, company, today, profiles, pref_cache)
        count += _scan_carrier_insurance(tenant, company, today, profiles, pref_cache)
        count += _scan_maintenance(tenant, company, today, profiles, pref_cache)
    return count


def _load_preferences(profiles):
    """
    Build {(user_id, category): NotificationPreference} lookup in one query.
    """
    user_ids = [p.user_id for p in profiles]
    prefs = NotificationPreference.objects.filter(user_id__in=user_ids)
    return {(p.user_id, p.category): p for p in prefs}


# ── individual scanners ─────────────────────────────────────────────────

def _scan_driver_compliance(tenant, company, today, profiles, pref_cache):
    """CDL, DOT physical, annual MVR — only rows near a threshold."""
    date_q = (
        _threshold_date_filter('cdl_expiration_date', today)
        | _threshold_date_filter('physical_date', today)
        | _threshold_date_filter('annual_vmr_date', today)
    )
    drivers = (
        Driver.objects.filter(date_q, company=company)
        .only('id', 'first_name', 'last_name',
              'cdl_expiration_date', 'physical_date', 'annual_vmr_date')
        .iterator()
    )
    count = 0
    for driver in drivers:
        label = f"{driver.first_name} {driver.last_name}"
        count += _check_and_notify(
            tenant, company, 'compliance', 'CDL License',
            label, driver.cdl_expiration_date, 'Driver', driver.id,
            today, profiles, pref_cache,
        )
        count += _check_and_notify(
            tenant, company, 'compliance', 'DOT Physical / Medical Card',
            label, driver.physical_date, 'Driver', driver.id,
            today, profiles, pref_cache,
        )
        count += _check_and_notify(
            tenant, company, 'compliance', 'Annual MVR',
            label, driver.annual_vmr_date, 'Driver', driver.id,
            today, profiles, pref_cache,
        )
    return count


def _scan_driver_tests(tenant, company, today, profiles, pref_cache):
    """Drug & alcohol test scheduling."""
    tests = (
        DriverTest.objects.filter(
            _threshold_date_filter('next_scheduled_test_date', today),
            driver__company=company,
            next_scheduled_test_date__isnull=False,
        )
        .select_related('driver')
        .only('id', 'next_scheduled_test_date',
              'driver__id', 'driver__first_name', 'driver__last_name')
        .iterator()
    )
    count = 0
    for test in tests:
        label = f"{test.driver.first_name} {test.driver.last_name}"
        count += _check_and_notify(
            tenant, company, 'compliance', 'Drug/Alcohol Test',
            label, test.next_scheduled_test_date, 'DriverTest', test.id,
            today, profiles, pref_cache,
        )
    return count


def _scan_truck_compliance(tenant, company, today, profiles, pref_cache):
    """Registration, insurance, license plate."""
    date_q = (
        _threshold_date_filter('registration_expiration', today)
        | _threshold_date_filter('insurance_expiration', today)
        | _threshold_date_filter('license_plate_expiration', today)
    )
    trucks = (
        Truck.objects.filter(date_q, company=company)
        .only('id', 'unit_number',
              'registration_expiration', 'insurance_expiration',
              'license_plate_expiration')
        .iterator()
    )
    count = 0
    for truck in trucks:
        label = f"Truck {truck.unit_number}"
        count += _check_and_notify(
            tenant, company, 'compliance', 'Registration',
            label, truck.registration_expiration, 'Truck', truck.id,
            today, profiles, pref_cache,
        )
        count += _check_and_notify(
            tenant, company, 'insurance', 'Insurance',
            label, truck.insurance_expiration, 'Truck', truck.id,
            today, profiles, pref_cache,
        )
        count += _check_and_notify(
            tenant, company, 'compliance', 'License Plate',
            label, truck.license_plate_expiration, 'Truck', truck.id,
            today, profiles, pref_cache,
        )
    return count


def _scan_annual_inspections(tenant, company, today, profiles, pref_cache):
    """CFR 396.17 annual inspection due dates."""
    inspections = (
        AnnualInspection.objects.filter(
            _threshold_date_filter('next_inspection_due', today),
            Q(truck__company=company) | Q(trailer__company=company),
        )
        .select_related('truck', 'trailer')
        .only('id', 'next_inspection_due',
              'truck__id', 'truck__unit_number',
              'trailer__id', 'trailer__unit_number')
        .iterator()
    )
    count = 0
    for insp in inspections:
        if insp.truck:
            label = f"Truck {insp.truck.unit_number}"
        elif insp.trailer:
            label = f"Trailer {insp.trailer.unit_number}"
        else:
            continue
        count += _check_and_notify(
            tenant, company, 'compliance', 'Annual DOT Inspection',
            label, insp.next_inspection_due, 'AnnualInspection', insp.id,
            today, profiles, pref_cache,
        )
    return count


def _scan_carrier_insurance(tenant, company, today, profiles, pref_cache):
    """Carrier insurance expirations."""
    carriers = (
        Carrier.objects.filter(
            _threshold_date_filter('insurance_expiration', today),
            company=company,
        )
        .only('id', 'name', 'insurance_expiration')
        .iterator()
    )
    count = 0
    for carrier in carriers:
        label = f"Carrier {carrier.name}"
        count += _check_and_notify(
            tenant, company, 'insurance', 'Insurance',
            label, carrier.insurance_expiration, 'Carrier', carrier.id,
            today, profiles, pref_cache,
        )
    return count


def _scan_maintenance(tenant, company, today, profiles, pref_cache):
    """Upcoming / overdue scheduled maintenance (uncompleted only)."""
    records = (
        MaintenanceRecord.objects.filter(
            _threshold_date_filter('scheduled_date', today),
            Q(truck__company=company) | Q(trailer__company=company),
            status__in=['scheduled', 'in_progress'],
        )
        .select_related('truck', 'trailer')
        .only('record_id', 'scheduled_date', 'maintenance_type',
              'truck__id', 'truck__unit_number',
              'trailer__id', 'trailer__unit_number')
        .iterator()
    )
    count = 0
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
            label, rec.scheduled_date, 'MaintenanceRecord', rec.record_id,
            today, profiles, pref_cache,
        )
    return count


# ── core helper ─────────────────────────────────────────────────────────

def _check_and_notify(tenant, company, category, field_label, item_label,
                      expiration_date, related_type, related_id,
                      today, profiles, pref_cache):
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

    metadata = {
        'urgency': urgency,
        'days_left': days_left,
        'expiration_date': str(expiration_date),
        'company_id': company.id,
        'company_name': company.name,
    }

    count = 0
    for profile in profiles:
        pref = pref_cache.get((profile.user_id, category))

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
