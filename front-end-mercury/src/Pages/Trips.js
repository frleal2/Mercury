import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import AddTrip from '../components/AddTrip';
import ViewTripDetails from '../components/ViewTripDetails';
import CancelReassignTripModal from '../components/CancelReassignTripModal';
import { 
  PlusIcon,
  TruckIcon,
  UserIcon,
  ClockIcon,
  MapPinIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

function Trips() {
  const { session, refreshAccessToken } = useSession();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cancelReassignTrip, setCancelReassignTrip] = useState(null);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/trips/`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });
      setTrips(response.data);
    } catch (error) {
      console.error('Error fetching trips:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = () => {
    setIsCreateTripOpen(true);
  };

  const handleCloseCreateTrip = () => {
    setIsCreateTripOpen(false);
    fetchTrips(); // Refresh trips after creation
  };

  const handleViewTripDetails = (tripId) => {
    setSelectedTripId(tripId);
  };

  const handleCloseTripDetails = () => {
    setSelectedTripId(null);
  };

  const handleCancelReassignTrip = (trip) => {
    setCancelReassignTrip(trip);
  };

  const handleCloseCancelReassign = () => {
    setCancelReassignTrip(null);
  };

  const handleTripCancelled = (result) => {
    console.log('Trip cancellation result:', result);
    fetchTrips(); // Refresh the trips list
    setCancelReassignTrip(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed_inspection':
        return 'bg-red-100 text-red-800';
      case 'maintenance_hold':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
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
      case 'maintenance_hold':
        return ExclamationTriangleIcon;
      case 'completed':
        return CheckCircleIcon;
      case 'cancelled':
        return XCircleIcon;
      default:
        return ClockIcon;
    }
  };

  const filteredTrips = trips.filter(trip => {
    const matchesFilter = filter === 'all' || trip.status === filter;
    const matchesSearch = 
      trip.trip_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.origin_display?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.destination_display?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const canCreateTrips = () => {
    const userRole = session?.userInfo?.role;
    return userRole === 'admin' || userRole === 'user';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading trips...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Trip Management</h1>
        <p className="text-gray-600">Manage trips and assignments for drivers, trucks, and trailers</p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by trip number, driver name, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Trips</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="failed_inspection">Failed Inspection</option>
            <option value="maintenance_hold">Maintenance Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {canCreateTrips() && (
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
              onClick={handleCreateTrip}
            >
              <PlusIcon className="h-5 w-5" />
              <span>Create Trip</span>
            </button>
          )}
        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {filteredTrips.length} Trip{filteredTrips.length !== 1 ? 's' : ''}
          </h2>
        </div>
        
        {filteredTrips.length === 0 ? (
          <div className="text-center py-8">
            <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No trips found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by creating a new trip.'}
            </p>
            {!searchTerm && canCreateTrips() && (
              <div className="mt-6">
                <button
                  onClick={handleCreateTrip}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Trip
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trip Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver & Equipment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inspections
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTrips.map((trip) => {
                  const StatusIcon = getStatusIcon(trip.status);
                  
                  return (
                    <tr key={trip.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <TruckIcon className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {trip.trip_number || `Trip #${trip.id}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              {trip.scheduled_start_date ? 
                                new Date(trip.scheduled_start_date).toLocaleDateString() :
                                new Date(trip.start_time).toLocaleDateString()
                              }
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center mb-1">
                            <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                            {trip.driver_name}
                          </div>
                          <div className="flex items-center">
                            <TruckIcon className="h-4 w-4 text-gray-400 mr-2" />
                            {trip.truck_number}
                            {trip.trailer_number && (
                              <span className="ml-2 text-gray-500">+ {trip.trailer_number}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center mb-1">
                            <MapPinIcon className="h-4 w-4 text-green-400 mr-2" />
                            {trip.origin_display}
                          </div>
                          <div className="flex items-center">
                            <MapPinIcon className="h-4 w-4 text-red-400 mr-2" />
                            {trip.destination_display}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {trip.status_display}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium w-fit ${
                            trip.pre_trip_inspection_completed 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            <CheckCircleIcon className={`h-3 w-3 mr-1 ${trip.pre_trip_inspection_completed ? 'text-green-600' : 'text-gray-400'}`} />
                            Pre-trip
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium w-fit ${
                            trip.post_trip_inspection_completed 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            <CheckCircleIcon className={`h-3 w-3 mr-1 ${trip.post_trip_inspection_completed ? 'text-green-600' : 'text-gray-400'}`} />
                            Post-trip
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleViewTripDetails(trip.id)}
                            className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                            title="View Trip Details & Inspections"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          
                          {/* Cancel & Reassign button for failed_inspection and maintenance_hold trips */}
                          {(trip.status === 'failed_inspection' || trip.status === 'maintenance_hold') && canCreateTrips() && (
                            <button
                              onClick={() => handleCancelReassignTrip(trip)}
                              className="text-orange-600 hover:text-orange-800 p-1 hover:bg-orange-50 rounded"
                              title="Cancel & Reassign Trip"
                            >
                              <ArrowPathIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Trip Modal */}
      {isCreateTripOpen && (
        <AddTrip
          onClose={handleCloseCreateTrip}
        />
      )}

      {/* View Trip Details Modal */}
      {selectedTripId && (
        <ViewTripDetails
          tripId={selectedTripId}
          onClose={handleCloseTripDetails}
        />
      )}

      {/* Cancel & Reassign Trip Modal */}
      {cancelReassignTrip && (
        <CancelReassignTripModal
          isOpen={!!cancelReassignTrip}
          onClose={handleCloseCancelReassign}
          trip={cancelReassignTrip}
          onTripCancelled={handleTripCancelled}
        />
      )}
    </div>
  );
}

export default Trips;