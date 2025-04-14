from .models import Driver  # Corrected import
from .serializers import DriverSerializer
from django.http import JsonResponse
from rest_framework.decorators import api_view
from .serializers import DriverSerializer


def drivers(request):
    data = Driver.objects.all()
    serializer = DriverSerializer(data, many=True)
    return JsonResponse({'drivers': serializer.data}, safe=False)  # Fixed syntax and added safe=False