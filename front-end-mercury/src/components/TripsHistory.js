import React, { useState, useEffect } from 'react';
import HoursOfService from './HoursOfService'; // Import the new component
import { useSession } from '../providers/SessionProvider';
import axios from 'axios';
import BASE_URL from '../config';
import { 
  TruckIcon, 
  CalendarIcon, 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MapPinIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

function TripsHistory({ driver, onClose }) {
  const { session, refreshAccessToken } = useSession();
  const [selectedTrip, setSelectedTrip] = useState(null); // Track the selected trip for HOS
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (driver) {
      fetchDriverTrips();
    }
  }, [driver]);

  const fetchDriverTrips = async () => {
    try {
      setLoading(true);
      // Fetch trips for this specific driver
      const response = await axios.get(`${BASE_URL}/api/trips/`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
        params: {
          driver_id: driver.id
        }
      });
      
      setTrips(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching driver trips:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
        // Retry the request
        return fetchDriverTrips();
      }
      setError('Failed to load trip history');
    } finally {
      setLoading(false);
    }
  };

  const handleHOSClick = (trip) => {
    setSelectedTrip(trip); // Set the selected trip for the HOS modal
  };

  const handleCloseHOS = () => {
    setSelectedTrip(null); // Clear the selected trip when the modal is closed
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'scheduled': { color: 'bg-blue-100 text-blue-800', label: 'Scheduled' },
      'in_progress': { color: 'bg-yellow-100 text-yellow-800', label: 'In Progress' },
      'completed': { color: 'bg-green-100 text-green-800', label: 'Completed' },
      'cancelled': { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getInspectionStatus = (completed) => {
    if (completed) {
      return (
        <span className="inline-flex items-center text-green-600">
          <CheckCircleIcon className="h-4 w-4 mr-1" />
          <span className="text-xs">Completed</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center text-red-600">
          <XCircleIcon className="h-4 w-4 mr-1" />
          <span className="text-xs">Pending</span>
        </span>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Trip History - {driver.first_name} {driver.last_name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Complete history of all trips for this driver
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
            <p className="ml-3 text-gray-600">Loading trip history...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-gray-600">{error}</p>
            <button 
              onClick={fetchDriverTrips}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-8">
            <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No trips found</h3>
            <p className="mt-1 text-sm text-gray-500">
              This driver hasn't been assigned to any trips yet.
            </p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h4 className="text-lg font-medium text-gray-900">
                {trips.length} Trip{trips.length !== 1 ? 's' : ''}
              </h4>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trip Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Route
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inspections
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {trip.trip_number || `Trip #${trip.id}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {trip.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <TruckIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div>{trip.truck_number || 'N/A'}</div>
                            {trip.trailer_number && (
                              <div className="text-xs text-gray-500">Trailer: {trip.trailer_number}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="font-medium">{trip.origin_display || 'N/A'}</div>
                            <div className="text-xs text-gray-500">to {trip.destination_display || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="font-medium">
                              {formatDate(trip.scheduled_start_date)}
                            </div>
                            {trip.scheduled_end_date && (
                              <div className="text-xs text-gray-500">
                                to {formatDate(trip.scheduled_end_date)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(trip.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Pre:</span>
                            {getInspectionStatus(trip.pre_trip_inspection_completed)}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Post:</span>
                            {getInspectionStatus(trip.post_trip_inspection_completed)}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTrip && (
          <HoursOfService
            driver={driver}
            trip={selectedTrip}
            onClose={handleCloseHOS}
          />
        )}
      </div>
    </div>
  );
}

export default TripsHistory;
