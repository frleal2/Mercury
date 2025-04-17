from django.db import models
from datetime import date  # Import date for default values

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
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"  # Completed __str__ method

class Truck(models.Model):
    id = models.AutoField(primary_key=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    driver = models.OneToOneField(Driver, on_delete=models.SET_NULL, null=True, blank=True)
    license_plate = models.CharField(max_length=20)
    model = models.CharField(max_length=255)
    active = models.BooleanField(default=True)

    def __str__(self):
        return f"Truck {self.license_plate}"

class Trailer(models.Model):
    id = models.AutoField(primary_key=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    truck = models.OneToOneField(Truck, on_delete=models.SET_NULL, null=True, blank=True)
    license_plate = models.CharField(max_length=20)
    model = models.CharField(max_length=255)
    active = models.BooleanField(default=True)

    def __str__(self):
        return f"Trailer {self.license_plate}"