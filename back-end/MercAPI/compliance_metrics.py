"""
Internal compliance metrics computation.
Aggregates data from Fleetly models (Driver, Truck, Inspection, Trips, etc.)
into a ComplianceMetric snapshot per company.

Run nightly via Celery or on-demand from the API.
"""
import logging
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Q, Count, Sum
from django.utils import timezone

logger = logging.getLogger(__name__)


def compute_and_store(company, period_days=30):
    """
    Compute compliance metrics for a company over the given period
    and store as a ComplianceMetric record.
    Returns the created ComplianceMetric instance.
    """
    from MercAPI.models import (
        ComplianceMetric, Driver, Truck, Trailer, Inspection,
        AnnualInspection, VehicleOperationStatus, Trips,
        DriverHOS, DriverTest, MaintenanceRecord,
    )

    today = date.today()
    period_start = today - timedelta(days=period_days)
    period_end = today

    # --- Driver compliance ---
    drivers = Driver.objects.filter(company=company, active=True)
    total_drivers = drivers.count()
    drivers_cdl_current = drivers.filter(cdl_expiration_date__gte=today).count()
    drivers_medical_current = drivers.filter(physical_date__gte=today).count()
    drivers_mvr_current = drivers.filter(annual_vmr_date__gte=today).count()

    # Drug test compliance: drivers who need a test this year and have a passing one
    drug_tests_required = drivers.filter(random_test_required_this_year=True).count()
    drug_tests_compliant = 0
    if drug_tests_required > 0:
        year_start = date(today.year, 1, 1)
        drivers_with_test = DriverTest.objects.filter(
            driver__company=company,
            driver__active=True,
            driver__random_test_required_this_year=True,
            test_date__gte=year_start,
            test_result='Pass',
        ).values('driver').distinct().count()
        drug_tests_compliant = drivers_with_test

    # --- Vehicle compliance ---
    trucks = Truck.objects.filter(company=company, active=True)
    trailers = Trailer.objects.filter(company=company, active=True)
    total_trucks = trucks.count()
    total_trailers = trailers.count()

    trucks_annual_inspection_current = trucks.filter(
        annual_dot_inspection_date__gte=today - timedelta(days=365)
    ).count()
    trucks_registration_current = trucks.filter(registration_expiration__gte=today).count()
    trucks_insurance_current = trucks.filter(insurance_expiration__gte=today).count()

    # Vehicle operation status counts
    vos_qs = VehicleOperationStatus.objects.filter(
        Q(truck__company=company) | Q(trailer__company=company)
    )
    vehicles_safe = vos_qs.filter(current_status='safe').count()
    vehicles_conditional = vos_qs.filter(current_status='conditional').count()
    vehicles_prohibited = vos_qs.filter(current_status='prohibited').count()
    vehicles_oos = vos_qs.filter(current_status='out_of_service').count()

    # --- Inspection results (period) ---
    inspections = Inspection.objects.filter(
        company=company,
        completed_at__date__gte=period_start,
        completed_at__date__lte=period_end,
    )
    total_inspections = inspections.count()
    inspections_with_defects = inspections.filter(defects_found=True).count()
    defect_rate = Decimal(0)
    if total_inspections > 0:
        defect_rate = Decimal(inspections_with_defects * 100) / Decimal(total_inspections)
        defect_rate = defect_rate.quantize(Decimal('0.01'))

    # --- Trip compliance (period) ---
    trips = Trips.objects.filter(
        company=company,
        created_at__date__gte=period_start,
        created_at__date__lte=period_end,
    )
    total_trips = trips.count()
    trips_with_pre = trips.filter(pre_trip_inspection_completed=True).count()
    trips_with_post = trips.filter(post_trip_inspection_completed=True).count()
    dvir_reviewed = trips.filter(last_dvir_reviewed=True).count()
    dvir_rate = Decimal(0)
    if total_trips > 0:
        dvir_rate = Decimal(dvir_reviewed * 100) / Decimal(total_trips)
        dvir_rate = dvir_rate.quantize(Decimal('0.01'))

    # --- Maintenance health (period) ---
    maint = MaintenanceRecord.objects.filter(
        Q(truck__company=company) | Q(trailer__company=company),
        scheduled_date__gte=period_start,
        scheduled_date__lte=period_end,
    )
    # Count completed on or before scheduled date
    completed_maint = maint.filter(status='completed')
    on_time_count = 0
    for m in completed_maint.only('completed_date', 'scheduled_date').iterator():
        if m.completed_date and m.completed_date <= m.scheduled_date:
            on_time_count += 1
    maintenance_on_time = on_time_count

    maintenance_overdue = maint.filter(
        status__in=['scheduled', 'in_progress'],
        scheduled_date__lt=today,
    ).count()

    maintenance_total_cost = maint.filter(
        status='completed'
    ).aggregate(total=Sum('total_cost'))['total'] or Decimal(0)

    # --- HOS (period) ---
    hos_records = DriverHOS.objects.filter(
        driver__company=company,
        duty_date__gte=period_start,
        duty_date__lte=period_end,
    )
    total_hos = hos_records.count()

    # HOS violations: driving > 660 minutes (11 hours) in a single record
    hos_violations = hos_records.filter(
        duty_status='DRIVING',
        duration_minutes__gt=660,
    ).count()

    # --- Store ---
    metric, created = ComplianceMetric.objects.update_or_create(
        company=company,
        period_start=period_start,
        period_end=period_end,
        defaults={
            'total_drivers': total_drivers,
            'drivers_cdl_current': drivers_cdl_current,
            'drivers_medical_current': drivers_medical_current,
            'drivers_mvr_current': drivers_mvr_current,
            'drug_tests_compliant': drug_tests_compliant,
            'drug_tests_required': drug_tests_required,
            'total_trucks': total_trucks,
            'total_trailers': total_trailers,
            'trucks_annual_inspection_current': trucks_annual_inspection_current,
            'trucks_registration_current': trucks_registration_current,
            'trucks_insurance_current': trucks_insurance_current,
            'vehicles_safe_status': vehicles_safe,
            'vehicles_conditional_status': vehicles_conditional,
            'vehicles_prohibited_status': vehicles_prohibited,
            'vehicles_oos_status': vehicles_oos,
            'total_inspections': total_inspections,
            'inspections_with_defects': inspections_with_defects,
            'defect_rate': defect_rate,
            'total_trips': total_trips,
            'trips_with_pre_trip': trips_with_pre,
            'trips_with_post_trip': trips_with_post,
            'dvir_review_rate': dvir_rate,
            'maintenance_on_time': maintenance_on_time,
            'maintenance_overdue': maintenance_overdue,
            'maintenance_total_cost': maintenance_total_cost,
            'total_hos_records': total_hos,
            'hos_violations': hos_violations,
        }
    )
    action = 'Created' if created else 'Updated'
    logger.info("%s compliance metric for %s (%s — %s)", action, company.name, period_start, period_end)
    return metric


def compute_all():
    """Compute compliance metrics for all active companies. Returns count."""
    from MercAPI.models import Company
    count = 0
    for company in Company.objects.filter(active=True).iterator():
        try:
            compute_and_store(company)
            count += 1
        except Exception:
            logger.exception("Failed to compute metrics for company %s", company.name)
    return count
