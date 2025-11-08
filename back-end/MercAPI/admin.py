from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Driver, Company, DriverTest, Truck, Trailer, Inspection, InspectionItem, Trips, DriverHOS, DriverApplication, Tenant, UserProfile, InvitationToken  # Import the UserProfile model

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
admin.site.register(DriverTest)
admin.site.register(Trailer)

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
