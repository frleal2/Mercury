import logging
import boto3
from django.utils.text import slugify
from botocore.exceptions import NoCredentialsError
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from datetime import datetime, timedelta
from django.utils import timezone
from urllib.parse import urlencode
from .tasks import (
    send_invitation_email_task,
    send_password_reset_email_task,
    send_load_notification_email_task,
    send_tracking_link_email_task,
)
from .alerts import (
    _tracking_url,
    notify_load_dispatched,
    notify_load_status_change,
    notify_load_reassigned,
    notify_vehicle_status_change,
    notify_trip_started,
    notify_trip_completed,
    notify_trip_delivery_confirmed,
    notify_trip_breakdown,
    notify_inspection_failed,
    notify_driver_load_assigned,
    notify_customer_load_dispatched,
    notify_customer_trip_started,
    notify_customer_trip_completed,
)
from .serializers import UserSerializer, DriverSerializer, TruckSerializer, CompanySerializer, TrailerSerializer, DriverTestSerializer, DriverHOSSerializer, DriverApplicationSerializer, MaintenanceCategorySerializer, MaintenanceTypeSerializer, MaintenanceRecordSerializer, MaintenanceAttachmentSerializer, DriverDocumentSerializer, InspectionSerializer, InspectionItemSerializer, TripsSerializer, TripDocumentSerializer, LoadDocumentSerializer, AnnualInspectionSerializer, VehicleOperationStatusSerializer, CustomerSerializer, CarrierSerializer, LoadSerializer, InvoiceSerializer, InvoicePaymentSerializer, RateLaneSerializer, AccessorialChargeSerializer, FuelSurchargeScheduleSerializer, CheckCallSerializer, LoadTrackingEventSerializer, CustomerTrackingSerializer, LoadNotificationSerializer, NotificationSerializer, NotificationPreferenceSerializer, CompanyNotificationSettingSerializer, ELDProviderSerializer, ELDProviderDetailSerializer, ELDVehicleMappingSerializer, ELDDriverMappingSerializer, VehicleLocationSerializer, ActiveLoadLocationSerializer
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import Driver, Truck, Company, Trailer, DriverTest, DriverHOS, DriverApplication, MaintenanceCategory, MaintenanceType, MaintenanceRecord, MaintenanceAttachment, DriverDocument, Tenant, UserProfile, Inspection, InspectionItem, Trips, InvitationToken, TripDocument, LoadDocument, PasswordResetToken, AnnualInspection, VehicleOperationStatus, Customer, Carrier, Load, Invoice, InvoicePayment, RateLane, AccessorialCharge, FuelSurchargeSchedule, CheckCall, LoadTrackingEvent, LoadNotification, Notification, NotificationPreference, CompanyNotificationSetting, ELDProvider, ELDVehicleMapping, ELDDriverMapping, VehicleLocation
from rest_framework.serializers import ValidationError
from rest_framework import serializers
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
import mimetypes
import os

logger = logging.getLogger(__name__)

class CompanyFilterMixin:
    """
    Mixin to filter queryset by user's assigned companies.
    Only shows data for companies the user has access to.
    """
    def get_queryset(self):
        # Get the base queryset
        queryset = super().get_queryset()
        
        # If user is not authenticated, return empty queryset
        if not self.request.user.is_authenticated:
            return queryset.none()
        
        # If user doesn't have a profile, return empty queryset
        if not hasattr(self.request.user, 'profile'):
            return queryset.none()
        
        # Get user's assigned companies
        user_companies = self.request.user.profile.companies.all()
        
        # If user has no companies assigned, return empty queryset
        if not user_companies.exists():
            return queryset.none()
        
        # Filter queryset by company field (if it exists)
        if hasattr(queryset.model, 'company'):
            return queryset.filter(company__in=user_companies)
        
        # For Company model itself, return only user's companies
        if queryset.model.__name__ == 'Company':
            return user_companies
        
        # Handle models that connect to companies through relationships
        model_name = queryset.model.__name__
        
        if model_name == 'InspectionItem':
            # Filter through inspection -> truck/driver -> company
            return queryset.filter(
                Q(inspection__truck__company__in=user_companies) |
                Q(inspection__driver__company__in=user_companies)
            )
        
        if model_name == 'Inspection':
            # Filter inspections by company (unified model)
            return queryset.filter(company__in=user_companies)
        
        if model_name == 'MaintenanceRecord':
            # Filter through truck/trailer -> company
            return queryset.filter(
                Q(truck__company__in=user_companies) |
                Q(trailer__company__in=user_companies)
            )
        
        # For models that don't have a company field, return all (maintenance categories, etc.)
        return queryset


