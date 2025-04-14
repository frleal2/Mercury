from django.db import models

class Driver(models.Model):
    id = models.AutoField(primary_key=True)
    company = models.CharField(max_length=255)
    first_name = models.CharField(max_length=255)
    