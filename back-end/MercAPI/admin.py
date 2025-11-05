from django.contrib import admin
from .models import Driver, Company, DriverTest, Truck, Trailer, Inspection, InspectionItem, Trips, DriverHOS, DriverApplication  # Import the DriverHOS model

@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    exclude = ('random_test_required_this_year',)  # Exclude the field from the form

@admin.register(Truck)
class TruckAdmin(admin.ModelAdmin):
    list_display = (
        'unit_number', 
        'license_plate', 
        'annual_dot_inspection_date',  # Annual DOT inspection column
        'license_plate_expiration',   # Plates column
        'registration_expiration',    # Registration column
        'insurance_expiration'        # Insurance column
    )
    list_filter = ('company', 'active')  # Add filters for better usability
    search_fields = ('unit_number', 'license_plate', 'vin')  # Add search fields

# Register other models
admin.site.register(Company)
admin.site.register(DriverTest)
admin.site.register(Trailer)

@admin.register(DriverApplication)
class DriverApplicationAdmin(admin.ModelAdmin):
    list_display = ('id', 'first_name', 'last_name', 'email', 'status', 'has_license_file', 'has_medical_file', 'created_at')
    list_filter = ('status', 'cdla_experience', 'state', 'created_at')
    search_fields = ('first_name', 'last_name', 'email', 'phone_number')
    readonly_fields = ('created_at', 'updated_at', 'drivers_license_url', 'medical_certificate_url')
    
    def has_license_file(self, obj):
        return bool(obj.drivers_license)
    has_license_file.boolean = True
    has_license_file.short_description = 'License File'
    
    def has_medical_file(self, obj):
        return bool(obj.medical_certificate)
    has_medical_file.boolean = True
    has_medical_file.short_description = 'Medical File'
    
    def drivers_license_url(self, obj):
        if obj.drivers_license:
            return obj.drivers_license.url
        return None
    drivers_license_url.short_description = 'License File URL'
    
    def medical_certificate_url(self, obj):
        if obj.medical_certificate:
            return obj.medical_certificate.url
        return None
    medical_certificate_url.short_description = 'Medical File URL'


@admin.register(Inspection)
class InspectionAdmin(admin.ModelAdmin):
    list_display = ('inspection_id', 'truck', 'driver', 'inspection_type', 'inspection_date', 'overall_status')
    list_filter = ('inspection_type', 'overall_status', 'inspection_date')
    search_fields = ('truck__license_plate', 'driver__first_name', 'driver__last_name')

@admin.register(InspectionItem)
class InspectionItemAdmin(admin.ModelAdmin):
    list_display = ('item_id', 'inspection', 'component', 'condition')
    list_filter = ('component', 'condition')
    search_fields = ('inspection__inspection_id',)

@admin.register(Trips)
class TripsAdmin(admin.ModelAdmin):
    list_display = ('id', 'driver', 'truck', 'start_time', 'end_time', 'miles_driven')
    list_filter = ('driver', 'truck', 'start_time', 'end_time')
    search_fields = ('driver__first_name', 'driver__last_name', 'truck__unit_number')

@admin.register(DriverHOS)
class DriverHOSAdmin(admin.ModelAdmin):
    list_display = ('hos_id', 'driver', 'duty_date', 'duty_status', 'start_time', 'end_time', 'duration_minutes', 'miles_driven')
    list_filter = ('duty_status', 'duty_date')
    search_fields = ('driver__first_name', 'driver__last_name', 'duty_date')
