import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSession } from '../providers/SessionProvider';
import axios from 'axios';
import BASE_URL from '../config';
import AddMaintenanceRecord from '../components/AddMaintenanceRecord';
import ViewMaintenanceRecord from '../components/ViewMaintenanceRecord';
import EditMaintenanceRecord from '../components/EditMaintenanceRecord';
import CancelReassignTripModal from '../components/CancelReassignTripModal';
import {
  WrenchScrewdriverIcon,
  TruckIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  DocumentArrowUpIcon,
  ArrowPathIcon,
  UserIcon
} from '@heroicons/react/24/outline';

function Maintenance() {
  const { session, refreshAccessToken } = useSession();
  const location = useLocation();
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [trailers, setTrailers] = useState([]);
  const [maintenanceHoldTrips, setMaintenanceHoldTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [isEditRecordOpen, setIsEditRecordOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [cancelReassignTrip, setCancelReassignTrip] = useState(null);
  const [inspectionData, setInspectionData] = useState(null);

  const fetchData = async () => {
    try {
      const [recordsRes, trucksRes, trailersRes, tripsRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/maintenance-records/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        }),
        axios.get(`${BASE_URL}/api/trucks/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        }),
        axios.get(`${BASE_URL}/api/trailers/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        }),
        axios.get(`${BASE_URL}/api/trips/?status=maintenance_hold`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        })
      ]);

      setMaintenanceRecords(recordsRes.data);
      setTrucks(trucksRes.data);
      setTrailers(trailersRes.data);
      setMaintenanceHoldTrips(tripsRes.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          return fetchData();
        }
      }
      console.error('Error fetching maintenance data:', error);
      alert('Failed to fetch maintenance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRecordAdded = () => {
    fetchData(); // Refresh the data after adding a new record
  };

  const handleRecordUpdated = () => {
    fetchData(); // Refresh the data after updating a record
  };

  const handleCancelReassignTrip = (trip) => {
    setCancelReassignTrip(trip);
  };

  const handleCloseCancelReassign = () => {
    setCancelReassignTrip(null);
  };

  const handleTripCancelled = (result) => {
    console.log('Trip cancellation result:', result);
    fetchData(); // Refresh all data
    setCancelReassignTrip(null);
  };

  const canManageTrips = () => {
    const userRole = session?.userInfo?.role;
    return userRole === 'admin' || userRole === 'user';
  };

  const filteredRecords = maintenanceRecords.filter((record) => {
    const matchesSearch = searchTerm === '' || 
      record.work_order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.maintenance_type_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.vehicle_identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.description && record.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const matchesVehicleType = vehicleTypeFilter === 'all' || record.vehicle_type === vehicleTypeFilter;
    const matchesPriority = priorityFilter === 'all' || record.priority === priorityFilter;
    const matchesSource = sourceFilter === 'all' || 
      (sourceFilter === 'dvir' && record.origin && record.origin.includes('DVIR')) ||
      (sourceFilter === 'manual' && (!record.origin || !record.origin.includes('DVIR')));
    
    return matchesSearch && matchesStatus && matchesVehicleType && matchesPriority && matchesSource;
  });

  const getStatusBadge = (status) => {
    const statusClasses = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status ? status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityClasses = {
      'low': 'bg-gray-100 text-gray-800',
      'medium': 'bg-blue-100 text-blue-800',
      'high': 'bg-orange-100 text-orange-800',
      'critical': 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityClasses[priority] || 'bg-gray-100 text-gray-800'}`}>
        {priority ? priority.toUpperCase() : 'MEDIUM'}
      </span>
    );
  };

  const getTimeInfo = (record) => {
    if (record.status === 'completed') {
      const completedDate = record.completed_date ? 
        new Date(record.completed_date).toLocaleDateString() : 
        'Recently';
      
      return {
        text: `Completed ${completedDate}`,
        color: 'text-green-600',
        icon: CheckCircleIcon
      };
    }
    
    if (record.is_overdue) {
      return {
        text: `Overdue by ${Math.abs(record.days_until_due)} days`,
        color: 'text-red-600',
        icon: ExclamationTriangleIcon
      };
    }
    
    if (record.days_until_due <= 7) {
      return {
        text: `Due in ${record.days_until_due} days`,
        color: 'text-yellow-600',
        icon: ClockIcon
      };
    }
    
    return {
      text: `Due ${new Date(record.scheduled_date).toLocaleDateString()}`,
      color: 'text-gray-600',
      icon: CalendarIcon
    };
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Fleet Maintenance</h1>
        <p className="text-gray-600">Track and manage maintenance records for DOT compliance</p>
      </div>

      {/* Maintenance Hold Trips Alert */}
      {maintenanceHoldTrips.length > 0 && (
        <div className="mb-6 bg-orange-50 border-l-4 border-orange-400 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-orange-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-orange-700">
                  <span className="font-medium">{maintenanceHoldTrips.length} trip{maintenanceHoldTrips.length !== 1 ? 's' : ''}</span> currently on maintenance hold due to inspection defects.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {maintenanceHoldTrips.slice(0, 3).map((trip) => (
                    <div key={trip.id} className="flex items-center bg-white rounded px-2 py-1 text-xs">
                      <UserIcon className="h-3 w-3 text-gray-400 mr-1" />
                      <span>{trip.driver_name}</span>
                      <TruckIcon className="h-3 w-3 text-gray-400 ml-1 mr-1" />
                      <span>{trip.truck_number}</span>
                      {canManageTrips() && (
                        <button
                          onClick={() => handleCancelReassignTrip(trip)}
                          className="ml-2 text-orange-600 hover:text-orange-800"
                          title="Cancel & Reassign Trip"
                        >
                          <ArrowPathIcon className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {maintenanceHoldTrips.length > 3 && (
                    <span className="text-xs text-orange-600">+{maintenanceHoldTrips.length - 3} more</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by work order, maintenance type, vehicle, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            onClick={() => { setInspectionData(null); setIsAddRecordOpen(true); }}
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add Maintenance</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={vehicleTypeFilter}
            onChange={(e) => setVehicleTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Vehicles</option>
            <option value="truck">Trucks</option>
            <option value="trailer">Trailers</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Sources</option>
            <option value="dvir">DVIR Defects</option>
            <option value="manual">Manual Entry</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading maintenance records...</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {filteredRecords.length} Maintenance Record{filteredRecords.length !== 1 ? 's' : ''}
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Work Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Maintenance Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timeline
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => {
                  const timeInfo = getTimeInfo(record);
                  
                  return (
                    <tr key={record.record_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <WrenchScrewdriverIcon className="h-6 w-6 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                WO-{record.work_order_number}
                              </span>
                              {record.origin && record.origin.includes('DVIR') && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                  <DocumentArrowUpIcon className="h-3 w-3 mr-1" />
                                  DVIR
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {record.service_provider || 'Internal'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <TruckIcon className="h-4 w-4 text-gray-400 mr-2" />
                          {record.vehicle_identifier}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {record.maintenance_type_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.category_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPriorityBadge(record.priority)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(record.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center text-sm ${timeInfo.color}`}>
                          <timeInfo.icon className="h-4 w-4 mr-2" />
                          {timeInfo.text}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="View Details"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingRecord(record);
                              setIsEditRecordOpen(true);
                            }}
                            className="text-green-600 hover:text-green-800 p-1"
                            title="Edit Record"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            className="text-purple-600 hover:text-purple-800 p-1"
                            title="Attachments"
                          >
                            <DocumentArrowUpIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredRecords.length === 0 && (
              <div className="text-center py-8">
                <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No maintenance records found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding a maintenance record.'}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <button
                      onClick={() => { setInspectionData(null); setIsAddRecordOpen(true); }}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Add Maintenance Record
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Maintenance Record Modal */}
      {isAddRecordOpen && (
        <AddMaintenanceRecord
          onClose={() => { setIsAddRecordOpen(false); setInspectionData(null); }}
          onRecordAdded={handleRecordAdded}
          trucks={trucks}
          trailers={trailers}
          inspectionData={inspectionData}
        />
      )}

      {/* View Maintenance Record Modal */}
      {selectedRecord && (
        <ViewMaintenanceRecord
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      {/* Edit Maintenance Record Modal */}
      {isEditRecordOpen && editingRecord && (
        <EditMaintenanceRecord
          record={editingRecord}
          onClose={() => {
            setIsEditRecordOpen(false);
            setEditingRecord(null);
          }}
          onRecordUpdated={handleRecordUpdated}
          trucks={trucks}
          trailers={trailers}
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

export default Maintenance;