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
from django.conf import settings
from django.conf.urls.static import static
from MercAPI import views  # Corrected to match the actual directory name
from MercAPI.views import RegisterUserView, CustomTokenObtainPairView, DriverViewSet, TruckViewSet, CompanyViewSet, TrailerViewSet, ApplicationViewSet, DriverTestViewSet, DriverHOSViewSet, submit_application  # Import ApplicationViewSet and DriverHOSViewSet

router = DefaultRouter()
router.register(r'drivers', DriverViewSet, basename='driver')  # Register DriverViewSet
router.register(r'trucks', TruckViewSet, basename='truck')  # Register TruckViewSet
router.register(r'companies', CompanyViewSet, basename='company')  # Register CompanyViewSet
router.register(r'trailers', TrailerViewSet, basename='trailer')  # Register TrailerViewSet
router.register(r'applications', ApplicationViewSet, basename='application')  # Register ApplicationViewSet
router.register(r'driver-tests', DriverTestViewSet, basename='driver-test')  # Register DriverTestViewSet
router.register(r'driver-hos', DriverHOSViewSet, basename='driver-hos')  # Register DriverHOSViewSet

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/register/', RegisterUserView.as_view(), name='register_user'),
    path('api/DriverTest/<int:driver_id>/', views.get_latest_driver_test, name='get_latest_driver_test'),
    path('api/submit-application/', submit_application, name='submit_application'),
]

# Serve media files during development
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)