import React, { useState, useEffect } from 'react';
import AddTruck from '../components/AddTruck';
import EditTruck from '../components/EditTruck';
import { useSession } from '../providers/SessionProvider';
import axios from 'axios';
import BASE_URL from '../config';
import InspectionHistory from '../components/InspectionHistory';
import {
  TruckIcon,
  IdentificationIcon,
  PencilIcon,
  DocumentTextIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserIcon,
  MapPinIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

function Trucks() {
  const { session, refreshAccessToken } = useSession();
  const [isAddTruckOpen, setIsAddTruckOpen] = useState(false);
  const [isEditTruckOpen, setIsEditTruckOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [isInspectionHistoryOpen, setIsInspectionHistoryOpen] = useState(false);
  const [inspectionTruck, setInspectionTruck] = useState(null);

  const handleAddTruckClick = () => {
    setIsAddTruckOpen(true);
  };

  const handleCloseAddTruck = () => {
    setIsAddTruckOpen(false);
    fetchTrucks();
  };

  const handleEditTruckClick = (truck) => {
    setSelectedTruck(truck);
    setIsEditTruckOpen(true);
  };

  const handleCloseEditTruck = () => {
    setIsEditTruckOpen(false);
    setSelectedTruck(null);
    fetchTrucks();
  };

  const handleOpenInspectionHistory = (truck) => {
    setInspectionTruck(truck);
    setIsInspectionHistoryOpen(true);
  };

  const handleCloseInspectionHistory = () => {
    setIsInspectionHistoryOpen(false);
    setInspectionTruck(null);
  };

  const fetchTrucks = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/trucks/`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });
      setTrucks(response.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          return fetchTrucks();
        }
      }
      console.error('Error fetching trucks:', error);
      alert('Failed to fetch trucks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrucks();
  }, []);

  const filteredTrucks = trucks.filter((truck) => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'active' && truck.active) || 
                         (filter === 'inactive' && !truck.active);
    
    const matchesSearch = searchTerm === '' || 
      truck.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      truck.vin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (truck.make && truck.make.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (truck.model && truck.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (truck.driver_name && truck.driver_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  const getStatusInfo = (expirationDate) => {
    const expDate = new Date(expirationDate);
    const today = new Date();
    const timeDiff = expDate - today;
    const daysUntilExpiration = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    if (timeDiff < 0) {
      return { status: 'Expired', color: 'text-red-600 bg-red-100', icon: ExclamationTriangleIcon };
    } else if (daysUntilExpiration <= 30) {
      return { status: `${daysUntilExpiration}d remaining`, color: 'text-yellow-600 bg-yellow-100', icon: ClockIcon };
    } else {
      return { status: 'Active', color: 'text-green-600 bg-green-100', icon: CheckCircleIcon };
    }
  };

  const getTitle = () => {
    if (filter === 'active') return 'Active Trucks';
    if (filter === 'inactive') return 'Inactive Trucks';
    return 'All Trucks';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{getTitle()}</h1>
        <p className="text-gray-600">Manage truck fleet and compliance tracking</p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by unit number, license plate, VIN, make, model, or driver..."
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
            <option value="active">Active Trucks</option>
            <option value="inactive">Inactive Trucks</option>
            <option value="all">All Trucks</option>
          </select>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            onClick={handleAddTruckClick}
          >
            <TruckIcon className="h-5 w-5" />
            <span>Add Truck</span>
          </button>
        </div>
      </div>

      {isAddTruckOpen && (
        <AddTruck
          onClose={handleCloseAddTruck}
          onTruckAdded={fetchTrucks}
        />
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading trucks...</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {filteredTrucks.length} Truck{filteredTrucks.length !== 1 ? 's' : ''}
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assignment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Insurance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DOT Inspection
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTrucks.map((truck) => {
                  const registrationStatus = getStatusInfo(truck.registration_expiration);
                  const insuranceStatus = getStatusInfo(truck.insurance_expiration);
                  const dotStatus = getStatusInfo(truck.annual_dot_inspection_date);
                  
                  return (
                    <tr key={truck.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              truck.active ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <TruckIcon className={`h-6 w-6 ${
                                truck.active ? 'text-blue-600' : 'text-gray-400'
                              }`} />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {truck.unit_number} • {truck.license_plate}
                            </div>
                            <div className="text-sm text-gray-500">
                              {truck.year} {truck.make} {truck.model}
                            </div>
                            <div className="text-xs text-gray-400 flex items-center">
                              <IdentificationIcon className="h-3 w-3 mr-1" />
                              VIN: {truck.vin}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                            {truck.company_name || 'Unassigned'}
                          </div>
                          {truck.driver_name && (
                            <div className="flex items-center">
                              <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                              {truck.driver_name}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${registrationStatus.color}`}>
                          <registrationStatus.icon className="h-3 w-3 mr-1" />
                          {registrationStatus.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${insuranceStatus.color}`}>
                          <insuranceStatus.icon className="h-3 w-3 mr-1" />
                          {insuranceStatus.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${dotStatus.color}`}>
                          <dotStatus.icon className="h-3 w-3 mr-1" />
                          {dotStatus.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEditTruckClick(truck)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Edit Truck"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleOpenInspectionHistory(truck)}
                            className="text-green-600 hover:text-green-800 p-1"
                            title="Inspection History"
                          >
                            <DocumentTextIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredTrucks.length === 0 && (
              <div className="text-center py-8">
                <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No trucks found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding a new truck.'}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <button
                      onClick={handleAddTruckClick}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <TruckIcon className="h-5 w-5 mr-2" />
                      Add Truck
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {isEditTruckOpen && (
        <EditTruck truck={selectedTruck} onClose={handleCloseEditTruck} />
      )}
      {isInspectionHistoryOpen && inspectionTruck && (
        <InspectionHistory 
          truck={inspectionTruck} 
          onClose={handleCloseInspectionHistory} 
        />
      )}
    </div>
  );
}

export default Trucks;
