"""
Fleetly Production Workflow Validation Script
Tests all major workflows against the production database via local Django server.
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'MercAPI.settings')
django.setup()

import json
from datetime import date, timedelta
from django.test import RequestFactory
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from MercAPI.models import (
    Tenant, Company, Driver, Truck, Trailer, Trips, 
    Inspection, InspectionItem, DriverTest, DriverHOS, DriverApplication,
    MaintenanceRecord, MaintenanceCategory, MaintenanceType,
    DriverDocument, TripDocument, MaintenanceAttachment,
    UserProfile, InvitationToken, AnnualInspection, VehicleOperationStatus,
    TripInspectionRepairCertification, PasswordResetToken,
)
from MercAPI.serializers import (
    DriverSerializer, TruckSerializer, CompanySerializer, TrailerSerializer,
    TripsSerializer, DriverTestSerializer,
    DriverHOSSerializer, DriverApplicationSerializer, MaintenanceRecordSerializer,
    AnnualInspectionSerializer, VehicleOperationStatusSerializer,
)

PASS = "PASS"
FAIL = "FAIL"
WARN = "WARN"
results = []

def log(workflow, test_name, status, detail=""):
    results.append((workflow, test_name, status, detail))
    icon = {"PASS": "+", "FAIL": "!", "WARN": "~"}[status]
    print(f"  [{icon}] {test_name}: {detail}" if detail else f"  [{icon}] {test_name}")

def section(name):
    print(f"\n{'='*60}")
    print(f"  {name}")
    print(f"{'='*60}")

# ================================================================
# 1. DATABASE CONNECTION & MODEL INTEGRITY
# ================================================================
section("1. DATABASE CONNECTION & MODEL INTEGRITY")

try:
    from django.db import connection
    cursor = connection.cursor()
    cursor.execute("SELECT current_database(), current_user")
    db, user = cursor.fetchone()
    log("DB", "Connection", PASS, f"db={db}, user={user}")
except Exception as e:
    log("DB", "Connection", FAIL, str(e))

# Check all tables exist
models_to_check = [
    Tenant, Company, Driver, Truck, Trailer, Trips,
    Inspection, InspectionItem, DriverTest, DriverHOS, DriverApplication,
    MaintenanceRecord, UserProfile, AnnualInspection, VehicleOperationStatus,
    TripDocument, DriverDocument, MaintenanceAttachment,
]
for model in models_to_check:
    try:
        count = model.objects.count()
        log("DB", f"{model.__name__} table", PASS, f"{count} records")
    except Exception as e:
        log("DB", f"{model.__name__} table", FAIL, str(e))

# ================================================================
# 2. TENANT & COMPANY HIERARCHY
# ================================================================
section("2. TENANT & COMPANY HIERARCHY")

try:
    tenants = Tenant.objects.all()
    for t in tenants:
        companies = Company.objects.filter(tenant=t)
        log("Tenant", f"Tenant '{t.name}'", PASS, f"domain={t.domain}, {companies.count()} companies")
        for c in companies:
            drivers = Driver.objects.filter(company=c).count()
            trucks = Truck.objects.filter(company=c).count()
            trailers = Trailer.objects.filter(company=c).count()
            log("Tenant", f"  Company '{c.name}'", PASS, f"{drivers} drivers, {trucks} trucks, {trailers} trailers")
except Exception as e:
    log("Tenant", "Hierarchy check", FAIL, str(e))

# ================================================================
# 3. USER AUTHENTICATION & PROFILES
# ================================================================
section("3. USER AUTHENTICATION & PROFILES")

try:
    users = User.objects.all()
    log("Auth", "Users", PASS, f"{users.count()} total users")
    
    profiles_ok = 0
    profiles_missing = 0
    for u in users:
        if hasattr(u, 'profile'):
            profiles_ok += 1
        else:
            profiles_missing += 1
            log("Auth", f"Missing profile: {u.username}", WARN)
    
    log("Auth", "UserProfiles", PASS if profiles_missing == 0 else WARN, 
        f"{profiles_ok} ok, {profiles_missing} missing")
except Exception as e:
    log("Auth", "Users check", FAIL, str(e))

# JWT token generation
try:
    test_user = User.objects.first()
    if test_user:
        refresh = RefreshToken.for_user(test_user)
        access = str(refresh.access_token)
        log("Auth", "JWT generation", PASS, f"token for {test_user.username}")
    else:
        log("Auth", "JWT generation", WARN, "No users to test")
except Exception as e:
    log("Auth", "JWT generation", FAIL, str(e))

# Check UserProfile data integrity
try:
    profiles = UserProfile.objects.select_related('user', 'tenant').prefetch_related('companies').all()
    for p in profiles:
        tenant_ok = p.tenant is not None
        companies_count = p.companies.count()
        role = p.role
        if not tenant_ok:
            log("Auth", f"Profile {p.user.username}", FAIL, "No tenant assigned")
        elif companies_count == 0:
            log("Auth", f"Profile {p.user.username}", WARN, f"role={role}, no companies assigned")
        else:
            log("Auth", f"Profile {p.user.username}", PASS, f"role={role}, {companies_count} companies, tenant={p.tenant.name}")
except Exception as e:
    log("Auth", "Profile integrity", FAIL, str(e))

# ================================================================
# 4. DRIVER WORKFLOWS
# ================================================================
section("4. DRIVER WORKFLOWS")

try:
    drivers = Driver.objects.select_related('company').all()
    for d in drivers:
        issues = []
        if not d.first_name or not d.last_name:
            issues.append("missing name")
        if not d.company:
            issues.append("no company")
        
        # Check driver tests
        tests = DriverTest.objects.filter(driver=d)
        test_info = f"{tests.count()} tests"
        
        # Check driver HOS
        hos = DriverHOS.objects.filter(driver=d)
        hos_info = f"{hos.count()} HOS records"
        
        # Check documents
        docs = DriverDocument.objects.filter(driver=d)
        doc_info = f"{docs.count()} documents"
        
        status = FAIL if issues else PASS
        detail = f"{d.first_name} {d.last_name} @ {d.company.name if d.company else 'N/A'} | {test_info}, {hos_info}, {doc_info}"
        if issues:
            detail += f" | ISSUES: {', '.join(issues)}"
        log("Driver", f"Driver #{d.id}", status, detail)
except Exception as e:
    log("Driver", "Driver check", FAIL, str(e))

# Serializer validation
try:
    driver = Driver.objects.first()
    if driver:
        serializer = DriverSerializer(driver)
        data = serializer.data
        required_fields = ['id', 'first_name', 'last_name', 'company']
        missing = [f for f in required_fields if f not in data]
        log("Driver", "Serializer", PASS if not missing else FAIL, 
            f"Fields OK" if not missing else f"Missing: {missing}")
except Exception as e:
    log("Driver", "Serializer", FAIL, str(e))

# ================================================================
# 5. TRUCK & TRAILER WORKFLOWS
# ================================================================
section("5. TRUCK & TRAILER WORKFLOWS")

try:
    trucks = Truck.objects.select_related('company').all()
    for t in trucks:
        issues = []
        if not t.company:
            issues.append("no company")
        status = FAIL if issues else PASS
        detail = f"{t.make} {t.model} ({t.year}) | plate={getattr(t, 'license_plate', 'N/A')} | company={t.company.name if t.company else 'N/A'}"
        log("Truck", f"Truck #{t.id}", status, detail)
    
    if trucks.count() == 0:
        log("Truck", "Trucks", WARN, "No trucks in production")
except Exception as e:
    log("Truck", "Truck check", FAIL, str(e))

try:
    trailers = Trailer.objects.select_related('company').all()
    for t in trailers:
        issues = []
        if not t.company:
            issues.append("no company")
        status = FAIL if issues else PASS
        detail = f"unit={getattr(t, 'unit_number', 'N/A')} type={getattr(t, 'trailer_type', 'N/A')} | company={t.company.name if t.company else 'N/A'}"
        log("Trailer", f"Trailer #{t.id}", status, detail)
    
    if trailers.count() == 0:
        log("Trailer", "Trailers", WARN, "No trailers in production")
except Exception as e:
    log("Trailer", "Trailer check", FAIL, str(e))

# ================================================================
# 6. TRIP WORKFLOWS
# ================================================================
section("6. TRIP WORKFLOWS")

try:
    trips = Trips.objects.select_related('driver', 'truck', 'trailer', 'company').all()
    log("Trip", "Total trips", PASS, f"{trips.count()} trips")
    
    # Status distribution
    statuses = {}
    for t in trips:
        s = t.status
        statuses[s] = statuses.get(s, 0) + 1
    for s, count in statuses.items():
        log("Trip", f"Status '{s}'", PASS, f"{count} trips")
    
    # Check trip data integrity
    for t in trips:
        issues = []
        if not t.driver:
            issues.append("no driver")
        if not t.truck:
            issues.append("no truck")
        if not t.company:
            issues.append("no company")
        if not t.start_location:
            issues.append("no start location")
        if not t.end_location:
            issues.append("no end location")
        
        status = FAIL if issues else PASS
        driver_name = f"{t.driver.first_name} {t.driver.last_name}" if t.driver else "N/A"
        detail = f"'{t.start_location}' → '{t.end_location}' | driver={driver_name} | status={t.status}"
        if issues:
            detail += f" | ISSUES: {', '.join(issues)}"
        log("Trip", f"Trip #{t.id}", status, detail)
except Exception as e:
    log("Trip", "Trip check", FAIL, str(e))

# Trip serializer
try:
    trip = Trips.objects.first()
    if trip:
        serializer = TripsSerializer(trip)
        data = serializer.data
        log("Trip", "Serializer", PASS, f"Fields: {list(data.keys())[:10]}...")
except Exception as e:
    log("Trip", "Serializer", FAIL, str(e))

# ================================================================
# 7. TRIP INSPECTIONS (CFR COMPLIANCE)
# ================================================================
section("7. TRIP INSPECTIONS (CFR COMPLIANCE)")

try:
    inspections = Inspection.objects.select_related('trip', 'truck', 'trailer', 'driver', 'company', 'completed_by').all()
    log("Inspection", "Total inspections", PASS, f"{inspections.count()} inspections")
    
    # Breakdown by type
    type_counts = {}
    for insp in inspections:
        t = insp.inspection_type
        type_counts[t] = type_counts.get(t, 0) + 1
    for t, count in type_counts.items():
        log("Inspection", f"Type '{t}'", PASS, f"{count} inspections")
    
    # Check CFR 396.11 fields on each inspection
    cfr_fields = ['service_brakes', 'parking_brake', 'steering_mechanism', 
                   'lighting_devices', 'tires_condition', 'horn', 'windshield_wipers',
                   'rear_vision_mirrors', 'coupling_devices', 'wheels_and_rims', 'emergency_equipment']
    for insp in inspections[:10]:  # Sample first 10
        failed_items = insp.get_failed_items()
        passed = insp.is_passed()
        defects = insp.defects_found
        
        vehicle = ""
        if insp.truck:
            vehicle += f"Truck #{insp.truck.id}"
        if insp.trailer:
            vehicle += f" Trailer #{insp.trailer.id}"
        
        log("Inspection", f"Inspection #{insp.inspection_id} ({insp.inspection_type})", 
            PASS if passed else WARN,
            f"passed={passed}, defects={defects}, vehicle={vehicle}, failed={failed_items if failed_items else 'none'}")
except Exception as e:
    log("Inspection", "Inspection check", FAIL, str(e))

# Repair certifications
try:
    repairs = TripInspectionRepairCertification.objects.all()
    log("Inspection", "Repair certifications", PASS, f"{repairs.count()} records")
except Exception as e:
    log("Inspection", "Repair certifications", FAIL, str(e))

# ================================================================
# 8. ANNUAL INSPECTIONS (CFR 396.17)
# ================================================================
section("8. ANNUAL INSPECTIONS (CFR 396.17)")

try:
    annual = AnnualInspection.objects.all()
    log("Annual", "Total annual inspections", PASS, f"{annual.count()} records")
    
    for a in annual:
        # Check if current (within 365 days)
        is_current = (date.today() - a.inspection_date).days <= 365 if a.inspection_date else False
        vehicle = f"Truck #{a.truck_id}" if a.truck_id else f"Trailer #{a.trailer_id}" if a.trailer_id else "N/A"
        log("Annual", f"Annual #{a.id}", PASS if is_current else WARN,
            f"vehicle={vehicle}, date={a.inspection_date}, current={'yes' if is_current else 'EXPIRED'}")
except Exception as e:
    log("Annual", "Annual inspections", FAIL, str(e))

# ================================================================
# 9. VEHICLE OPERATION STATUS (CFR 396.7)
# ================================================================
section("9. VEHICLE OPERATION STATUS (CFR 396.7)")

try:
    vos_records = VehicleOperationStatus.objects.all()
    log("VOS", "Total operation statuses", PASS, f"{vos_records.count()} records")
    
    for v in vos_records:
        vehicle = f"Truck #{v.truck_id}" if v.truck_id else f"Trailer #{v.trailer_id}" if v.trailer_id else "N/A"
        log("VOS", f"VOS #{v.id}", PASS, f"vehicle={vehicle}, status={v.status}")
except Exception as e:
    log("VOS", "Vehicle status check", FAIL, str(e))

# ================================================================
# 10. MAINTENANCE WORKFLOWS
# ================================================================
section("10. MAINTENANCE WORKFLOWS")

try:
    categories = MaintenanceCategory.objects.all()
    log("Maint", "Categories", PASS, f"{categories.count()} categories")
    for c in categories:
        log("Maint", f"  Category: {c.name}", PASS)
except Exception as e:
    log("Maint", "Categories", FAIL, str(e))

try:
    types = MaintenanceType.objects.all()
    log("Maint", "Types", PASS, f"{types.count()} types")
except Exception as e:
    log("Maint", "Types", FAIL, str(e))

try:
    records = MaintenanceRecord.objects.select_related('company').all()
    log("Maint", "Records", PASS, f"{records.count()} records")
    
    for r in records:
        vehicle = f"Truck #{r.truck_id}" if r.truck_id else f"Trailer #{r.trailer_id}" if r.trailer_id else "N/A"
        log("Maint", f"Maint #{r.id}", PASS, 
            f"vehicle={vehicle}, status={r.status}, type={r.maintenance_type}")
except Exception as e:
    log("Maint", "Records check", FAIL, str(e))

try:
    attachments = MaintenanceAttachment.objects.all()
    log("Maint", "Attachments", PASS, f"{attachments.count()} files")
except Exception as e:
    log("Maint", "Attachments", FAIL, str(e))

# ================================================================
# 11. RECRUITMENT / DRIVER APPLICATIONS
# ================================================================
section("11. RECRUITMENT / DRIVER APPLICATIONS")

try:
    apps = DriverApplication.objects.all()
    log("Recruit", "Applications", PASS, f"{apps.count()} applications")
    
    for a in apps:
        log("Recruit", f"App #{a.id}", PASS, 
            f"{a.first_name} {a.last_name} | status={getattr(a, 'status', 'N/A')} | company={a.company_id}")
except Exception as e:
    log("Recruit", "Applications check", FAIL, str(e))

# ================================================================
# 12. INVITATION TOKEN INTEGRITY
# ================================================================
section("12. INVITATION TOKENS")

try:
    tokens = InvitationToken.objects.select_related('created_by', 'tenant').all()
    log("Invite", "Total tokens", PASS, f"{tokens.count()} tokens")
    
    for t in tokens:
        from django.utils import timezone
        is_expired = t.expires_at < timezone.now() if t.expires_at else True
        is_used = t.is_used
        log("Invite", f"Token {str(t.token)[:8]}...", PASS,
            f"email={t.email}, used={is_used}, expired={is_expired}, role={getattr(t, 'role', 'N/A')}")
except Exception as e:
    log("Invite", "Token check", FAIL, str(e))

# ================================================================
# 13. COMPANY FILTER (MULTI-TENANT ISOLATION)
# ================================================================
section("13. MULTI-TENANT DATA ISOLATION")

try:
    # Verify that every driver belongs to a company that belongs to a tenant
    orphan_drivers = Driver.objects.filter(company__isnull=True).count()
    orphan_trucks = Truck.objects.filter(company__isnull=True).count()
    orphan_trailers = Trailer.objects.filter(company__isnull=True).count()
    
    log("Isolation", "Orphan drivers (no company)", PASS if orphan_drivers == 0 else FAIL, f"{orphan_drivers}")
    log("Isolation", "Orphan trucks (no company)", PASS if orphan_trucks == 0 else FAIL, f"{orphan_trucks}")
    log("Isolation", "Orphan trailers (no company)", PASS if orphan_trailers == 0 else FAIL, f"{orphan_trailers}")
    
    # Check companies all have tenants
    orphan_companies = Company.objects.filter(tenant__isnull=True).count()
    log("Isolation", "Orphan companies (no tenant)", PASS if orphan_companies == 0 else FAIL, f"{orphan_companies}")
    
    # Cross-tenant check: trips should only reference resources from the same company
    trips_cross_tenant = 0
    for t in Trips.objects.select_related('driver__company', 'truck__company', 'company').all():
        if t.driver and t.driver.company != t.company:
            trips_cross_tenant += 1
            log("Isolation", f"Trip #{t.id} cross-company driver", FAIL, 
                f"trip_company={t.company_id}, driver_company={t.driver.company_id}")
        if t.truck and t.truck.company != t.company:
            trips_cross_tenant += 1
            log("Isolation", f"Trip #{t.id} cross-company truck", FAIL,
                f"trip_company={t.company_id}, truck_company={t.truck.company_id}")
    
    log("Isolation", "Cross-tenant trip violations", PASS if trips_cross_tenant == 0 else FAIL, f"{trips_cross_tenant}")
except Exception as e:
    log("Isolation", "Isolation check", FAIL, str(e))

# ================================================================
# 14. SERIALIZER ROUND-TRIP VALIDATION
# ================================================================
section("14. SERIALIZER VALIDATION")

serializer_tests = [
    ("Driver", DriverSerializer, Driver),
    ("Truck", TruckSerializer, Truck),
    ("Trailer", TrailerSerializer, Trailer),
    ("Company", CompanySerializer, Company),
    ("Trip", TripsSerializer, Trips),
    ("MaintenanceRecord", MaintenanceRecordSerializer, MaintenanceRecord),
]

for name, serializer_cls, model_cls in serializer_tests:
    try:
        obj = model_cls.objects.first()
        if obj:
            serializer = serializer_cls(obj)
            data = serializer.data
            # Verify it serializes to JSON without errors
            json_str = json.dumps(data, default=str)
            log("Serializer", f"{name} serialize", PASS, f"{len(data)} fields, {len(json_str)} bytes")
        else:
            log("Serializer", f"{name} serialize", WARN, "No records to test")
    except Exception as e:
        log("Serializer", f"{name} serialize", FAIL, str(e))

# ================================================================
# 15. API ENDPOINT SMOKE TEST (via Django test client)
# ================================================================
section("15. API ENDPOINT SMOKE TEST")

from django.test import Client
client = Client()

# Get a valid JWT token for API testing
try:
    test_user = User.objects.filter(is_active=True).first()
    if test_user:
        refresh = RefreshToken.for_user(test_user)
        token = str(refresh.access_token)
        auth_header = f"Bearer {token}"
        
        endpoints = [
            ("GET", "/api/drivers/", "Drivers list"),
            ("GET", "/api/trucks/", "Trucks list"),
            ("GET", "/api/trailers/", "Trailers list"),
            ("GET", "/api/companies/", "Companies list"),
            ("GET", "/api/trips/", "Trips list"),
            ("GET", "/api/driver-tests/", "Driver tests list"),
            ("GET", "/api/driver-hos/", "Driver HOS list"),
            ("GET", "/api/maintenance-categories/", "Maint categories"),
            ("GET", "/api/maintenance-types/", "Maint types"),
            ("GET", "/api/maintenance-records/", "Maint records"),
            ("GET", "/api/driver-documents/", "Driver docs"),
            ("GET", "/api/trip-documents/", "Trip docs"),
            ("GET", "/api/trip-inspections/", "Trip inspections"),
            ("GET", "/api/annual-inspections/", "Annual inspections"),
            ("GET", "/api/vehicle-operation-status/", "Vehicle status"),
            ("GET", "/api/applications/", "Applications"),
            ("GET", "/api/user/profile/", "User profile"),
            ("GET", "/api/tenant-users/", "Tenant users"),
            ("GET", "/api/dashboard/simple/", "Dashboard simple"),
        ]
        
        for method, url, name in endpoints:
            try:
                response = client.get(url, HTTP_AUTHORIZATION=auth_header, content_type="application/json")
                status_code = response.status_code
                if status_code == 200:
                    try:
                        data = response.json()
                        if isinstance(data, list):
                            log("API", f"{name} ({url})", PASS, f"HTTP {status_code}, {len(data)} items")
                        elif isinstance(data, dict) and 'results' in data:
                            log("API", f"{name} ({url})", PASS, f"HTTP {status_code}, {len(data['results'])} items (paginated)")
                        else:
                            log("API", f"{name} ({url})", PASS, f"HTTP {status_code}")
                    except:
                        log("API", f"{name} ({url})", PASS, f"HTTP {status_code}")
                elif status_code == 403:
                    log("API", f"{name} ({url})", WARN, f"HTTP {status_code} (permission denied - may need specific role)")
                else:
                    log("API", f"{name} ({url})", FAIL, f"HTTP {status_code}")
            except Exception as e:
                log("API", f"{name} ({url})", FAIL, str(e))
    else:
        log("API", "Smoke test", WARN, "No active users for auth")
except Exception as e:
    log("API", "Smoke test setup", FAIL, str(e))

# ================================================================
# 16. PASSWORD RESET TOKEN CHECK
# ================================================================
section("16. PASSWORD RESET TOKENS")

try:
    tokens = PasswordResetToken.objects.all()
    log("PwReset", "Total tokens", PASS, f"{tokens.count()} tokens")
except Exception as e:
    log("PwReset", "Token check", FAIL, str(e))

# ================================================================
# 17. TRIP WORKFLOW LOGIC VALIDATION
# ================================================================
section("17. TRIP WORKFLOW LOGIC")

try:
    # Validate can_start_trip logic for scheduled trips
    scheduled_trips = Trips.objects.filter(status='scheduled').select_related('driver', 'truck', 'trailer', 'company')
    for t in scheduled_trips[:5]:
        can_start = t.can_start_trip()
        issues = t.get_compliance_issues()
        log("TripLogic", f"Trip #{t.id} can_start_trip()", PASS if not issues else WARN,
            f"can_start={can_start}, issues={issues if issues else 'none'}")
    
    # Validate completed trips have proper data
    completed_trips = Trips.objects.filter(status='completed')
    for t in completed_trips[:5]:
        duration = t.get_duration_hours()
        miles = t.get_total_miles()
        has_post = t.post_trip_inspection_completed
        log("TripLogic", f"Completed Trip #{t.id}", PASS,
            f"duration={duration}h, miles={miles}, post_inspection={has_post}")
    
    # Check for trips in maintenance_hold
    hold_trips = Trips.objects.filter(status='maintenance_hold')
    for t in hold_trips:
        can_resume = t.can_resume_from_maintenance_hold()
        log("TripLogic", f"Held Trip #{t.id}", WARN if not can_resume else PASS,
            f"can_resume={can_resume}")
except Exception as e:
    log("TripLogic", "Trip logic check", FAIL, str(e))

# ================================================================
# 18. FOREIGN KEY INTEGRITY
# ================================================================
section("18. FOREIGN KEY & RELATIONSHIP INTEGRITY")

try:
    # Driver -> user_account links
    drivers_with_accounts = Driver.objects.exclude(user_account__isnull=True).count()
    drivers_without_accounts = Driver.objects.filter(user_account__isnull=True).count()
    log("FK", "Drivers with user accounts", PASS, f"{drivers_with_accounts} linked, {drivers_without_accounts} unlinked")
    
    # Trips -> pre/post inspection links
    trips_with_pre = Trips.objects.exclude(pre_trip_inspection__isnull=True).count()
    trips_with_post = Trips.objects.exclude(post_trip_inspection__isnull=True).count()
    total_trips = Trips.objects.count()
    log("FK", "Trip inspection links", PASS, f"{trips_with_pre}/{total_trips} pre-trip, {trips_with_post}/{total_trips} post-trip")
    
    # Inspection -> trip links
    orphan_trip_inspections = Inspection.objects.filter(
        inspection_type__in=['pre_trip', 'post_trip'],
        trip__isnull=True
    ).count()
    log("FK", "Orphan trip inspections (no trip)", PASS if orphan_trip_inspections == 0 else WARN, f"{orphan_trip_inspections}")
    
    # Maintenance -> vehicle links
    maint_no_vehicle = MaintenanceRecord.objects.filter(truck__isnull=True, trailer__isnull=True).count()
    log("FK", "Maintenance without vehicle", PASS if maint_no_vehicle == 0 else WARN, f"{maint_no_vehicle}")
except Exception as e:
    log("FK", "FK integrity check", FAIL, str(e))

# ================================================================
# SUMMARY
# ================================================================
section("VALIDATION SUMMARY")

total = len(results)
passed = sum(1 for _, _, s, _ in results if s == PASS)
warned = sum(1 for _, _, s, _ in results if s == WARN)
failed = sum(1 for _, _, s, _ in results if s == FAIL)

print(f"\n  Total checks: {total}")
print(f"  PASSED: {passed}")
print(f"  WARNINGS: {warned}")
print(f"  FAILED: {failed}")
print()

if failed > 0:
    print("  FAILED ITEMS:")
    for workflow, test, status, detail in results:
        if status == FAIL:
            print(f"    [!] [{workflow}] {test}: {detail}")
    print()

if warned > 0:
    print("  WARNINGS:")
    for workflow, test, status, detail in results:
        if status == WARN:
            print(f"    [~] [{workflow}] {test}: {detail}")
    print()

print(f"  Overall: {'ALL CLEAR' if failed == 0 else 'ISSUES FOUND'}")
