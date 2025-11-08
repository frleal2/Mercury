from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from datetime import date, datetime, timedelta  # Import date and datetime for default values
from django.utils import timezone
import uuid

class Tenant(models.Model):
    """
    Represents a business/organization that uses the fleet management system.
    A tenant can have multiple companies (subsidiaries, divisions, etc.)
    """
    name = models.CharField(max_length=255, help_text="Business name (e.g., 'ABC Logistics LLC')")
    domain = models.CharField(
        max_length=100, 
        unique=True, 
        help_text="Subdomain for this tenant (e.g., 'abc-logistics')"
    )
    application_code = models.CharField(
        max_length=10, 
        unique=True, 
        help_text="Short code for Quick Apply links (e.g., 'ABC123')"
    )
    contact_email = models.EmailField(help_text="Primary contact email for this tenant")
    subscription_plan = models.CharField(
        max_length=50, 
        default='starter',
        choices=[
            ('starter', 'Starter'),
            ('professional', 'Professional'),
            ('enterprise', 'Enterprise'),
        ]
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = "Tenant (Business Account)"
        verbose_name_plural = "Tenants (Business Accounts)"

    def __str__(self):
        return f"{self.name} ({self.domain})"

class Company(models.Model):
    id = models.AutoField(primary_key=True)
    tenant = models.ForeignKey(
        Tenant, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        help_text="The business/organization this company belongs to"
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
        help_text="URL-friendly name for this company (e.g., 'east-coast', 'west-division')"
    )
    address = models.TextField(null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class UserProfile(models.Model):
    """
    Extends Django's User model to add company relationships.
    A user can belong to multiple companies within their tenant's ecosystem.
    """
    ROLE_CHOICES = [
        ('admin', 'Admin - Full tenant management access'),
        ('user', 'User - Company management access (cannot create companies/users)'),
        ('driver', 'Driver - Inspection and trip access only'),
    ]
    
    user = models.OneToOneField(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='profile'
    )
    companies = models.ManyToManyField(
        Company,
        blank=True,
        help_text="Companies this user has access to"
    )
    # Optional: Add tenant for quick access, though it can be derived from companies
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Primary tenant this user belongs to"
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='user',
        help_text="User's role level within the tenant"
    )
    is_company_admin = models.BooleanField(
        default=False,
        help_text="Can this user manage company settings and other users? (deprecated - use role field)"
    )
    profile_image = models.FileField(
        upload_to='profile_photos/%Y/%m/%d/',
        null=True,
        blank=True,
        help_text="User's profile photo file"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        companies = ", ".join([c.name for c in self.companies.all()[:3]])
        if self.companies.count() > 3:
            companies += f" (+{self.companies.count() - 3} more)"
        return f"{self.user.username} - {companies}"

    def get_accessible_companies(self):
        """Return all companies this user has access to"""
        return self.companies.all()

    def has_company_access(self, company):
        """Check if user has access to a specific company"""
        return self.companies.filter(id=company.id).exists()
    
    def is_admin(self):
        """Check if user has admin role (full tenant access)"""
        return self.role == 'admin'
    
    def is_user_or_above(self):
        """Check if user has user role or above (company management access)"""
        return self.role in ['admin', 'user']
    
    def is_driver(self):
        """Check if user has driver role (inspection access only)"""
        return self.role == 'driver'
    
    def can_manage_companies(self):
        """Check if user can create/manage companies"""
        return self.role == 'admin'
    
    def can_manage_users(self):
        """Check if user can create/manage user accounts"""
        return self.role == 'admin'
    
    def can_create_driver_accounts(self):
        """Check if user can create driver accounts"""
        return self.role in ['admin', 'user']
    
    def get_driver_record(self):
        """Get the Driver record associated with this user (if any)"""
        if self.is_driver():
            return getattr(self.user, 'driver_profile', None)
        return None

class Driver(models.Model):
    id = models.AutoField(primary_key=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, default=1)  # Added default value
    first_name = models.CharField(max_length=255, blank=False)  # Ensure this is required
    last_name = models.CharField(max_length=255, blank=False)  # Ensure this is required
    employee_verification = models.BooleanField(default=False)  # Default value
    state = models.CharField(max_length=50, default="", blank=True)  # Allow full state name
    cdl_number = models.CharField(max_length=255, default="", blank=True)  # Allow blank values
    cdl_expiration_date = models.DateField(null=True, blank=True, default=date(2000, 1, 1))  # Corrected default
    physical_date = models.DateField(null=True, blank=True, default=date(2000, 1, 1))  # Corrected default
    annual_vmr_date = models.DateField(null=True, blank=True, default=date(2000, 1, 1))  # Corrected default
    dob = models.DateField(null=True, blank=True, default=date(1990, 1, 1))  # Corrected default
    ssn = models.CharField(max_length=11, default="", blank=True)  # Allow blank values
    hire_date = models.DateField(null=True, blank=True, default=date(2000, 1, 1))  # Corrected default
    phone = models.CharField(max_length=20, null=True, blank=True)
    active = models.BooleanField(default=True)
    random_test_required_this_year = models.BooleanField(default=True, editable=False)
    
    # Optional link to user account for driver portal access
    user_account = models.OneToOneField(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='driver_profile',
        help_text="Optional user account for driver portal access"
    )
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"  # Ensure this returns a clear identifier for the driver
    
    def has_user_account(self):
        """Check if this driver has a user account for portal access"""
        return self.user_account is not None
    
    def can_access_portal(self):
        """Check if driver can access the driver portal"""
        return (self.has_user_account() and 
                self.active and 
                hasattr(self.user_account, 'profile') and 
                self.user_account.profile.is_driver())
    
    def get_user_profile(self):
        """Get the UserProfile associated with this driver (if any)"""
        if self.has_user_account():
            return getattr(self.user_account, 'profile', None)
        return None

class DriverDocument(models.Model):
    DOCUMENT_TYPE_CHOICES = [
        ('cdl_license', 'CDL License'),
        ('medical_certificate', 'Medical Certificate'),
        ('mvr_report', 'Motor Vehicle Record'),
        ('employment_verification', 'Employment Verification'),
        ('drug_test_results', 'Drug Test Results'),
        ('background_check', 'Background Check'),
        ('training_certificate', 'Training Certificate'),
        ('other', 'Other Document'),
    ]
    
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name="documents")
    document_type = models.CharField(max_length=30, choices=DOCUMENT_TYPE_CHOICES)
    file = models.FileField(upload_to='driver_documents/%Y/%m/%d/')
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(null=True, blank=True)  # Size in bytes
    expiration_date = models.DateField(null=True, blank=True)  # For documents with expiration
    description = models.CharField(max_length=200, blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.CharField(max_length=100, default="system")
    is_verified = models.BooleanField(default=False)  # For document verification workflow
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.driver} - {self.get_document_type_display()}"
    
    def save(self, *args, **kwargs):
        if self.file and not self.file_name:
            self.file_name = self.file.name
        if self.file:
            self.file_size = self.file.size
        super().save(*args, **kwargs)

class DriverTest(models.Model):
    id = models.AutoField(primary_key=True)
    driver = models.ForeignKey(
        Driver,
        on_delete=models.CASCADE,
        related_name="tests"  # Ensure this related_name is used to access tests for a driver
    )
    test_type = models.CharField(
        max_length=50,
        choices=[
            ('Pre-employment', 'Pre-employment'),
            ('Random', 'Random'),
            ('Post-Accident', 'Post-Accident'),
            ('Reasonable suspicion', 'Reasonable suspicion'),
            ('Return-to-duty', 'Return-to-duty'),
            ('Follow-up', 'Follow-up'),
        ]
    )
    test_date = models.DateField()  # Ensure this is the date of the test
    test_result = models.CharField(
        max_length=20,
        choices=[
            ('Pass', 'Pass'),
            ('Fail', 'Fail'),
            ('Pending', 'Pending'),
        ]
    )
    random_test_required_this_year = models.BooleanField(default=False)
    test_completion_date = models.DateField(null=True, blank=True)
    next_scheduled_test_date = models.DateField(null=True, blank=True)
    follow_up_test_required = models.BooleanField(default=False)

    def __str__(self):
        return f"Test for {self.driver.first_name} {self.driver.last_name} on {self.test_date}"

class Truck(models.Model):
    id = models.AutoField(primary_key=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    driver = models.OneToOneField(Driver, on_delete=models.SET_NULL, null=True, blank=True)
    unit_number = models.CharField(max_length=50, unique=True, default="UNKNOWN")  # Add default value
    vin = models.CharField(max_length=17, default="UNKNOWN")  # Add default value
    license_plate = models.CharField(max_length=20)
    license_plate_state = models.CharField(max_length=20, default="NA")  # Updated max_length to 20
    year = models.PositiveIntegerField(null=True, blank=True)  # Allow nulls
    make = models.CharField(max_length=255, default="UNKNOWN")  # Add default value
    model = models.CharField(max_length=255, default="UNKNOWN")  # Add default value
    license_plate_expiration = models.DateField(null=True, blank=True, default=date(2000, 1, 1))  # Add default
    registration_expiration = models.DateField(null=True, blank=True, default=date(2000, 1, 1))  # Add default
    insurance_expiration = models.DateField(null=True, blank=True, default=date(2000, 1, 1))  # Add default
    annual_dot_inspection_date = models.DateField(null=True, blank=True, default=date(2000, 1, 1))  # Add Annual DOT inspection date
    active = models.BooleanField(default=True)  # Status field (active/inactive)

    def __str__(self):
        return f"Truck {self.unit_number} - {self.license_plate}"  # Update string representation

class Trailer(models.Model):
    id = models.AutoField(primary_key=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    truck = models.OneToOneField(Truck, on_delete=models.SET_NULL, null=True, blank=True)
    license_plate = models.CharField(max_length=20)
    model = models.CharField(max_length=255)
    active = models.BooleanField(default=True)

    def __str__(self):
        return f"Trailer {self.license_plate}"

class DriverApplication(models.Model):
    id = models.AutoField(primary_key=True)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="The specific company/division this application is for"
    )
    first_name = models.CharField(max_length=255,null=False,default="")
    middle_name = models.CharField(max_length=255, blank=True, null=True, default="")
    last_name = models.CharField(max_length=255, null=False, default="")
    email = models.EmailField(null=False,default="")
    phone_number = models.CharField(max_length=20, null=False, default="")
    address = models.TextField(null=False, default="")
    zip_code = models.CharField(max_length=10, null=False, default="")
    state = models.CharField(max_length=50, null=False, default="")  # Full state name
    cdla_experience = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=[
            ('new', 'New'),
            ('reviewed', 'Reviewed'),
            ('contacted', 'Contacted'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
        ],
        default='new'
    )
    notes = models.TextField(blank=True, null=True)
    
    # File upload fields
    drivers_license = models.FileField(
        upload_to='applications/licenses/',
        blank=True,
        null=True,
        help_text="Upload driver's license image"
    )
    medical_certificate = models.FileField(
        upload_to='applications/medical/',
        blank=True, 
        null=True,
        help_text="Upload medical certificate/DOT physical"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']  # Show newest applications first

    def __str__(self):
        return f"DriverApplication {self.id} - {self.first_name} {self.last_name}"

class Inspection(models.Model):
    inspection_id = models.AutoField(primary_key=True)
    truck = models.ForeignKey(Truck, on_delete=models.CASCADE, related_name="inspections")
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name="inspections")
    inspection_type = models.CharField(
        max_length=20,
        choices=[
            ('pre-trip', 'Pre-trip'),
            ('post-trip', 'Post-trip'),
            ('annual', 'Annual'),
        ]
    )
    inspection_date = models.DateTimeField(default=datetime.now)
    defects_found = models.BooleanField(default=False)
    overall_status = models.CharField(
        max_length=10,
        choices=[
            ('pass', 'Pass'),
            ('fail', 'Fail'),
        ]
    )
    notes = models.TextField(blank=True, null=True)
    signed_by = models.CharField(max_length=255)
    signed_at = models.DateTimeField(default=datetime.now)

    def __str__(self):
        return f"Inspection {self.inspection_id} - Truck {self.truck.license_plate}"

class InspectionItem(models.Model):
    item_id = models.AutoField(primary_key=True)
    inspection = models.ForeignKey(Inspection, on_delete=models.CASCADE, related_name="items")
    component = models.CharField(
        max_length=50,
        choices=[
            ('brakes', 'Brakes'),
            ('steering', 'Steering'),
            ('lights', 'Lights'),
            ('tires', 'Tires'),
            ('horn', 'Horn'),
            ('wipers', 'Wipers'),
            ('mirrors', 'Mirrors'),
            ('coupling', 'Coupling'),
            ('emergency_equipment', 'Emergency Equipment'),
        ]
    )
    condition = models.CharField(
        max_length=20,
        choices=[
            ('ok', 'OK'),
            ('defect', 'Defect'),
            ('not_applicable', 'Not Applicable'),
        ]
    )
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Item {self.item_id} - {self.component} ({self.condition})"

class Trips(models.Model):
    id = models.AutoField(primary_key=True)
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name="trips")
    truck = models.ForeignKey(Truck, on_delete=models.CASCADE, related_name="trips")
    pre_trip_inspection = models.ForeignKey(Inspection, on_delete=models.SET_NULL, null=True, blank=True, related_name="pre_trip_trips")
    post_trip_inspection = models.ForeignKey(Inspection, on_delete=models.SET_NULL, null=True, blank=True, related_name="post_trip_trips")
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    start_location = models.TextField()
    end_location = models.TextField(null=True, blank=True)
    miles_driven = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Trip {self.id} - Driver {self.driver} - Truck {self.truck}"

class DriverHOS(models.Model):
    hos_id = models.AutoField(primary_key=True)
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name="hos_records")
    trip = models.ForeignKey(Trips, on_delete=models.SET_NULL, null=True, blank=True, related_name="hos_records")
    truck = models.ForeignKey(Truck, on_delete=models.SET_NULL, null=True, blank=True, related_name="hos_records")
    duty_date = models.DateField()
    duty_status = models.CharField(
        max_length=10,
        choices=[
            ('OFF', 'Off Duty'),
            ('SLEEP', 'Sleeper Berth'),
            ('DRIVING', 'Driving'),
            ('ON_DUTY', 'On Duty'),
        ]
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField()
    miles_driven = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"HOS {self.hos_id} - Driver {self.driver} - {self.duty_date}"

class MaintenanceCategory(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    color_code = models.CharField(max_length=7, default="#3B82F6")  # Hex color for UI
    
    class Meta:
        verbose_name_plural = "Maintenance Categories"
    
    def __str__(self):
        return self.name

class MaintenanceType(models.Model):
    category = models.ForeignKey(MaintenanceCategory, on_delete=models.CASCADE, related_name="types")
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    estimated_hours = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    dot_required = models.BooleanField(default=False)  # If this maintenance is DOT required
    
    def __str__(self):
        return f"{self.category.name} - {self.name}"

class MaintenanceRecord(models.Model):
    VEHICLE_TYPE_CHOICES = [
        ('truck', 'Truck'),
        ('trailer', 'Trailer'),
    ]
    
    MAINTENANCE_STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    MAINTENANCE_TYPE_CHOICES = [
        # Engine & Powertrain
        ('oil_change', 'Oil Change'),
        ('transmission_service', 'Transmission Service'),
        ('differential_service', 'Differential Service'),
        ('engine_tune_up', 'Engine Tune-Up'),
        
        # Brakes & Safety
        ('brake_inspection', 'Brake Inspection'),
        ('brake_pad_replacement', 'Brake Pad Replacement'),
        ('air_brake_service', 'Air Brake Service'),
        
        # Tires & Wheels
        ('tire_rotation', 'Tire Rotation'),
        ('tire_replacement', 'Tire Replacement'),
        ('wheel_alignment', 'Wheel Alignment'),
        
        # Electrical & Lighting
        ('lighting_inspection', 'Lighting Inspection'),
        ('battery_service', 'Battery Service'),
        ('alternator_service', 'Alternator Service'),
        
        # HVAC & Climate
        ('ac_service', 'A/C Service'),
        ('heater_service', 'Heater Service'),
        
        # Body & Frame
        ('body_repair', 'Body Repair'),
        ('frame_inspection', 'Frame Inspection'),
        
        # Preventive Maintenance
        ('a_service', 'A-Service (Basic)'),
        ('b_service', 'B-Service (Intermediate)'),
        ('c_service', 'C-Service (Complete)'),
        
        # DOT Inspections
        ('annual_dot_inspection', 'Annual DOT Inspection'),
        ('quarterly_inspection', '90-Day Inspection'),
        ('pre_trip_inspection', 'Pre-Trip Inspection'),
        
        # Other
        ('other', 'Other'),
    ]

    # Basic Information
    record_id = models.AutoField(primary_key=True)
    vehicle_type = models.CharField(max_length=10, choices=VEHICLE_TYPE_CHOICES)
    truck = models.ForeignKey(Truck, on_delete=models.CASCADE, null=True, blank=True, related_name="maintenance_records")
    trailer = models.ForeignKey(Trailer, on_delete=models.CASCADE, null=True, blank=True, related_name="maintenance_records")
    
    # Maintenance Details
    maintenance_type = models.CharField(max_length=50, choices=MAINTENANCE_TYPE_CHOICES)
    work_order_number = models.CharField(max_length=50, unique=True)
    
    # Scheduling
    scheduled_date = models.DateField()
    completed_date = models.DateField(null=True, blank=True)
    due_mileage = models.IntegerField(null=True, blank=True)
    actual_mileage = models.IntegerField(null=True, blank=True)
    
    # Status and Priority
    status = models.CharField(max_length=20, choices=MAINTENANCE_STATUS_CHOICES, default='scheduled')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    
    # Work Details
    description = models.TextField()
    parts_used = models.TextField(blank=True, null=True)  # JSON or text list of parts
    labor_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Service Provider
    service_provider = models.CharField(max_length=200, blank=True, null=True)  # Shop name or internal
    technician_name = models.CharField(max_length=100, blank=True, null=True)
    
    # Documentation
    notes = models.TextField(blank=True, null=True)
    warranty_expiration = models.DateField(null=True, blank=True)
    
    # Tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=100, default="system")  # Could be FK to User later
    
    class Meta:
        ordering = ['-scheduled_date', '-created_at']
    
    def __str__(self):
        vehicle = self.truck.unit_number if self.truck else self.trailer.license_plate
        return f"WO-{self.work_order_number}: {self.get_maintenance_type_display()} on {vehicle}"
    
    @property
    def vehicle_identifier(self):
        """Get the main identifier for the vehicle"""
        if self.truck:
            return f"Truck {self.truck.unit_number}"
        elif self.trailer:
            return f"Trailer {self.trailer.license_plate}"
        return "Unknown Vehicle"
    
    @property
    def is_overdue(self):
        """Check if scheduled maintenance is overdue"""
        if self.status == 'completed':
            return False
        return self.scheduled_date < date.today()
    
    @property
    def days_until_due(self):
        """Get days until due (negative if overdue)"""
        return (self.scheduled_date - date.today()).days

class MaintenanceAttachment(models.Model):
    ATTACHMENT_TYPE_CHOICES = [
        ('image', 'Image'),
        ('document', 'Document'),
        ('archive', 'Archive'),
        ('other', 'Other'),
    ]
    
    maintenance_record = models.ForeignKey(MaintenanceRecord, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to='maintenance_attachments/%Y/%m/%d/', null=True, blank=True)
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=20, choices=ATTACHMENT_TYPE_CHOICES, default='document')
    file_size = models.PositiveIntegerField(null=True, blank=True)  # Size in bytes
    description = models.CharField(max_length=200, blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.CharField(max_length=100, default="system")  # Could be FK to User later
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.maintenance_record.work_order_number} - {self.file_name}"
    
    def save(self, *args, **kwargs):
        if self.file and not self.file_name:
            self.file_name = self.file.name
        if self.file:
            self.file_size = self.file.size
        super().save(*args, **kwargs)


class InvitationToken(models.Model):
    """
    Secure invitation tokens for user registration
    """
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    email = models.EmailField()
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE)
    invitation_data = models.JSONField(
        default=dict,
        help_text="Additional invitation data (role, company_ids, driver_id, etc.)"
    )
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Invitation Token"
        verbose_name_plural = "Invitation Tokens"
    
    def __str__(self):
        return f"Invitation for {self.email} to {self.company.name}"
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)  # 7 days expiration
        super().save(*args, **kwargs)
    
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        return not self.is_used and not self.is_expired()

