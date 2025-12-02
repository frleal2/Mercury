# Simple dashboard functions to debug issues
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_simple(request):
    """
    Super simple dashboard to test basic functionality
    """
    try:
        logger.info(f"Simple dashboard: User {request.user.username} accessing")
        
        # Basic user check
        if not hasattr(request.user, 'profile'):
            return Response({
                'error': 'No user profile found',
                'user': request.user.username,
                'key_metrics': {
                    'total_drivers': 0,
                    'active_drivers': 0,
                    'total_vehicles': 0,
                    'active_vehicles': 0,
                    'active_trips': 0,
                    'completed_today': 0,
                    'inspection_pass_rate': 0,
                    'compliance_score': 0
                },
                'compliance_scores': {
                    'overall': 0,
                    'drivers': 0,
                    'vehicles': 0,
                    'operations': 0,
                    'trend': 'stable'
                },
                'critical_alerts': [],
                'action_items': {
                    'drivers': [],
                    'vehicles': [],
                    'inspections': [],
                    'maintenance': []
                },
                'recent_activity': []
            }, status=status.HTTP_200_OK)
        
        # Get user companies
        companies = request.user.profile.companies.all()
        
        if not companies.exists():
            return Response({
                'message': 'No companies assigned',
                'key_metrics': {
                    'total_drivers': 0,
                    'active_drivers': 0,
                    'total_vehicles': 0,
                    'active_vehicles': 0,
                    'active_trips': 0,
                    'completed_today': 0,
                    'inspection_pass_rate': 85.0,
                    'compliance_score': 90.0
                },
                'compliance_scores': {
                    'overall': 90.0,
                    'drivers': 95.0,
                    'vehicles': 85.0,
                    'operations': 90.0,
                    'trend': 'up'
                },
                'critical_alerts': [],
                'action_items': {
                    'drivers': [],
                    'vehicles': [],
                    'inspections': [],
                    'maintenance': []
                },
                'recent_activity': []
            }, status=status.HTTP_200_OK)

        # Return basic data with some mock metrics
        return Response({
            'message': 'Dashboard loaded successfully',
            'user': request.user.username,
            'companies': [{'id': c.id, 'name': c.name} for c in companies],
            'key_metrics': {
                'total_drivers': 5,
                'active_drivers': 4,
                'total_vehicles': 8,
                'active_vehicles': 7,
                'active_trips': 3,
                'completed_today': 2,
                'inspection_pass_rate': 87.5,
                'compliance_score': 92.0
            },
            'compliance_scores': {
                'overall': 92.0,
                'drivers': 94.0,
                'vehicles': 89.0,
                'operations': 93.0,
                'trend': 'up'
            },
            'critical_alerts': [
                {
                    'id': 'sample-alert-1',
                    'type': 'warning',
                    'title': 'Sample Alert',
                    'message': 'This is a sample alert for testing',
                    'priority': 'medium'
                }
            ],
            'action_items': {
                'drivers': [
                    {
                        'id': 1,
                        'first_name': 'John',
                        'last_name': 'Doe',
                        'action_needed': 'License renewal'
                    }
                ],
                'vehicles': [],
                'inspections': [],
                'maintenance': []
            },
            'recent_activity': [
                {
                    'id': 'activity-1',
                    'type': 'trip',
                    'message': 'Sample trip completed',
                    'timestamp': timezone.now().isoformat(),
                    'icon': '✅'
                }
            ]
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Simple dashboard error: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        return Response({
            'error': f'Dashboard error: {str(e)}',
            'key_metrics': {
                'total_drivers': 0,
                'active_drivers': 0,
                'total_vehicles': 0,
                'active_vehicles': 0,
                'active_trips': 0,
                'completed_today': 0,
                'inspection_pass_rate': 0,
                'compliance_score': 0
            },
            'compliance_scores': {
                'overall': 0,
                'drivers': 0,
                'vehicles': 0,
                'operations': 0,
                'trend': 'stable'
            },
            'critical_alerts': [],
            'action_items': {
                'drivers': [],
                'vehicles': [],
                'inspections': [],
                'maintenance': []
            },
            'recent_activity': []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)