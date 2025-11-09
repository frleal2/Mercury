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
from MercAPI.views import RegisterUserView, CustomTokenObtainPairView, DriverViewSet, TruckViewSet, CompanyViewSet, TrailerViewSet, DriverTestViewSet, DriverHOSViewSet, DriverApplicationViewSet, MaintenanceCategoryViewSet, MaintenanceTypeViewSet, MaintenanceRecordViewSet, MaintenanceAttachmentViewSet, DriverDocumentViewSet, MaintenanceAttachmentUploadView, DriverDocumentUploadView, InspectionViewSet, InspectionItemViewSet, TripsViewSet

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
router.register(r'inspections', InspectionViewSet, basename='inspection')
router.register(r'inspection-items', InspectionItemViewSet, basename='inspection-item')
router.register(r'trips', TripsViewSet, basename='trips')

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
]

# Serve media and static files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)