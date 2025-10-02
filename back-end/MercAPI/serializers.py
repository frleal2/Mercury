from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Driver, Truck, Company, Trailer, Application, DriverTest, DriverHOS  # Import additional models


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

class DriverSerializer(serializers.ModelSerializer):
    tests = DriverTestSerializer(many=True, read_only=True)  # Include related DriverTest data

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

class ApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = '__all__'

class DriverHOSSerializer(serializers.ModelSerializer):
    class Meta:
        model = DriverHOS
        fields = '__all__'