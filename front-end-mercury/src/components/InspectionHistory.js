import React, { useState, useEffect } from 'react';
import { useSession } from '../providers/SessionProvider';
import axios from 'axios';
import BASE_URL from '../config';
import { 
  TruckIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

function InspectionHistory({ truck, onClose }) {
  const { session, refreshAccessToken } = useSession();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (truck) {
      fetchTruckInspections();
    }
  }, [truck]);

  const fetchTruckInspections = async () => {
    try {
      setLoading(true);
      
      // First, get all trips for this truck
      const tripsResponse = await axios.get(`${BASE_URL}/api/trips/`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
        params: {
          truck_id: truck.id
        }
      });

      // Then, get all inspections for those trips
      if (tripsResponse.data.length > 0) {
        const tripIds = tripsResponse.data.map(trip => trip.id);
        const inspectionsPromises = tripIds.map(tripId =>
          axios.get(`${BASE_URL}/api/trip-inspections/?trip=${tripId}`, {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
            }
          })
        );

        const inspectionsResponses = await Promise.all(inspectionsPromises);
        const allInspections = inspectionsResponses.flatMap(response => response.data);
        
        // Add trip information to each inspection
        const inspectionsWithTripInfo = allInspections.map(inspection => {
          const trip = tripsResponse.data.find(t => t.id.toString() === inspection.trip_id);
          return {
            ...inspection,
            trip_info: trip
          };
        });

        setInspections(inspectionsWithTripInfo.sort((a, b) => 
          new Date(b.completed_at) - new Date(a.completed_at)
        ));
      } else {
        setInspections([]);
      }
      
      setError(null);
    } catch (error) {
      console.error('Error fetching truck inspections:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
        return fetchTruckInspections();
      }
      setError('Failed to load inspection history');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getInspectionTypeDisplay = (type) => {
    return type === 'pre_trip' ? 'Pre-Trip' : type === 'post_trip' ? 'Post-Trip' : type;
  };

  const getInspectionStatus = (inspection) => {
    const passed = inspection.is_inspection_passed;
    return {
      status: passed ? 'Pass' : 'Fail',
      color: passed ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100',
      icon: passed ? CheckCircleIcon : XCircleIcon
    };
  };

  const renderInspectionDetails = (inspection) => {
    const details = [];
    const fields = [
      { key: 'vehicle_exterior_condition', label: 'Vehicle Exterior' },
      { key: 'lights_working', label: 'Lights' },
      { key: 'tires_condition', label: 'Tires' },
      { key: 'brakes_working', label: 'Brakes' },
      { key: 'engine_fluids_ok', label: 'Engine Fluids' },
      { key: 'trailer_attached_properly', label: 'Trailer Attachment' },
      { key: 'trailer_lights_working', label: 'Trailer Lights' },
      { key: 'cargo_secured', label: 'Cargo Secured' },
    ];

    fields.forEach(field => {
      const value = inspection[field.key];
      if (value !== null && value !== undefined && value !== 'na') {
        details.push({
          label: field.label,
          value: value === 'pass' ? 'Pass' : 'Fail',
          passed: value === 'pass'
        });
      }
    });

    return details;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Inspection History - {truck.unit_number}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              All trip inspections for {truck.year} {truck.make} {truck.model}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-3 text-gray-600">Loading inspection history...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12" />
            </div>
            <p className="text-gray-600">{error}</p>
            <button 
              onClick={fetchTruckInspections}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : inspections.length === 0 ? (
          <div className="text-center py-8">
            <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No inspections found</h3>
            <p className="mt-1 text-sm text-gray-500">
              This truck hasn't been used for any trips with inspections yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Inspection Summary
              </h4>
              <div className="text-sm text-blue-800">
                <p>Total Inspections: {inspections.length}</p>
                <p>Passed: {inspections.filter(i => i.is_inspection_passed).length}</p>
                <p>Failed: {inspections.filter(i => !i.is_inspection_passed).length}</p>
              </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {inspections.map((inspection, index) => {
                  const status = getInspectionStatus(inspection);
                  const details = renderInspectionDetails(inspection);
                  
                  return (
                    <li key={inspection.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <ClipboardDocumentCheckIcon className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center">
                              <h4 className="text-sm font-medium text-gray-900">
                                {getInspectionTypeDisplay(inspection.inspection_type)}
                              </h4>
                              <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                                <status.icon className="h-3 w-3 mr-1" />
                                {status.status}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500">
                              <CalendarIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              <p>
                                {formatDateTime(inspection.completed_at)}
                              </p>
                              <span className="mx-2">•</span>
                              <UserIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              <p>{inspection.completed_by_name}</p>
                              {inspection.trip_info && (
                                <>
                                  <span className="mx-2">•</span>
                                  <DocumentTextIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                  <p>Trip: {inspection.trip_info.trip_number || `#${inspection.trip_info.id}`}</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {details.length > 0 && (
                        <div className="mt-4 ml-14">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Inspection Details:</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {details.map((detail, idx) => (
                              <div key={idx} className="flex items-center text-sm">
                                <span className="text-gray-600">{detail.label}:</span>
                                <span className={`ml-2 font-medium ${
                                  detail.passed ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {detail.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {inspection.inspection_notes && (
                        <div className="mt-4 ml-14">
                          <h5 className="text-sm font-medium text-gray-700 mb-1">Notes:</h5>
                          <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            {inspection.inspection_notes}
                          </p>
                        </div>
                      )}

                      {inspection.issues_found && (
                        <div className="mt-4 ml-14">
                          <h5 className="text-sm font-medium text-red-700 mb-1">Issues Found:</h5>
                          <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                            {inspection.issues_found}
                          </p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default InspectionHistory;
