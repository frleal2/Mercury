from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Driver, Truck, Company, Trailer  # Import additional models


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


class DriverSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)  # Add company name field

    class Meta:
        model = Driver
        fields = '__all__'  # Serialize all fields of the Driver model
        extra_fields = ['company_name']  # Include the company_name field


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