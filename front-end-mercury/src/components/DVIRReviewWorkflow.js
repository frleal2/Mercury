import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import DVIRReviewModal from './DVIRReviewModal';
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  EyeIcon,
  UserIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

function DVIRReviewWorkflow() {
  const { session, refreshAccessToken } = useSession();
  const [pendingReviews, setPendingReviews] = useState([]);
  const [completedReviews, setCompletedReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchDVIRReviews();
  }, []);

  const fetchDVIRReviews = async () => {
    try {
      setLoading(true);
      
      // Fetch trips with their DVIR status
      const response = await axios.get(`${BASE_URL}/api/trips/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
        params: { include_compliance: true }
      });

      const trips = response.data;
      
      // Separate trips needing DVIR review from those already reviewed
      const pending = trips.filter(trip => 
        trip.status === 'completed' && 
        (!trip.post_trip_dvir_reviewed || !trip.pre_trip_dvir_reviewed)
      );
      
      const completed = trips.filter(trip => 
        trip.status === 'completed' && 
        trip.post_trip_dvir_reviewed && 
        trip.pre_trip_dvir_reviewed
      );

      setPendingReviews(pending);
      setCompletedReviews(completed);
      
    } catch (error) {
      console.error('Error fetching DVIR reviews:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReviewTrip = (trip) => {
    setSelectedTrip(trip);
    setIsReviewModalOpen(true);
  };

  const handleReviewCompleted = () => {
    setIsReviewModalOpen(false);
    setSelectedTrip(null);
    fetchDVIRReviews();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  const getDVIRStatus = (trip) => {
    const preReviewed = trip.pre_trip_dvir_reviewed;
    const postReviewed = trip.post_trip_dvir_reviewed;
    
    if (preReviewed && postReviewed) {
      return { 
        status: 'complete', 
        label: 'Review Complete', 
        icon: CheckCircleIcon, 
        color: 'text-green-600 bg-green-50 border-green-200' 
      };
    } else if (preReviewed || postReviewed) {
      return { 
        status: 'partial', 
        label: 'Partially Reviewed', 
        icon: ExclamationTriangleIcon, 
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200' 
      };
    } else {
      return { 
        status: 'pending', 
        label: 'Review Required', 
        icon: XCircleIcon, 
        color: 'text-red-600 bg-red-50 border-red-200' 
      };
    }
  };

  const getComplianceViolations = (trip) => {
    const violations = [];
    const daysSinceCompletion = trip.actual_end_date ? 
      Math.floor((new Date() - new Date(trip.actual_end_date)) / (1000 * 60 * 60 * 24)) : 0;

    if (!trip.pre_trip_dvir_reviewed && daysSinceCompletion > 0) {
      violations.push('CFR 396.13 - Pre-trip DVIR not reviewed within required timeframe');
    }
    
    if (!trip.post_trip_dvir_reviewed && daysSinceCompletion > 0) {
      violations.push('CFR 396.13 - Post-trip DVIR not reviewed within required timeframe');
    }

    return violations;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading DVIR reviews...</p>
      </div>
    );
  }

  const displayTrips = filter === 'pending' ? pendingReviews : completedReviews;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">DVIR Review Workflow</h1>
        <p className="text-gray-600">CFR 396.13 - Driver Vehicle Inspection Report Review Requirements</p>
      </div>

      {/* Compliance Alert */}
      {pendingReviews.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-red-800">CFR 396.13 Compliance Alert</h3>
              <p className="text-red-700 mt-1">
                {pendingReviews.length} trip(s) require DVIR review. Motor carriers must review driver vehicle inspection reports.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setFilter('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                filter === 'pending'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Reviews ({pendingReviews.length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                filter === 'completed'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Completed Reviews ({completedReviews.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Trip Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {displayTrips.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {filter === 'pending' ? 'No pending DVIR reviews' : 'No completed reviews'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'pending' 
                ? 'All completed trips have been reviewed for CFR 396.13 compliance.'
                : 'No DVIR reviews have been completed yet.'
              }
            </p>
          </div>
        ) : (
          displayTrips.map((trip) => {
            const dvirStatus = getDVIRStatus(trip);
            const violations = getComplianceViolations(trip);
            const StatusIcon = dvirStatus.icon;

            return (
              <div
                key={trip.id}
                className={`border rounded-lg p-6 hover:shadow-md transition-shadow ${dvirStatus.color}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Trip #{trip.id}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {trip.pickup_location} → {trip.destination}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <StatusIcon className={`h-6 w-6 mr-2 ${dvirStatus.color.split(' ')[0]}`} />
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      dvirStatus.status === 'complete' ? 'bg-green-500 text-white' :
                      dvirStatus.status === 'partial' ? 'bg-yellow-500 text-white' :
                      'bg-red-500 text-white'
                    }`}>
                      {dvirStatus.label}
                    </span>
                  </div>
                </div>

                {/* Trip Details */}
                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Driver:</span>
                      <p className="font-medium">{trip.driver_name || 'Not assigned'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Vehicle:</span>
                      <p className="font-medium">
                        {trip.truck_unit_number} / {trip.trailer_unit_number}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Completed:</span>
                      <p className="font-medium">{formatDate(trip.actual_end_date)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <p className="font-medium capitalize">{trip.status}</p>
                    </div>
                  </div>
                </div>

                {/* DVIR Review Status */}
                <div className="mb-4">
                  <div className="text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Pre-trip DVIR Review:</span>
                      <div className="flex items-center">
                        {trip.pre_trip_dvir_reviewed ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                        )}
                        <span className={trip.pre_trip_dvir_reviewed ? 'text-green-600' : 'text-red-600'}>
                          {trip.pre_trip_dvir_reviewed ? 'Completed' : 'Required'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Post-trip DVIR Review:</span>
                      <div className="flex items-center">
                        {trip.post_trip_dvir_reviewed ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                        )}
                        <span className={trip.post_trip_dvir_reviewed ? 'text-green-600' : 'text-red-600'}>
                          {trip.post_trip_dvir_reviewed ? 'Completed' : 'Required'}
                        </span>
                      </div>
                    </div>

                    {(trip.pre_trip_dvir_reviewed_at || trip.post_trip_dvir_reviewed_at) && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        {trip.pre_trip_dvir_reviewed_at && (
                          <p className="text-xs text-gray-500 flex items-center">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            Pre-trip reviewed: {formatDateTime(trip.pre_trip_dvir_reviewed_at)}
                          </p>
                        )}
                        {trip.post_trip_dvir_reviewed_at && (
                          <p className="text-xs text-gray-500 flex items-center">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            Post-trip reviewed: {formatDateTime(trip.post_trip_dvir_reviewed_at)}
                          </p>
                        )}
                        {(trip.pre_trip_dvir_reviewed_by || trip.post_trip_dvir_reviewed_by) && (
                          <p className="text-xs text-gray-500 flex items-center">
                            <UserIcon className="h-3 w-3 mr-1" />
                            Reviewed by: {trip.pre_trip_dvir_reviewed_by || trip.post_trip_dvir_reviewed_by}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Compliance Violations */}
                {violations.length > 0 && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded">
                    <h4 className="text-sm font-medium text-red-800 mb-2">Compliance Issues:</h4>
                    <ul className="text-xs text-red-700 space-y-1">
                      {violations.map((violation, index) => (
                        <li key={index} className="flex items-start">
                          <ExclamationTriangleIcon className="h-3 w-3 text-red-500 mr-1 mt-0.5 flex-shrink-0" />
                          {violation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Button */}
                {filter === 'pending' && (
                  <button
                    onClick={() => handleReviewTrip(trip)}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    Review DVIR
                  </button>
                )}

                {filter === 'completed' && (
                  <button
                    onClick={() => handleReviewTrip(trip)}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    View Review
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* DVIR Review Modal */}
      {isReviewModalOpen && selectedTrip && (
        <DVIRReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          trip={selectedTrip}
          onReviewCompleted={handleReviewCompleted}
        />
      )}
    </div>
  );
}

export default DVIRReviewWorkflow;