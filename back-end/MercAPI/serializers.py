from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Driver, Truck, Company, Trailer, DriverTest, DriverHOS, DriverApplication, MaintenanceCategory, MaintenanceType, MaintenanceRecord, MaintenanceAttachment, DriverDocument, Inspection, InspectionItem, Trips, UserProfile, TripInspection, TripInspectionRepairCertification, TripDocument, QualifiedInspector, AnnualInspection, VehicleOperationStatus


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


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'role_display', 
                 'tenant', 'companies', 'is_company_admin', 'profile_image', 'created_at']
        read_only_fields = ['id', 'created_at']


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
    has_user_account = serializers.BooleanField(read_only=True)
    can_access_portal = serializers.BooleanField(read_only=True)
    username = serializers.CharField(source='user_account.username', read_only=True)

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
    company_name = serializers.CharField(source='company.name', read_only=True)
    truck_license_plate = serializers.CharField(source='truck.license_plate', read_only=True)
    truck_unit_number = serializers.CharField(source='truck.unit_number', read_only=True)
    
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


class InspectionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InspectionItem
        fields = '__all__'


class InspectionSerializer(serializers.ModelSerializer):
    items = InspectionItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Inspection
        fields = '__all__'


class TripsSerializer(serializers.ModelSerializer):
    driver_name = serializers.CharField(source='driver.get_full_name', read_only=True)
    truck_number = serializers.CharField(source='truck.truck_number', read_only=True)
    trailer_number = serializers.CharField(source='trailer.trailer_number', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    origin_display = serializers.CharField(source='get_origin_display', read_only=True)
    destination_display = serializers.CharField(source='get_destination_display', read_only=True)
    duration_hours = serializers.SerializerMethodField()
    total_miles = serializers.SerializerMethodField()
    can_start = serializers.SerializerMethodField()
    can_complete = serializers.SerializerMethodField()
    compliance_issues = serializers.SerializerMethodField()
    
    # Frontend form fields (write-only for trip creation)
    planned_departure = serializers.CharField(write_only=True, required=False)  # Accept date string
    planned_arrival = serializers.CharField(write_only=True, required=False)    # Accept date string
    origin = serializers.CharField(write_only=True, required=False)
    destination = serializers.CharField(write_only=True, required=False)
    load_description = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = Trips
        fields = [
            # Model fields
            'id', 'company', 'driver', 'truck', 'trailer', 'trip_number', 'origin', 'destination',
            'pre_trip_inspection', 'post_trip_inspection', 'start_time', 'end_time', 
            'start_location', 'end_location', 'miles_driven', 'notes',
            'scheduled_start_date', 'scheduled_end_date', 'actual_start_date', 'actual_end_date',
            'status', 'pre_trip_inspection_completed', 'post_trip_inspection_completed',
            'mileage_start', 'mileage_end', 'created_by', 'created_at', 'updated_at',
            # SerializerMethodFields (read-only)
            'driver_name', 'truck_number', 'trailer_number', 'company_name', 'status_display',
            'origin_display', 'destination_display', 'duration_hours', 'total_miles',
            'can_start', 'can_complete', 'compliance_issues',
            # Write-only fields for frontend forms
            'planned_departure', 'planned_arrival', 'load_description'
        ]
    
    def get_duration_hours(self, obj):
        return obj.get_duration_hours()
    
    def get_total_miles(self, obj):
        return obj.get_total_miles()
    
    def get_can_start(self, obj):
        return obj.can_start_trip()
    
    def get_can_complete(self, obj):
        return obj.can_complete_trip()
    
    def get_compliance_issues(self, obj):
        return obj.get_compliance_issues()
    
    def create(self, validated_data):
        """
        Custom create method to handle frontend form data mapping
        """
        from datetime import datetime
        from django.utils import timezone
        
        # Extract frontend-specific fields
        planned_departure = validated_data.pop('planned_departure', None)
        planned_arrival = validated_data.pop('planned_arrival', None)
        origin = validated_data.pop('origin', None)
        destination = validated_data.pop('destination', None)
        load_description = validated_data.pop('load_description', None)
        
        # Map to backend fields
        if planned_departure:
            # Convert date string to datetime for start_time and scheduled_start_date
            if isinstance(planned_departure, str):
                try:
                    departure_date = datetime.fromisoformat(planned_departure.replace('Z', '+00:00'))
                    validated_data['start_time'] = departure_date
                    validated_data['scheduled_start_date'] = departure_date
                except ValueError:
                    # If it's just a date string, add time
                    departure_date = datetime.strptime(planned_departure, '%Y-%m-%d')
                    departure_date = timezone.make_aware(departure_date)
                    validated_data['start_time'] = departure_date
                    validated_data['scheduled_start_date'] = departure_date
            else:
                validated_data['start_time'] = planned_departure
                validated_data['scheduled_start_date'] = planned_departure
        
        if planned_arrival:
            # Convert date string to datetime for scheduled_end_date
            if isinstance(planned_arrival, str):
                try:
                    arrival_date = datetime.fromisoformat(planned_arrival.replace('Z', '+00:00'))
                    validated_data['scheduled_end_date'] = arrival_date
                except ValueError:
                    # If it's just a date string, add end of day time
                    arrival_date = datetime.strptime(planned_arrival, '%Y-%m-%d')
                    arrival_date = arrival_date.replace(hour=23, minute=59, second=59)
                    arrival_date = timezone.make_aware(arrival_date)
                    validated_data['scheduled_end_date'] = arrival_date
            else:
                validated_data['scheduled_end_date'] = planned_arrival
        
        # Map origin/destination to start_location/end_location
        if origin:
            validated_data['start_location'] = origin
        if destination:
            validated_data['end_location'] = destination
            
        # Handle load description in notes if provided
        if load_description:
            existing_notes = validated_data.get('notes', '')
            if existing_notes:
                validated_data['notes'] = f"Load: {load_description}\n\n{existing_notes}"
            else:
                validated_data['notes'] = f"Load: {load_description}"
        
        return super().create(validated_data)


class TripInspectionSerializer(serializers.ModelSerializer):
    trip_number = serializers.CharField(source='trip.trip_number', read_only=True)
    trip_id = serializers.CharField(source='trip.id', read_only=True)
    inspection_type_display = serializers.CharField(source='get_inspection_type_display', read_only=True)
    completed_by_name = serializers.CharField(source='completed_by.get_full_name', read_only=True)
    is_inspection_passed = serializers.SerializerMethodField()
    
    # Vehicle identification for CFR 396.11 compliance
    truck_info = serializers.SerializerMethodField()
    trailer_info = serializers.SerializerMethodField()
    
    # CFR 396.11 compliance summary
    cfr_compliance_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = TripInspection
        fields = '__all__'
        read_only_fields = ['completed_at', 'completed_by']
    
    def get_is_inspection_passed(self, obj):
        return obj.is_passed()
    
    def get_truck_info(self, obj):
        """Vehicle identification required by CFR 396.11"""
        if obj.trip.truck:
            return {
                'unit_number': obj.trip.truck.unit_number,
                'license_plate': obj.trip.truck.license_plate,
                'vin': obj.trip.truck.vin,
                'make': obj.trip.truck.make,
                'model': obj.trip.truck.model,
                'year': obj.trip.truck.year
            }
        return None
    
    def get_trailer_info(self, obj):
        """Trailer identification if applicable"""
        if obj.trip.trailer:
            return {
                'unit_number': obj.trip.trailer.unit_number,
                'license_plate': obj.trip.trailer.license_plate,
                'trailer_type': obj.trip.trailer.trailer_type,
                'model': obj.trip.trailer.model
            }
        return None
    
    def get_cfr_compliance_summary(self, obj):
        """Summary of CFR 396.11 required inspections"""
        cfr_items = {
            'Service Brakes': obj.service_brakes,
            'Parking Brake': obj.parking_brake,
            'Steering Mechanism': obj.steering_mechanism,
            'Lighting Devices': obj.lighting_devices,
            'Tires': obj.tires_condition,
            'Horn': obj.horn,
            'Windshield Wipers': obj.windshield_wipers,
            'Rear Vision Mirrors': obj.rear_vision_mirrors,
            'Coupling Devices': obj.coupling_devices,
            'Wheels and Rims': obj.wheels_and_rims,
            'Emergency Equipment': obj.emergency_equipment,
        }
        
        # Add trailer items if applicable
        if obj.trip.trailer:
            trailer_items = {
                'Trailer Attached Properly': obj.trailer_attached_properly,
                'Trailer Lights Working': obj.trailer_lights_working,
                'Cargo Secured': obj.cargo_secured,
            }
            cfr_items.update(trailer_items)
        
        return cfr_items


class TripInspectionRepairCertificationSerializer(serializers.ModelSerializer):
    inspection_details = serializers.SerializerMethodField()
    certified_by_name = serializers.CharField(source='certified_by.get_full_name', read_only=True)
    
    class Meta:
        model = TripInspectionRepairCertification
        fields = '__all__'
        read_only_fields = ['certified_at', 'created_at']
    
    def get_inspection_details(self, obj):
        return {
            'trip_id': obj.inspection.trip.id,
            'trip_number': obj.inspection.trip.trip_number,
            'inspection_type': obj.inspection.get_inspection_type_display(),
            'inspection_date': obj.inspection.completed_at,
        }


class TripDocumentSerializer(serializers.ModelSerializer):
    trip_number = serializers.CharField(source='trip.trip_number', read_only=True)
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = TripDocument
        fields = '__all__'
        read_only_fields = ['uploaded_at', 'uploaded_by']
    
    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None


class QualifiedInspectorSerializer(serializers.ModelSerializer):
    inspector_type_display = serializers.CharField(source='get_inspector_type_display', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    is_certification_valid = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = QualifiedInspector
        fields = '__all__'
        read_only_fields = ['created_at']


class AnnualInspectionSerializer(serializers.ModelSerializer):
    inspector_name = serializers.CharField(source='inspector.name', read_only=True)
    inspector_certification = serializers.CharField(source='inspector.certification_number', read_only=True)
    vehicle_identifier = serializers.CharField(read_only=True)
    inspection_result_display = serializers.CharField(source='get_inspection_result_display', read_only=True)
    is_current = serializers.BooleanField(read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True)
    truck_info = serializers.SerializerMethodField()
    trailer_info = serializers.SerializerMethodField()
    inspection_report_url = serializers.SerializerMethodField()
    
    class Meta:
        model = AnnualInspection
        fields = '__all__'
        read_only_fields = ['next_inspection_due', 'compliant_until', 'created_at', 'updated_at']
    
    def get_truck_info(self, obj):
        if obj.truck:
            return {
                'unit_number': obj.truck.unit_number,
                'license_plate': obj.truck.license_plate,
                'vin': obj.truck.vin,
                'make': obj.truck.make,
                'model': obj.truck.model,
                'year': obj.truck.year
            }
        return None
    
    def get_trailer_info(self, obj):
        if obj.trailer:
            return {
                'unit_number': obj.trailer.unit_number,
                'license_plate': obj.trailer.license_plate,
                'trailer_type': obj.trailer.trailer_type,
                'model': obj.trailer.model
            }
        return None
    
    def get_inspection_report_url(self, obj):
        if obj.inspection_report_pdf:
            return obj.inspection_report_pdf.url
        return None


class VehicleOperationStatusSerializer(serializers.ModelSerializer):
    vehicle_identifier = serializers.CharField(read_only=True)
    current_status_display = serializers.CharField(source='get_current_status_display', read_only=True)
    status_set_by_name = serializers.CharField(source='status_set_by.get_full_name', read_only=True)
    can_operate = serializers.BooleanField(read_only=True)
    truck_info = serializers.SerializerMethodField()
    trailer_info = serializers.SerializerMethodField()
    related_inspection_info = serializers.SerializerMethodField()
    
    class Meta:
        model = VehicleOperationStatus
        fields = '__all__'
        read_only_fields = ['status_set_at', 'created_at', 'updated_at']
    
    def get_truck_info(self, obj):
        if obj.truck:
            return {
                'unit_number': obj.truck.unit_number,
                'license_plate': obj.truck.license_plate,
                'vin': obj.truck.vin,
                'make': obj.truck.make,
                'model': obj.truck.model
            }
        return None
    
    def get_trailer_info(self, obj):
        if obj.trailer:
            return {
                'unit_number': obj.trailer.unit_number,
                'license_plate': obj.trailer.license_plate,
                'trailer_type': obj.trailer.trailer_type,
                'model': obj.trailer.model
            }
        return None
    
    def get_related_inspection_info(self, obj):
        if obj.related_inspection:
            return {
                'inspection_type': obj.related_inspection.get_inspection_type_display(),
                'inspection_date': obj.related_inspection.completed_at,
                'trip_id': obj.related_inspection.trip.id,
                'trip_number': obj.related_inspection.trip.trip_number
            }
        return None