from django.db import models

class Driver(models.Model):
    id = models.AutoField(primary_key=True)
    company = models.CharField(max_length=255, null=True, blank=True, default="Unknown Company")  # Default value
    first_name = models.CharField(max_length=255, default="John")  # Default value
    last_name = models.CharField(max_length=255, default="Doe")  # Default value
    employee_verification = models.BooleanField(default=False)  # Default value
    state = models.CharField(max_length=2, default="NA")  # Default value
    cdl_number = models.CharField(max_length=255, default="00000")  # Default value
    cdl_expiration_date = models.DateField(null=True, blank=True, default='2000-01-01')  # Default value
    physical_date = models.DateField(null=True, blank=True, default='2000-01-01')  # Default value
    annual_vmr_date = models.DateField(null=True, blank=True, default='2000-01-01')  # Default value
    dob = models.DateField(null=True, blank=True, default='1990-01-01')  # Default value
    ssn = models.CharField(max_length=11, default="000-00-0000")  # Default value
    hire_date = models.DateField(null=True, blank=True, default='2000-01-01')  # Default value
    phone = models.CharField(max_length=20, null=True, blank=True, default="000-0000")  # Default value