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
from .serializers import UserSerializer, DriverSerializer, TruckSerializer, CompanySerializer, TrailerSerializer, DriverTestSerializer, DriverHOSSerializer, DriverApplicationSerializer, MaintenanceCategorySerializer, MaintenanceTypeSerializer, MaintenanceRecordSerializer, MaintenanceAttachmentSerializer, DriverDocumentSerializer, InspectionSerializer, InspectionItemSerializer, TripsSerializer
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
from .models import Driver, Truck, Company, Trailer, DriverTest, DriverHOS, DriverApplication, MaintenanceCategory, MaintenanceType, MaintenanceRecord, MaintenanceAttachment, DriverDocument, Tenant, UserProfile, Inspection, InspectionItem, Trips, InvitationToken
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
        # Check if user is company admin
        if not hasattr(request.user, 'profile') or not request.user.profile.is_company_admin:
            return Response(
                {'error': 'Only company admins can view users'}, 
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
                'is_company_admin': user.profile.is_company_admin,
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

class CompanyViewSet(AdminOnlyMixin, CompanyFilterMixin, ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
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
    queryset = Trailer.objects.all()
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
@permission_classes([AllowAny])
def list_applications_with_files(request):
    """List all driver applications with file information"""
    try:
        applications = DriverApplication.objects.all().order_by('-created_at')
        
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
    Generate signed URL for application file download
    """
    try:
        logger.info(f"Download request: application_id={application_id}, file_type={file_type}")
        
        # Get the application
        application = DriverApplication.objects.get(id=application_id)
        
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
def get_latest_driver_test(request, driver_id):
    try:
        # Fetch the latest test for the given driver ID, ordered by completion_date
        latest_test = DriverTest.objects.filter(driver_id=driver_id, completion_date__isnull=False).order_by('-completion_date').first()
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
        driver_data = invitation_data.get('driver_data', {})
        
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
                # Link to existing driver record
                try:
                    driver = Driver.objects.get(id=driver_id, company__in=companies)
                    driver.user_account = new_user
                    driver.save()
                    driver_linked = True
                except Driver.DoesNotExist:
                    logger.warning(f"Driver {driver_id} not found when accepting invitation for {invitation.email}")
                    # Don't fail the invitation, just log the warning
                    
            elif create_new_driver and driver_data:
                # Create new driver record (Option 3: Simultaneous creation)
                try:
                    driver_company = companies.get(id=driver_data.get('company_id'))
                    new_driver = Driver.objects.create(
                        first_name=new_user.first_name,
                        last_name=new_user.last_name,
                        email=new_user.email,
                        phone=driver_data.get('phone'),
                        company=driver_company,
                        user_account=new_user,
                        # Optional fields with defaults
                        address=driver_data.get('address', ''),
                        city=driver_data.get('city', ''),
                        state=driver_data.get('state', ''),
                        zip_code=driver_data.get('zip_code', ''),
                        date_hired=driver_data.get('date_hired'),
                        license_number=driver_data.get('license_number', ''),
                        license_state=driver_data.get('license_state', ''),
                        license_expiry=driver_data.get('license_expiry'),
                        medical_cert_expiry=driver_data.get('medical_cert_expiry'),
                        # Default status
                        status='active'
                    )
                    driver_created = True
                    logger.info(f"Created new driver record {new_driver.id} for user {new_user.email}")
                except Exception as e:
                    logger.error(f"Failed to create driver record for {new_user.email}: {str(e)}")
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

