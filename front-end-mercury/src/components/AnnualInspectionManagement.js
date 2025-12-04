import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import AddAnnualInspection from './AddAnnualInspection';
import EditAnnualInspection from './EditAnnualInspection';
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  CalendarIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

function AnnualInspectionManagement() {
  const { session, refreshAccessToken } = useSession();
  const [inspections, setInspections] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [trailers, setTrailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [inspectionsResponse, trucksResponse, trailersResponse] = await Promise.all([
        axios.get(`${BASE_URL}/api/annual-inspections/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        }),
        axios.get(`${BASE_URL}/api/trucks/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        }),
        axios.get(`${BASE_URL}/api/trailers/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        })
      ]);

      setInspections(inspectionsResponse.data);
      setTrucks(trucksResponse.data);
      setTrailers(trailersResponse.data);
      
    } catch (error) {
      console.error('Error fetching annual inspection data:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
    } finally {
      setLoading(false);
    }
  };

  const getInspectionStatus = (inspection) => {
    const inspectionDate = new Date(inspection.inspection_date);
    const expiryDate = new Date(inspectionDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // CFR 396.17 - Annual inspection valid for 1 year
    
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { 
        status: 'expired', 
        label: 'Expired', 
        icon: XCircleIcon, 
        color: 'text-red-600 bg-red-50 border-red-200',
        daysText: `${Math.abs(daysUntilExpiry)} days overdue`
      };
    } else if (daysUntilExpiry <= 30) {
      return { 
        status: 'expiring', 
        label: 'Expiring Soon', 
        icon: ExclamationTriangleIcon, 
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        daysText: `${daysUntilExpiry} days remaining`
      };
    } else {
      return { 
        status: 'valid', 
        label: 'Valid', 
        icon: CheckCircleIcon, 
        color: 'text-green-600 bg-green-50 border-green-200',
        daysText: `${daysUntilExpiry} days remaining`
      };
    }
  };

  const getVehiclesNeedingInspection = () => {
    const allVehicles = [
      ...trucks.map(t => ({ ...t, type: 'truck' })),
      ...trailers.map(t => ({ ...t, type: 'trailer' }))
    ];

    return allVehicles.filter(vehicle => {
      const vehicleInspections = inspections.filter(inspection =>
        (inspection.truck && inspection.truck === vehicle.id && vehicle.type === 'truck') ||
        (inspection.trailer && inspection.trailer === vehicle.id && vehicle.type === 'trailer')
      );

      if (vehicleInspections.length === 0) return true;

      // Check if latest inspection is expired or expiring
      const latestInspection = vehicleInspections.sort((a, b) => 
        new Date(b.inspection_date) - new Date(a.inspection_date)
      )[0];

      const status = getInspectionStatus(latestInspection);
      return status.status === 'expired' || status.status === 'expiring';
    });
  };

  const handleEditInspection = (inspection) => {
    setSelectedInspection(inspection);
    setIsEditModalOpen(true);
  };

  const handleInspectionUpdated = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedInspection(null);
    fetchData();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getFilteredInspections = () => {
    switch (filter) {
      case 'expired':
        return inspections.filter(inspection => getInspectionStatus(inspection).status === 'expired');
      case 'expiring':
        return inspections.filter(inspection => getInspectionStatus(inspection).status === 'expiring');
      case 'valid':
        return inspections.filter(inspection => getInspectionStatus(inspection).status === 'valid');
      default:
        return inspections;
    }
  };

  const filteredInspections = getFilteredInspections();
  const vehiclesNeedingInspection = getVehiclesNeedingInspection();
  
  const statusCounts = {
    all: inspections.length,
    expired: inspections.filter(i => getInspectionStatus(i).status === 'expired').length,
    expiring: inspections.filter(i => getInspectionStatus(i).status === 'expiring').length,
    valid: inspections.filter(i => getInspectionStatus(i).status === 'valid').length
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading annual inspections...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Annual Inspection Management</h1>
            <p className="text-gray-600">CFR 396.17 - Annual Vehicle Inspection Requirements</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Schedule Inspection
          </button>
        </div>
      </div>

      {/* Compliance Alerts */}
      {(statusCounts.expired > 0 || vehiclesNeedingInspection.length > 0) && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-3" />
            <h3 className="text-lg font-medium text-red-800">CFR 396.17 Compliance Alerts</h3>
          </div>
          
          <div className="space-y-2 text-sm text-red-700">
            {statusCounts.expired > 0 && (
              <p>• {statusCounts.expired} vehicle(s) have expired annual inspections</p>
            )}
            {vehiclesNeedingInspection.length > 0 && (
              <p>• {vehiclesNeedingInspection.length} vehicle(s) need annual inspection within 30 days or have no inspection on record</p>
            )}
          </div>
        </div>
      )}

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div 
          className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer border-2 ${filter === 'all' ? 'border-blue-500' : 'border-transparent'}`}
          onClick={() => setFilter('all')}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-8 w-8 text-gray-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Inspections</dt>
                  <dd className="text-lg font-medium text-gray-900">{statusCounts.all}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer border-2 ${filter === 'valid' ? 'border-green-500' : 'border-transparent'}`}
          onClick={() => setFilter('valid')}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Valid</dt>
                  <dd className="text-lg font-medium text-green-600">{statusCounts.valid}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer border-2 ${filter === 'expiring' ? 'border-yellow-500' : 'border-transparent'}`}
          onClick={() => setFilter('expiring')}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Expiring Soon</dt>
                  <dd className="text-lg font-medium text-yellow-600">{statusCounts.expiring}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer border-2 ${filter === 'expired' ? 'border-red-500' : 'border-transparent'}`}
          onClick={() => setFilter('expired')}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-8 w-8 text-red-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Expired</dt>
                  <dd className="text-lg font-medium text-red-600">{statusCounts.expired}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inspections Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Annual Inspection Records ({filteredInspections.length} inspections)
          </h2>
        </div>

        {filteredInspections.length === 0 ? (
          <div className="text-center py-8">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No inspections found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' ? 'No annual inspections recorded yet.' : `No inspections with ${filter} status.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inspection Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inspector
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Result
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInspections.map((inspection) => {
                  const status = getInspectionStatus(inspection);
                  const StatusIcon = status.icon;
                  const vehicle = inspection.truck_info || inspection.trailer_info;
                  const vehicleType = inspection.truck_info ? 'Truck' : 'Trailer';

                  return (
                    <tr key={inspection.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <TruckIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {vehicleType} {vehicle?.unit_number || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {vehicle?.license_plate || 'No license plate'}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-900">{formatDate(inspection.inspection_date)}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Expires: {formatDate(new Date(new Date(inspection.inspection_date).setFullYear(new Date(inspection.inspection_date).getFullYear() + 1)))}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{inspection.inspector_name}</div>
                        <div className="text-sm text-gray-500">{inspection.inspection_facility}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {inspection.passed ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                          ) : (
                            <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                          )}
                          <span className={`text-sm font-medium ${inspection.passed ? 'text-green-600' : 'text-red-600'}`}>
                            {inspection.passed ? 'Passed' : 'Failed'}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className={`h-3 w-3 mr-1 ${status.color.split(' ')[0]}`} />
                          {status.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{status.daysText}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditInspection(inspection)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Annual Inspection Modal */}
      {isAddModalOpen && (
        <AddAnnualInspection
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onInspectionAdded={handleInspectionUpdated}
        />
      )}

      {/* Edit Annual Inspection Modal */}
      {isEditModalOpen && selectedInspection && (
        <EditAnnualInspection
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          inspection={selectedInspection}
          onInspectionUpdated={handleInspectionUpdated}
        />
      )}
    </div>
  );
}

export default AnnualInspectionManagement;