class AdminOnlyMixin:
    """
    Mixin to restrict access to admin users only.
    Admin users can manage everything including companies and user accounts.
    """
    def get_permissions(self):
        permissions = super().get_permissions()
        permissions.append(IsAuthenticated())
        return permissions
    
    def check_permissions(self, request):
        super().check_permissions(request)
        
        if not hasattr(request.user, 'profile'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("User profile not found")
        
        if not request.user.profile.is_admin():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Admin access required")


class UserOrAboveMixin:
    """
    Mixin to restrict access to user role and above (user + admin).
    These users can manage company data but not create companies or user accounts.
    """
    def get_permissions(self):
        permissions = super().get_permissions()
        permissions.append(IsAuthenticated())
        return permissions
    
    def check_permissions(self, request):
        super().check_permissions(request)
        
        if not hasattr(request.user, 'profile'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("User profile not found")
        
        if not request.user.profile.is_user_or_above():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("User access or above required")


class DriverFilterMixin:
    """
    Mixin to filter data for driver users - only shows their assigned trips and related data.
    """
    def get_queryset(self):
        queryset = super().get_queryset()
        
        if not self.request.user.is_authenticated:
            return queryset.none()
        
        if not hasattr(self.request.user, 'profile'):
            return queryset.none()
        
        profile = self.request.user.profile
        
        # If user is driver, filter to only their data
        if profile.is_driver():
            # For now, drivers can see all data in their companies
            # This will be further restricted when we implement trip assignments
            user_companies = profile.companies.all()
            if hasattr(queryset.model, 'company'):
                return queryset.filter(company__in=user_companies)
        
        # For non-driver users, use regular company filtering
        return queryset


class DriverReadOnlyMixin:
    """
    Mixin for viewsets that should allow drivers to read data (for DVIR purposes)
    but restrict create/update/delete operations to user role and above.
    """
    def get_permissions(self):
        permissions = super().get_permissions()
        permissions.append(IsAuthenticated())
        return permissions
    
    def check_permissions(self, request):
        super().check_permissions(request)
        
        if not hasattr(request.user, 'profile'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("User profile not found")
        
        # Allow drivers to read (GET, HEAD, OPTIONS) but not modify data
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            # All authenticated users with profiles can read
            return
        
        # For create/update/delete operations, require user role or above
        if not request.user.profile.is_user_or_above():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("User access or above required for modifications")


@api_view(['GET'])
@permission_classes([AllowAny])
def resolve_tenant_company(request, tenant_domain=None, company_slug=None):
    """
    Resolve tenant and company from URL parameters.
    Used for Quick Apply form to determine which company user is applying to.
    """
    try:
        result = {}
        
        # If tenant_domain is provided, look it up
        if tenant_domain:
            try:
                tenant = Tenant.objects.get(domain=tenant_domain, is_active=True)
                result['tenant'] = {
                    'id': tenant.id,
                    'name': tenant.name,
                    'domain': tenant.domain
                }
                
                # If company_slug is also provided, look up the company within this tenant
                if company_slug:
                    try:
                        company = Company.objects.get(
                            slug=company_slug, 
                            tenant=tenant, 
                            active=True
                        )
                        result['company'] = {
                            'id': company.id,
                            'name': company.name,
                            'slug': company.slug,
                            'tenant_id': company.tenant.id
                        }
                    except Company.DoesNotExist:
                        return Response(
                            {'error': f'Company "{company_slug}" not found for tenant "{tenant_domain}"'}, 
                            status=status.HTTP_404_NOT_FOUND
                        )
                else:
                    # Return all companies for this tenant
                    companies = Company.objects.filter(tenant=tenant, active=True)
                    result['companies'] = [
                        {
                            'id': company.id,
                            'name': company.name,
                            'slug': company.slug,
                        }
                        for company in companies
                    ]
                    
            except Tenant.DoesNotExist:
                return Response(
                    {'error': f'Tenant "{tenant_domain}" not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # No tenant specified - return error or list of available tenants
            return Response(
                {'error': 'No tenant domain specified'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error resolving tenant/company: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def tenant_signup(request):
    """
    Create a new tenant, company, and admin user in one signup flow.
    Used for client self-service signup.
    """
    try:
        data = request.data
        
        # Required fields validation
        required_fields = ['business_name', 'domain', 'admin_username', 'admin_email', 'admin_password', 'admin_first_name', 'admin_last_name']
        for field in required_fields:
            if not data.get(field):
                return Response(
                    {'error': f'{field} is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Check if domain is already taken
        if Tenant.objects.filter(domain=data['domain']).exists():
            return Response(
                {'error': 'Domain already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if admin username is already taken
        if User.objects.filter(username=data['admin_username']).exists():
            return Response(
                {'error': 'Username already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if admin email is already taken
        if User.objects.filter(email=data['admin_email']).exists():
            return Response(
                {'error': 'Email already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create tenant
        tenant = Tenant.objects.create(
            name=data['business_name'],
            domain=data['domain'],
            application_code=data['domain'][:10].upper(),  # Use first 10 chars of domain
            contact_email=data['admin_email'],
            subscription_plan=data.get('subscription_plan', 'starter')
        )
        
        # Create default company
        company = Company.objects.create(
            tenant=tenant,
            name=data.get('company_name', f"{data['business_name']} - Main Office"),
            slug=data['domain'],  # Use domain as slug for main company
            email=data['admin_email'],
            active=True
        )
        
        # Create admin user
        admin_user = User.objects.create_user(
            username=data['admin_username'],  # Use provided username
            email=data['admin_email'],
            password=data['admin_password'],
            first_name=data['admin_first_name'],
            last_name=data['admin_last_name'],
            is_staff=True  # Allow admin panel access
        )
        
        # The UserProfile is created automatically by signal
        # Now assign the admin to the company with admin permissions
        profile = admin_user.profile
        profile.tenant = tenant
        profile.is_company_admin = True
        profile.save()
        profile.companies.add(company)
        
        return Response({
            'message': 'Tenant created successfully',
            'tenant': {
                'id': tenant.id,
                'name': tenant.name,
                'domain': tenant.domain
            },
            'company': {
                'id': company.id,
                'name': company.name,
                'slug': company.slug
            },
            'admin_user': {
                'id': admin_user.id,
                'email': admin_user.email,
                'first_name': admin_user.first_name,
                'last_name': admin_user.last_name
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error creating tenant: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def invite_user(request):
    """
    Role-based user invitation system.
    - Admin can invite: admin, user, driver
    - User can invite: driver only
    - Driver cannot invite anyone
    """
    try:
        # Check if user has profile
        if not hasattr(request.user, 'profile'):
            return Response(
                {'error': 'User profile not found'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        profile = request.user.profile
        
        # Check basic permission to invite users
        if not profile.can_create_driver_accounts():  # This covers admin and user roles
            return Response(
                {'error': 'You do not have permission to invite users'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        data = request.data
        required_fields = ['email', 'first_name', 'last_name', 'role', 'company_ids']
        for field in required_fields:
            if not data.get(field):
                return Response(
                    {'error': f'{field} is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Validate role choice
        role = data.get('role')
        valid_roles = ['admin', 'user', 'driver']
        if role not in valid_roles:
            return Response(
                {'error': f'Invalid role. Must be one of: {", ".join(valid_roles)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Role-based permission checks
        if role == 'admin' and not profile.is_admin():
            return Response(
                {'error': 'Only admins can create admin accounts'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if role == 'user' and not profile.is_admin():
            return Response(
                {'error': 'Only admins can create user accounts'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Users and admins can create driver accounts (already checked above)
        
        # Check if email already exists
        if User.objects.filter(email=data['email']).exists():
            return Response(
                {'error': 'User with this email already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if there's already a pending invitation for this email
        if InvitationToken.objects.filter(email=data['email'], is_used=False).exists():
            return Response(
                {'error': 'There is already a pending invitation for this email'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify user can access all requested companies
        user_companies = profile.companies.all()
        company_ids = data['company_ids']
        requested_companies = Company.objects.filter(id__in=company_ids)
        
        for company in requested_companies:
            if company not in user_companies:
                return Response(
                    {'error': f'You do not have access to company: {company.name}'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Additional validation for driver accounts
        driver_id = data.get('driver_id')  # Optional: link to existing driver record
        create_new_driver = data.get('create_new_driver', False)  # Option 3: Create new driver
        driver_data = data.get('driver_data', {})  # Driver details for new driver creation
        driver = None
        
        if role == 'driver':
            if driver_id and create_new_driver:
                return Response(
                    {'error': 'Cannot both link to existing driver and create new driver'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if driver_id:
                # Option 1: Link to existing driver
                try:
                    driver = Driver.objects.get(id=driver_id, company__in=user_companies)
                    if driver.has_user_account():
                        return Response(
                            {'error': f'Driver {driver.first_name} {driver.last_name} already has a user account'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except Driver.DoesNotExist:
                    return Response(
                        {'error': 'Driver not found or you do not have access to this driver'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            elif create_new_driver:
                # Option 3: Create new driver - validate required driver fields
                required_driver_fields = ['phone', 'company_id']
                for field in required_driver_fields:
                    if not driver_data.get(field):
                        return Response(
                            {'error': f'driver_data.{field} is required when creating a new driver'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                
                # Verify company access for new driver
                driver_company_id = driver_data.get('company_id')
                if driver_company_id not in company_ids:
                    return Response(
                        {'error': 'Driver company must be one of the selected companies'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                try:
                    driver_company = Company.objects.get(id=driver_company_id, id__in=[c.id for c in user_companies])
                except Company.DoesNotExist:
                    return Response(
                        {'error': 'You do not have access to the specified driver company'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
        
        # Send invitation email
        try:
            # Create secure invitation token with role information
            invitation_token = InvitationToken.objects.create(
                email=data['email'],
                tenant=profile.tenant,
                company=requested_companies.first(),  # Use first company as primary
                invited_by=request.user,
                # Store additional invitation data as JSON
                invitation_data={
                    'role': role,
                    'company_ids': company_ids,
                    'driver_id': driver_id if role == 'driver' and driver_id else None,
                    'create_new_driver': create_new_driver if role == 'driver' else False,
                    'driver_data': driver_data if role == 'driver' and create_new_driver else {},
                    'first_name': data['first_name'],
                    'last_name': data['last_name']
                }
            )
            
            # Create secure activation URL with token (points to frontend)
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
            activation_url = f"{frontend_url}/accept-invitation/{invitation_token.token}"
            
            # Calculate expiration date
            expiration_date = (timezone.now() + timedelta(days=7)).strftime('%B %d, %Y')
            
            # Prepare email context
            email_context = {
                'email': data['email'],
                'first_name': data['first_name'],
                'last_name': data['last_name'],
                'role': role,
                'role_display': dict([('admin', 'Administrator'), ('user', 'User'), ('driver', 'Driver')])[role],
                'inviter_name': f"{request.user.first_name} {request.user.last_name}",
                'inviter_email': request.user.email,
                'tenant_name': profile.tenant.name,
                'companies': requested_companies,
                'activation_url': activation_url,
                'expiration_date': expiration_date,
                'is_driver_account': role == 'driver',
                'driver_name': f"{driver.first_name} {driver.last_name}" if role == 'driver' and driver_id else None,
            }
            
            # Render email templates
            html_message = render_to_string('emails/user_invitation.html', email_context)
            plain_message = render_to_string('emails/user_invitation.txt', email_context)
            
            # Send email asynchronously via Celery
            send_invitation_email_task.delay(
                data['email'],
                request.user.profile.tenant.name,
                email_context,
            )
            
        except Exception as email_error:
            logger.error(f"Failed to send invitation email: {str(email_error)}")
            # Don't fail the entire invitation if email fails
            # The user was still created successfully
        
        return Response({
            'message': 'User invited successfully',
            'invitation': {
                'email': data['email'],
                'first_name': data['first_name'],
                'last_name': data['last_name'],
                'role': role,
                'companies': [{'id': c.id, 'name': c.name} for c in requested_companies],
                'driver_id': driver_id if role == 'driver' and driver_id else None,
                'driver_name': f"{driver.first_name} {driver.last_name}" if driver else None,
                'expires_at': invitation_token.expires_at.isoformat()
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error inviting user: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_tenant_users(request):
    """
    List all users in the admin's tenant with their company assignments.
    Only accessible by company admins.
    """
    try:
        # Check if user has permission to view users (admin or user role)
        if not hasattr(request.user, 'profile') or not request.user.profile.is_user_or_above():
            return Response(
                {'error': 'You do not have permission to view users'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get all users in the same tenant
        tenant = request.user.profile.tenant
        tenant_users = User.objects.filter(profile__tenant=tenant).select_related('profile')
        
        users_data = []
        for user in tenant_users:
            user_companies = user.profile.companies.all()
            users_data.append({
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_active': user.is_active,
                'role': user.profile.role,
                'is_company_admin': user.profile.is_company_admin,  # Keep for backward compatibility
                'companies': [{'id': c.id, 'name': c.name, 'slug': c.slug} for c in user_companies],
                'date_joined': user.date_joined
            })
        
        return Response({
            'users': users_data,
            'tenant': {
                'name': tenant.name,
                'domain': tenant.domain
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error listing users: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_user_companies(request, user_id):
    """
    Update a user's company assignments.
    Only accessible by company admins within the same tenant.
    """
    try:
        # Check if user is company admin
        if not hasattr(request.user, 'profile') or not request.user.profile.is_company_admin:
            return Response(
                {'error': 'Only company admins can update users'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get target user
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verify target user is in same tenant
        if target_user.profile.tenant != request.user.profile.tenant:
            return Response(
                {'error': 'User not in your tenant'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Verify admin can access all requested companies
        company_ids = request.data.get('company_ids', [])
        admin_companies = request.user.profile.companies.all()
        requested_companies = Company.objects.filter(id__in=company_ids)
        
        for company in requested_companies:
            if company not in admin_companies:
                return Response(
                    {'error': f'You do not have access to company: {company.name}'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Update user's company assignments
        target_user.profile.companies.set(requested_companies)
        
        return Response({
            'message': 'User companies updated successfully',
            'user': {
                'id': target_user.id,
                'email': target_user.email,
                'companies': [{'id': c.id, 'name': c.name} for c in requested_companies]
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error updating user companies: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_user(request, user_id):
    """
    Update a user's profile information.
    Only accessible by users with admin or user role within the same tenant.
    """
    try:
        # Check if user has permission (admin or user role)
        if not hasattr(request.user, 'profile') or not request.user.profile.is_user_or_above():
            return Response(
                {'error': 'Only admins and users can edit user profiles'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get target user
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verify target user is in same tenant
        if target_user.profile.tenant != request.user.profile.tenant:
            return Response(
                {'error': 'User not in your tenant'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get request data
        email = request.data.get('email')
        role = request.data.get('role')
        is_active = request.data.get('is_active')
        company_ids = request.data.get('companies', [])
        
        # Validate email
        if email and email != target_user.email:
            if User.objects.filter(email=email).exclude(id=target_user.id).exists():
                return Response(
                    {'error': 'Email already exists'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            target_user.email = email
            target_user.username = email  # Keep username in sync
        
        # Validate role
        if role and role not in ['admin', 'user', 'driver']:
            return Response(
                {'error': 'Invalid role'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update is_active status
        if is_active is not None:
            target_user.is_active = is_active
        
        # Update role
        if role:
            target_user.profile.role = role
        
        # Verify admin can access all requested companies
        if company_ids:
            admin_companies = request.user.profile.companies.all()
            requested_companies = Company.objects.filter(id__in=company_ids, tenant=request.user.profile.tenant)
            
            # Only check company access if not an admin
            if not request.user.profile.is_admin():
                for company in requested_companies:
                    if company not in admin_companies:
                        return Response(
                            {'error': f'You do not have access to company: {company.name}'}, 
                            status=status.HTTP_403_FORBIDDEN
                        )
            
            # Update user's company assignments
            target_user.profile.companies.set(requested_companies)
        
        # Save changes
        target_user.save()
        target_user.profile.save()
        
        # Return updated user data
        user_companies = target_user.profile.companies.all()
        return Response({
            'message': 'User updated successfully',
            'user': {
                'id': target_user.id,
                'email': target_user.email,
                'first_name': target_user.first_name,
                'last_name': target_user.last_name,
                'is_active': target_user.is_active,
                'role': target_user.profile.role,
                'companies': [{'id': c.id, 'name': c.name, 'slug': c.slug} for c in user_companies],
                'date_joined': target_user.date_joined
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class FileUploadView(APIView):
    """
    Base view for handling file uploads with validation
    """
    permission_classes = [IsAuthenticated]
    
    ALLOWED_TYPES = {
        'pdf': ['application/pdf'],
        'image': ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
        'document': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        'spreadsheet': ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        'text': ['text/plain', 'text/csv']
    }
    
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    def validate_file(self, file, allowed_categories=None):
        """Validate uploaded file"""
        if not file:
            raise ValidationError("No file provided")
        
        # Check file size
        if file.size > self.MAX_FILE_SIZE:
            raise ValidationError(f"File size too large. Maximum size is {self.MAX_FILE_SIZE / (1024*1024):.1f}MB")
        
        # Get file extension and mime type
        file_extension = os.path.splitext(file.name)[1].lower()
        content_type = file.content_type or mimetypes.guess_type(file.name)[0]
        
        # Validate file type if categories specified
        if allowed_categories:
            allowed_types = []
            for category in allowed_categories:
                if category in self.ALLOWED_TYPES:
                    allowed_types.extend(self.ALLOWED_TYPES[category])
            
            if content_type not in allowed_types:
                raise ValidationError(f"File type not allowed. Allowed types: {', '.join(allowed_types)}")
        
        return True

class MaintenanceAttachmentUploadView(FileUploadView):
    """
    Handle file uploads for maintenance attachments
    """
    
    def post(self, request, *args, **kwargs):
        try:
            file = request.FILES.get('file')
            maintenance_record_id = request.data.get('maintenance_record_id')
            description = request.data.get('description', '')
            
            if not file:
                return Response(
                    {'error': 'No file provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not maintenance_record_id:
                return Response(
                    {'error': 'maintenance_record_id is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate maintenance record exists
            try:
                maintenance_record = MaintenanceRecord.objects.get(id=maintenance_record_id)
            except MaintenanceRecord.DoesNotExist:
                return Response(
                    {'error': 'Maintenance record not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Validate file
            self.validate_file(file, ['pdf', 'image', 'document'])
            
            # Create attachment
            attachment = MaintenanceAttachment.objects.create(
                maintenance_record=maintenance_record,
                file=file,
                description=description,
                file_size=file.size
            )
            
            serializer = MaintenanceAttachmentSerializer(attachment)
            
            return Response(
                {
                    'message': 'File uploaded successfully',
                    'attachment': serializer.data
                }, 
                status=status.HTTP_201_CREATED
            )
            
        except ValidationError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error uploading maintenance attachment: {str(e)}")
            return Response(
                {'error': 'Internal server error'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class DriverDocumentUploadView(FileUploadView):
    """
    Handle file uploads for driver documents (licenses, certifications, etc.)
    """
    
    def post(self, request, *args, **kwargs):
        try:
            file = request.FILES.get('file')
            driver_id = request.data.get('driver_id')
            document_type = request.data.get('document_type')
            description = request.data.get('description', '')
            expiry_date = request.data.get('expiry_date')
            
            if not file:
                return Response(
                    {'error': 'No file provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not driver_id:
                return Response(
                    {'error': 'driver_id is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not document_type:
                return Response(
                    {'error': 'document_type is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate driver exists
            try:
                driver = Driver.objects.get(id=driver_id)
            except Driver.DoesNotExist:
                return Response(
                    {'error': 'Driver not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Validate document type
            valid_types = [choice[0] for choice in DriverDocument.DOCUMENT_TYPE_CHOICES]
            if document_type not in valid_types:
                return Response(
                    {'error': f'Invalid document type. Valid types: {", ".join(valid_types)}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate file
            self.validate_file(file, ['pdf', 'image', 'document'])
            
            # Create document
            document = DriverDocument.objects.create(
                driver=driver,
                document_type=document_type,
                file=file,
                description=description,
                expiry_date=expiry_date,
                file_size=file.size
            )
            
            serializer = DriverDocumentSerializer(document)
            
            return Response(
                {
                    'message': 'Document uploaded successfully',
                    'document': serializer.data
                }, 
                status=status.HTTP_201_CREATED
            )
            
        except ValidationError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error uploading driver document: {str(e)}")
            return Response(
                {'error': 'Internal server error'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class RegisterUserView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, created = Token.objects.get_or_create(user=user)
            return Response({'token': token.key}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        if hasattr(user, 'profile'):
            profile = user.profile
            # Add tenant information
            if profile.tenant:
                token['tenant_id'] = profile.tenant.id
                token['tenant_name'] = profile.tenant.name
                token['tenant_domain'] = profile.tenant.domain
            
            # Add company information
            companies = profile.companies.all()
            token['companies'] = [
                {
                    'id': company.id,
                    'name': company.name,
                    'slug': company.slug
                }
                for company in companies
            ]
            
            # Add admin status (deprecated - use role instead)
            token['is_company_admin'] = profile.is_company_admin
            
            # Add role information
            token['role'] = profile.role
            token['role_display'] = profile.get_role_display()
        
        return token

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class DriverViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        logger.debug("Fetching drivers filtered by user's companies")
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

class TruckViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    queryset = Truck.objects.all()
    serializer_class = TruckSerializer
    permission_classes = [IsAuthenticated]

class CompanyViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        # Only admins can create companies
        if not hasattr(request.user, 'profile') or not request.user.profile.is_admin():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can create companies")
    
        return self._handle_company_create_update(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        # Only admins can update companies
        if not hasattr(request.user, 'profile') or not request.user.profile.is_admin():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can update companies")
        
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        # Only admins can update companies
        if not hasattr(request.user, 'profile') or not request.user.profile.is_admin():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can update companies")
        
        return super().partial_update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        # Only admins can delete companies
        if not hasattr(request.user, 'profile') or not request.user.profile.is_admin():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can delete companies")
        
        return super().destroy(request, *args, **kwargs)
    
    def _handle_company_create_update(self, request, *args, **kwargs):
        # Auto-assign tenant and generate slug
        data = request.data.copy()
        
        # Set tenant to current user's tenant
        if hasattr(request.user, 'profile') and request.user.profile.tenant:
            data['tenant'] = request.user.profile.tenant.id
        
        # Generate slug from company name
        if 'name' in data and not data.get('slug'):
            base_slug = slugify(data['name'])
            slug = base_slug
            counter = 1
            while Company.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            data['slug'] = slug
        
        # Use the modified data
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Add the newly created company to the user's companies
        if hasattr(request.user, 'profile'):
            request.user.profile.companies.add(serializer.instance)
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

class TrailerViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    queryset = Trailer.objects.select_related('company', 'truck').all()
    serializer_class = TrailerSerializer
    permission_classes = [IsAuthenticated]


class DriverApplicationViewSet(CompanyFilterMixin, ModelViewSet):
    queryset = DriverApplication.objects.all()
    serializer_class = DriverApplicationSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        # If user is authenticated, filter by their companies
        if self.request.user.is_authenticated:
            return super().get_queryset()
        # If not authenticated (public access), return all for create operations
        return DriverApplication.objects.all()
    
    def create(self, request, *args, **kwargs):
        try:
            logger.info(f"Creating driver application with data: {request.data}")
            logger.info(f"Files in request: {request.FILES}")
            
            # Check if files are present
            if 'drivers_license' in request.FILES:
                logger.info(f"Driver's license file size: {request.FILES['drivers_license'].size}")
            if 'medical_certificate' in request.FILES:
                logger.info(f"Medical certificate file size: {request.FILES['medical_certificate'].size}")
            
            return super().create(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error creating driver application: {str(e)}")
            logger.error(f"Error type: {type(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise

class DriverTestViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    queryset = DriverTest.objects.all()
    serializer_class = DriverTestSerializer
    permission_classes = [IsAuthenticated]

class DriverHOSViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    queryset = DriverHOS.objects.all()
    serializer_class = DriverHOSSerializer
    permission_classes = [IsAuthenticated]

class MaintenanceCategoryViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    queryset = MaintenanceCategory.objects.all()
    serializer_class = MaintenanceCategorySerializer
    permission_classes = [IsAuthenticated]

class MaintenanceTypeViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    queryset = MaintenanceType.objects.all()
    serializer_class = MaintenanceTypeSerializer
    permission_classes = [IsAuthenticated]

class MaintenanceRecordViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    queryset = MaintenanceRecord.objects.all()
    serializer_class = MaintenanceRecordSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # First apply company filtering
        queryset = super().get_queryset()
        
        # Then apply additional filters
        vehicle_type = self.request.query_params.get('vehicle_type', None)
        vehicle_id = self.request.query_params.get('vehicle_id', None)
        status = self.request.query_params.get('status', None)
        
        if vehicle_type and vehicle_id:
            if vehicle_type == 'truck':
                queryset = queryset.filter(truck_id=vehicle_id)
            elif vehicle_type == 'trailer':
                queryset = queryset.filter(trailer_id=vehicle_id)
        
        if status:
            queryset = queryset.filter(status=status)
        
        return queryset
    
    def update(self, request, *args, **kwargs):
        """Override update to automatically set completed_date when status changes to completed"""
        instance = self.get_object()
        
        # Check if status is being changed to completed
        if (request.data.get('status') == 'completed' and 
            instance.status != 'completed' and 
            not request.data.get('completed_date')):
            # Automatically set completed_date to today
            from datetime import date
            request.data['completed_date'] = date.today().isoformat()
            logger.info(f"Auto-setting completed_date for maintenance record {instance.record_id}")
        
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        """Override partial_update to automatically set completed_date when status changes to completed"""
        instance = self.get_object()
        
        # Check if status is being changed to completed
        if (request.data.get('status') == 'completed' and 
            instance.status != 'completed' and 
            not request.data.get('completed_date')):
            # Automatically set completed_date to today
            from datetime import date
            request.data['completed_date'] = date.today().isoformat()
            logger.info(f"Auto-setting completed_date for maintenance record {instance.record_id}")
        
        return super().partial_update(request, *args, **kwargs)
            
        return queryset

class MaintenanceAttachmentViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    queryset = MaintenanceAttachment.objects.all()
    serializer_class = MaintenanceAttachmentSerializer
    permission_classes = [IsAuthenticated]

class DriverDocumentViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    queryset = DriverDocument.objects.all()
    serializer_class = DriverDocumentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # First apply company filtering
        queryset = super().get_queryset()
        
        # Then apply additional filters
        driver_id = self.request.query_params.get('driver_id', None)
        document_type = self.request.query_params.get('document_type', None)
        
        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
        
        if document_type:
            queryset = queryset.filter(document_type=document_type)
            
        return queryset.order_by('-uploaded_at')


class TripDocumentViewSet(UserOrAboveMixin, ModelViewSet):
    queryset = TripDocument.objects.all()
    serializer_class = TripDocumentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Filter by user's companies through trip relationship
        if not hasattr(self.request.user, 'profile') or not self.request.user.profile:
            return TripDocument.objects.none()
        
        user_companies = self.request.user.profile.companies.all()
        queryset = TripDocument.objects.filter(trip__company__in=user_companies)
        
        # Apply additional filters
        trip_id = self.request.query_params.get('trip', None)
        document_type = self.request.query_params.get('document_type', None)
        
        if trip_id:
            queryset = queryset.filter(trip_id=trip_id)
        
        if document_type:
            queryset = queryset.filter(document_type=document_type)
            
        return queryset.order_by('-uploaded_at')
    
    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class LoadDocumentViewSet(UserOrAboveMixin, ModelViewSet):
    queryset = LoadDocument.objects.all()
    serializer_class = LoadDocumentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if not hasattr(self.request.user, 'profile') or not self.request.user.profile:
            return LoadDocument.objects.none()
        
        user_companies = self.request.user.profile.companies.all()
        queryset = LoadDocument.objects.filter(load__company__in=user_companies)
        
        load_id = self.request.query_params.get('load', None)
        document_type = self.request.query_params.get('document_type', None)
        
        if load_id:
            queryset = queryset.filter(load_id=load_id)
        
        if document_type:
            queryset = queryset.filter(document_type=document_type)
            
        return queryset.order_by('-uploaded_at')
    
    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class InspectionViewSet(CompanyFilterMixin, ModelViewSet):
    # TODO: Will need DriverFilterMixin when trip system is implemented
    # Drivers need to create pre/post trip inspections
    queryset = Inspection.objects.all()
    serializer_class = InspectionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Apply company filtering through truck and driver relationships
        queryset = super().get_queryset()
        
        # Additional filters
        truck_id = self.request.query_params.get('truck_id', None)
        driver_id = self.request.query_params.get('driver_id', None)
        inspection_type = self.request.query_params.get('inspection_type', None)
        
        if truck_id:
            queryset = queryset.filter(truck_id=truck_id)
        
        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
            
        if inspection_type:
            queryset = queryset.filter(inspection_type=inspection_type)
            
        return queryset.order_by('-inspection_date')


class InspectionItemViewSet(CompanyFilterMixin, ModelViewSet):
    # TODO: Will need DriverFilterMixin when trip system is implemented
    # Drivers need to create inspection items
    queryset = InspectionItem.objects.all()
    serializer_class = InspectionItemSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Filter through inspection relationship
        queryset = super().get_queryset()
        
        # Additional filters
        inspection_id = self.request.query_params.get('inspection_id', None)
        component = self.request.query_params.get('component', None)
        condition = self.request.query_params.get('condition', None)
        
        if inspection_id:
            queryset = queryset.filter(inspection_id=inspection_id)
        
        if component:
            queryset = queryset.filter(component=component)
            
        if condition:
            queryset = queryset.filter(condition=condition)
            
        return queryset


class TripsViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    # Trips management restricted to admin/user roles
    # Drivers will have separate endpoints for viewing their assigned trips
    queryset = Trips.objects.all()
    serializer_class = TripsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Apply company filtering through driver and truck relationships
        queryset = super().get_queryset()
        
        # Additional filters
        driver_id = self.request.query_params.get('driver_id', None)
        truck_id = self.request.query_params.get('truck_id', None)
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        
        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
        
        if truck_id:
            queryset = queryset.filter(truck_id=truck_id)
            
        if start_date:
            queryset = queryset.filter(start_time__date__gte=start_date)
            
        if end_date:
            queryset = queryset.filter(start_time__date__lte=end_date)
            
        return queryset.order_by('-start_time')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_applications_with_files(request):
    """List all driver applications with file information for user's companies"""
    try:
        # Ensure user has profile and companies
        if not hasattr(request.user, 'profile') or not request.user.profile.companies.exists():
            return Response({"detail": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
        
        # Filter by user's companies for tenant isolation
        user_companies = request.user.profile.companies.all()
        applications = DriverApplication.objects.filter(
            company__in=user_companies
        ).order_by('-created_at')
        
        # Use the serializer to get full data, then add file URLs
        serializer = DriverApplicationSerializer(applications, many=True)
        data = serializer.data
        
        # Add file URL information to each application
        for i, app in enumerate(applications):
            data[i]['drivers_license_url'] = app.drivers_license.url if app.drivers_license else None
            data[i]['medical_certificate_url'] = app.medical_certificate.url if app.medical_certificate else None
            data[i]['has_files'] = bool(app.drivers_license or app.medical_certificate)
        
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error listing applications: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_application_file(request, application_id, file_type):
    """
    Generate signed URL for application file download (tenant-aware)
    """
    try:
        logger.info(f"Download request: application_id={application_id}, file_type={file_type}")
        
        # Ensure user has profile and companies
        if not hasattr(request.user, 'profile') or not request.user.profile.companies.exists():
            return Response({"detail": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
        
        # Get the application with tenant filtering
        user_companies = request.user.profile.companies.all()
        application = DriverApplication.objects.get(
            id=application_id,
            company__in=user_companies
        )
        
        # Get the file based on type
        if file_type == 'license':
            file_field = application.drivers_license
            file_name = f"drivers_license_{application.id}"
        elif file_type == 'medical':
            file_field = application.medical_certificate
            file_name = f"medical_certificate_{application.id}"
        else:
            logger.error(f"Invalid file type: {file_type}")
            return Response(
                {'error': 'Invalid file type'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if file exists
        if not file_field:
            logger.error(f"File not found for application {application_id}, type {file_type}")
            return Response(
                {'error': 'File not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate signed URL manually using boto3
        try:
            # Create S3 client
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )
            
            # Generate presigned URL
            presigned_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': settings.AWS_STORAGE_BUCKET_NAME, 'Key': file_field.name},
                ExpiresIn=3600  # 1 hour
            )
            
            logger.info(f"Generated presigned URL: {presigned_url}")
            
            return Response({
                'download_url': presigned_url,
                'filename': file_field.name.split('/')[-1],
                'expires_in': 3600  # 1 hour
            }, status=status.HTTP_200_OK)
        except Exception as url_error:
            logger.error(f"Error generating presigned URL: {str(url_error)}")
            return Response(
                {'error': 'Error generating download URL'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    except DriverApplication.DoesNotExist:
        logger.error(f"Application not found: {application_id}")
        return Response(
            {'error': 'Application not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error generating download URL: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_latest_driver_test(request, driver_id):
    try:
        # Ensure user has profile and companies
        if not hasattr(request.user, 'profile') or not request.user.profile.companies.exists():
            return Response({"detail": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
        
        # Fetch the latest test with tenant filtering
        user_companies = request.user.profile.companies.all()
        latest_test = DriverTest.objects.filter(
            driver_id=driver_id, 
            completion_date__isnull=False,
            driver__company__in=user_companies
        ).order_by('-completion_date').first()
        if not latest_test:
            return Response({"detail": "No tests with a valid completion date found for this driver."}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = DriverTestSerializer(latest_test)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])  # Public endpoint
def validate_invitation(request, token):
    """
    Validate an invitation token and return invitation details
    """
    try:
        invitation = InvitationToken.objects.get(token=token)
        
        if not invitation.is_valid():
            if invitation.is_expired():
                return Response(
                    {'error': 'This invitation has expired'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                return Response(
                    {'error': 'This invitation has already been used'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Extract invitation data
        invitation_data = invitation.invitation_data or {}
        role = invitation_data.get('role', 'user')
        first_name = invitation_data.get('first_name', '')
        last_name = invitation_data.get('last_name', '')
        
        return Response({
            'valid': True,
            'email': invitation.email,
            'first_name': first_name,
            'last_name': last_name,
            'role': role,
            'role_display': dict([('admin', 'Administrator'), ('user', 'User'), ('driver', 'Driver')])[role],
            'tenant_name': invitation.tenant.name,
            'company_name': invitation.company.name,
            'expires_at': invitation.expires_at.isoformat()
        }, status=status.HTTP_200_OK)
        
    except InvitationToken.DoesNotExist:
        return Response(
            {'error': 'Invalid invitation token'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error validating invitation: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])  # Public endpoint
def accept_invitation(request, token):
    """
    Accept an invitation and create the user account
    """
    try:
        invitation = InvitationToken.objects.get(token=token)
        
        if not invitation.is_valid():
            if invitation.is_expired():
                return Response(
                    {'error': 'This invitation has expired'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                return Response(
                    {'error': 'This invitation has already been used'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Get required fields from request
        data = request.data
        required_fields = ['username', 'password', 'first_name', 'last_name']
        for field in required_fields:
            if not data.get(field):
                return Response(
                    {'error': f'{field} is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Check if user already exists (shouldn't happen, but safety check)
        if User.objects.filter(email=invitation.email).exists():
            return Response(
                {'error': 'User with this email already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if username is already taken
        if User.objects.filter(username=data['username']).exists():
            return Response(
                {'error': 'Username is already taken. Please choose a different username.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the user
        new_user = User.objects.create_user(
            username=data['username'],
            email=invitation.email,
            first_name=data['first_name'],
            last_name=data['last_name'],
            password=data['password'],
            is_active=True
        )
        
        # Extract invitation data
        invitation_data = invitation.invitation_data or {}
        role = invitation_data.get('role', 'user')  # Default to user if not specified
        company_ids = invitation_data.get('company_ids', [invitation.company.id])
        driver_id = invitation_data.get('driver_id')
        create_new_driver = invitation_data.get('create_new_driver', False)
        
        # Get driver data from either request payload (form submission) or invitation data
        driver_data = data.get('driver_data', invitation_data.get('driver_data', {}))
        
        # Set up user profile with role
        profile = new_user.profile
        profile.tenant = invitation.tenant
        profile.role = role
        profile.save()
        
        # Add user to specified companies
        companies = Company.objects.filter(id__in=company_ids, tenant=invitation.tenant)
        profile.companies.set(companies)
        
        driver_created = False
        driver_linked = False
        
        # Handle driver account creation or linking
        if role == 'driver':
            if driver_id:
                # Option 1: Link to existing driver record
                try:
                    driver = Driver.objects.get(id=driver_id, company__in=companies)
                    driver.user_account = new_user
                    driver.save()
                    driver_linked = True
                    logger.info(f"Linked user {new_user.email} to existing driver {driver.id}")
                except Driver.DoesNotExist:
                    logger.warning(f"Driver {driver_id} not found when accepting invitation for {invitation.email}")
                    # Don't fail the invitation, just log the warning
                    
            elif create_new_driver and driver_data:
                # Option 2: Create new driver record with provided data
                try:
                    driver_company = companies.get(id=driver_data.get('company_id'))
                    new_driver = Driver.objects.create(
                        first_name=new_user.first_name,
                        last_name=new_user.last_name,
                        phone=driver_data.get('phone'),
                        company=driver_company,
                        user_account=new_user,
                        # Optional fields with defaults  
                        hire_date=driver_data.get('date_hired') or timezone.now().date(),
                        cdl_number=driver_data.get('license_number', ''),
                        state=driver_data.get('license_state', ''),
                        cdl_expiration_date=driver_data.get('license_expiry'),
                        physical_date=driver_data.get('medical_cert_expiry'),
                        active=True,
                        employee_verification=False,
                        random_test_required_this_year=True
                    )
                    driver_created = True
                    logger.info(f"Created new driver record {new_driver.id} for user {new_user.email}")
                except Exception as e:
                    logger.error(f"Failed to create driver record for {new_user.email}: {str(e)}")
                    # Don't fail the invitation if driver creation fails, but log it
                    # The user account was still created successfully
                    
            elif driver_data:
                # Option 2.5: Create driver record with detailed data from AcceptInvitation form
                try:
                    # Use the first company as default, or company from invitation
                    default_company = companies.first() or invitation.company
                    
                    # Parse date fields safely
                    dob = None
                    if driver_data.get('dob'):
                        try:
                            dob = datetime.strptime(driver_data['dob'], '%Y-%m-%d').date()
                        except ValueError:
                            pass
                    
                    cdl_expiration_date = None
                    if driver_data.get('cdl_expiration_date'):
                        try:
                            cdl_expiration_date = datetime.strptime(driver_data['cdl_expiration_date'], '%Y-%m-%d').date()
                        except ValueError:
                            pass
                    
                    physical_date = None
                    if driver_data.get('physical_date'):
                        try:
                            physical_date = datetime.strptime(driver_data['physical_date'], '%Y-%m-%d').date()
                        except ValueError:
                            pass
                            
                    annual_vmr_date = None
                    if driver_data.get('annual_vmr_date'):
                        try:
                            annual_vmr_date = datetime.strptime(driver_data['annual_vmr_date'], '%Y-%m-%d').date()
                        except ValueError:
                            pass
                    
                    new_driver = Driver.objects.create(
                        first_name=new_user.first_name,
                        last_name=new_user.last_name,
                        phone=driver_data.get('phone', ''),
                        company=default_company,
                        user_account=new_user,
                        # Driver-specific fields from form
                        dob=dob,
                        ssn=driver_data.get('ssn', ''),
                        state=driver_data.get('state', ''),
                        cdl_number=driver_data.get('cdl_number', ''),
                        cdl_expiration_date=cdl_expiration_date,
                        physical_date=physical_date,
                        annual_vmr_date=annual_vmr_date,
                        # Defaults
                        hire_date=timezone.now().date(),
                        active=True,
                        employee_verification=False,
                        random_test_required_this_year=True
                    )
                    driver_created = True
                    logger.info(f"Created detailed driver record {new_driver.id} for user {new_user.email}")
                except Exception as e:
                    logger.error(f"Failed to create detailed driver record for {new_user.email}: {str(e)}")
                    # Don't fail the invitation if driver creation fails, but log it
                    
            else:
                # Option 3: AUTO-CREATE driver record (NEW FEATURE)
                # If no explicit driver linking/creation specified, auto-create a basic driver record
                try:
                    # Use the first company as default, or company from invitation
                    default_company = companies.first() or invitation.company
                    new_driver = Driver.objects.create(
                        first_name=new_user.first_name,
                        last_name=new_user.last_name,
                        company=default_company,
                        user_account=new_user,
                        # Use minimal defaults - can be updated later in driver management
                        phone='',  # Can be updated later
                        hire_date=timezone.now().date(),  # Set hire date to today
                        active=True,
                        employee_verification=False,
                        random_test_required_this_year=True,
                        cdl_number='',
                        state='',
                        ssn='',
                        dob=None
                    )
                    driver_created = True
                    logger.info(f"Auto-created driver record {new_driver.id} for user {new_user.email}")
                except Exception as e:
                    logger.error(f"Failed to auto-create driver record for {new_user.email}: {str(e)}")
                    # Don't fail the invitation if driver creation fails, but log it
                    # The user account was still created successfully
        
        # Mark invitation as used
        invitation.is_used = True
        invitation.used_at = timezone.now()
        invitation.save()
        
        return Response({
            'message': 'Account created successfully',
            'user': {
                'id': new_user.id,
                'username': new_user.username,
                'email': new_user.email,
                'first_name': new_user.first_name,
                'last_name': new_user.last_name,
                'role': role,
                'tenant': invitation.tenant.name,
                'companies': [{'id': c.id, 'name': c.name} for c in companies],
                'driver_linked': driver_linked,
                'driver_created': driver_created
            }
        }, status=status.HTTP_201_CREATED)
        
    except InvitationToken.DoesNotExist:
        return Response(
            {'error': 'Invalid invitation token'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error accepting invitation: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """
    Get or update user profile information
    """
    try:
        if request.method == 'GET':
            user = request.user
                
            return Response({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'date_joined': user.date_joined.isoformat(),
                'tenant': user.profile.tenant.name if hasattr(user, 'profile') and user.profile.tenant else None,
                'companies': [{'id': c.id, 'name': c.name, 'active': c.active} for c in user.profile.companies.all()] if hasattr(user, 'profile') else []
            }, status=status.HTTP_200_OK)
        
        elif request.method == 'PATCH':
            user = request.user
            data = request.data
            
            # Update basic user fields
            if 'first_name' in data:
                user.first_name = data['first_name']
            if 'last_name' in data:
                user.last_name = data['last_name']
            if 'email' in data:
                # Check if email is already taken by another user
                if User.objects.filter(email=data['email']).exclude(id=user.id).exists():
                    return Response(
                        {'email': ['Email is already in use by another user']}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                user.email = data['email']
            if 'username' in data:
                # Check if username is already taken by another user
                if User.objects.filter(username=data['username']).exclude(id=user.id).exists():
                    return Response(
                        {'username': ['Username is already taken']}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                user.username = data['username']
            
            user.save()
            

            
            return Response({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'date_joined': user.date_joined.isoformat(),
                'tenant': user.profile.tenant.name if hasattr(user, 'profile') and user.profile.tenant else None,
                'companies': [{'id': c.id, 'name': c.name, 'active': c.active} for c in user.profile.companies.all()] if hasattr(user, 'profile') else []
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        logger.error(f"Error in user profile endpoint: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ==================== TRIPS MANAGEMENT VIEWSETS ====================

class TripsManagementViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    """
    ViewSet for comprehensive trips management
    Users can create trips and assign drivers, trucks, and trailers
    """
    queryset = Trips.objects.all()
    serializer_class = TripsSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by user role
        user_role = self.request.user.profile.role
        
        if user_role == 'driver':
            # Drivers only see their own trips
            queryset = queryset.filter(driver__user_account=self.request.user)
        elif user_role in ['user', 'admin']:
            # Users and admins see trips for their companies
            user_companies = self.request.user.profile.companies.all()
            queryset = queryset.filter(company__in=user_companies)
        
        # Additional query parameter filters for admin/user roles
        if user_role in ['user', 'admin']:
            driver_id = self.request.query_params.get('driver_id', None)
            truck_id = self.request.query_params.get('truck_id', None)
            start_date = self.request.query_params.get('start_date', None)
            end_date = self.request.query_params.get('end_date', None)
            status = self.request.query_params.get('status', None)
            
            if driver_id:
                queryset = queryset.filter(driver_id=driver_id)
            
            if truck_id:
                queryset = queryset.filter(truck_id=truck_id)
                
            if start_date:
                queryset = queryset.filter(scheduled_start_date__date__gte=start_date)
                
            if end_date:
                queryset = queryset.filter(scheduled_start_date__date__lte=end_date)
                
            if status:
                queryset = queryset.filter(status=status)
        
        return queryset.order_by('-scheduled_start_date', '-start_time')
    
    def perform_create(self, serializer):
        # Auto-generate trip number if not provided
        if not serializer.validated_data.get('trip_number'):
            trip_count = Trips.objects.count() + 1
            trip_number = f"TRIP-{trip_count:06d}"
            serializer.validated_data['trip_number'] = trip_number
        
        # Set the company from the user's companies if not specified
        if not serializer.validated_data.get('company'):
            user_companies = self.request.user.profile.companies.first()
            if user_companies:
                serializer.validated_data['company'] = user_companies
        
        # Map frontend field names to model field names
        if serializer.validated_data.get('planned_departure'):
            from datetime import datetime, time
            planned_dep = serializer.validated_data.pop('planned_departure')
            # If it's a date string, convert to datetime with default time (8:00 AM)
            if isinstance(planned_dep, str):
                from django.utils.dateparse import parse_date
                date_obj = parse_date(planned_dep)
                if date_obj:
                    planned_dep = datetime.combine(date_obj, time(8, 0))  # 8:00 AM default
            serializer.validated_data['start_time'] = planned_dep
            serializer.validated_data['scheduled_start_date'] = planned_dep
        
        if serializer.validated_data.get('planned_arrival'):
            from datetime import datetime, time
            planned_arr = serializer.validated_data.pop('planned_arrival')
            # If it's a date string, convert to datetime with default time (6:00 PM)
            if isinstance(planned_arr, str):
                from django.utils.dateparse import parse_date
                date_obj = parse_date(planned_arr)
                if date_obj:
                    planned_arr = datetime.combine(date_obj, time(18, 0))  # 6:00 PM default
            serializer.validated_data['scheduled_end_date'] = planned_arr
        
        if serializer.validated_data.get('origin'):
            serializer.validated_data['start_location'] = serializer.validated_data.pop('origin')
        
        if serializer.validated_data.get('destination'):
            serializer.validated_data['end_location'] = serializer.validated_data.pop('destination')
        
        if serializer.validated_data.get('load_description'):
            # Store load_description in notes if notes is empty
            if not serializer.validated_data.get('notes'):
                serializer.validated_data['notes'] = serializer.validated_data.pop('load_description')
            else:
                load_desc = serializer.validated_data.pop('load_description')
                serializer.validated_data['notes'] = f"Load: {load_desc}\n{serializer.validated_data['notes']}"
        
        serializer.save(created_by=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_trip(request, trip_id):
    """
    Start a trip (driver can start if pre-trip inspection is completed)
    """
    try:
        trip = Trips.objects.get(id=trip_id)
        user_role = request.user.profile.role
        
        # Check permissions
        if user_role == 'driver':
            if trip.driver.user_account != request.user:
                return Response(
                    {'error': 'You can only start your own trips'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        elif user_role in ['user', 'admin']:
            user_companies = request.user.profile.companies.all()
            if trip.company not in user_companies:
                return Response(
                    {'error': 'Trip not in your company'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Check if trip can be started
        if not trip.can_start_trip():
            # Add detailed logging for debugging
            logger.error(f"Trip {trip_id} cannot be started. Debug info:")
            logger.error(f"  - Status: {trip.status}")
            logger.error(f"  - last_dvir_reviewed: {trip.last_dvir_reviewed}")
            logger.error(f"  - pre_trip_inspection_completed: {trip.pre_trip_inspection_completed}")
            if trip.truck and hasattr(trip.truck, 'operation_status'):
                truck_status = trip.truck.operation_status
                logger.error(f"  - truck operation status: {truck_status.current_status}")
                logger.error(f"  - truck can_operate(): {truck_status.can_operate()}")
            else:
                logger.error(f"  - truck operation status: NOT FOUND or no operation_status attribute")
            if trip.trailer and hasattr(trip.trailer, 'operation_status'):
                trailer_status = trip.trailer.operation_status
                logger.error(f"  - trailer operation status: {trailer_status.current_status}")
                logger.error(f"  - trailer can_operate(): {trailer_status.can_operate()}")
                logger.error(f"  - trailer clear_status_date: {trailer_status.clear_status_date}")
            else:
                logger.error(f"  - trailer operation status: NOT FOUND or no operation_status attribute")
            
            error_message = 'Trip cannot be started. '
            if trip.status != 'scheduled':
                error_message += f'Trip status is "{trip.status}" but must be "scheduled". '
            if not trip.last_dvir_reviewed:
                error_message += 'Driver must review last DVIR first. '
            if not trip.pre_trip_inspection_completed:
                error_message += 'Pre-trip inspection must be completed first. '
            if trip.truck and hasattr(trip.truck, 'operation_status') and trip.truck.operation_status.current_status == 'out_of_service':
                error_message += 'Truck is out of service. '
            if trip.trailer and hasattr(trip.trailer, 'operation_status') and not trip.trailer.operation_status.can_operate():
                error_message += 'Trailer cannot operate. '
            
            return Response(
                {'error': error_message}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Start the trip
        trip.status = 'in_progress'
        trip.actual_start_date = timezone.now()
        
        # Set mileage start if provided
        if 'mileage_start' in request.data:
            trip.mileage_start = request.data['mileage_start']
        
        trip.save()
        
        # Sync linked load status to in_transit
        if hasattr(trip, 'load') and trip.load and trip.load.status == 'dispatched':
            trip.load.status = 'in_transit'
            trip.load.save(update_fields=['status'])
            notify_load_status_change(trip.load, 'dispatched', 'in_transit', changed_by=request.user)

        notify_trip_started(trip, started_by=request.user)
        notify_customer_trip_started(trip)

        return Response({
            'message': 'Trip started successfully',
            'trip_id': trip.id,
            'status': trip.status,
            'actual_start_date': trip.actual_start_date
        }, status=status.HTTP_200_OK)
        
    except Trips.DoesNotExist:
        return Response(
            {'error': 'Trip not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error starting trip: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_trip(request, trip_id):
    """
    Complete a trip (driver can complete after delivery confirmed + post-trip inspection done)
    """
    try:
        trip = Trips.objects.get(id=trip_id)
        user_role = request.user.profile.role
        
        # Check permissions
        if user_role == 'driver':
            if trip.driver.user_account != request.user:
                return Response(
                    {'error': 'You can only complete your own trips'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        elif user_role in ['user', 'admin']:
            user_companies = request.user.profile.companies.all()
            if trip.company not in user_companies:
                return Response(
                    {'error': 'Trip not in your company'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Check if trip can be completed
        if not trip.can_complete_trip():
            error_message = 'Trip cannot be completed. '
            if trip.status != 'delivered':
                error_message += 'Delivery must be confirmed first. '
            if not trip.post_trip_inspection_completed:
                error_message += 'Post-trip inspection must be completed. '
            return Response(
                {'error': error_message}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Complete the trip
        trip.status = 'completed'
        trip.actual_end_date = timezone.now()
        
        # Set mileage end if provided
        if 'mileage_end' in request.data:
            trip.mileage_end = request.data['mileage_end']
            
        # Calculate miles driven if both start and end mileage are available
        if trip.mileage_start and trip.mileage_end:
            trip.miles_driven = trip.mileage_end - trip.mileage_start
        
        trip.save()

        notify_trip_completed(trip, completed_by=request.user)
        notify_customer_trip_completed(trip)

        return Response({
            'message': 'Trip completed successfully',
            'trip_id': trip.id,
            'status': trip.status,
            'actual_end_date': trip.actual_end_date,
            'total_miles': trip.get_total_miles()
        }, status=status.HTTP_200_OK)
        
    except Trips.DoesNotExist:
        return Response(
            {'error': 'Trip not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error completing trip: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_delivery(request, trip_id):
    """
    Driver confirms delivery at destination. Requires POD to be uploaded first.
    Transitions trip: in_progress → delivered, load: in_transit → delivered.
    """
    try:
        trip = Trips.objects.get(id=trip_id)
        user_role = request.user.profile.role

        # Check permissions
        if user_role == 'driver':
            if trip.driver.user_account != request.user:
                return Response(
                    {'error': 'You can only confirm delivery for your own trips'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif user_role in ['user', 'admin']:
            user_companies = request.user.profile.companies.all()
            if trip.company not in user_companies:
                return Response(
                    {'error': 'Trip not in your company'},
                    status=status.HTTP_403_FORBIDDEN
                )

        if trip.status != 'in_progress':
            return Response(
                {'error': 'Trip must be in progress to confirm delivery.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Require POD before confirming delivery
        if not trip.pod_uploaded:
            return Response(
                {'error': 'Proof of Delivery (POD) must be uploaded before confirming delivery.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Transition trip to delivered
        trip.status = 'delivered'
        trip.delivery_confirmed = True
        trip.delivery_confirmed_at = timezone.now()
        trip.save(update_fields=['status', 'delivery_confirmed', 'delivery_confirmed_at'])

        # Sync linked load status to delivered
        if hasattr(trip, 'load') and trip.load and trip.load.status == 'in_transit':
            trip.load.status = 'delivered'
            trip.load.save(update_fields=['status'])
            notify_load_status_change(trip.load, 'in_transit', 'delivered', changed_by=request.user)

        notify_trip_delivery_confirmed(trip, confirmed_by=request.user)

        return Response({
            'message': 'Delivery confirmed successfully',
            'trip_id': trip.id,
            'status': trip.status,
            'delivery_confirmed_at': trip.delivery_confirmed_at,
        }, status=status.HTTP_200_OK)

    except Trips.DoesNotExist:
        return Response({'error': 'Trip not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error confirming delivery: {str(e)}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def report_breakdown(request, trip_id):
    """
    Driver reports a breakdown mid-trip. Transitions trip to 'breakdown' status
    and notifies dispatch.
    """
    try:
        trip = Trips.objects.get(id=trip_id)

        # Only the assigned driver can report a breakdown
        if request.user.profile.role == 'driver':
            if trip.driver.user_account != request.user:
                return Response(
                    {'error': 'You can only report breakdowns for your own trips'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif request.user.profile.role in ['user', 'admin']:
            user_companies = request.user.profile.companies.all()
            if trip.company not in user_companies:
                return Response(
                    {'error': 'Trip not in your company'},
                    status=status.HTTP_403_FORBIDDEN
                )

        if trip.status != 'in_progress':
            return Response(
                {'error': 'Breakdown can only be reported for in-progress trips.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        description = request.data.get('description', '')
        location = request.data.get('location', '')

        if not description:
            return Response(
                {'error': 'Please describe the issue.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        trip.status = 'breakdown'
        trip.breakdown_reported = True
        trip.breakdown_reported_at = timezone.now()
        trip.breakdown_description = description
        trip.breakdown_location = location
        trip.save(update_fields=[
            'status', 'breakdown_reported', 'breakdown_reported_at',
            'breakdown_description', 'breakdown_location',
        ])

        # Notify dispatch / company users
        notify_trip_breakdown(trip, reported_by=request.user)

        return Response({
            'message': 'Breakdown reported. Dispatch has been notified.',
            'trip_id': trip.id,
            'status': trip.status,
            'breakdown_reported_at': trip.breakdown_reported_at,
        }, status=status.HTTP_200_OK)

    except Trips.DoesNotExist:
        return Response({'error': 'Trip not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error reporting breakdown: {str(e)}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def driver_active_trips(request):
    """
    Get active trips for the logged-in driver
    """
    try:
        # Check if user is a driver
        if request.user.profile.role != 'driver':
            return Response(
                {'error': 'This endpoint is only for drivers'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get driver's active trips (including failed inspections and breakdowns that need attention)
        active_trips = Trips.objects.filter(
            driver__user_account=request.user,
            status__in=['scheduled', 'in_progress', 'delivered', 'breakdown', 'failed_inspection']
        ).order_by('-scheduled_start_date', '-start_time')
        
        serializer = TripsSerializer(active_trips, many=True)
        return Response({
            'trips': serializer.data,
            'count': active_trips.count()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching driver active trips: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def driver_upload_pod(request, trip_id):
    """
    Allow drivers to upload Proof of Delivery (signed BOL photo) for their trips.
    Also supports uploading other trip-related documents.
    """
    try:
        if not hasattr(request.user, 'profile'):
            return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)
        
        # Drivers can only upload for their own trips; admins/users for any company trip
        if request.user.profile.role == 'driver':
            try:
                trip = Trips.objects.get(id=trip_id, driver__user_account=request.user)
            except Trips.DoesNotExist:
                return Response({'error': 'Trip not found or not assigned to you'}, status=status.HTTP_404_NOT_FOUND)
        else:
            user_companies = request.user.profile.companies.all()
            try:
                trip = Trips.objects.get(id=trip_id, company__in=user_companies)
            except Trips.DoesNotExist:
                return Response({'error': 'Trip not found'}, status=status.HTTP_404_NOT_FOUND)
        
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file size (10MB max)
        if file.size > 10 * 1024 * 1024:
            return Response({'error': 'File size exceeds 10MB limit'}, status=status.HTTP_400_BAD_REQUEST)
        
        document_type = request.data.get('document_type', 'pod')
        valid_types = [choice[0] for choice in TripDocument.DOCUMENT_TYPE_CHOICES]
        if document_type not in valid_types:
            return Response({'error': f'Invalid document type. Must be one of: {", ".join(valid_types)}'}, status=status.HTTP_400_BAD_REQUEST)
        
        description = request.data.get('description', '')
        
        doc = TripDocument.objects.create(
            trip=trip,
            document_type=document_type,
            file=file,
            description=description,
            uploaded_by=request.user,
        )
        
        # If it's a POD, also create on the linked load if one exists
        if document_type == 'pod':
            # Mark POD as uploaded on the trip
            if not trip.pod_uploaded:
                trip.pod_uploaded = True
                trip.save(update_fields=['pod_uploaded'])
            
            if hasattr(trip, 'load') and trip.load:
                LoadDocument.objects.create(
                    load=trip.load,
                    document_type='pod',
                    file=file,
                    file_name=file.name,
                    file_size=file.size,
                    description=description or f"POD uploaded by driver - Trip {trip.trip_number}",
                    uploaded_by=request.user,
                )
        
        serializer = TripDocumentSerializer(doc)
        return Response({
            'message': f'{doc.get_document_type_display()} uploaded successfully',
            'document': serializer.data,
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error uploading document for trip {trip_id}: {str(e)}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_document(request, document_source, document_id):
    """
    Generate a presigned S3 URL for downloading a trip or load document.
    document_source: 'trip' or 'load'
    """
    try:
        if not hasattr(request.user, 'profile'):
            return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)

        user_companies = request.user.profile.companies.all()

        if document_source == 'trip':
            try:
                doc = TripDocument.objects.get(id=document_id, trip__company__in=user_companies)
            except TripDocument.DoesNotExist:
                return Response({'error': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)
        elif document_source == 'load':
            try:
                doc = LoadDocument.objects.get(id=document_id, load__company__in=user_companies)
            except LoadDocument.DoesNotExist:
                return Response({'error': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'error': 'Invalid document source'}, status=status.HTTP_400_BAD_REQUEST)

        if not doc.file:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)

        # Generate presigned URL using boto3
        try:
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )

            presigned_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': settings.AWS_STORAGE_BUCKET_NAME, 'Key': doc.file.name},
                ExpiresIn=3600
            )

            return Response({
                'download_url': presigned_url,
                'filename': doc.file.name.split('/')[-1],
                'expires_in': 3600
            }, status=status.HTTP_200_OK)
        except Exception as url_error:
            logger.error(f"Error generating presigned URL for document {document_id}: {str(url_error)}")
            return Response({'error': 'Could not generate download URL'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.error(f"Error downloading document {document_source}/{document_id}: {str(e)}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sign_document(request, document_id, document_source):
    """
    E-sign a document (rate confirmation, BOL, etc.)
    document_source: 'trip' or 'load'
    """
    try:
        if not hasattr(request.user, 'profile'):
            return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)
        
        user_companies = request.user.profile.companies.all()
        signer_name = request.data.get('signer_name', request.user.get_full_name())
        signature_data = request.data.get('signature_data', '')
        
        if not signer_name:
            return Response({'error': 'Signer name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if document_source == 'trip':
            try:
                doc = TripDocument.objects.get(id=document_id, trip__company__in=user_companies)
            except TripDocument.DoesNotExist:
                return Response({'error': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)
        elif document_source == 'load':
            try:
                doc = LoadDocument.objects.get(id=document_id, load__company__in=user_companies)
            except LoadDocument.DoesNotExist:
                return Response({'error': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'error': 'Invalid document source'}, status=status.HTTP_400_BAD_REQUEST)
        
        doc.is_signed = True
        doc.signed_by_name = signer_name
        doc.signed_at = timezone.now()
        doc.signature_data = signature_data
        doc.save()
        
        return Response({
            'message': 'Document signed successfully',
            'signed_by': signer_name,
            'signed_at': doc.signed_at.isoformat(),
        })
        
    except Exception as e:
        logger.error(f"Error signing document {document_id}: {str(e)}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def driver_update_dvir_review(request, trip_id):
    """
    Allow drivers to update DVIR review status for their assigned trips
    """
    try:
        # Check if user is a driver
        if request.user.profile.role != 'driver':
            return Response(
                {'error': 'This endpoint is only for drivers'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the trip and verify it belongs to this driver
        try:
            trip = Trips.objects.get(id=trip_id, driver__user_account=request.user)
        except Trips.DoesNotExist:
            return Response(
                {'error': 'Trip not found or not assigned to you'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update DVIR review fields
        trip.last_dvir_reviewed = request.data.get('last_dvir_reviewed', False)
        if request.data.get('last_dvir_reviewed_at'):
            trip.last_dvir_reviewed_at = request.data.get('last_dvir_reviewed_at')
        if request.data.get('last_dvir_acknowledgment'):
            trip.last_dvir_acknowledgment = request.data.get('last_dvir_acknowledgment')
        
        trip.save()
        
        return Response({
            'message': 'DVIR review updated successfully',
            'trip_id': trip.id,
            'last_dvir_reviewed': trip.last_dvir_reviewed
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error updating DVIR review: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_trip(request, trip_id):
    """
    Cancel a trip that is scheduled or in progress
    """
    try:
        # Check if user has admin/user role
        if request.user.profile.role not in ['admin', 'user']:
            return Response(
                {'error': 'Only admin and user roles can cancel trips'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the trip
        try:
            trip = Trips.objects.get(id=trip_id)
        except Trips.DoesNotExist:
            return Response(
                {'error': 'Trip not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verify trip can be cancelled
        if trip.status not in ['scheduled', 'in_progress', 'failed_inspection']:
            return Response(
                {'error': f'Cannot cancel trip with status: {trip.status}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get cancellation reason
        cancellation_reason = request.data.get('reason', 'Trip cancelled')
        
        if not cancellation_reason or cancellation_reason.strip() == '':
            return Response(
                {'error': 'Cancellation reason is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cancel the trip
        trip.cancel_trip(request.user, cancellation_reason)
        
        # Unlink and revert linked load to booked
        if hasattr(trip, 'load') and trip.load:
            load = trip.load
            load.trip = None
            load.status = 'booked'
            load.save(update_fields=['trip', 'status'])
        
        return Response({
            'message': 'Trip cancelled successfully',
            'cancelled_trip_id': trip.id,
            'trip_number': trip.trip_number
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error cancelling trip: {str(e)}")
        return Response(
            {'error': 'An error occurred while cancelling the trip'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_and_reassign_trip(request, trip_id):
    """
    Cancel a maintenance-held trip and optionally create a new trip with different truck
    """
    try:
        # Check if user has admin/user role
        if request.user.profile.role not in ['admin', 'user']:
            return Response(
                {'error': 'Only admin and user roles can cancel trips'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the trip
        try:
            trip = Trips.objects.get(id=trip_id)
        except Trips.DoesNotExist:
            return Response(
                {'error': 'Trip not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verify trip is in maintenance_hold status
        if trip.status != 'maintenance_hold':
            return Response(
                {'error': 'Can only cancel trips that are on maintenance hold'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get request data
        cancellation_reason = request.data.get('reason', 'Cancelled due to maintenance delays')
        create_new_trip = request.data.get('create_new_trip', False)
        new_truck_id = request.data.get('new_truck_id', None)
        
        # Cancel the original trip
        trip.cancel_trip(request.user, cancellation_reason)
        
        response_data = {
            'message': 'Trip cancelled successfully',
            'cancelled_trip_id': trip.id,
            'new_trip_id': None
        }
        
        # Create new trip if requested
        if create_new_trip and new_truck_id:
            try:
                new_truck = Truck.objects.get(id=new_truck_id)
                
                # Check if new truck can accept trips
                if not new_truck.can_accept_new_trips():
                    return Response(
                        {'error': f'Truck {new_truck.unit_number} is not available for new trips'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Create new trip with same details but different truck
                new_trip = Trips.objects.create(
                    company=trip.company,
                    driver=trip.driver,
                    truck=new_truck,
                    trailer=trip.trailer,  # Keep same trailer if compatible
                    origin=trip.origin,
                    destination=trip.destination,
                    scheduled_start_date=trip.scheduled_start_date,
                    scheduled_end_date=trip.scheduled_end_date,
                    start_time=trip.start_time,
                    notes=f"Reassigned from trip #{trip.trip_number} due to maintenance",
                    created_by=request.user
                )
                
                response_data['new_trip_id'] = new_trip.id
                response_data['message'] = f'Trip cancelled and reassigned to truck {new_truck.unit_number}'
                
            except Truck.DoesNotExist:
                return Response(
                    {'error': 'New truck not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error cancelling and reassigning trip: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_trucks(request):
    """
    Get list of trucks available for new trip assignments
    """
    try:
        # Check if user has admin/user role
        if request.user.profile.role not in ['admin', 'user']:
            return Response(
                {'error': 'Only admin and user roles can access this endpoint'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get user's companies
        user_companies = request.user.profile.companies.all()
        
        # Get all active trucks from user's companies
        trucks = Truck.objects.filter(company__in=user_companies, active=True)
        
        # Filter to only trucks that can accept new trips
        available_trucks = []
        for truck in trucks:
            if truck.can_accept_new_trips():
                available_trucks.append({
                    'id': truck.id,
                    'unit_number': truck.unit_number,
                    'license_plate': truck.license_plate,
                    'make': truck.make,
                    'model': truck.model,
                    'company_name': truck.company.name
                })
        
        return Response({
            'available_trucks': available_trucks,
            'count': len(available_trucks)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching available trucks: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class TripInspectionViewSet(DriverReadOnlyMixin, CompanyFilterMixin, ModelViewSet):
    """
    ViewSet for simplified CFR 396.11 trip inspections (pre-trip and post-trip)
    Focuses on 11 required inspection items with pass/fail validation
    """
    serializer_class = InspectionSerializer
    permission_classes = [IsAuthenticated]
    queryset = Inspection.objects.filter(trip__isnull=False)
    
    def get_queryset(self):
        # Get company-filtered queryset first (tenant isolation)
        queryset = super().get_queryset()
        
        user_role = self.request.user.profile.role
        
        if user_role == 'driver':
            # For DVIR review purposes (CFR 396.13), drivers need to see last post-trip inspection
            # for any vehicle they're about to operate, but only within their company/tenant
            truck_param = self.request.query_params.get('truck', None)
            inspection_type_param = self.request.query_params.get('inspection_type', None)
            
            if truck_param and inspection_type_param == 'post_trip':
                # Allow drivers to see last DVIR for vehicle within their assigned companies
                user_companies = self.request.user.profile.companies.all()
                queryset = queryset.filter(
                    truck=truck_param,
                    company__in=user_companies
                )
            else:
                # For all other cases, drivers only see inspections for their trips
                queryset = queryset.filter(
                    trip__driver__user_account=self.request.user
                )
        # For user/admin roles, CompanyFilterMixin already handles company filtering
        
        # Filter by specific trip if requested
        trip_id = self.request.query_params.get('trip', None)
        if trip_id:
            queryset = queryset.filter(trip_id=trip_id)
        
        # Filter by truck (direct FK on Inspection)
        truck_param = self.request.query_params.get('truck', None)
        if truck_param and user_role != 'driver':  # Driver case handled above
            queryset = queryset.filter(truck=truck_param)
        
        # Filter by trailer (direct FK on Inspection)
        trailer_param = self.request.query_params.get('trailer', None)
        if trailer_param:
            queryset = queryset.filter(trailer=trailer_param)
        
        # Filter by inspection type
        inspection_type_param = self.request.query_params.get('inspection_type', None)
        if inspection_type_param:
            queryset = queryset.filter(inspection_type=inspection_type_param)
        
        # Ordering support (default: -completed_at)
        ordering = self.request.query_params.get('ordering', '-completed_at')
        if ordering in ('completed_at', '-completed_at'):
            queryset = queryset.order_by(ordering)
        
        # Limit support
        limit = self.request.query_params.get('limit', None)
        if limit:
            try:
                queryset = queryset[:int(limit)]
            except (ValueError, TypeError):
                pass
        
        return queryset
    
    def perform_create(self, serializer):
        trip = serializer.validated_data['trip']
        inspection_type = serializer.validated_data['inspection_type']
        
        serializer.save(completed_by=self.request.user)
        
        # Update trip inspection flags
        if inspection_type == 'pre_trip':
            trip.pre_trip_inspection_completed = True
        elif inspection_type == 'post_trip':
            trip.post_trip_inspection_completed = True
        
        trip.save()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_inspection(request, trip_id, inspection_type):
    """
    Submit a simplified CFR 396.11 trip inspection (pre-trip or post-trip)
    Focuses on 11 required inspection items only - no photos, comments, or additional complexity
    """
    try:
        # Ensure user has profile and companies
        if not hasattr(request.user, 'profile') or not request.user.profile.companies.exists():
            return Response({"detail": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
        
        # Get trip with tenant filtering
        user_companies = request.user.profile.companies.all()
        user_role = request.user.profile.role
        
        if user_role == 'driver':
            # Drivers can only inspect their own trips
            trip = Trips.objects.get(
                id=trip_id,
                driver__user_account=request.user,
                company__in=user_companies
            )
        else:
            # Admin/managers can inspect trips in their companies
            trip = Trips.objects.get(
                id=trip_id,
                company__in=user_companies
            )
        
        # Validate inspection type
        if inspection_type not in ['pre_trip', 'post_trip']:
            return Response(
                {'error': 'Invalid inspection type'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if inspection already exists
        if Inspection.objects.filter(trip=trip, inspection_type=inspection_type).exists():
            return Response(
                {'error': f'{inspection_type.replace("_", "-").title()} inspection already completed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create CFR 396.11 inspection (simplified - no photo uploads)
        inspection_data = request.data.copy()
        inspection_data['trip'] = trip.id
        inspection_data['inspection_type'] = inspection_type
        
        # Log the data being submitted for debugging
        logger.info(f"Submitting inspection data: {inspection_data}")
        
        serializer = InspectionSerializer(data=inspection_data)
        if serializer.is_valid():
            # Create inspection with trip context
            inspection = serializer.save(
                completed_by=request.user,
                truck=trip.truck,
                trailer=trip.trailer,
                driver=trip.driver,
                company=trip.company
            )
            
            # Update vehicle operation status now that we have completed_by user
            try:
                inspection._update_vehicle_operation_status()
                logger.info(f"Updated vehicle operation status for inspection {inspection.inspection_id}")
            except Exception as status_error:
                logger.error(f"Error updating vehicle operation status: {str(status_error)}")
                # Don't fail the entire inspection if status update fails
                pass
            
            # Reload trip to get any status updates from Inspection.save()
            try:
                trip.refresh_from_db()
            except Exception as refresh_error:
                logger.error(f"Error refreshing trip from db: {str(refresh_error)}")
                pass
            
            # Update trip inspection flags
            try:
                if inspection_type == 'pre_trip':
                    trip.pre_trip_inspection_completed = True
                    # Only update the completion flag, not the status (which may have been set to failed_inspection)
                    trip.save(update_fields=['pre_trip_inspection_completed'])
                    logger.info(f"Trip {trip_id} pre_trip_inspection_completed set to True")
                elif inspection_type == 'post_trip':
                    trip.post_trip_inspection_completed = True
                    trip.save(update_fields=['post_trip_inspection_completed'])
                    logger.info(f"Trip {trip_id} post_trip_inspection_completed set to True")
            except Exception as trip_update_error:
                logger.error(f"Error updating trip inspection flags: {str(trip_update_error)}")
                # Don't fail if trip update fails
                pass
            
            # Notify dispatch if pre-trip inspection failed
            if inspection_type == 'pre_trip' and not inspection.is_passed():
                try:
                    trip.refresh_from_db()
                    notify_inspection_failed(trip, inspection=inspection)
                except Exception as notify_error:
                    logger.error(f"Error notifying inspection failure: {str(notify_error)}")
            
            return Response({
                'message': f'CFR 396.11 {inspection_type.replace("_", "-").title()} inspection completed',
                'inspection_id': inspection.inspection_id,
                'inspection_passed': inspection.is_passed(),
                'cfr_compliance': 'CFR 396.11 Driver Vehicle Inspection Requirements'
            }, status=status.HTTP_201_CREATED)
        else:
            # Log detailed validation errors for debugging
            logger.error(f"Inspection serializer validation failed for trip {trip_id}:")
            for field, errors in serializer.errors.items():
                logger.error(f"  {field}: {errors}")
            
            return Response({
                'error': 'Validation failed', 
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except Trips.DoesNotExist:
        return Response(
            {'error': 'Trip not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error submitting inspection: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# Password Reset Views
@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """
    Send password reset email to user
    """
    try:
        email = request.data.get('email', '').strip().lower()
        
        if not email:
            return Response(
                {'error': 'Email is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user exists
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # For security reasons, don't reveal if email exists or not
            return Response(
                {'message': 'If an account with this email exists, a password reset link has been sent.'}, 
                status=status.HTTP_200_OK
            )
        
        # Check rate limiting (max 3 requests per hour per user)
        one_hour_ago = timezone.now() - timedelta(hours=1)
        recent_tokens = PasswordResetToken.objects.filter(
            user=user, 
            created_at__gte=one_hour_ago
        ).count()
        
        if recent_tokens >= 3:
            return Response(
                {'error': 'Too many password reset requests. Please try again later.'}, 
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # Create password reset token
        reset_token = PasswordResetToken.objects.create(user=user)
        
        # Create reset URL
        reset_url = f"{request.scheme}://{request.get_host()}/reset-password/{reset_token.token}"
        
        # Send email (you'll need to configure email settings)
        try:
            subject = 'Password Reset Request - Fleetly'
            message = f"""
Hello {user.first_name or user.username},

You requested a password reset for your Fleetly account. Click the link below to reset your password:

{reset_url}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email.

Best regards,
The Fleetly Team
            """
            
            # Send email asynchronously via Celery
            send_password_reset_email_task.delay(
                user.email,
                subject,
                message,
            )
            
            logger.info(f"Password reset email sent to {user.email}")
            
        except Exception as e:
            logger.error(f"Failed to send password reset email to {user.email}: {str(e)}")
            return Response(
                {'error': 'Failed to send reset email. Please try again later.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response(
            {'message': 'If an account with this email exists, a password reset link has been sent.'}, 
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Error in forgot password: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def validate_reset_token(request, token):
    """
    Validate a password reset token
    """
    try:
        reset_token = PasswordResetToken.objects.get(token=token)
        
        if not reset_token.is_valid():
            if reset_token.is_expired():
                return Response(
                    {'error': 'Reset token has expired'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            else:
                return Response(
                    {'error': 'Reset token has already been used'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        return Response(
            {'valid': True, 'email': reset_token.user.email}, 
            status=status.HTTP_200_OK
        )
        
    except PasswordResetToken.DoesNotExist:
        return Response(
            {'error': 'Invalid reset token'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error validating reset token: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request, token):
    """
    Reset user password using a valid token
    """
    try:
        reset_token = PasswordResetToken.objects.get(token=token)
        
        if not reset_token.is_valid():
            if reset_token.is_expired():
                return Response(
                    {'error': 'Reset token has expired'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            else:
                return Response(
                    {'error': 'Reset token has already been used'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Get new password from request
        new_password = request.data.get('password', '').strip()
        
        if not new_password:
            return Response(
                {'error': 'Password is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(new_password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters long'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update user password
        user = reset_token.user
        user.set_password(new_password)
        user.save()
        
        # Mark token as used
        reset_token.used = True
        reset_token.save()
        
        logger.info(f"Password successfully reset for user {user.email}")
        
        return Response(
            {'message': 'Password reset successfully'}, 
            status=status.HTTP_200_OK
        )
        
    except PasswordResetToken.DoesNotExist:
        return Response(
            {'error': 'Invalid reset token'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error resetting password: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# CFR Compliance ViewSets


class AnnualInspectionViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    """
    CFR 396.17 - Annual vehicle inspection tracking
    """
    serializer_class = AnnualInspectionSerializer
    
    def get_queryset(self):
        user_companies = self.request.user.profile.companies.all()
        return AnnualInspection.objects.filter(
            Q(truck__company__in=user_companies) | Q(trailer__company__in=user_companies)
        ).order_by('-inspection_date')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class VehicleOperationStatusViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    """
    CFR 396.7 - Vehicle operation status tracking
    """
    serializer_class = VehicleOperationStatusSerializer
    
    def get_queryset(self):
        user_companies = self.request.user.profile.companies.all()
        return VehicleOperationStatus.objects.filter(
            Q(truck__company__in=user_companies) | Q(trailer__company__in=user_companies)
        ).order_by('-status_set_at')

    def perform_update(self, serializer):
        old_status = serializer.instance.current_status
        instance = serializer.save()
        if old_status != instance.current_status:
            notify_vehicle_status_change(instance, old_status=old_status)

    def perform_create(self, serializer):
        instance = serializer.save()
        if instance.current_status in ('prohibited', 'out_of_service'):
            notify_vehicle_status_change(instance, old_status=None)


# ==================== TMS - CUSTOMER & LOAD MANAGEMENT ====================

class CustomerViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    """
    Manage external customers/shippers.
    """
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        # Search filter
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(contact_name__icontains=search) |
                Q(email__icontains=search)
            )
        active = self.request.query_params.get('active', None)
        if active is not None:
            queryset = queryset.filter(active=active.lower() == 'true')
        return queryset


class CarrierViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    """
    Manage external carriers for broker mode operations.
    """
    queryset = Carrier.objects.all()
    serializer_class = CarrierSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(mc_number__icontains=search) |
                Q(dot_number__icontains=search) |
                Q(contact_name__icontains=search) |
                Q(email__icontains=search) |
                Q(city__icontains=search) |
                Q(state__icontains=search)
            )
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        hazmat = self.request.query_params.get('hazmat', None)
        if hazmat is not None:
            queryset = queryset.filter(hazmat_certified=hazmat.lower() == 'true')
        return queryset


class LoadViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    """
    Manage freight loads - the core TMS business object.
    """
    queryset = Load.objects.select_related('customer', 'company', 'carrier', 'trip', 'trip__driver', 'created_by').all()
    serializer_class = LoadSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filters
        status_filter = self.request.query_params.get('status', None)
        customer_id = self.request.query_params.get('customer_id', None)
        search = self.request.query_params.get('search', None)
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        if search:
            queryset = queryset.filter(
                Q(load_number__icontains=search) |
                Q(customer__name__icontains=search) |
                Q(customer_reference__icontains=search) |
                Q(bol_number__icontains=search) |
                Q(commodity__icontains=search) |
                Q(pickup_city__icontains=search) |
                Q(delivery_city__icontains=search)
            )
        if start_date:
            queryset = queryset.filter(pickup_date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(pickup_date__date__lte=end_date)

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        # Auto-generate load number
        if not serializer.validated_data.get('load_number'):
            load_count = Load.objects.count() + 1
            load_number = f"LD-{load_count:06d}"
            # Ensure uniqueness
            while Load.objects.filter(load_number=load_number).exists():
                load_count += 1
                load_number = f"LD-{load_count:06d}"
            serializer.validated_data['load_number'] = load_number

        # Set company from user if not specified
        if not serializer.validated_data.get('company'):
            user_company = self.request.user.profile.companies.first()
            if user_company:
                serializer.validated_data['company'] = user_company

        # Calculate total revenue if customer_rate is set
        customer_rate = serializer.validated_data.get('customer_rate')
        fuel_surcharge = serializer.validated_data.get('fuel_surcharge', 0) or 0
        accessorial_charges = serializer.validated_data.get('accessorial_charges', 0) or 0
        if customer_rate:
            serializer.validated_data['total_revenue'] = customer_rate + fuel_surcharge + accessorial_charges

        serializer.save(created_by=self.request.user)

        # Create tracking event for load creation
        load = serializer.instance
        create_tracking_event(
            load=load,
            event_type='created',
            description=f'Load {load.load_number} created',
            user=self.request.user,
        )

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        instance = serializer.save()
        # Recalculate total revenue
        customer_rate = instance.customer_rate or 0
        fuel_surcharge = instance.fuel_surcharge or 0
        accessorial_charges = instance.accessorial_charges or 0
        if customer_rate:
            instance.total_revenue = customer_rate + fuel_surcharge + accessorial_charges
            instance.save(update_fields=['total_revenue'])

        # Create tracking event if status changed
        if old_status != instance.status:
            status_event_map = {
                'booked': 'booked',
                'in_transit': 'in_transit',
                'delivered': 'delivered',
                'invoiced': 'invoiced',
                'paid': 'paid',
                'cancelled': 'cancelled',
            }
            event_type = status_event_map.get(instance.status)
            if event_type:
                create_tracking_event(
                    load=instance,
                    event_type=event_type,
                    description=f'Status changed to {instance.get_status_display()}',
                    user=self.request.user,
                )
            notify_load_status_change(instance, old_status, instance.status, changed_by=self.request.user)


class InvoiceViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    """
    Manage invoices for delivered loads.
    """
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)
        customer_id = self.request.query_params.get('customer_id', None)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(invoice_number__icontains=search) |
                Q(customer__name__icontains=search) |
                Q(notes__icontains=search)
            )
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        if start_date:
            queryset = queryset.filter(issue_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(issue_date__lte=end_date)
        overdue = self.request.query_params.get('overdue', None)
        if overdue and overdue.lower() == 'true':
            from django.utils import timezone as tz
            queryset = queryset.filter(
                due_date__lt=tz.now().date(),
                status__in=['sent', 'partial']
            )
        return queryset

    def perform_create(self, serializer):
        inv_count = Invoice.objects.count() + 1
        invoice_number = f"INV-{inv_count:06d}"
        while Invoice.objects.filter(invoice_number=invoice_number).exists():
            inv_count += 1
            invoice_number = f"INV-{inv_count:06d}"
        serializer.validated_data['invoice_number'] = invoice_number

        if not serializer.validated_data.get('company'):
            user_company = self.request.user.profile.companies.first()
            if user_company:
                serializer.validated_data['company'] = user_company

        invoice = serializer.save(created_by=self.request.user)

        load_ids = self.request.data.get('load_ids', [])
        if load_ids:
            loads = Load.objects.filter(id__in=load_ids, customer=invoice.customer)
            loads.update(invoice=invoice, status='invoiced')
            invoice.calculate_totals()
            invoice.save()

    def perform_update(self, serializer):
        invoice = serializer.save()
        invoice.calculate_totals()
        invoice.save()


class InvoicePaymentViewSet(UserOrAboveMixin, ModelViewSet):
    """
    Record payments against invoices.
    """
    queryset = InvoicePayment.objects.all()
    serializer_class = InvoicePaymentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        invoice_id = self.request.query_params.get('invoice_id', None)
        if invoice_id:
            queryset = queryset.filter(invoice_id=invoice_id)
        if hasattr(self.request.user, 'profile'):
            user_companies = self.request.user.profile.companies.all()
            queryset = queryset.filter(invoice__company__in=user_companies)
        else:
            queryset = queryset.none()
        return queryset

    def perform_create(self, serializer):
        payment = serializer.save(created_by=self.request.user)
        invoice = payment.invoice
        invoice.amount_paid = sum(p.amount for p in invoice.payments.all())
        invoice.balance_due = invoice.total_amount - invoice.amount_paid
        if invoice.balance_due <= 0:
            invoice.status = 'paid'
            invoice.loads.update(status='paid')
        elif invoice.amount_paid > 0:
            invoice.status = 'partial'
        invoice.save()


class RateLaneViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    queryset = RateLane.objects.all()
    serializer_class = RateLaneSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search', None)
        equipment_type = self.request.query_params.get('equipment_type', None)
        customer_id = self.request.query_params.get('customer_id', None)
        active_only = self.request.query_params.get('active', None)

        if search:
            queryset = queryset.filter(
                Q(origin_city__icontains=search) |
                Q(origin_state__icontains=search) |
                Q(destination_city__icontains=search) |
                Q(destination_state__icontains=search) |
                Q(customer__name__icontains=search) |
                Q(notes__icontains=search)
            )
        if equipment_type:
            queryset = queryset.filter(equipment_type=equipment_type)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        if active_only == 'true':
            queryset = queryset.filter(active=True)

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        if not serializer.validated_data.get('company'):
            user_company = self.request.user.profile.companies.first()
            if user_company:
                serializer.validated_data['company'] = user_company
        serializer.save()


class AccessorialChargeViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    queryset = AccessorialCharge.objects.all()
    serializer_class = AccessorialChargeSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search', None)
        active_only = self.request.query_params.get('active', None)

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(code__icontains=search) |
                Q(description__icontains=search)
            )
        if active_only == 'true':
            queryset = queryset.filter(active=True)
        return queryset

    def perform_create(self, serializer):
        if not serializer.validated_data.get('company'):
            user_company = self.request.user.profile.companies.first()
            if user_company:
                serializer.validated_data['company'] = user_company
        serializer.save()


class FuelSurchargeScheduleViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    queryset = FuelSurchargeSchedule.objects.all()
    serializer_class = FuelSurchargeScheduleSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        active_only = self.request.query_params.get('active', None)
        if active_only == 'true':
            queryset = queryset.filter(active=True)
        return queryset

    def perform_create(self, serializer):
        if not serializer.validated_data.get('company'):
            user_company = self.request.user.profile.companies.first()
            if user_company:
                serializer.validated_data['company'] = user_company
        serializer.save()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def quote_lookup(request):
    """
    Look up matching rate lanes for quoting a load.
    Query params: origin_city, origin_state, destination_city, destination_state, equipment_type, customer_id
    Returns matching active, non-expired rate lanes ordered by specificity (customer-specific first).
    """
    from django.db import models as db_models

    if not hasattr(request.user, 'profile'):
        return Response([], status=status.HTTP_200_OK)

    user_companies = request.user.profile.companies.all()
    origin_city = request.query_params.get('origin_city', '').strip()
    origin_state = request.query_params.get('origin_state', '').strip()
    dest_city = request.query_params.get('destination_city', '').strip()
    dest_state = request.query_params.get('destination_state', '').strip()
    equipment_type = request.query_params.get('equipment_type', '')
    customer_id = request.query_params.get('customer_id', None)

    queryset = RateLane.objects.filter(
        company__in=user_companies,
        active=True,
    ).filter(
        Q(expiration_date__isnull=True) | Q(expiration_date__gte=timezone.now().date())
    )

    if origin_city:
        queryset = queryset.filter(origin_city__iexact=origin_city)
    if origin_state:
        queryset = queryset.filter(origin_state__iexact=origin_state)
    if dest_city:
        queryset = queryset.filter(destination_city__iexact=dest_city)
    if dest_state:
        queryset = queryset.filter(destination_state__iexact=dest_state)
    if equipment_type:
        queryset = queryset.filter(equipment_type=equipment_type)

    # Prioritize customer-specific rates, then default rates
    if customer_id:
        queryset = queryset.filter(Q(customer_id=customer_id) | Q(customer__isnull=True))
    else:
        queryset = queryset.filter(customer__isnull=True)

    # Customer-specific first, then by most recent
    queryset = queryset.order_by(
        db_models.Case(
            db_models.When(customer__isnull=False, then=0),
            default=1,
            output_field=db_models.IntegerField(),
        ),
        '-effective_date'
    )[:10]

    serializer = RateLaneSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def dispatch_load(request, load_id):
    """
    Dispatch a load by assigning a driver/truck/trailer and auto-creating a linked Trip.
    Expects: { driver_id, truck_id, trailer_id (optional) }
    """
    from django.db import transaction

    try:
        load = Load.objects.get(id=load_id)
    except Load.DoesNotExist:
        return Response({'error': 'Load not found'}, status=status.HTTP_404_NOT_FOUND)

    # Permission check
    user_companies = request.user.profile.companies.all()
    if load.company not in user_companies:
        return Response({'error': 'Load not in your company'}, status=status.HTTP_403_FORBIDDEN)

    # Validate load is in a dispatchable state
    if load.status not in ('booked', 'quoted'):
        return Response(
            {'error': f'Cannot dispatch a load with status "{load.get_status_display()}". Must be Booked or Quoted.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if load.trip:
        return Response(
            {'error': 'This load already has a linked trip.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    broker_dispatch = request.data.get('broker_dispatch', False)
    driver_id = request.data.get('driver_id')
    truck_id = request.data.get('truck_id')
    trailer_id = request.data.get('trailer_id')

    # Broker dispatch: carrier is assigned, no driver/truck needed, no trip created
    if broker_dispatch:
        if not load.carrier:
            return Response(
                {'error': 'Cannot broker-dispatch a load without an assigned carrier.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        load.status = 'dispatched'
        load.save(update_fields=['status'])

        create_tracking_event(
            load=load,
            event_type='dispatched',
            description=f'Dispatched to carrier: {load.carrier.name}',
            user=request.user,
            metadata={'carrier': load.carrier.name, 'broker_dispatch': True},
        )

        notify_load_dispatched(load, carrier=load.carrier, dispatched_by=request.user)
        notify_customer_load_dispatched(load)

        load.refresh_from_db()
        serializer = LoadSerializer(load)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # Carrier/self-haul dispatch: requires driver and truck, creates a trip
    if not driver_id:
        return Response({'error': 'driver_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not truck_id:
        return Response({'error': 'truck_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        driver = Driver.objects.get(id=driver_id)
    except (Driver.DoesNotExist, ValueError, TypeError):
        return Response({'error': 'Driver not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        truck = Truck.objects.get(id=truck_id)
    except (Truck.DoesNotExist, ValueError, TypeError):
        return Response({'error': 'Truck not found'}, status=status.HTTP_404_NOT_FOUND)

    trailer = None
    if trailer_id:
        try:
            trailer = Trailer.objects.get(id=trailer_id)
        except (Trailer.DoesNotExist, ValueError, TypeError):
            return Response({'error': 'Trailer not found'}, status=status.HTTP_404_NOT_FOUND)

    # Build origin/destination from load locations
    origin_parts = [p for p in [load.pickup_city, load.pickup_state] if p]
    origin = ', '.join(origin_parts) if origin_parts else load.pickup_address or ''
    dest_parts = [p for p in [load.delivery_city, load.delivery_state] if p]
    destination = ', '.join(dest_parts) if dest_parts else load.delivery_address or ''

    try:
        with transaction.atomic():
            # Auto-generate trip number
            trip_count = Trips.objects.count() + 1
            trip_number = f"TRIP-{trip_count:06d}"
            while Trips.objects.filter(trip_number=trip_number).exists():
                trip_count += 1
                trip_number = f"TRIP-{trip_count:06d}"

            # Create the trip
            trip = Trips.objects.create(
                company=load.company,
                driver=driver,
                truck=truck,
                trailer=trailer,
                trip_number=trip_number,
                start_location=origin,
                end_location=destination,
                scheduled_start_date=load.pickup_date,
                scheduled_end_date=load.delivery_date,
                status='scheduled',
                notes=f"Auto-created from Load {load.load_number}",
                created_by=request.user,
            )

            # Link trip to load and update status
            load.trip = trip
            load.status = 'dispatched'
            load.save(update_fields=['trip', 'status'])

        # Create tracking event for dispatch
        create_tracking_event(
            load=load,
            event_type='dispatched',
            description=f'Dispatched to {driver.get_full_name()} — Truck {truck.unit_number}',
            user=request.user,
            metadata={'driver': driver.get_full_name(), 'truck': truck.unit_number, 'trip_number': trip_number},
        )

        notify_load_dispatched(load, driver=driver, dispatched_by=request.user)
        notify_driver_load_assigned(load, driver)
        notify_customer_load_dispatched(load)

        # Refresh from DB to ensure clean serialization
        load.refresh_from_db()
        serializer = LoadSerializer(load)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error dispatching load {load_id}: {str(e)}")
        return Response(
            {'error': 'Failed to dispatch load. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reassign_load(request, load_id):
    """
    Reassign a dispatched load's driver/truck/trailer by updating the linked Trip.
    Allowed when load is dispatched or in_transit.
    Expects: { driver_id, truck_id, trailer_id (optional) }
    """
    from django.db import transaction

    try:
        load = Load.objects.select_related('trip', 'company').get(id=load_id)
    except Load.DoesNotExist:
        return Response({'error': 'Load not found'}, status=status.HTTP_404_NOT_FOUND)

    # Permission check
    user_companies = request.user.profile.companies.all()
    if load.company not in user_companies:
        return Response({'error': 'Load not in your company'}, status=status.HTTP_403_FORBIDDEN)

    # Must have a linked trip
    if not load.trip:
        return Response({'error': 'This load has no linked trip to reassign.'}, status=status.HTTP_400_BAD_REQUEST)

    # Only allow reassignment for dispatched or in_transit loads
    if load.status not in ('dispatched', 'in_transit'):
        return Response(
            {'error': f'Cannot reassign a load with status "{load.get_status_display()}". Must be Dispatched or In Transit.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    driver_id = request.data.get('driver_id')
    truck_id = request.data.get('truck_id')
    trailer_id = request.data.get('trailer_id')

    if not driver_id:
        return Response({'error': 'driver_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not truck_id:
        return Response({'error': 'truck_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        driver = Driver.objects.get(id=driver_id)
    except (Driver.DoesNotExist, ValueError, TypeError):
        return Response({'error': 'Driver not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        truck = Truck.objects.get(id=truck_id)
    except (Truck.DoesNotExist, ValueError, TypeError):
        return Response({'error': 'Truck not found'}, status=status.HTTP_404_NOT_FOUND)

    trailer = None
    if trailer_id:
        try:
            trailer = Trailer.objects.get(id=trailer_id)
        except (Trailer.DoesNotExist, ValueError, TypeError):
            return Response({'error': 'Trailer not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        with transaction.atomic():
            trip = load.trip
            old_driver = trip.driver
            trip.driver = driver
            trip.truck = truck
            trip.trailer = trailer
            trip.save(update_fields=['driver', 'truck', 'trailer'])

        notify_load_reassigned(load, old_driver=old_driver, new_driver=driver, reassigned_by=request.user)

        load.refresh_from_db()
        serializer = LoadSerializer(load)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error reassigning load {load_id}: {str(e)}")
        return Response(
            {'error': 'Failed to reassign load. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ========================
# Tracking & Visibility
# ========================

def create_tracking_event(load, event_type, description='', location='', metadata=None, user=None, is_customer_visible=True):
    """
    Helper to create a tracking event and optionally send customer notification.
    """
    event = LoadTrackingEvent.objects.create(
        load=load,
        event_type=event_type,
        description=description,
        location=location,
        metadata=metadata or {},
        created_by=user,
        is_customer_visible=is_customer_visible,
    )

    # Send customer email notification for key milestones
    if load.customer_notifications_enabled and load.customer and load.customer.email:
        milestone_events = ['picked_up', 'in_transit', 'delivered', 'delay']
        if event_type in milestone_events:
            _send_milestone_notification(load, event)

    return event


def _send_milestone_notification(load, event):
    """Send email notification to customer for a load milestone."""
    try:
        subject = f"Load {load.load_number} — {event.get_event_type_display()}"
        tracking_link = _tracking_url(load)

        message = (
            f"Load Update: {load.load_number}\n\n"
            f"Status: {event.get_event_type_display()}\n"
            f"{'Location: ' + event.location if event.location else ''}\n"
            f"{'ETA: ' + load.current_eta.strftime('%m/%d/%Y %I:%M %p') if load.current_eta else ''}\n\n"
            f"Route: {load.pickup_location_display} → {load.delivery_location_display}\n"
            f"Reference: {load.customer_reference or load.bol_number or 'N/A'}\n\n"
            f"Track your shipment: {tracking_link}\n"
        )

        notification = LoadNotification.objects.create(
            load=load,
            tracking_event=event,
            notification_type='email',
            recipient_email=load.customer.email,
            subject=subject,
            message=message,
        )

        # Send email asynchronously via Celery
        send_load_notification_email_task.delay(
            notification.id,
            subject,
            message,
            load.customer.email,
        )

    except Exception as e:
        logger.error(f"Failed to send milestone notification for load {load.load_number}: {str(e)}")
        if 'notification' in locals():
            notification.status = 'failed'
            notification.error_message = str(e)
            notification.save(update_fields=['status', 'error_message'])


class CheckCallViewSet(UserOrAboveMixin, ModelViewSet):
    """Manage check calls (status updates) on loads."""
    queryset = CheckCall.objects.select_related('load', 'created_by').all()
    serializer_class = CheckCallSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not hasattr(self.request.user, 'profile') or not self.request.user.profile:
            return CheckCall.objects.none()
        user_companies = self.request.user.profile.companies.all()
        queryset = CheckCall.objects.filter(load__company__in=user_companies)

        load_id = self.request.query_params.get('load', None)
        if load_id:
            queryset = queryset.filter(load_id=load_id)

        call_type = self.request.query_params.get('call_type', None)
        if call_type:
            queryset = queryset.filter(call_type=call_type)

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        check_call = serializer.save(created_by=self.request.user)
        load = check_call.load

        # Update load's last known location/ETA
        update_fields = []
        if check_call.location:
            load.last_known_location = check_call.location
            update_fields.append('last_known_location')
        if check_call.latitude is not None:
            load.last_known_latitude = check_call.latitude
            update_fields.append('last_known_latitude')
        if check_call.longitude is not None:
            load.last_known_longitude = check_call.longitude
            update_fields.append('last_known_longitude')
        if check_call.eta:
            load.current_eta = check_call.eta
            update_fields.append('current_eta')
        if update_fields:
            load.save(update_fields=update_fields)

        # Create tracking event
        event_type_map = {
            'pickup_arrived': 'picked_up',
            'pickup_completed': 'picked_up',
            'delivery_arrived': 'arrived_delivery',
            'delivery_completed': 'delivered',
            'delay': 'delay',
            'issue': 'issue',
            'eta_update': 'eta_updated',
        }
        event_type = event_type_map.get(check_call.call_type, 'check_call')
        create_tracking_event(
            load=load,
            event_type=event_type,
            description=check_call.notes or check_call.get_call_type_display(),
            location=check_call.location,
            metadata={
                'eta': check_call.eta.isoformat() if check_call.eta else None,
                'latitude': float(check_call.latitude) if check_call.latitude else None,
                'longitude': float(check_call.longitude) if check_call.longitude else None,
            },
            user=self.request.user,
        )


class LoadTrackingEventViewSet(UserOrAboveMixin, ModelViewSet):
    """View tracking events (timeline) for loads. Read-only for timeline display."""
    queryset = LoadTrackingEvent.objects.select_related('load', 'created_by').all()
    serializer_class = LoadTrackingEventSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'head', 'options']

    def get_queryset(self):
        if not hasattr(self.request.user, 'profile') or not self.request.user.profile:
            return LoadTrackingEvent.objects.none()
        user_companies = self.request.user.profile.companies.all()
        queryset = LoadTrackingEvent.objects.filter(load__company__in=user_companies)

        load_id = self.request.query_params.get('load', None)
        if load_id:
            queryset = queryset.filter(load_id=load_id)

        return queryset.order_by('-created_at')


@api_view(['GET'])
@permission_classes([AllowAny])
def customer_tracking_portal(request, tracking_token):
    """
    Public endpoint for customers to track their loads.
    No authentication required — secured by UUID tracking token.
    """
    try:
        load = Load.objects.get(tracking_token=tracking_token)
    except (Load.DoesNotExist, ValueError):
        return Response({'error': 'Load not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = CustomerTrackingSerializer(load)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_tracking_link(request, load_id):
    """
    Send tracking link email to the customer for a specific load.
    """
    try:
        if not hasattr(request.user, 'profile'):
            return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)

        user_companies = request.user.profile.companies.all()
        try:
            load = Load.objects.get(id=load_id, company__in=user_companies)
        except Load.DoesNotExist:
            return Response({'error': 'Load not found'}, status=status.HTTP_404_NOT_FOUND)

        if not load.customer or not load.customer.email:
            return Response({'error': 'Customer has no email address'}, status=status.HTTP_400_BAD_REQUEST)

        subject = f"Track Your Shipment — Load {load.load_number}"
        tracking_link = _tracking_url(load)
        message = (
            f"Hello {load.customer.contact_name or load.customer.name},\n\n"
            f"You can track your shipment using the link below:\n\n"
            f"Load: {load.load_number}\n"
            f"Reference: {load.customer_reference or 'N/A'}\n"
            f"Route: {load.pickup_location_display} → {load.delivery_location_display}\n\n"
            f"Track your shipment: {tracking_link}\n\n"
            f"Thank you for your business.\n"
        )

        # Send tracking link email asynchronously via Celery
        send_tracking_link_email_task.delay(
            subject,
            message,
            load.customer.email,
        )

        create_tracking_event(
            load=load,
            event_type='created',
            description=f'Tracking link sent to {load.customer.email}',
            user=request.user,
            is_customer_visible=False,
        )

        return Response({'message': f'Tracking link sent to {load.customer.email}'})

    except Exception as e:
        logger.error(f"Error sending tracking link for load {load_id}: {str(e)}")
        return Response({'error': 'Failed to send tracking link'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def load_tracking_timeline(request, load_id):
    """
    Get full tracking timeline for a load (events + check calls combined).
    """
    try:
        if not hasattr(request.user, 'profile'):
            return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)

        user_companies = request.user.profile.companies.all()
        try:
            load = Load.objects.get(id=load_id, company__in=user_companies)
        except Load.DoesNotExist:
            return Response({'error': 'Load not found'}, status=status.HTTP_404_NOT_FOUND)

        events = LoadTrackingEvent.objects.filter(load=load).order_by('-created_at')
        check_calls = CheckCall.objects.filter(load=load).order_by('-created_at')

        return Response({
            'load_number': load.load_number,
            'status': load.status,
            'status_display': load.get_status_display(),
            'last_known_location': load.last_known_location,
            'current_eta': load.current_eta.isoformat() if load.current_eta else None,
            'tracking_token': str(load.tracking_token),
            'customer_notifications_enabled': load.customer_notifications_enabled,
            'events': LoadTrackingEventSerializer(events, many=True).data,
            'check_calls': CheckCallSerializer(check_calls, many=True).data,
        })

    except Exception as e:
        logger.error(f"Error fetching tracking timeline for load {load_id}: {str(e)}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ── Notification Center ──────────────────────────────────────────────────

class NotificationViewSet(ModelViewSet):
    """
    Notification center endpoints.
    All operations are scoped to the authenticated user's own notifications.
    """
    serializer_class = NotificationSerializer
    http_method_names = ['get', 'patch', 'post', 'head', 'options']

    def get_queryset(self):
        return (
            Notification.objects
            .filter(recipient=self.request.user, channel='in_app')
            .order_by('-created_at')
        )

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        category = request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        serializer = self.get_serializer(qs[:20], many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=['is_read'])
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'marked_read': updated})

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})


class NotificationPreferenceViewSet(ModelViewSet):
    """
    Notification preference management.
    Auto-creates missing preference rows on first list; scoped to the current user.
    """
    serializer_class = NotificationPreferenceSerializer
    http_method_names = ['get', 'patch', 'head', 'options']

    _ALL_CATEGORIES = ['compliance', 'operations', 'insurance', 'maintenance', 'load', 'system']

    def get_queryset(self):
        return NotificationPreference.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        existing = {p.category for p in self.get_queryset()}
        missing = [
            NotificationPreference(user=request.user, category=cat)
            for cat in self._ALL_CATEGORIES
            if cat not in existing
        ]
        if missing:
            NotificationPreference.objects.bulk_create(missing, ignore_conflicts=True)
        return super().list(request, *args, **kwargs)


class CompanyNotificationSettingViewSet(ModelViewSet):
    """
    Company-wide notification settings. Admin-only.
    Auto-seeds all 24 setting rows for the requested company on first list.
    PATCH individual rows to toggle channels.
    """
    serializer_class = CompanyNotificationSettingSerializer
    http_method_names = ['get', 'patch', 'head', 'options']

    _ALL_KEYS = [key for key, _ in CompanyNotificationSetting.NOTIFICATION_KEY_CHOICES]

    def _get_company(self):
        company_id = self.request.query_params.get('company') or self.request.data.get('company')
        if not company_id:
            return None
        try:
            profile = self.request.user.profile
            return profile.companies.get(id=company_id)
        except Exception:
            return None

    def get_queryset(self):
        company = self._get_company()
        if not company:
            return CompanyNotificationSetting.objects.none()
        return CompanyNotificationSetting.objects.filter(company=company).order_by('notification_key')

    def list(self, request, *args, **kwargs):
        # Admins only
        if not request.user.profile.is_admin():
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        company = self._get_company()
        if not company:
            return Response({'error': 'company query param required'}, status=status.HTTP_400_BAD_REQUEST)

        # Auto-seed missing rows (all default to False)
        existing_keys = set(
            CompanyNotificationSetting.objects.filter(company=company)
            .values_list('notification_key', flat=True)
        )
        missing = [
            CompanyNotificationSetting(company=company, notification_key=key)
            for key in self._ALL_KEYS
            if key not in existing_keys
        ]
        if missing:
            CompanyNotificationSetting.objects.bulk_create(missing, ignore_conflicts=True)

        return super().list(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not request.user.profile.is_admin():
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        # get_queryset() requires ?company= which isn't present on PATCH, so fetch directly
        try:
            instance = CompanyNotificationSetting.objects.get(pk=kwargs['pk'])
        except CompanyNotificationSetting.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        # Verify the requesting user belongs to this company
        if not request.user.profile.companies.filter(id=instance.company_id).exists():
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        return Response(serializer.data)


# ─── ELD INTEGRATION VIEWS ──────────────────────────────────────────────────────

class ELDProviderViewSet(CompanyFilterMixin, ModelViewSet):
    """CRUD for ELD provider connections. Admin-only."""
    serializer_class = ELDProviderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user_companies = self.request.user.profile.companies.all()
        return ELDProvider.objects.filter(company__in=user_companies)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ELDProviderDetailSerializer
        return ELDProviderSerializer

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """Test that the stored API key connects successfully."""
        from .eld_adapters import get_adapter
        provider = self.get_object()
        try:
            adapter = get_adapter(provider.provider, provider.api_key, provider.access_token)
            ok = adapter.test_connection()
            if ok:
                provider.status = 'connected'
                provider.last_error = ''
            else:
                provider.status = 'error'
                provider.last_error = 'Connection test returned false'
            provider.save(update_fields=['status', 'last_error', 'updated_at'])
            return Response({'connected': ok, 'status': provider.status})
        except Exception as e:
            provider.status = 'error'
            provider.last_error = str(e)
            provider.save(update_fields=['status', 'last_error', 'updated_at'])
            return Response({'connected': False, 'error': str(e)}, status=400)

    @action(detail=True, methods=['post'])
    def sync_assets(self, request, pk=None):
        """Fetch vehicles & drivers from ELD and auto-match to local records."""
        from .eld_adapters import get_adapter
        provider = self.get_object()
        adapter = get_adapter(provider.provider, provider.api_key, provider.access_token)

        # Sync vehicles — auto-match by VIN
        eld_vehicles = adapter.fetch_vehicles()
        company_trucks = Truck.objects.filter(company=provider.company, active=True)
        vin_lookup = {t.vin.upper(): t for t in company_trucks if t.vin}
        vehicles_matched = 0
        for ev in eld_vehicles:
            if ELDVehicleMapping.objects.filter(eld_provider=provider, external_vehicle_id=ev.external_id).exists():
                continue
            truck = vin_lookup.get(ev.vin.upper()) if ev.vin else None
            if truck:
                ELDVehicleMapping.objects.create(
                    eld_provider=provider, truck=truck,
                    external_vehicle_id=ev.external_id,
                    external_vehicle_name=ev.name,
                    auto_matched=True,
                )
                vehicles_matched += 1

        # Sync drivers — auto-match by CDL number or first+last name
        eld_drivers = adapter.fetch_drivers()
        company_drivers = Driver.objects.filter(company=provider.company, active=True)
        cdl_lookup = {d.cdl_number.upper(): d for d in company_drivers if d.cdl_number}
        name_lookup = {f"{d.first_name.lower()} {d.last_name.lower()}": d for d in company_drivers}
        drivers_matched = 0
        for ed in eld_drivers:
            if ELDDriverMapping.objects.filter(eld_provider=provider, external_driver_id=ed.external_id).exists():
                continue
            driver = None
            if ed.license_number:
                driver = cdl_lookup.get(ed.license_number.upper())
            if not driver:
                driver = name_lookup.get(f"{ed.first_name.lower()} {ed.last_name.lower()}")
            if driver:
                ELDDriverMapping.objects.create(
                    eld_provider=provider, driver=driver,
                    external_driver_id=ed.external_id,
                    external_driver_name=f"{ed.first_name} {ed.last_name}",
                    auto_matched=True,
                )
                drivers_matched += 1

        provider.status = 'connected'
        provider.last_sync_at = timezone.now()
        provider.save(update_fields=['status', 'last_sync_at', 'updated_at'])

        return Response({
            'vehicles_found': len(eld_vehicles),
            'vehicles_matched': vehicles_matched,
            'drivers_found': len(eld_drivers),
            'drivers_matched': drivers_matched,
        })

    @action(detail=True, methods=['post'])
    def sync_locations(self, request, pk=None):
        """Manually trigger a GPS location sync for this provider."""
        from .eld_adapters import get_adapter
        provider = self.get_object()
        adapter = get_adapter(provider.provider, provider.api_key, provider.access_token)
        locations = adapter.fetch_vehicle_locations()

        # Resolve vehicle mappings
        mappings = {
            m.external_vehicle_id: m
            for m in provider.vehicle_mappings.select_related('truck').all()
        }

        created = 0
        for loc in locations:
            mapping = mappings.get(loc.external_vehicle_id)
            if not mapping:
                continue

            # Resolve driver from mapping if available
            driver = None
            if loc.driver_external_id:
                dm = provider.driver_mappings.filter(external_driver_id=loc.driver_external_id).select_related('driver').first()
                if dm:
                    driver = dm.driver

            # Find current in-transit load for this truck
            active_load = Load.objects.filter(
                trip__truck=mapping.truck,
                status='in_transit',
            ).first()

            VehicleLocation.objects.create(
                truck=mapping.truck,
                load=active_load,
                driver=driver,
                latitude=loc.latitude,
                longitude=loc.longitude,
                speed_mph=loc.speed_mph,
                heading=loc.heading,
                odometer_miles=loc.odometer_miles,
                engine_hours=loc.engine_hours,
                recorded_at=loc.recorded_at or timezone.now(),
                source_provider=provider.provider,
            )
            created += 1

            # Also update the Load's last known position
            if active_load:
                active_load.last_known_latitude = loc.latitude
                active_load.last_known_longitude = loc.longitude
                active_load.save(update_fields=['last_known_latitude', 'last_known_longitude'])

        provider.last_sync_at = timezone.now()
        provider.save(update_fields=['last_sync_at', 'updated_at'])

        return Response({'locations_synced': created, 'total_from_provider': len(locations)})


class ELDVehicleMappingViewSet(CompanyFilterMixin, ModelViewSet):
    serializer_class = ELDVehicleMappingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user_companies = self.request.user.profile.companies.all()
        return ELDVehicleMapping.objects.filter(
            eld_provider__company__in=user_companies
        ).select_related('truck', 'eld_provider')


class ELDDriverMappingViewSet(CompanyFilterMixin, ModelViewSet):
    serializer_class = ELDDriverMappingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user_companies = self.request.user.profile.companies.all()
        return ELDDriverMapping.objects.filter(
            eld_provider__company__in=user_companies
        ).select_related('driver', 'eld_provider')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dispatch_map_locations(request):
    """
    Returns active loads (dispatched + in_transit) with their latest GPS positions.
    Used by the Dispatch Board live map.
    """
    user_companies = request.user.profile.companies.all()

    active_loads = Load.objects.filter(
        company__in=user_companies,
        status__in=['dispatched', 'in_transit'],
    ).select_related('customer', 'carrier', 'trip__driver', 'trip__truck')

    results = []
    for load in active_loads:
        # Try to get the latest VehicleLocation for this load's truck
        lat = load.last_known_latitude
        lng = load.last_known_longitude
        speed = None
        heading = None
        location_updated = None

        if load.trip and load.trip.truck:
            latest_loc = VehicleLocation.objects.filter(
                truck=load.trip.truck
            ).first()  # Already ordered by -recorded_at
            if latest_loc:
                lat = latest_loc.latitude
                lng = latest_loc.longitude
                speed = latest_loc.speed_mph
                heading = latest_loc.heading
                location_updated = latest_loc.recorded_at

        driver_name = None
        if load.trip and load.trip.driver:
            driver_name = f"{load.trip.driver.first_name} {load.trip.driver.last_name}"

        results.append({
            'load_id': load.id,
            'load_number': load.load_number,
            'status': load.status,
            'customer_name': load.customer.name if load.customer else '',
            'pickup_location_display': load.pickup_location_display,
            'delivery_location_display': load.delivery_location_display,
            'pickup_date': load.pickup_date,
            'delivery_date': load.delivery_date,
            'total_revenue': load.total_revenue,
            'trip_driver_name': driver_name,
            'carrier_name': load.carrier.name if load.carrier else None,
            'truck_unit_number': load.trip.truck.unit_number if load.trip and load.trip.truck else None,
            'latitude': lat,
            'longitude': lng,
            'speed_mph': speed,
            'heading': heading,
            'location_updated_at': location_updated,
            'current_eta': load.current_eta,
        })

    serializer = ActiveLoadLocationSerializer(results, many=True)
    return Response(serializer.data)


# ─── Rate Confirmation PDF Parsing ────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def parse_rate_confirmation(request):
    """
    Accept a Rate Confirmation PDF upload, extract text via pdfplumber,
    and use OpenAI to parse it into structured load fields.
    """
    pdf_file = request.FILES.get('file')
    if not pdf_file:
        return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)

    if not pdf_file.name.lower().endswith('.pdf'):
        return Response({'error': 'Only PDF files are accepted'}, status=status.HTTP_400_BAD_REQUEST)

    # Limit file size to 10 MB
    if pdf_file.size > 10 * 1024 * 1024:
        return Response({'error': 'File size must be under 10 MB'}, status=status.HTTP_400_BAD_REQUEST)

    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        return Response(
            {'error': 'Anthropic API key is not configured. Please set the ANTHROPIC_API_KEY environment variable.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    # Extract text from PDF
    try:
        import PyPDF2
        import io
        extracted_text = ''
        reader = PyPDF2.PdfReader(io.BytesIO(pdf_file.read()))
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                extracted_text += page_text + '\n'
    except Exception as e:
        logger.error(f'PDF extraction error: {e}')
        return Response({'error': 'Failed to read PDF file. Please ensure it is a valid PDF.'}, status=status.HTTP_400_BAD_REQUEST)

    if not extracted_text.strip():
        return Response({'error': 'Could not extract any text from the PDF. It may be a scanned image — please upload a text-based PDF.'}, status=status.HTTP_400_BAD_REQUEST)

    # Truncate to avoid token limits (keep first ~12000 chars)
    extracted_text = extracted_text[:12000]

    # Send to Anthropic Claude for structured extraction
    import requests as http_requests

    prompt = """You are a logistics data extraction assistant. Extract load/shipment information from this Rate Confirmation document text and return it as a JSON object.

Return ONLY a valid JSON object with these exact keys (use empty string "" for missing values, do not omit keys):
{
  "customer_reference": "PO number or customer reference number",
  "bol_number": "Bill of Lading number",
  "pickup_name": "Pickup facility/shipper name",
  "pickup_address": "Pickup street address",
  "pickup_city": "Pickup city",
  "pickup_state": "Pickup state (2-letter code)",
  "pickup_zip": "Pickup ZIP code",
  "pickup_date": "Pickup date/time in YYYY-MM-DDTHH:MM format or empty string",
  "pickup_notes": "Any pickup instructions or appointment notes",
  "delivery_name": "Delivery facility/consignee name",
  "delivery_address": "Delivery street address",
  "delivery_city": "Delivery city",
  "delivery_state": "Delivery state (2-letter code)",
  "delivery_zip": "Delivery ZIP code",
  "delivery_date": "Delivery date/time in YYYY-MM-DDTHH:MM format or empty string",
  "delivery_notes": "Any delivery instructions or appointment notes",
  "commodity": "Description of freight/commodity",
  "weight": "Weight in lbs (number only, no commas or units)",
  "pieces": "Number of pieces/pallets (number only)",
  "equipment_type": "One of: dry_van, reefer, flatbed, step_deck, lowboy, tanker, power_only, box_truck, hotshot, other",
  "temperature_requirement": "One of: none, frozen, cold, cool, custom",
  "temperature_value": "Temperature value if specified (e.g. 35°F)",
  "hazmat": false,
  "customer_rate": "Total rate/linehaul amount (number only, no $ or commas)",
  "carrier_cost": "Carrier pay amount if shown (number only)",
  "fuel_surcharge": "Fuel surcharge amount if shown (number only)",
  "accessorial_charges": "Any detention, lumper, or other accessorial total (number only)",
  "estimated_miles": "Total miles if shown (number only)",
  "notes": "Any other relevant notes, special instructions, or reference numbers"
}

Important rules:
- For equipment_type, infer from context (e.g. "53' Dry Van" = "dry_van", "Reefer" = "reefer", "Flatbed" = "flatbed")
- For temperature_requirement, if temp is specified set to "custom" and put value in temperature_value
- If temp indicates frozen (<0°F or <-18°C) set to "frozen", cold (32-36°F) = "cold", cool (36-50°F) = "cool"  
- Convert all dates to YYYY-MM-DDTHH:MM format
- For numeric fields (weight, pieces, rates, miles), return just the number as a string, no currency symbols or commas
- Set hazmat to true only if document explicitly mentions hazardous materials
- Return ONLY the JSON object, no markdown, no explanation

Rate Confirmation text:
"""

    try:
        response = http_requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={
                'x-api-key': api_key,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
            },
            json={
                'model': 'claude-haiku-4-5',
                'max_tokens': 1500,
                'system': 'You are a precise data extraction assistant. Return only valid JSON.',
                'messages': [
                    {'role': 'user', 'content': prompt + extracted_text},
                ],
            },
            timeout=60,
        )

        if response.status_code == 401:
            return Response({'error': 'Invalid Anthropic API key. Please check configuration.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if response.status_code == 429:
            return Response({'error': 'AI service rate limit reached. Please try again in a moment.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        if response.status_code != 200:
            logger.error(f'Anthropic API error {response.status_code}: {response.text[:500]}')
            return Response({'error': 'AI processing failed. Please try again or fill the form manually.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        result_data = response.json()
        result_text = result_data['content'][0]['text'].strip()

        # Clean up response — remove markdown code fences if present
        if result_text.startswith('```'):
            result_text = result_text.split('\n', 1)[1] if '\n' in result_text else result_text[3:]
        if result_text.endswith('```'):
            result_text = result_text[:-3].strip()

        import json
        parsed_data = json.loads(result_text)

        return Response({
            'parsed_data': parsed_data,
            'extracted_text_preview': extracted_text[:500] + ('...' if len(extracted_text) > 500 else ''),
        })

    except json.JSONDecodeError:
        logger.error(f'Claude returned invalid JSON: {result_text[:500]}')
        return Response({'error': 'Failed to parse extracted data. Please try again or fill the form manually.'}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    except http_requests.exceptions.Timeout:
        return Response({'error': 'AI processing timed out. Please try again.'}, status=status.HTTP_504_GATEWAY_TIMEOUT)
    except Exception as e:
        logger.error(f'Anthropic API error: {e}')
        return Response({'error': 'AI processing failed. Please try again or fill the form manually.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== FMCSA SAFETY & COMPLIANCE ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_safety_overview(request):
    """
    Get the combined FMCSA + internal compliance overview for the user's company.
    For asset-based or hybrid companies that have a DOT number.
    """
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)

    user_companies = request.user.profile.companies.all()
    # Get companies with DOT numbers (asset or hybrid)
    companies_with_dot = user_companies.filter(company_type__in=['asset', 'hybrid']).exclude(dot_number='')

    results = []
    for company in companies_with_dot:
        from MercAPI.models import FMCSASnapshot, ComplianceMetric
        fmcsa_snapshot = FMCSASnapshot.objects.filter(company=company).first()
        compliance_metric = ComplianceMetric.objects.filter(company=company).first()

        from MercAPI.serializers import FMCSASnapshotSerializer, ComplianceMetricSerializer
        results.append({
            'company_id': company.id,
            'company_name': company.name,
            'company_type': company.company_type,
            'dot_number': company.dot_number,
            'mc_number': company.mc_number,
            'fmcsa': FMCSASnapshotSerializer(fmcsa_snapshot).data if fmcsa_snapshot else None,
            'compliance': ComplianceMetricSerializer(compliance_metric).data if compliance_metric else None,
        })

    return Response(results)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def company_safety_refresh(request):
    """
    Force a fresh FMCSA data fetch for the user's companies.
    Also recomputes internal compliance metrics.
    """
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)

    # Only admins can trigger a refresh
    if request.user.profile.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    user_companies = request.user.profile.companies.filter(
        company_type__in=['asset', 'hybrid']
    ).exclude(dot_number='')

    refreshed = []
    for company in user_companies:
        from MercAPI.fmcsa_client import fetch_and_store as fmcsa_fetch
        from MercAPI.compliance_metrics import compute_and_store

        try:
            snapshot = fmcsa_fetch(dot_number=company.dot_number, company=company)
        except Exception as e:
            logger.exception("FMCSA fetch failed for %s (DOT %s)", company.name, company.dot_number)
            snapshot = None

        try:
            metric = compute_and_store(company)
        except Exception as e:
            logger.exception("Compliance metrics failed for %s", company.name)
            metric = None

        refreshed.append({
            'company': company.name,
            'fmcsa_fetched': snapshot is not None,
            'metrics_computed': metric is not None,
        })

    return Response({'refreshed': refreshed})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_compliance_history(request):
    """
    Get historical compliance metrics for trend charts.
    Query params: company_id (optional), limit (default 12).
    """
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)

    user_companies = request.user.profile.companies.all()
    company_id = request.query_params.get('company_id')
    limit = min(int(request.query_params.get('limit', 12)), 52)

    from MercAPI.models import ComplianceMetric
    from MercAPI.serializers import ComplianceMetricSerializer

    qs = ComplianceMetric.objects.filter(company__in=user_companies)
    if company_id:
        qs = qs.filter(company_id=company_id)

    metrics = qs.order_by('-period_end')[:limit]
    return Response(ComplianceMetricSerializer(metrics, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def carrier_safety_overview(request, carrier_id):
    """
    Get FMCSA safety data for a specific carrier (broker view).
    """
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)

    user_companies = request.user.profile.companies.all()

    from MercAPI.models import Carrier, FMCSASnapshot
    try:
        carrier = Carrier.objects.get(id=carrier_id, company__in=user_companies)
    except Carrier.DoesNotExist:
        return Response({'error': 'Carrier not found'}, status=status.HTTP_404_NOT_FOUND)

    fmcsa_snapshot = FMCSASnapshot.objects.filter(carrier=carrier).first()

    from MercAPI.serializers import FMCSASnapshotSerializer
    return Response({
        'carrier_id': carrier.id,
        'carrier_name': carrier.name,
        'dot_number': carrier.dot_number,
        'mc_number': carrier.mc_number,
        'status': carrier.status,
        'fmcsa': FMCSASnapshotSerializer(fmcsa_snapshot).data if fmcsa_snapshot else None,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def carrier_safety_refresh(request, carrier_id):
    """
    Force a fresh FMCSA data fetch for a specific carrier.
    """
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)

    user_companies = request.user.profile.companies.all()

    from MercAPI.models import Carrier
    try:
        carrier = Carrier.objects.get(id=carrier_id, company__in=user_companies)
    except Carrier.DoesNotExist:
        return Response({'error': 'Carrier not found'}, status=status.HTTP_404_NOT_FOUND)

    if not carrier.dot_number:
        return Response({'error': 'Carrier has no DOT number on file'}, status=status.HTTP_400_BAD_REQUEST)

    from MercAPI.fmcsa_client import fetch_and_store as fmcsa_fetch
    try:
        snapshot = fmcsa_fetch(dot_number=carrier.dot_number, carrier=carrier)
    except Exception:
        logger.exception("FMCSA fetch failed for carrier %s (DOT %s)", carrier.name, carrier.dot_number)
        return Response({'error': 'Failed to fetch FMCSA data due to a server error'}, status=status.HTTP_502_BAD_GATEWAY)

    if snapshot is None:
        return Response({'error': 'Failed to fetch FMCSA data — check DOT number or try again later'}, status=status.HTTP_502_BAD_GATEWAY)

    from MercAPI.serializers import FMCSASnapshotSerializer
    return Response({
        'carrier_id': carrier.id,
        'carrier_name': carrier.name,
        'fmcsa': FMCSASnapshotSerializer(snapshot).data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def carriers_safety_list(request):
    """
    Get all carriers with their latest FMCSA snapshot (list view for broker dashboard).
    Includes safety highlights for quick scanning.
    """
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not found'}, status=status.HTTP_403_FORBIDDEN)

    user_companies = request.user.profile.companies.all()

    from MercAPI.models import Carrier, FMCSASnapshot
    from MercAPI.serializers import FMCSASnapshotSerializer

    carriers = Carrier.objects.filter(
        company__in=user_companies, status='active'
    ).order_by('name')

    results = []
    for carrier in carriers:
        snapshot = FMCSASnapshot.objects.filter(carrier=carrier).first()
        results.append({
            'carrier_id': carrier.id,
            'carrier_name': carrier.name,
            'dot_number': carrier.dot_number,
            'mc_number': carrier.mc_number,
            'status': carrier.status,
            'has_dot': bool(carrier.dot_number),
            'fmcsa': FMCSASnapshotSerializer(snapshot).data if snapshot else None,
        })

    return Response(results)


# ==================== AI FEATURES ====================

from .ai_services import fleet_assistant_chat, extract_document_data, get_dispatch_recommendations
from .models import AIConversation, AIMessage


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_chat(request):
    """
    AI Fleet Assistant — send a message and get an AI response.
    Body: { "message": "...", "conversation_id": null | int }
    """
    message = request.data.get('message', '').strip()
    if not message:
        return Response({'error': 'Message is required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Limit message length to prevent abuse
    if len(message) > 2000:
        return Response({'error': 'Message too long (max 2000 characters).'}, status=status.HTTP_400_BAD_REQUEST)

    conversation_id = request.data.get('conversation_id')

    result = fleet_assistant_chat(request.user, message, conversation_id)

    if 'error' in result and 'conversation_id' not in result:
        return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)
    if 'error' in result:
        return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_chat_history(request):
    """
    Get the user's AI chat conversations list.
    """
    if not hasattr(request.user, 'profile'):
        return Response({'error': 'User profile not configured.'}, status=status.HTTP_400_BAD_REQUEST)

    conversations = AIConversation.objects.filter(
        user=request.user, tenant=request.user.profile.tenant
    ).order_by('-updated_at')[:50]

    data = [
        {
            'id': c.id,
            'title': c.title,
            'created_at': c.created_at.isoformat(),
            'updated_at': c.updated_at.isoformat(),
            'message_count': c.messages.count(),
        }
        for c in conversations
    ]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_chat_messages(request, conversation_id):
    """
    Get messages for a specific AI conversation.
    """
    try:
        conversation = AIConversation.objects.get(
            id=conversation_id, user=request.user
        )
    except AIConversation.DoesNotExist:
        return Response({'error': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

    messages = conversation.messages.order_by('created_at')
    data = [
        {
            'id': m.id,
            'role': m.role,
            'content': m.content,
            'created_at': m.created_at.isoformat(),
            'metadata': m.metadata,
        }
        for m in messages
    ]
    return Response({
        'conversation_id': conversation.id,
        'title': conversation.title,
        'messages': data,
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def ai_chat_delete(request, conversation_id):
    """Delete an AI conversation."""
    try:
        conversation = AIConversation.objects.get(
            id=conversation_id, user=request.user
        )
    except AIConversation.DoesNotExist:
        return Response({'error': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

    conversation.delete()
    return Response({'status': 'deleted'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_extract_document(request):
    """
    AI Document Intelligence — extract structured data from an uploaded PDF.
    Body: multipart form with 'file' and optional 'document_type' (bol/pod/invoice/auto)
    """
    pdf_file = request.FILES.get('file')
    if not pdf_file:
        return Response({'error': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

    document_type = request.data.get('document_type', 'auto')
    allowed_types = ('auto', 'bol', 'pod', 'invoice', 'rate_confirmation')
    if document_type not in allowed_types:
        return Response(
            {'error': f'Invalid document_type. Use: {", ".join(allowed_types)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    result = extract_document_data(request.user, pdf_file, document_type)

    if 'error' in result:
        return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_dispatch_recommend(request, load_id):
    """
    AI Dispatch Recommendations — get ranked driver/truck suggestions for a load.
    """
    result = get_dispatch_recommendations(request.user, load_id)

    if 'error' in result:
        return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)

    return Response(result)


# ============================================================
# ONE-CLICK DRIVER ONBOARDING
# ============================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def onboard_driver_from_application(request, application_id):
    """
    One-Click Driver Onboarding: AI-extract CDL + medical data from the application's
    uploaded documents, then create a Driver record, User account, and UserProfile
    in a single operation.

    POST body (optional overrides):
      - extracted_data: pre-extracted fields (skip AI if provided)

    Returns the created Driver and any extraction results.
    """
    from .ai_services import extract_driver_documents

    # Verify user access
    if not hasattr(request.user, 'profile') or not request.user.profile.companies.exists():
        return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

    user_companies = request.user.profile.companies.all()

    try:
        application = DriverApplication.objects.get(id=application_id, company__in=user_companies)
    except DriverApplication.DoesNotExist:
        return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not application.company:
        return Response({'error': 'Application has no company assigned.'}, status=status.HTTP_400_BAD_REQUEST)

    # Check if driver already exists with same name + company
    existing = Driver.objects.filter(
        first_name__iexact=application.first_name,
        last_name__iexact=application.last_name,
        company=application.company,
    ).first()
    if existing:
        return Response(
            {'error': f'Driver {existing.first_name} {existing.last_name} already exists in this company (ID: {existing.id}).'},
            status=status.HTTP_409_CONFLICT,
        )

    # Step 1: AI-extract data from uploaded documents (if not pre-provided)
    extracted = request.data.get('extracted_data')
    extraction_results = {}

    if not extracted:
        cdl_file = None
        medical_file = None

        # Download files from storage to pass to AI
        if application.drivers_license:
            try:
                cdl_file = application.drivers_license.open('rb')
            except Exception as e:
                logger.warning(f'Could not open CDL file: {e}')

        if application.medical_certificate:
            try:
                medical_file = application.medical_certificate.open('rb')
            except Exception as e:
                logger.warning(f'Could not open medical file: {e}')

        if cdl_file or medical_file:
            extraction_results = extract_driver_documents(request.user, cdl_file, medical_file)

            # Close files
            if cdl_file:
                cdl_file.close()
            if medical_file:
                medical_file.close()

            if 'error' in extraction_results:
                # Non-fatal: continue with application data only
                logger.warning(f'AI extraction warning: {extraction_results["error"]}')
                extraction_results = {'warning': extraction_results['error']}

        # Merge extracted data
        cdl = extraction_results.get('cdl_data', {}).get('extracted_data', {})
        med = extraction_results.get('medical_data', {}).get('extracted_data', {})
    else:
        cdl = extracted.get('cdl_data', {})
        med = extracted.get('medical_data', {})

    # Step 2: Build driver fields (application data + AI-extracted data)
    from datetime import date as date_type

    def parse_date(val, default=None):
        if not val:
            return default
        try:
            return datetime.strptime(val, '%Y-%m-%d').date()
        except (ValueError, TypeError):
            return default

    driver_data = {
        'company': application.company,
        'first_name': application.first_name,
        'last_name': application.last_name,
        'phone': application.phone_number or '',
        'state': cdl.get('state', '') or application.state or '',
        'cdl_number': cdl.get('cdl_number', ''),
        'cdl_expiration_date': parse_date(cdl.get('expiration_date'), date_type(2000, 1, 1)),
        'dob': parse_date(cdl.get('date_of_birth'), date_type(1990, 1, 1)),
        'physical_date': parse_date(
            med.get('medical_expiration_date') or med.get('medical_exam_date'),
            date_type(2000, 1, 1),
        ),
        'hire_date': timezone.now().date(),
        'active': True,
        'employee_verification': False,
    }

    # Step 3: Create the Driver
    driver = Driver.objects.create(**driver_data)

    # Step 4: Create a User account for driver portal access
    base_username = f"{application.first_name.lower()}.{application.last_name.lower()}"
    username = base_username
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}{counter}"
        counter += 1

    # Generate a temporary password (driver will reset on first login)
    import secrets
    temp_password = secrets.token_urlsafe(12)

    user_account = User.objects.create_user(
        username=username,
        email=application.email,
        password=temp_password,
        first_name=application.first_name,
        last_name=application.last_name,
    )

    # Step 5: Create UserProfile linking to tenant + company with driver role
    tenant = request.user.profile.tenant
    profile = UserProfile.objects.create(
        user=user_account,
        tenant=tenant,
        role='driver',
    )
    profile.companies.add(application.company)

    # Step 6: Link user account to driver
    driver.user_account = user_account
    driver.save(update_fields=['user_account'])

    # Step 7: Mark application as approved
    application.status = 'approved'
    application.notes = (application.notes or '') + f'\n[Auto-onboarded] Driver ID: {driver.id}, User: {username}'
    application.save(update_fields=['status', 'notes'])

    # Build response
    response_data = {
        'driver': DriverSerializer(driver).data,
        'username': username,
        'temp_password': temp_password,
        'extraction': {
            'cdl_data': extraction_results.get('cdl_data', {}),
            'medical_data': extraction_results.get('medical_data', {}),
            'processing_time_ms': extraction_results.get('processing_time_ms'),
            'warning': extraction_results.get('warning'),
        },
        'message': f'Driver {driver.first_name} {driver.last_name} onboarded successfully.',
    }

    return Response(response_data, status=status.HTTP_201_CREATED)

