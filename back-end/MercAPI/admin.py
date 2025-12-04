from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import (Driver, Company, DriverTest, Truck, Trailer, Inspection, InspectionItem, 
                     Trips, DriverHOS, DriverApplication, Tenant, UserProfile, InvitationToken, 
                     TripDocument, DriverDocument, MaintenanceCategory, 
                     MaintenanceType, MaintenanceRecord, MaintenanceAttachment, PasswordResetToken,
                     TripInspectionRepairCertification, QualifiedInspector, AnnualInspection, VehicleOperationStatus)

@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ('name', 'domain', 'application_code', 'subscription_plan', 'is_active', 'created_at')
    list_filter = ('subscription_plan', 'is_active', 'created_at')
    search_fields = ('name', 'domain', 'application_code', 'contact_email')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'contact_email')
        }),
        ('System Configuration', {
            'fields': ('domain', 'application_code')
        }),
        ('Subscription', {
            'fields': ('subscription_plan', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'tenant', 'phone', 'email', 'active')
    list_filter = ('tenant', 'active')
    search_fields = ('name', 'slug', 'email', 'phone')
    prepopulated_fields = {'slug': ('name',)}  # Auto-generate slug from name
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('tenant', 'name', 'slug', 'email', 'phone')
        }),
        ('Address', {
            'fields': ('address',)
        }),
        ('Status', {
            'fields': ('active',)
        }),
    )

# UserProfile admin - inline with User
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'
    filter_horizontal = ('companies',)  # Makes company selection easier
    
    fieldsets = (
        ('Company Access', {
            'fields': ('companies', 'tenant')
        }),
        ('Permissions', {
            'fields': ('role', 'is_company_admin')
        }),
    )

# Extend the existing User admin
class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)

# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'tenant', 'role', 'is_company_admin', 'company_count', 'created_at')
    list_filter = ('tenant', 'role', 'is_company_admin', 'created_at')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name')
    filter_horizontal = ('companies',)
    
    def company_count(self, obj):
        return obj.companies.count()
    company_count.short_description = 'Companies'
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Access Control', {
            'fields': ('tenant', 'companies', 'role', 'is_company_admin')
        }),
        ('Profile', {
            'fields': ('profile_image',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ('created_at', 'updated_at')

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
# DriverTest and Trailer now have proper admin classes below

@admin.register(DriverApplication)
class DriverApplicationAdmin(admin.ModelAdmin):
    list_display = ('id', 'first_name', 'last_name', 'email', 'company', 'status', 'has_license_file', 'has_medical_file', 'created_at')
    list_filter = ('company', 'status', 'cdla_experience', 'state', 'created_at')
    search_fields = ('first_name', 'last_name', 'email', 'phone_number')
    
    fieldsets = (
        ('Application Target', {
            'fields': ('company',)
        }),
        ('Personal Information', {
            'fields': ('first_name', 'middle_name', 'last_name', 'email', 'phone_number')
        }),
        ('Address', {
            'fields': ('address', 'zip_code', 'state')
        }),
        ('Experience & Status', {
            'fields': ('cdla_experience', 'status', 'notes')
        }),
        ('Documents', {
            'fields': ('drivers_license', 'medical_certificate')
        }),
    )
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
    list_display = ('inspection_id', 'inspection_type', 'company', 'trip', 'truck', 'trailer', 'driver', 'completed_at', 'is_passed')
    list_filter = ('inspection_type', 'company', 'completed_at')
    search_fields = ('truck__license_plate', 'trailer__license_plate', 'driver__first_name', 'driver__last_name', 'trip__trip_number')
    readonly_fields = ('completed_at', 'is_passed')
    
    def is_passed(self, obj):
        return obj.is_passed()
    is_passed.boolean = True

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

@admin.register(InvitationToken)
class InvitationTokenAdmin(admin.ModelAdmin):
    list_display = ('email', 'tenant', 'company', 'invited_by', 'is_used', 'created_at', 'expires_at')
    list_filter = ('is_used', 'tenant', 'company', 'created_at')
    search_fields = ('email', 'tenant__name', 'company__name', 'invited_by__email')
    readonly_fields = ('token', 'created_at', 'used_at')
    
    fieldsets = (
        ('Invitation Details', {
            'fields': ('email', 'tenant', 'company', 'invited_by')
        }),
        ('Token Information', {
            'fields': ('token', 'expires_at')
        }),
        ('Status', {
            'fields': ('is_used', 'created_at', 'used_at')
        }),
    )

# TripInspection admin removed - using unified Inspection admin

@admin.register(TripDocument)
class TripDocumentAdmin(admin.ModelAdmin):
    list_display = ('id', 'trip', 'document_type', 'uploaded_by', 'uploaded_at')
    list_filter = ('document_type', 'uploaded_at', 'trip__company')
    search_fields = ('trip__trip_number', 'uploaded_by__username', 'document_name')
    readonly_fields = ('uploaded_at',)
    
    fieldsets = (
        ('Document Information', {
            'fields': ('trip', 'document_type', 'document_name', 'file')
        }),
        ('Upload Details', {
            'fields': ('uploaded_by', 'uploaded_at')
        }),
    )

@admin.register(DriverDocument)
class DriverDocumentAdmin(admin.ModelAdmin):
    list_display = ('id', 'driver', 'document_type', 'uploaded_at', 'expiration_date', 'is_verified')
    list_filter = ('document_type', 'uploaded_at', 'expiration_date', 'is_verified')
    search_fields = ('driver__first_name', 'driver__last_name', 'document_type')
    readonly_fields = ('uploaded_at', 'file_size')
    
    fieldsets = (
        ('Driver Information', {
            'fields': ('driver', 'document_type')
        }),
        ('Document Details', {
            'fields': ('file', 'file_name', 'file_size', 'expiration_date', 'description')
        }),
        ('Upload Information', {
            'fields': ('uploaded_at', 'uploaded_by', 'is_verified')
        }),
    )

@admin.register(MaintenanceCategory)
class MaintenanceCategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'color_code')
    search_fields = ('name',)

@admin.register(MaintenanceType)
class MaintenanceTypeAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'category', 'estimated_hours', 'dot_required')
    list_filter = ('category', 'dot_required')
    search_fields = ('name', 'category__name')

@admin.register(MaintenanceRecord)
class MaintenanceRecordAdmin(admin.ModelAdmin):
    list_display = ('work_order_number', 'get_vehicle', 'maintenance_type', 'scheduled_date', 'completed_date', 'total_cost', 'status')
    list_filter = ('maintenance_type', 'scheduled_date', 'completed_date', 'status', 'priority', 'vehicle_type')
    search_fields = ('work_order_number', 'truck__unit_number', 'trailer__unit_number', 'service_provider', 'technician_name')
    readonly_fields = ('created_at', 'updated_at')
    
    def get_vehicle(self, obj):
        if obj.truck:
            return f"Truck: {obj.truck.unit_number}"
        elif obj.trailer:
            return f"Trailer: {obj.trailer.unit_number}"
        return "No Vehicle"
    get_vehicle.short_description = 'Vehicle'
    
    fieldsets = (
        ('Work Order', {
            'fields': ('work_order_number', 'vehicle_type', 'status', 'priority')
        }),
        ('Vehicle Information', {
            'fields': ('truck', 'trailer')
        }),
        ('Maintenance Details', {
            'fields': ('maintenance_type', 'scheduled_date', 'completed_date', 'description', 'parts_used')
        }),
        ('Service Information', {
            'fields': ('service_provider', 'technician_name', 'labor_hours', 'total_cost')
        }),
        ('Tracking', {
            'fields': ('due_mileage', 'actual_mileage', 'warranty_expiration', 'notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )

@admin.register(MaintenanceAttachment)
class MaintenanceAttachmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'maintenance_record', 'file_type', 'file_name', 'uploaded_at')
    list_filter = ('file_type', 'uploaded_at')
    search_fields = ('maintenance_record__work_order_number', 'file_name')
    readonly_fields = ('uploaded_at', 'file_size')

@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'used', 'created_at', 'expires_at')
    list_filter = ('used', 'created_at')
    search_fields = ('user__email', 'user__username')
    readonly_fields = ('token', 'created_at')
    
    fieldsets = (
        ('Reset Information', {
            'fields': ('user', 'token')
        }),
        ('Status', {
            'fields': ('used', 'created_at', 'expires_at')
        }),
    )

class DriverTestAdmin(admin.ModelAdmin):
    list_display = ('driver', 'test_type', 'test_date', 'test_result', 'test_completion_date')
    list_filter = ('test_type', 'test_result', 'test_date', 'test_completion_date')
    search_fields = ('driver__first_name', 'driver__last_name', 'test_type')
    date_hierarchy = 'test_date'

class TrailerAdmin(admin.ModelAdmin):
    list_display = ('unit_number', 'license_plate', 'trailer_type', 'company', 'active')
    list_filter = ('trailer_type', 'company', 'active')
    search_fields = ('unit_number', 'license_plate', 'model')

@admin.register(TripInspectionRepairCertification)
class TripInspectionRepairCertificationAdmin(admin.ModelAdmin):
    list_display = ('inspection', 'defect_type', 'operation_impact', 'affects_safety', 'repair_completed')
    list_filter = ('defect_type', 'operation_impact', 'affects_safety', 'repair_completed')
    search_fields = ('inspection__trip__trip_number', 'defect_description')

@admin.register(QualifiedInspector)
class QualifiedInspectorAdmin(admin.ModelAdmin):
    list_display = ('name', 'inspector_id', 'inspector_type', 'certification_expiry', 'company', 'active')
    list_filter = ('inspector_type', 'active', 'certification_expiry', 'company')
    search_fields = ('name', 'inspector_id', 'email')
    date_hierarchy = 'certification_expiry'

@admin.register(AnnualInspection)
class AnnualInspectionAdmin(admin.ModelAdmin):
    list_display = ('truck', 'trailer', 'inspector', 'inspection_date', 'inspection_result', 'inspection_certificate_number')
    list_filter = ('inspection_result', 'inspection_date', 'inspector__inspector_type')
    search_fields = ('truck__unit_number', 'trailer__unit_number', 'inspection_certificate_number', 'inspector__name')
    date_hierarchy = 'inspection_date'

@admin.register(VehicleOperationStatus)
class VehicleOperationStatusAdmin(admin.ModelAdmin):
    list_display = ('get_vehicle', 'vehicle_type', 'current_status', 'status_set_at')
    list_filter = ('vehicle_type', 'current_status', 'status_set_at')
    search_fields = ('truck__unit_number', 'trailer__unit_number', 'status_reason')
    
    def get_vehicle(self, obj):
        if obj.truck:
            return f"Truck: {obj.truck.unit_number}"
        elif obj.trailer:
            return f"Trailer: {obj.trailer.unit_number}"
        return "Unknown"
    get_vehicle.short_description = 'Vehicle'

# Register admin classes that were converted from simple registrations
admin.site.register(DriverTest, DriverTestAdmin)
admin.site.register(Trailer, TrailerAdmin)
