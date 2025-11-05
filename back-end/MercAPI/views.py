import logging
import boto3
from botocore.exceptions import NoCredentialsError
from django.conf import settings
from .serializers import UserSerializer, DriverSerializer, TruckSerializer, CompanySerializer, TrailerSerializer, DriverTestSerializer, DriverHOSSerializer, DriverApplicationSerializer, MaintenanceCategorySerializer, MaintenanceTypeSerializer, MaintenanceRecordSerializer, MaintenanceAttachmentSerializer, DriverDocumentSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import Driver, Truck, Company, Trailer, DriverTest, DriverHOS, DriverApplication, MaintenanceCategory, MaintenanceType, MaintenanceRecord, MaintenanceAttachment, DriverDocument
from rest_framework.serializers import ValidationError
from rest_framework import serializers
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
import mimetypes
import os

logger = logging.getLogger(__name__)

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

class CustomTokenObtainPairView(TokenObtainPairView):
    # Optionally, you can override methods or serializers here if needed
    pass

class DriverViewSet(ModelViewSet):
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer

    def list(self, request, *args, **kwargs):
        logger.debug("Fetching all drivers with their test history")
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

class TruckViewSet(ModelViewSet):
    queryset = Truck.objects.all()
    serializer_class = TruckSerializer
    permission_classes = [IsAuthenticated]

class CompanyViewSet(ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]

class TrailerViewSet(ModelViewSet):
    queryset = Trailer.objects.all()
    serializer_class = TrailerSerializer
    permission_classes = [IsAuthenticated]


class DriverApplicationViewSet(ModelViewSet):
    queryset = DriverApplication.objects.all()
    serializer_class = DriverApplicationSerializer
    permission_classes = [AllowAny]
    
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

class DriverTestViewSet(ModelViewSet):
    queryset = DriverTest.objects.all()
    serializer_class = DriverTestSerializer
    permission_classes = [IsAuthenticated]

class DriverHOSViewSet(ModelViewSet):
    queryset = DriverHOS.objects.all()
    serializer_class = DriverHOSSerializer
    permission_classes = [IsAuthenticated]

class MaintenanceCategoryViewSet(ModelViewSet):
    queryset = MaintenanceCategory.objects.all()
    serializer_class = MaintenanceCategorySerializer
    permission_classes = [IsAuthenticated]

class MaintenanceTypeViewSet(ModelViewSet):
    queryset = MaintenanceType.objects.all()
    serializer_class = MaintenanceTypeSerializer
    permission_classes = [IsAuthenticated]

class MaintenanceRecordViewSet(ModelViewSet):
    queryset = MaintenanceRecord.objects.all()
    serializer_class = MaintenanceRecordSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = MaintenanceRecord.objects.all()
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

class MaintenanceAttachmentViewSet(ModelViewSet):
    queryset = MaintenanceAttachment.objects.all()
    serializer_class = MaintenanceAttachmentSerializer
    permission_classes = [IsAuthenticated]

class DriverDocumentViewSet(ModelViewSet):
    queryset = DriverDocument.objects.all()
    serializer_class = DriverDocumentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = DriverDocument.objects.all()
        driver_id = self.request.query_params.get('driver_id', None)
        document_type = self.request.query_params.get('document_type', None)
        
        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
        
        if document_type:
            queryset = queryset.filter(document_type=document_type)
            
        return queryset.order_by('-uploaded_at')

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

