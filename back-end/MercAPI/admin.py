from django.contrib import admin
from .models import Driver, Truck, Company, Trailer

# Register your models here
admin.site.register(Driver)
admin.site.register(Truck)
admin.site.register(Company)
admin.site.register(Trailer)
