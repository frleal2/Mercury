"""
URL configuration for MercAPI project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework_simplejwt.views import TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static
from MercAPI import views  # Corrected to match the actual directory name
from MercAPI.views import RegisterUserView, CustomTokenObtainPairView, DriverViewSet, TruckViewSet, CompanyViewSet, TrailerViewSet, DriverTestViewSet, DriverHOSViewSet, DriverApplicationViewSet, MaintenanceCategoryViewSet, MaintenanceTypeViewSet, MaintenanceRecordViewSet, MaintenanceAttachmentViewSet, DriverDocumentViewSet, TripDocumentViewSet, LoadDocumentViewSet, MaintenanceAttachmentUploadView, DriverDocumentUploadView, InspectionViewSet, InspectionItemViewSet, TripsViewSet, TripsManagementViewSet, TripInspectionViewSet, AnnualInspectionViewSet, VehicleOperationStatusViewSet, driver_update_dvir_review, cancel_trip, cancel_and_reassign_trip, available_trucks, CustomerViewSet, CarrierViewSet, LoadViewSet, InvoiceViewSet, InvoicePaymentViewSet, RateLaneViewSet, AccessorialChargeViewSet, FuelSurchargeScheduleViewSet, CheckCallViewSet, LoadTrackingEventViewSet, NotificationViewSet, NotificationPreferenceViewSet, CompanyNotificationSettingViewSet, parse_rate_confirmation, confirm_delivery, report_breakdown, ELDProviderViewSet, ELDVehicleMappingViewSet, ELDDriverMappingViewSet, dispatch_map_locations

router = DefaultRouter()
router.register(r'drivers', DriverViewSet, basename='driver')  # Register DriverViewSet
router.register(r'trucks', TruckViewSet, basename='truck')  # Register TruckViewSet
router.register(r'companies', CompanyViewSet, basename='company')  # Register CompanyViewSet
router.register(r'trailers', TrailerViewSet, basename='trailer')  # Register TrailerViewSet
router.register(r'applications', DriverApplicationViewSet, basename='application')  # Register ApplicationViewSet
router.register(r'driver-tests', DriverTestViewSet, basename='driver-test')  # Register DriverTestViewSet
router.register(r'driver-hos', DriverHOSViewSet, basename='driver-hos')  # Register DriverHOSViewSet
router.register(r'maintenance-categories', MaintenanceCategoryViewSet, basename='maintenance-category')
router.register(r'maintenance-types', MaintenanceTypeViewSet, basename='maintenance-type')
router.register(r'maintenance-records', MaintenanceRecordViewSet, basename='maintenance-record')
router.register(r'maintenance-attachments', MaintenanceAttachmentViewSet, basename='maintenance-attachment')
router.register(r'driver-documents', DriverDocumentViewSet, basename='driver-document')
router.register(r'trip-documents', TripDocumentViewSet, basename='trip-document')
router.register(r'load-documents', LoadDocumentViewSet, basename='load-document')
router.register(r'inspections', InspectionViewSet, basename='inspection')
router.register(r'inspection-items', InspectionItemViewSet, basename='inspection-item')
router.register(r'trips', TripsManagementViewSet, basename='trips')
router.register(r'trip-inspections', TripInspectionViewSet, basename='trip-inspection')
# CFR Compliance endpoints
router.register(r'annual-inspections', AnnualInspectionViewSet, basename='annual-inspection')
router.register(r'vehicle-operation-status', VehicleOperationStatusViewSet, basename='vehicle-operation-status')
# TMS endpoints
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'carriers', CarrierViewSet, basename='carrier')
router.register(r'loads', LoadViewSet, basename='load')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'invoice-payments', InvoicePaymentViewSet, basename='invoice-payment')
router.register(r'rate-lanes', RateLaneViewSet, basename='rate-lane')
router.register(r'accessorial-charges', AccessorialChargeViewSet, basename='accessorial-charge')
router.register(r'fuel-surcharge-schedules', FuelSurchargeScheduleViewSet, basename='fuel-surcharge-schedule')
# Tracking & Visibility
router.register(r'check-calls', CheckCallViewSet, basename='check-call')
router.register(r'tracking-events', LoadTrackingEventViewSet, basename='tracking-event')
# Notification Center
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'notification-preferences', NotificationPreferenceViewSet, basename='notification-preference')
router.register(r'notification-settings', CompanyNotificationSettingViewSet, basename='notification-setting')
# ELD Integrations
router.register(r'eld-providers', ELDProviderViewSet, basename='eld-provider')
router.register(r'eld-vehicle-mappings', ELDVehicleMappingViewSet, basename='eld-vehicle-mapping')
router.register(r'eld-driver-mappings', ELDDriverMappingViewSet, basename='eld-driver-mapping')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/register/', RegisterUserView.as_view(), name='register_user'),
    path('api/DriverTest/<int:driver_id>/', views.get_latest_driver_test, name='get_latest_driver_test'),
    path('api/upload/maintenance-attachment/', MaintenanceAttachmentUploadView.as_view(), name='upload_maintenance_attachment'),
    path('api/upload/driver-document/', DriverDocumentUploadView.as_view(), name='upload_driver_document'),
    path('api/applications-with-files/', views.list_applications_with_files, name='list_applications_with_files'),
    path('api/applications/<int:application_id>/download/<str:file_type>/', views.download_application_file, name='download_application_file'),
    path('api/resolve/', views.resolve_tenant_company, name='resolve_tenant_company'),
    path('api/resolve/<str:tenant_domain>/', views.resolve_tenant_company, name='resolve_tenant'),
    path('api/resolve/<str:tenant_domain>/<str:company_slug>/', views.resolve_tenant_company, name='resolve_tenant_company'),
    path('api/tenant-signup/', views.tenant_signup, name='tenant_signup'),
    path('api/invite-user/', views.invite_user, name='invite_user'),
    path('api/validate-invitation/<uuid:token>/', views.validate_invitation, name='validate_invitation'),
    path('api/accept-invitation/<uuid:token>/', views.accept_invitation, name='accept_invitation'),
    path('api/user/profile/', views.user_profile, name='user_profile'),
    path('api/tenant-users/', views.list_tenant_users, name='list_tenant_users'),
    path('api/users/<int:user_id>/companies/', views.update_user_companies, name='update_user_companies'),
    path('api/users/<int:user_id>/', views.update_user, name='update_user'),
    # Password reset endpoints
    path('api/forgot-password/', views.forgot_password, name='forgot_password'),
    path('api/validate-reset-token/<uuid:token>/', views.validate_reset_token, name='validate_reset_token'),
    path('api/reset-password/<uuid:token>/', views.reset_password, name='reset_password'),
    # Trip management endpoints
    path('api/trips/<int:trip_id>/start/', views.start_trip, name='start_trip'),
    path('api/trips/<int:trip_id>/complete/', views.complete_trip, name='complete_trip'),
    path('api/trips/<int:trip_id>/confirm-delivery/', views.confirm_delivery, name='confirm_delivery'),
    path('api/trips/<int:trip_id>/report-breakdown/', views.report_breakdown, name='report_breakdown'),
    path('api/trips/<int:trip_id>/cancel/', views.cancel_trip, name='cancel_trip'),
    path('api/driver/active-trips/', views.driver_active_trips, name='driver_active_trips'),
    path('api/driver/trips/<int:trip_id>/dvir-review/', views.driver_update_dvir_review, name='driver_update_dvir_review'),
    path('api/trips/<int:trip_id>/cancel-reassign/', views.cancel_and_reassign_trip, name='cancel_and_reassign_trip'),
    path('api/available-trucks/', views.available_trucks, name='available_trucks'),
    path('api/trips/<int:trip_id>/inspection/<str:inspection_type>/', views.submit_inspection, name='submit_inspection'),
    # Rate management endpoints
    path('api/quote-lookup/', views.quote_lookup, name='quote_lookup'),
    # Load-Trip integration endpoints
    path('api/loads/<int:load_id>/dispatch/', views.dispatch_load, name='dispatch_load'),
    path('api/loads/<int:load_id>/reassign/', views.reassign_load, name='reassign_load'),
    # Document management endpoints
    path('api/trips/<int:trip_id>/upload-document/', views.driver_upload_pod, name='driver_upload_pod'),
    path('api/documents/<str:document_source>/<int:document_id>/sign/', views.sign_document, name='sign_document'),
    path('api/documents/<str:document_source>/<int:document_id>/download/', views.download_document, name='download_document'),
    # Tracking & Visibility endpoints
    path('api/loads/<int:load_id>/tracking/', views.load_tracking_timeline, name='load_tracking_timeline'),
    path('api/loads/<int:load_id>/send-tracking-link/', views.send_tracking_link, name='send_tracking_link'),
    path('api/tracking/<uuid:tracking_token>/', views.customer_tracking_portal, name='customer_tracking_portal'),
    # Rate Confirmation PDF parsing
    path('api/parse-rate-confirmation/', views.parse_rate_confirmation, name='parse_rate_confirmation'),
    # FMCSA Safety & Compliance
    path('api/company-safety/', views.company_safety_overview, name='company_safety_overview'),
    path('api/company-safety/refresh/', views.company_safety_refresh, name='company_safety_refresh'),
    path('api/company-safety/metrics/history/', views.company_compliance_history, name='company_compliance_history'),
    path('api/carriers/<int:carrier_id>/safety/', views.carrier_safety_overview, name='carrier_safety_overview'),
    path('api/carriers/<int:carrier_id>/safety/refresh/', views.carrier_safety_refresh, name='carrier_safety_refresh'),
    path('api/carriers/safety/overview/', views.carriers_safety_list, name='carriers_safety_list'),
    # ELD / Dispatch Map
    path('api/dispatch/map-locations/', dispatch_map_locations, name='dispatch_map_locations'),
]

# Serve media and static files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)