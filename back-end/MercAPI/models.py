from django.db import models
from datetime import date, datetime  # Import date and datetime for default values

class Company(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    address = models.TextField(null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class Driver(models.Model):
    id = models.AutoField(primary_key=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, default=1)  # Added default value
    first_name = models.CharField(max_length=255, blank=False)  # Ensure this is required
    last_name = models.CharField(max_length=255, blank=False)  # Ensure this is required
    employee_verification = models.BooleanField(default=False)  # Default value
    state = models.CharField(max_length=2, default="", blank=True)  # Allow blank values
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
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"  # Ensure this returns a clear identifier for the driver

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

class Application(models.Model):
    id = models.AutoField(primary_key=True)
    first_name = models.CharField(max_length=255,null=False,default="")
    middle_name = models.CharField(max_length=255, blank=True, null=True, default="")
    last_name = models.CharField(max_length=255, null=False, default="")
    email = models.EmailField(null=False,default="")   
    phone = models.CharField(max_length=20, null=False, default="")

    def __str__(self):
        return f"Application {self.id} - {self.first_name} {self.last_name}"

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

