from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Driver, Truck, Company, Trailer, DriverTest, DriverHOS, DriverApplication, MaintenanceCategory, MaintenanceType, MaintenanceRecord, MaintenanceAttachment, DriverDocument


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'email', 'first_name', 'last_name']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user


class DriverTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = DriverTest
        fields = '__all__'

class DriverDocumentSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = DriverDocument
        fields = '__all__'
    
    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None

class DriverSerializer(serializers.ModelSerializer):
    tests = DriverTestSerializer(many=True, read_only=True)  # Include related DriverTest data
    documents = DriverDocumentSerializer(many=True, read_only=True)  # Include driver documents

    class Meta:
        model = Driver
        fields = '__all__'  # Ensure all fields are included

class TruckSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)  # Add company name field
    driver_name = serializers.CharField(source='driver.first_name', read_only=True)  # Add driver name field

    class Meta:
        model = Truck
        fields = '__all__'  # Serialize all fields of the Truck model
        extra_fields = ['company_name', 'driver_name']  # Include the company_name and driver_name fields


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'

class TrailerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trailer
        fields = '__all__'

class DriverApplicationSerializer(serializers.ModelSerializer):
    drivers_license_url = serializers.SerializerMethodField()
    medical_certificate_url = serializers.SerializerMethodField()
    
    class Meta:
        model = DriverApplication
        fields = '__all__'
    
    def get_drivers_license_url(self, obj):
        if obj.drivers_license:
            return obj.drivers_license.url
        return None
    
    def get_medical_certificate_url(self, obj):
        if obj.medical_certificate:
            return obj.medical_certificate.url
        return None

class DriverHOSSerializer(serializers.ModelSerializer):
    class Meta:
        model = DriverHOS
        fields = '__all__'

class MaintenanceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceCategory
        fields = '__all__'

class MaintenanceTypeSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = MaintenanceType
        fields = '__all__'

class MaintenanceAttachmentSerializer(serializers.ModelSerializer):
    file_type_display = serializers.CharField(source='get_file_type_display', read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = MaintenanceAttachment
        fields = '__all__'
    
    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None

class MaintenanceRecordSerializer(serializers.ModelSerializer):
    maintenance_type_name = serializers.CharField(source='get_maintenance_type_display', read_only=True)
    vehicle_identifier = serializers.CharField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    days_until_due = serializers.IntegerField(read_only=True)
    attachments = MaintenanceAttachmentSerializer(many=True, read_only=True)
    truck_info = serializers.SerializerMethodField()
    trailer_info = serializers.SerializerMethodField()
    
    class Meta:
        model = MaintenanceRecord
        fields = '__all__'
    
    def get_truck_info(self, obj):
        if obj.truck:
            return {
                'unit_number': obj.truck.unit_number,
                'license_plate': obj.truck.license_plate,
                'make': obj.truck.make,
                'model': obj.truck.model,
                'year': obj.truck.year
            }
        return None
    
    def get_trailer_info(self, obj):
        if obj.trailer:
            return {
                'license_plate': obj.trailer.license_plate,
                'model': obj.trailer.model
            }
        return None