import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import PreTripInspection from '../components/PreTripInspection';
import PostTripInspection from '../components/PostTripInspection';
import PreTripDVIRReview from '../components/PreTripDVIRReview';
import RepairCertificationModal from '../components/RepairCertificationModal';
import { 
  TruckIcon,
  ClockIcon,
  MapPinIcon,
  PlayIcon,
  StopIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
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
  const [dvirReviewModalOpen, setDvirReviewModalOpen] = useState(false);
  const [repairCertificationModalOpen, setRepairCertificationModalOpen] = useState(false);
  const [completedInspection, setCompletedInspection] = useState(null);

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

  const handleStartTripClick = (trip) => {
    // First step: Show DVIR Review modal
    setSelectedTrip(trip);
    setDvirReviewModalOpen(true);
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

  const handleDVIRReviewCompleted = () => {
    setDvirReviewModalOpen(false);
    // Refresh trips to update the button state (DVIR reviewed = true)
    fetchActiveTrips();
  };

  const handleInspectionCompleted = (inspectionData) => {
    setInspectionModalOpen(false);
    
    if (inspectionType === 'pre_trip') {
      // After pre-trip inspection, start the trip
      startTrip(selectedTrip.id);
    } else if (inspectionType === 'post_trip') {
      // Check if defects were found
      setCompletedInspection(inspectionData);
      const hasDefects = inspectionData.overall_status !== 'satisfactory' || inspectionData.issues_found;
      
      if (hasDefects) {
        // Show repair certification modal for defects
        setRepairCertificationModalOpen(true);
      } else {
        // No defects, complete the trip
        completeTrip(selectedTrip.id);
      }
    }
  };

  const handleRepairCertificationCompleted = () => {
    setRepairCertificationModalOpen(false);
    // Complete the trip after repair certification
    completeTrip(selectedTrip.id);
  };

  const closeDVIRModal = () => {
    setDvirReviewModalOpen(false);
    setSelectedTrip(null);
  };

  const closeRepairCertificationModal = () => {
    setRepairCertificationModalOpen(false);
    setCompletedInspection(null);
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
      <div className="flex flex-col justify-center items-center h-64 px-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-3 text-sm sm:text-base text-gray-600 text-center">Loading your trips...</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Trips</h1>
        <p className="text-sm sm:text-base text-gray-600">Your assigned trips and inspection workflows</p>
      </div>

      {message && (
        <div className={`mb-3 sm:mb-4 p-3 sm:p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <div className="flex justify-between items-start">
            <span className="text-sm sm:text-base pr-2">{message.text}</span>
            <button 
              onClick={clearMessage}
              className="text-gray-500 hover:text-gray-700 flex-shrink-0 p-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Active Trips */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden mx-auto max-w-4xl">
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-medium text-gray-900">
            {activeTrips.length} Active Trip{activeTrips.length !== 1 ? 's' : ''}
          </h2>
        </div>
        
        {activeTrips.length === 0 ? (
          <div className="text-center py-6 sm:py-8 px-3">
            <TruckIcon className="mx-auto h-10 sm:h-12 w-10 sm:w-12 text-gray-400" />
            <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900">No active trips</h3>
            <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
              You don't have any scheduled or in-progress trips at the moment.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {activeTrips.map((trip) => {
              const StatusIcon = getStatusIcon(trip.status);
              
              return (
                <div key={trip.id} className="p-3 sm:p-6 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                  {/* Mobile Layout - Stack vertically */}
                  <div className="space-y-4 sm:space-y-0 sm:flex sm:items-start sm:justify-between">
                    <div className="flex items-start space-x-3 sm:space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <TruckIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-1 sm:space-y-0">
                          <h3 className="text-base sm:text-lg font-medium text-gray-900">
                            {trip.trip_number || `Trip #${trip.id}`}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${getStatusColor(trip.status)}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {trip.status_display}
                          </span>
                        </div>
                        
                        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-1 sm:space-y-0 text-xs sm:text-sm text-gray-500">
                          <div className="flex items-center">
                            <TruckIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">
                              {trip.truck_number}
                              {trip.trailer_number && (
                                <span className="ml-1">+ {trip.trailer_number}</span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                            {trip.scheduled_start_date ? 
                              new Date(trip.scheduled_start_date).toLocaleDateString() :
                              new Date(trip.start_time).toLocaleDateString()
                            }
                          </div>
                        </div>
                        
                        {/* Mobile-friendly route display */}
                        <div className="mt-2 space-y-1 text-xs sm:text-sm text-gray-600">
                          <div className="flex items-start">
                            <MapPinIcon className="h-4 w-4 text-green-500 mr-1 flex-shrink-0 mt-0.5" />
                            <span className="text-green-700 font-medium">From:</span>
                            <span className="ml-1 break-words">{trip.origin_display}</span>
                          </div>
                          <div className="flex items-start">
                            <MapPinIcon className="h-4 w-4 text-red-500 mr-1 flex-shrink-0 mt-0.5" />
                            <span className="text-red-700 font-medium">To:</span>
                            <span className="ml-1 break-words">{trip.destination_display}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Mobile-friendly actions section */}
                    <div className="w-full sm:w-auto space-y-3">
                      {/* Action buttons - full width on mobile */}
                      <div className="flex flex-col space-y-2 sm:space-y-2">
                        {/* Trip Actions Based on Status */}
                        {trip.status === 'scheduled' && !trip.last_dvir_reviewed ? (
                          <button
                            onClick={() => handleStartTripClick(trip)}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 sm:py-2 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 touch-manipulation"
                          >
                            <DocumentTextIcon className="h-4 w-4 mr-2" />
                            Review DVIR
                          </button>
                        ) : trip.status === 'scheduled' && trip.last_dvir_reviewed && !trip.pre_trip_inspection_completed ? (
                          <button
                            onClick={() => openInspectionModal(trip, 'pre_trip')}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 sm:py-2 border border-green-300 rounded-lg text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 touch-manipulation"
                          >
                            <ClipboardDocumentCheckIcon className="h-4 w-4 mr-2" />
                            Start Pre-Inspection
                          </button>
                        ) : trip.status === 'scheduled' && trip.can_start && trip.pre_trip_inspection_completed ? (
                          <button
                            onClick={() => startTrip(trip.id)}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 sm:py-2 border border-green-300 rounded-lg text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 touch-manipulation"
                          >
                            <PlayIcon className="h-4 w-4 mr-2" />
                            Start Trip
                          </button>
                        ) : trip.status === 'failed_inspection' ? (
                          <div className="text-center py-2 px-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700 font-medium">Inspection Failed</p>
                            <p className="text-xs text-red-600">Contact your supervisor - vehicle cannot be operated</p>
                          </div>
                        ) : trip.status === 'maintenance_hold' ? (
                          <div className="text-center py-2 px-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-700 font-medium">Trip on Maintenance Hold</p>
                            <p className="text-xs text-yellow-600">Vehicle requires repairs before operation</p>
                          </div>
                        ) : null}
                        
                        {/* Post-trip Inspection */}
                        {trip.status === 'in_progress' && !trip.post_trip_inspection_completed && (
                          <button
                            onClick={() => openInspectionModal(trip, 'post_trip')}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 sm:py-2 border border-orange-300 rounded-lg text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 touch-manipulation"
                          >
                            <ClipboardDocumentCheckIcon className="h-4 w-4 mr-2" />
                            Post-Trip Inspection
                          </button>
                        )}
                        
                        {/* Complete Trip */}
                        {trip.can_complete && trip.post_trip_inspection_completed && (
                          <button
                            onClick={() => completeTrip(trip.id)}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 sm:py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 touch-manipulation"
                          >
                            <StopIcon className="h-4 w-4 mr-2" />
                            Complete Trip
                          </button>
                        )}
                      </div>
                      
                      {/* Inspection Status Indicators - responsive layout */}
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
                          trip.pre_trip_inspection_completed 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          Pre-trip {trip.pre_trip_inspection_completed ? '✓' : '○'}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
                          trip.post_trip_inspection_completed 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          Post-trip {trip.post_trip_inspection_completed ? '✓' : '○'}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
                          trip.last_dvir_reviewed 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          DVIR Review {trip.last_dvir_reviewed ? '✓' : '○'}
                        </span>
                        
                        {/* Workflow step indicator */}
                        {trip.status === 'scheduled' && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {!trip.last_dvir_reviewed ? 'Step 1: Review DVIR' :
                             !trip.pre_trip_inspection_completed ? 'Step 2: Pre-Inspection' :
                             'Ready to Start'}
                          </span>
                        )}
                        {trip.status === 'maintenance_hold' && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                            🔧 Maintenance Hold - Repairs Needed
                          </span>
                        )}
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
          onInspectionComplete={handleInspectionCompleted}
        />
      )}

      {/* Post-Trip Inspection Modal */}
      {inspectionModalOpen && selectedTrip && inspectionType === 'post_trip' && (
        <PostTripInspection
          isOpen={inspectionModalOpen}
          onClose={closeInspectionModal}
          tripId={selectedTrip.id}
          onInspectionComplete={handleInspectionCompleted}
        />
      )}

      {/* Pre-Trip DVIR Review Modal */}
      {dvirReviewModalOpen && selectedTrip && (
        <PreTripDVIRReview
          isOpen={dvirReviewModalOpen}
          onClose={closeDVIRModal}
          trip={selectedTrip}
          onReviewCompleted={handleDVIRReviewCompleted}
        />
      )}

      {/* Repair Certification Modal */}
      {repairCertificationModalOpen && completedInspection && (
        <RepairCertificationModal
          isOpen={repairCertificationModalOpen}
          onClose={closeRepairCertificationModal}
          inspection={completedInspection}
          onRepairCompleted={handleRepairCertificationCompleted}
        />
      )}
    </div>
  );
}

export default DriverDashboard;