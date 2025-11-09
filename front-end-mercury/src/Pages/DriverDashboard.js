import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import PreTripInspection from '../components/PreTripInspection';
import PostTripInspection from '../components/PostTripInspection';
import { 
  TruckIcon,
  ClockIcon,
  MapPinIcon,
  PlayIcon,
  StopIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

function DriverDashboard() {
  const { session, refreshAccessToken } = useSession();
  const [activeTrips, setActiveTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [inspectionType, setInspectionType] = useState(null); // 'pre_trip' or 'post_trip'

  useEffect(() => {
    fetchActiveTrips();
  }, []);

  const fetchActiveTrips = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/driver/active-trips/`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });
      setActiveTrips(response.data.trips || []);
    } catch (error) {
      console.error('Error fetching active trips:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      } else {
        setMessage({ type: 'error', text: 'Failed to load your trips' });
      }
    } finally {
      setLoading(false);
    }
  };

  const startTrip = async (tripId) => {
    try {
      const response = await axios.post(`${BASE_URL}/api/trips/${tripId}/start/`, {}, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });
      
      setMessage({ type: 'success', text: 'Trip started successfully!' });
      fetchActiveTrips(); // Refresh trips
    } catch (error) {
      console.error('Error starting trip:', error);
      const errorMessage = error.response?.data?.error || 'Failed to start trip';
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  const completeTrip = async (tripId) => {
    try {
      const response = await axios.post(`${BASE_URL}/api/trips/${tripId}/complete/`, {}, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });
      
      setMessage({ type: 'success', text: 'Trip completed successfully!' });
      fetchActiveTrips(); // Refresh trips
    } catch (error) {
      console.error('Error completing trip:', error);
      const errorMessage = error.response?.data?.error || 'Failed to complete trip';
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  const openInspectionModal = (trip, type) => {
    setSelectedTrip(trip);
    setInspectionType(type);
    setInspectionModalOpen(true);
  };

  const closeInspectionModal = () => {
    setSelectedTrip(null);
    setInspectionType(null);
    setInspectionModalOpen(false);
    fetchActiveTrips(); // Refresh trips after inspection
  };

  const handleInspectionComplete = (inspectionType) => {
    setMessage({ 
      type: 'success', 
      text: `${inspectionType.replace('_', '-')} inspection completed successfully!` 
    });
    closeInspectionModal();
    fetchActiveTrips(); // Refresh trips to update status
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return ClockIcon;
      case 'in_progress':
        return PlayIcon;
      case 'completed':
        return CheckCircleIcon;
      default:
        return ClockIcon;
    }
  };

  const clearMessage = () => {
    setMessage(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading your trips...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Trips</h1>
        <p className="text-gray-600">Your assigned trips and inspection workflows</p>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <div className="flex justify-between items-center">
            <span>{message.text}</span>
            <button 
              onClick={clearMessage}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Active Trips */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {activeTrips.length} Active Trip{activeTrips.length !== 1 ? 's' : ''}
          </h2>
        </div>
        
        {activeTrips.length === 0 ? (
          <div className="text-center py-8">
            <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No active trips</h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have any scheduled or in-progress trips at the moment.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {activeTrips.map((trip) => {
              const StatusIcon = getStatusIcon(trip.status);
              
              return (
                <div key={trip.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <TruckIcon className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-medium text-gray-900">
                            {trip.trip_number || `Trip #${trip.id}`}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {trip.status_display}
                          </span>
                        </div>
                        
                        <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                          <div className="flex items-center">
                            <TruckIcon className="h-4 w-4 mr-1" />
                            {trip.truck_number}
                            {trip.trailer_number && (
                              <span className="ml-1">+ {trip.trailer_number}</span>
                            )}
                          </div>
                          <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {trip.scheduled_start_date ? 
                              new Date(trip.scheduled_start_date).toLocaleDateString() :
                              new Date(trip.start_time).toLocaleDateString()
                            }
                          </div>
                        </div>
                        
                        <div className="mt-2 flex items-center space-x-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            <MapPinIcon className="h-4 w-4 text-green-500 mr-1" />
                            {trip.origin_display}
                          </div>
                          <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                          <div className="flex items-center">
                            <MapPinIcon className="h-4 w-4 text-red-500 mr-1" />
                            {trip.destination_display}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      {/* Pre-trip Inspection */}
                      {trip.status === 'scheduled' && !trip.pre_trip_inspection_completed && (
                        <button
                          onClick={() => openInspectionModal(trip, 'pre_trip')}
                          className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                        >
                          <ClipboardDocumentCheckIcon className="h-4 w-4 mr-2" />
                          Pre-Trip Inspection
                        </button>
                      )}
                      
                      {/* Start Trip */}
                      {trip.can_start && (
                        <button
                          onClick={() => startTrip(trip.id)}
                          className="inline-flex items-center px-3 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100"
                        >
                          <PlayIcon className="h-4 w-4 mr-2" />
                          Start Trip
                        </button>
                      )}
                      
                      {/* Post-trip Inspection */}
                      {trip.status === 'in_progress' && !trip.post_trip_inspection_completed && (
                        <button
                          onClick={() => openInspectionModal(trip, 'post_trip')}
                          className="inline-flex items-center px-3 py-2 border border-orange-300 rounded-md text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100"
                        >
                          <ClipboardDocumentCheckIcon className="h-4 w-4 mr-2" />
                          Post-Trip Inspection
                        </button>
                      )}
                      
                      {/* Complete Trip */}
                      {trip.can_complete && trip.post_trip_inspection_completed && (
                        <button
                          onClick={() => completeTrip(trip.id)}
                          className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
                        >
                          <StopIcon className="h-4 w-4 mr-2" />
                          Complete Trip
                        </button>
                      )}
                      
                      {/* Inspection Status Indicators */}
                      <div className="flex space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          trip.pre_trip_inspection_completed 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          Pre-trip {trip.pre_trip_inspection_completed ? '✓' : '○'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          trip.post_trip_inspection_completed 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          Post-trip {trip.post_trip_inspection_completed ? '✓' : '○'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pre-Trip Inspection Modal */}
      {inspectionModalOpen && selectedTrip && inspectionType === 'pre_trip' && (
        <PreTripInspection
          isOpen={inspectionModalOpen}
          onClose={closeInspectionModal}
          tripId={selectedTrip.id}
          onInspectionComplete={handleInspectionComplete}
        />
      )}

      {/* Post-Trip Inspection Modal */}
      {inspectionModalOpen && selectedTrip && inspectionType === 'post_trip' && (
        <PostTripInspection
          isOpen={inspectionModalOpen}
          onClose={closeInspectionModal}
          tripId={selectedTrip.id}
          onInspectionComplete={handleInspectionComplete}
        />
      )}
    </div>
  );
}

export default DriverDashboard;