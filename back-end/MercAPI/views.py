import logging
import boto3
from django.utils.text import slugify
from botocore.exceptions import NoCredentialsError
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from datetime import datetime, timedelta
from django.utils import timezone
from urllib.parse import urlencode
from .serializers import UserSerializer, DriverSerializer, TruckSerializer, CompanySerializer, TrailerSerializer, DriverTestSerializer, DriverHOSSerializer, DriverApplicationSerializer, MaintenanceCategorySerializer, MaintenanceTypeSerializer, MaintenanceRecordSerializer, MaintenanceAttachmentSerializer, DriverDocumentSerializer, InspectionSerializer, InspectionItemSerializer, TripsSerializer, TripInspectionSerializer, TripDocumentSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import Driver, Truck, Company, Trailer, DriverTest, DriverHOS, DriverApplication, MaintenanceCategory, MaintenanceType, MaintenanceRecord, MaintenanceAttachment, DriverDocument, Tenant, UserProfile, Inspection, InspectionItem, Trips, InvitationToken, TripInspection, TripDocument, PasswordResetToken
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
        
        if model_name == 'TripInspection':
            # Filter through trip -> company
            return queryset.filter(trip__company__in=user_companies)
        
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
            
            # Send email
            send_mail(
                subject=f'You\'re invited to {request.user.profile.tenant.name} - Fleetly Fleet Management',
                message=plain_message,
                html_message=html_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[data['email']],
                fail_silently=False,
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
            return Response(
                {'error': 'Trip cannot be started. Pre-trip inspection must be completed first.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Start the trip
        trip.status = 'in_progress'
        trip.actual_start_date = timezone.now()
        
        # Set mileage start if provided
        if 'mileage_start' in request.data:
            trip.mileage_start = request.data['mileage_start']
        
        trip.save()
        
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
    Complete a trip (driver can complete if post-trip inspection is done)
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
            return Response(
                {'error': 'Trip cannot be completed. Trip must be in progress.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if post-trip inspection is completed
        if not trip.post_trip_inspection_completed:
            return Response(
                {'error': 'Post-trip inspection must be completed before finishing the trip.'}, 
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
        
        # Get driver's active trips
        active_trips = Trips.objects.filter(
            driver__user_account=request.user,
            status__in=['scheduled', 'in_progress']
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


class TripInspectionViewSet(UserOrAboveMixin, CompanyFilterMixin, ModelViewSet):
    """
    ViewSet for trip inspections (pre-trip and post-trip)
    """
    serializer_class = TripInspectionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Get company-filtered queryset first (tenant isolation)
        queryset = super().get_queryset()
        
        user_role = self.request.user.profile.role
        
        if user_role == 'driver':
            # Drivers only see inspections for their trips
            queryset = queryset.filter(
                trip__driver__user_account=self.request.user
            )
        # For user/admin roles, CompanyFilterMixin already handles company filtering
        
        # Filter by specific trip if requested
        trip_id = self.request.query_params.get('trip', None)
        if trip_id:
            queryset = queryset.filter(trip_id=trip_id)
        
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
    Submit a trip inspection (pre-trip or post-trip) with tenant isolation
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
        if TripInspection.objects.filter(trip=trip, inspection_type=inspection_type).exists():
            return Response(
                {'error': f'{inspection_type.replace("_", "-").title()} inspection already completed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create inspection
        inspection_data = request.data.copy()
        inspection_data['trip'] = trip.id
        inspection_data['inspection_type'] = inspection_type
        
        serializer = TripInspectionSerializer(data=inspection_data)
        if serializer.is_valid():
            inspection = serializer.save(completed_by=request.user)
            
            # Update trip inspection flags
            if inspection_type == 'pre_trip':
                trip.pre_trip_inspection_completed = True
            elif inspection_type == 'post_trip':
                trip.post_trip_inspection_completed = True
            
            trip.save()
            
            return Response({
                'message': f'{inspection_type.replace("_", "-").title()} inspection submitted successfully',
                'inspection_id': inspection.id,
                'inspection_passed': inspection.is_passed()
            }, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
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
            from django.core.mail import send_mail
            from django.conf import settings
            
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
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
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


# Dashboard API Endpoints
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_overview(request):
    """
    Comprehensive dashboard data with real-time metrics and compliance scores
    """
    try:
        # Ensure user has profile and companies
        if not hasattr(request.user, 'profile') or not request.user.profile.companies.exists():
            return Response({"detail": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

        user_companies = request.user.profile.companies.all()
        user_role = request.user.profile.role

        # Filter data by user's companies for tenant isolation
        drivers = Driver.objects.filter(company__in=user_companies)
        trucks = Truck.objects.filter(company__in=user_companies)
        trailers = Trailer.objects.filter(company__in=user_companies)
        trips = Trips.objects.filter(company__in=user_companies)
        maintenance_records = MaintenanceRecord.objects.filter(
            Q(truck__company__in=user_companies) | Q(trailer__company__in=user_companies)
        )
        inspections = TripInspection.objects.filter(trip__company__in=user_companies)

        # Calculate key metrics
        total_drivers = drivers.count()
        active_drivers = drivers.filter(status='active').count()
        total_vehicles = trucks.count() + trailers.count()
        active_vehicles = trucks.filter(status='active').count() + trailers.filter(status='active').count()
        
        # Trip metrics
        today = timezone.now().date()
        active_trips = trips.filter(status='in_progress').count()
        completed_today = trips.filter(
            status='completed',
            actual_end_date__date=today
        ).count()
        
        # Inspection metrics (last 30 days)
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        recent_inspections = inspections.filter(completed_at__gte=thirty_days_ago)
        
        # Calculate inspection pass rate
        total_inspections = recent_inspections.count()
        if total_inspections > 0:
            # Count inspections where all critical checks passed
            passed_inspections = recent_inspections.filter(
                vehicle_exterior_condition=True,
                lights_working=True,
                tires_condition=True,
                brakes_working=True,
                engine_fluids_ok=True
            ).count()
            inspection_pass_rate = round((passed_inspections / total_inspections) * 100, 1)
        else:
            inspection_pass_rate = 0

        # Compliance calculations
        driver_compliance = calculate_driver_compliance(drivers)
        vehicle_compliance = calculate_vehicle_compliance(trucks, trailers)
        operations_compliance = calculate_operations_compliance(trips, inspections)
        overall_compliance = round((driver_compliance + vehicle_compliance + operations_compliance) / 3, 1)

        # Critical alerts
        critical_alerts = generate_critical_alerts(drivers, trucks, trailers, trips, maintenance_records)

        # Action items
        action_items = generate_action_items(drivers, trucks, trailers, maintenance_records, inspections, user_companies)

        # Recent activity
        recent_activity = generate_recent_activity(trips, inspections, maintenance_records)

        return Response({
            'key_metrics': {
                'total_drivers': total_drivers,
                'active_drivers': active_drivers,
                'total_vehicles': total_vehicles,
                'active_vehicles': active_vehicles,
                'active_trips': active_trips,
                'completed_today': completed_today,
                'inspection_pass_rate': inspection_pass_rate,
                'compliance_score': overall_compliance
            },
            'compliance_scores': {
                'overall': overall_compliance,
                'drivers': driver_compliance,
                'vehicles': vehicle_compliance,
                'operations': operations_compliance,
                'trend': 'up' if overall_compliance >= 85 else 'down'
            },
            'critical_alerts': critical_alerts,
            'action_items': action_items,
            'recent_activity': recent_activity,
            'last_updated': timezone.now().isoformat()
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching dashboard data: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def calculate_driver_compliance(drivers):
    """Calculate driver compliance percentage based on various factors"""
    if not drivers.exists():
        return 100.0
    
    total_drivers = drivers.count()
    compliant_drivers = 0
    
    today = timezone.now().date()
    thirty_days = timezone.timedelta(days=30)
    
    for driver in drivers:
        compliance_points = 0
        total_points = 5  # Total possible compliance points
        
        # Active status (1 point)
        if driver.status == 'active':
            compliance_points += 1
        
        # Valid license (2 points)
        if driver.license_expiry_date and driver.license_expiry_date > today:
            compliance_points += 2
        elif driver.license_expiry_date and driver.license_expiry_date > (today + thirty_days):
            compliance_points += 1  # Expiring soon, partial credit
        
        # Medical certificate (2 points)
        if driver.medical_cert_expiry and driver.medical_cert_expiry > today:
            compliance_points += 2
        elif driver.medical_cert_expiry and driver.medical_cert_expiry > (today + thirty_days):
            compliance_points += 1  # Expiring soon, partial credit
        
        # Driver is compliant if they have at least 4/5 points
        if compliance_points >= 4:
            compliant_drivers += 1
    
    return round((compliant_drivers / total_drivers) * 100, 1)


def calculate_vehicle_compliance(trucks, trailers):
    """Calculate vehicle compliance percentage"""
    vehicles = list(trucks) + list(trailers)
    if not vehicles:
        return 100.0
    
    total_vehicles = len(vehicles)
    compliant_vehicles = 0
    
    today = timezone.now().date()
    
    for vehicle in vehicles:
        compliance_points = 0
        total_points = 3
        
        # Active status (1 point)
        if vehicle.status == 'active':
            compliance_points += 1
        
        # Registration current (1 point)
        if hasattr(vehicle, 'registration_expiry') and vehicle.registration_expiry and vehicle.registration_expiry > today:
            compliance_points += 1
        
        # Insurance current (1 point)
        if hasattr(vehicle, 'insurance_expiry') and vehicle.insurance_expiry and vehicle.insurance_expiry > today:
            compliance_points += 1
        
        # Vehicle is compliant if it has at least 2/3 points
        if compliance_points >= 2:
            compliant_vehicles += 1
    
    return round((compliant_vehicles / total_vehicles) * 100, 1)


def calculate_operations_compliance(trips, inspections):
    """Calculate operations compliance based on trip inspections and completion rates"""
    recent_trips = trips.filter(created_at__gte=timezone.now() - timezone.timedelta(days=30))
    
    if not recent_trips.exists():
        return 100.0
    
    total_trips = recent_trips.count()
    compliant_trips = 0
    
    for trip in recent_trips:
        compliance_points = 0
        total_points = 2
        
        # Pre-trip inspection completed (1 point)
        if trip.pre_trip_inspection_completed:
            compliance_points += 1
        
        # Post-trip inspection completed (1 point)
        if trip.post_trip_inspection_completed:
            compliance_points += 1
        
        # Trip is compliant if both inspections are done
        if compliance_points >= 2:
            compliant_trips += 1
    
    return round((compliant_trips / total_trips) * 100, 1)


def generate_critical_alerts(drivers, trucks, trailers, trips, maintenance_records):
    """Generate list of critical alerts requiring immediate attention"""
    alerts = []
    today = timezone.now().date()
    thirty_days = today + timezone.timedelta(days=30)
    
    # Driver license expiring alerts
    for driver in drivers.filter(license_expiry_date__lte=thirty_days, license_expiry_date__gte=today):
        days_until_expiry = (driver.license_expiry_date - today).days
        alerts.append({
            'id': f'driver-license-{driver.id}',
            'type': 'warning' if days_until_expiry > 7 else 'error',
            'title': 'License Expiring Soon',
            'message': f"{driver.first_name} {driver.last_name}'s license expires in {days_until_expiry} days",
            'priority': 'high' if days_until_expiry <= 7 else 'medium',
            'date': driver.license_expiry_date.isoformat(),
            'action_url': '/ActiveDrivers'
        })
    
    # Medical certificate expiring alerts
    for driver in drivers.filter(medical_cert_expiry__lte=thirty_days, medical_cert_expiry__gte=today):
        days_until_expiry = (driver.medical_cert_expiry - today).days
        alerts.append({
            'id': f'driver-medical-{driver.id}',
            'type': 'warning' if days_until_expiry > 7 else 'error',
            'title': 'Medical Certificate Expiring',
            'message': f"{driver.first_name} {driver.last_name}'s DOT physical expires in {days_until_expiry} days",
            'priority': 'high' if days_until_expiry <= 7 else 'medium',
            'date': driver.medical_cert_expiry.isoformat(),
            'action_url': '/ActiveDrivers'
        })
    
    # Out of service vehicles
    for truck in trucks.exclude(status='active'):
        alerts.append({
            'id': f'truck-oos-{truck.id}',
            'type': 'error',
            'title': 'Vehicle Out of Service',
            'message': f"Truck {truck.unit_number} - {truck.status}",
            'priority': 'critical',
            'action_url': '/ActiveTrucks'
        })
    
    for trailer in trailers.exclude(status='active'):
        alerts.append({
            'id': f'trailer-oos-{trailer.id}',
            'type': 'error',
            'title': 'Trailer Out of Service',
            'message': f"Trailer {trailer.unit_number} - {trailer.status}",
            'priority': 'critical',
            'action_url': '/ActiveTrailers'
        })
    
    # Overdue maintenance
    overdue_maintenance = maintenance_records.filter(
        status='scheduled',
        scheduled_date__lt=today
    )
    for maintenance in overdue_maintenance[:5]:  # Limit to top 5
        vehicle_name = f"{maintenance.truck.unit_number}" if maintenance.truck else f"{maintenance.trailer.unit_number}"
        alerts.append({
            'id': f'maintenance-overdue-{maintenance.id}',
            'type': 'warning',
            'title': 'Maintenance Overdue',
            'message': f"{vehicle_name} - {maintenance.maintenance_type} overdue",
            'priority': 'medium',
            'action_url': '/Maintenance'
        })
    
    return sorted(alerts, key=lambda x: {'critical': 0, 'high': 1, 'medium': 2}.get(x['priority'], 3))


def generate_action_items(drivers, trucks, trailers, maintenance_records, inspections, user_companies):
    """Generate actionable items for each category"""
    today = timezone.now().date()
    sixty_days = today + timezone.timedelta(days=60)
    
    return {
        'drivers': [
            {
                'id': driver.id,
                'first_name': driver.first_name,
                'last_name': driver.last_name,
                'license_expiry_date': driver.license_expiry_date.isoformat() if driver.license_expiry_date else None,
                'medical_cert_expiry': driver.medical_cert_expiry.isoformat() if driver.medical_cert_expiry else None,
                'status': driver.status,
                'action_needed': 'License renewal' if driver.license_expiry_date and driver.license_expiry_date <= sixty_days else 'Medical renewal'
            }
            for driver in drivers.filter(
                Q(license_expiry_date__lte=sixty_days) | 
                Q(medical_cert_expiry__lte=sixty_days) |
                Q(status__in=['inactive', 'suspended'])
            )[:10]  # Limit to top 10
        ],
        'vehicles': [
            {
                'id': vehicle.id,
                'make': vehicle.make,
                'model': vehicle.model,
                'unit_number': vehicle.unit_number,
                'status': vehicle.status,
                'type': 'truck' if hasattr(vehicle, 'truck_type') else 'trailer'
            }
            for vehicle in list(trucks.exclude(status='active')) + list(trailers.exclude(status='active'))
        ][:10],
        'inspections': [
            {
                'trip_id': trip.id,
                'driver_name': f"{trip.driver.first_name} {trip.driver.last_name}",
                'issue': 'Missing pre-trip inspection' if not trip.pre_trip_inspection_completed else 'Missing post-trip inspection',
                'created_date': trip.created_at.isoformat()
            }
            for trip in Trips.objects.filter(
                company__in=user_companies,
                status__in=['in_progress', 'completed'],
                created_at__gte=timezone.now() - timezone.timedelta(days=7)
            ).filter(
                Q(pre_trip_inspection_completed=False) | Q(post_trip_inspection_completed=False)
            )[:10]
        ],
        'maintenance': [
            {
                'id': maintenance.id,
                'vehicle_info': f"{maintenance.truck.unit_number}" if maintenance.truck else f"{maintenance.trailer.unit_number}",
                'maintenance_type': maintenance.maintenance_type,
                'scheduled_date': maintenance.scheduled_date.isoformat() if maintenance.scheduled_date else None,
                'status': maintenance.status,
                'priority': 'overdue' if maintenance.scheduled_date and maintenance.scheduled_date < today else 'upcoming'
            }
            for maintenance in maintenance_records.filter(
                Q(status='scheduled') & 
                (Q(scheduled_date__lte=today + timezone.timedelta(days=14)) | Q(scheduled_date__lt=today))
            ).order_by('scheduled_date')[:10]
        ]
    }


def generate_recent_activity(trips, inspections, maintenance_records):
    """Generate recent activity feed"""
    activities = []
    
    # Recent trip completions
    recent_trips = trips.filter(
        status='completed',
        actual_end_date__gte=timezone.now() - timezone.timedelta(days=7)
    ).order_by('-actual_end_date')[:5]
    
    for trip in recent_trips:
        activities.append({
            'id': f'trip-{trip.id}',
            'type': 'trip',
            'message': f"Trip {trip.id} completed by {trip.driver.first_name} {trip.driver.last_name}",
            'timestamp': trip.actual_end_date.isoformat(),
            'icon': '✅'
        })
    
    # Recent inspections
    recent_inspections = inspections.filter(
        completed_at__gte=timezone.now() - timezone.timedelta(days=7)
    ).order_by('-completed_at')[:5]
    
    for inspection in recent_inspections:
        activities.append({
            'id': f'inspection-{inspection.id}',
            'type': 'inspection',
            'message': f"{inspection.inspection_type.title()} inspection completed for Trip {inspection.trip.id}",
            'timestamp': inspection.completed_at.isoformat(),
            'icon': '🔍'
        })
    
    # Recent maintenance
    recent_maintenance = maintenance_records.filter(
        status='completed',
        completion_date__gte=timezone.now() - timezone.timedelta(days=7)
    ).order_by('-completion_date')[:5]
    
    for maintenance in recent_maintenance:
        vehicle_name = f"{maintenance.truck.unit_number}" if maintenance.truck else f"{maintenance.trailer.unit_number}"
        activities.append({
            'id': f'maintenance-{maintenance.id}',
            'type': 'maintenance',
            'message': f"Maintenance completed on {vehicle_name} - {maintenance.maintenance_type}",
            'timestamp': maintenance.completion_date.isoformat(),
            'icon': '🔧'
        })
    
    # Sort all activities by timestamp (most recent first)
    activities.sort(key=lambda x: x['timestamp'], reverse=True)
    
    return activities[:15]  # Return top 15 most recent activities

