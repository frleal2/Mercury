import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, XCircleIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

const ViewTripDetails = ({ tripId, onClose }) => {
  const { session, refreshAccessToken } = useSession();
  const [trip, setTrip] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (tripId) {
      fetchTripDetails();
      fetchInspections();
    }
  }, [tripId]);

  const fetchTripDetails = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/trips/${tripId}/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });
      setTrip(response.data);
    } catch (error) {
      console.error('Error fetching trip details:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
    }
  };

  const fetchInspections = async () => {
    try {
      console.log('Fetching inspections for trip ID:', tripId);
      const response = await axios.get(`${BASE_URL}/api/trip-inspections/?trip=${tripId}`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });
      console.log('Inspections response:', response.data);
      setInspections(response.data);
    } catch (error) {
      console.error('Error fetching inspections:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getInspectionStatus = (inspection) => {
    console.log('Inspection data for status check:', inspection);
    
    const checks = [
      inspection.vehicle_exterior_condition,
      inspection.lights_working,
      inspection.tires_condition,
      inspection.brakes_working,
      inspection.engine_fluids_ok,
    ];
    
    // Only include trailer checks if they exist (not null/undefined)
    if (inspection.trailer_attached_properly !== null && inspection.trailer_attached_properly !== undefined) {
      checks.push(inspection.trailer_attached_properly);
    }
    if (inspection.trailer_lights_working !== null && inspection.trailer_lights_working !== undefined) {
      checks.push(inspection.trailer_lights_working);
    }
    if (inspection.cargo_secured !== null && inspection.cargo_secured !== undefined) {
      checks.push(inspection.cargo_secured);
    }
    
    const passedChecks = checks.filter(check => check === true).length;
    const totalChecks = checks.length;
    
    console.log('Inspection status calculation:', {
      checks,
      passedChecks,
      totalChecks,
      passed: passedChecks === totalChecks
    });
    
    return { passed: passedChecks === totalChecks, passedChecks, totalChecks };
  };

  const renderInspectionChecklist = (inspection) => {
    console.log('Rendering checklist for inspection:', inspection);
    
    const checks = [
      { label: 'Vehicle Exterior Condition', value: inspection.vehicle_exterior_condition, key: 'vehicle_exterior_condition' },
      { label: 'Lights Working', value: inspection.lights_working, key: 'lights_working' },
      { label: 'Tires Condition', value: inspection.tires_condition, key: 'tires_condition' },
      { label: 'Brakes Working', value: inspection.brakes_working, key: 'brakes_working' },
      { label: 'Engine Fluids OK', value: inspection.engine_fluids_ok, key: 'engine_fluids_ok' },
    ];

    // Add trailer checks if they exist (not null/undefined)
    if (inspection.trailer_attached_properly !== null && inspection.trailer_attached_properly !== undefined) {
      checks.push({ label: 'Trailer Attached Properly', value: inspection.trailer_attached_properly, key: 'trailer_attached_properly' });
    }
    if (inspection.trailer_lights_working !== null && inspection.trailer_lights_working !== undefined) {
      checks.push({ label: 'Trailer Lights Working', value: inspection.trailer_lights_working, key: 'trailer_lights_working' });
    }
    if (inspection.cargo_secured !== null && inspection.cargo_secured !== undefined) {
      checks.push({ label: 'Cargo Secured', value: inspection.cargo_secured, key: 'cargo_secured' });
    }

    return (
      <div className="space-y-3">
        {checks.map((check) => {
          console.log(`Check ${check.key}:`, check.value, typeof check.value);
          return (
            <div key={check.key} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <span className="text-sm font-medium text-gray-700">{check.label}</span>
              <div className="flex items-center">
                {check.value === true ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-500" />
                )}
                <span className={`ml-2 text-sm font-medium ${check.value === true ? 'text-green-700' : 'text-red-700'}`}>
                  {check.value === true ? 'Pass' : 'Fail'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-lg rounded-md bg-white">
          <div className="flex justify-center items-center h-64">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-3 text-gray-600">Loading trip details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  const preTrip = inspections.find(insp => insp.inspection_type === 'pre_trip');
  const postTrip = inspections.find(insp => insp.inspection_type === 'post_trip');

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Trip Details - {trip.trip_number || `Trip #${trip.id}`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('inspections')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'inspections'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Inspections
              {(preTrip || postTrip) && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {[preTrip, postTrip].filter(Boolean).length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Trip Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Trip Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Trip Number</label>
                  <p className="mt-1 text-sm text-gray-900">{trip.trip_number || `Trip #${trip.id}`}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      trip.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      trip.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {trip.status_display}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Scheduled Start</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDateTime(trip.scheduled_start_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Scheduled End</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDateTime(trip.scheduled_end_date)}</p>
                </div>
              </div>
            </div>

            {/* Assignment Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Assignment</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Driver</label>
                  <p className="mt-1 text-sm text-gray-900">{trip.driver_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Truck</label>
                  <p className="mt-1 text-sm text-gray-900">{trip.truck_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Trailer</label>
                  <p className="mt-1 text-sm text-gray-900">{trip.trailer_number || 'No trailer assigned'}</p>
                </div>
              </div>
            </div>

            {/* Route Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Route</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Origin</label>
                  <p className="mt-1 text-sm text-gray-900">{trip.origin_display}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Destination</label>
                  <p className="mt-1 text-sm text-gray-900">{trip.destination_display}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {trip.notes && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Notes</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{trip.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inspections' && (
          <div className="space-y-6">
            {/* Pre-Trip Inspection */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900 flex items-center">
                  <ClipboardDocumentCheckIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Pre-Trip Inspection
                </h4>
                {preTrip ? (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    getInspectionStatus(preTrip).passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {getInspectionStatus(preTrip).passed ? 'Passed' : 'Failed'}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    Not Completed
                  </span>
                )}
              </div>

              {preTrip ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="font-medium text-gray-700">Completed By:</label>
                      <p className="text-gray-900">{preTrip.completed_by_name}</p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-700">Completed At:</label>
                      <p className="text-gray-900">{formatDateTime(preTrip.completed_at)}</p>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-700 mb-3">Inspection Checklist:</h5>
                    {renderInspectionChecklist(preTrip)}
                  </div>

                  {preTrip.inspection_notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notes:</label>
                      <p className="text-sm text-gray-900 bg-white p-3 rounded border">{preTrip.inspection_notes}</p>
                    </div>
                  )}

                  {preTrip.issues_found && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Issues Found:</label>
                      <p className="text-sm text-red-700 bg-red-50 p-3 rounded border border-red-200">{preTrip.issues_found}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Pre-trip inspection has not been completed yet.</p>
              )}
            </div>

            {/* Post-Trip Inspection */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900 flex items-center">
                  <ClipboardDocumentCheckIcon className="h-5 w-5 mr-2 text-orange-600" />
                  Post-Trip Inspection
                </h4>
                {postTrip ? (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    getInspectionStatus(postTrip).passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {getInspectionStatus(postTrip).passed ? 'Passed' : 'Failed'}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    Not Completed
                  </span>
                )}
              </div>

              {postTrip ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="font-medium text-gray-700">Completed By:</label>
                      <p className="text-gray-900">{postTrip.completed_by_name}</p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-700">Completed At:</label>
                      <p className="text-gray-900">{formatDateTime(postTrip.completed_at)}</p>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-700 mb-3">Inspection Checklist:</h5>
                    {renderInspectionChecklist(postTrip)}
                  </div>

                  {postTrip.inspection_notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notes:</label>
                      <p className="text-sm text-gray-900 bg-white p-3 rounded border">{postTrip.inspection_notes}</p>
                    </div>
                  )}

                  {postTrip.issues_found && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Issues Found:</label>
                      <p className="text-sm text-red-700 bg-red-50 p-3 rounded border border-red-200">{postTrip.issues_found}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Post-trip inspection has not been completed yet.</p>
              )}
            </div>

            {/* Summary */}
            {(preTrip || postTrip) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-blue-900 mb-2">Inspection Summary</h4>
                <div className="text-sm text-blue-800">
                  {preTrip && postTrip ? (
                    <p>Both pre-trip and post-trip inspections have been completed.</p>
                  ) : preTrip ? (
                    <p>Pre-trip inspection completed. Post-trip inspection pending.</p>
                  ) : postTrip ? (
                    <p>Post-trip inspection completed. Pre-trip inspection data may be unavailable.</p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewTripDetails;