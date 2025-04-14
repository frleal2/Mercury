from django.db import models

class Driver(models.Model):
    company = models.CharField(max_length=255)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
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

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.company})"
