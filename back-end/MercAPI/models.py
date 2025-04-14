from django.db import models

class Driver(models.Model):
    id = models.AutoField(primary_key=True)
    company = models.CharField(max_length=255)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    employee_verification = models.BooleanField(default=False)
    state = models.CharField(max_length=2)
    cdl_number = models.CharField(max_length=20)
    cdl_expiration_date = models.DateField()
    physical_date = models.DateField()
    annual_vmr_date = models.DateField()
    dob = models.DateField()
    ssn = models.CharField(max_length=11)
    hire_date = models.DateField()
    phone = models.CharField(max_length=15)
    
class Truck(models.Model):
    id = models.AutoField(primary_key=True)
    vin = models.CharField(max_length=255)
    make = models.CharField(max_length=255)
    model = models.CharField(max_length=255)

class Company(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2)
    zip_code = models.CharField(max_length=10)

class Trailer(models.Model):
    id = models.AutoField(primary_key=True)
    vin = models.CharField(max_length=255)
    make = models.CharField(max_length=255)
    model = models.CharField(max_length=255)
    year = models.IntegerField()