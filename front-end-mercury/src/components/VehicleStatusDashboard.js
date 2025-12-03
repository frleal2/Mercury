import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import VehicleStatusCard from './VehicleStatusCard';
import UpdateVehicleStatus from './UpdateVehicleStatus';
import ComplianceAlerts from './ComplianceAlerts';
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TruckIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

function VehicleStatusDashboard() {
  const { session, refreshAccessToken } = useSession();
  const [vehicleStatuses, setVehicleStatuses] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [trailers, setTrailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [statusResponse, trucksResponse, trailersResponse] = await Promise.all([
        axios.get(`${BASE_URL}/api/vehicle-operation-status/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        }),
        axios.get(`${BASE_URL}/api/trucks/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        }),
        axios.get(`${BASE_URL}/api/trailers/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        })
      ]);

      setVehicleStatuses(statusResponse.data);
      setTrucks(trucksResponse.data);
      setTrailers(trailersResponse.data);

      // Create status entries for vehicles without explicit status
      createMissingStatusEntries(trucksResponse.data, trailersResponse.data, statusResponse.data);
      
    } catch (error) {
      console.error('Error fetching vehicle status data:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
    } finally {
      setLoading(false);
    }
  };

  const createMissingStatusEntries = (allTrucks, allTrailers, existingStatuses) => {
    const statusVehicleIds = new Set([
      ...existingStatuses.filter(s => s.truck).map(s => `truck-${s.truck}`),
      ...existingStatuses.filter(s => s.trailer).map(s => `trailer-${s.trailer}`)
    ]);

    const missingStatuses = [];

    // Add trucks without status
    allTrucks.forEach(truck => {
      if (!statusVehicleIds.has(`truck-${truck.id}`)) {
        missingStatuses.push({
          id: `temp-truck-${truck.id}`,
          vehicle_type: 'truck',
          truck: truck.id,
          truck_info: {
            unit_number: truck.unit_number,
            license_plate: truck.license_plate,
            make: truck.make,
            model: truck.model,
            vin: truck.vin
          },
          current_status: 'safe',
          current_status_display: 'Safe to Operate',
          can_operate: true,
          status_reason: 'No specific status set',
          status_set_at: new Date().toISOString()
        });
      }
    });

    // Add trailers without status
    allTrailers.forEach(trailer => {
      if (!statusVehicleIds.has(`trailer-${trailer.id}`)) {
        missingStatuses.push({
          id: `temp-trailer-${trailer.id}`,
          vehicle_type: 'trailer',
          trailer: trailer.id,
          trailer_info: {
            unit_number: trailer.unit_number,
            license_plate: trailer.license_plate,
            trailer_type: trailer.trailer_type,
            model: trailer.model
          },
          current_status: 'safe',
          current_status_display: 'Safe to Operate',
          can_operate: true,
          status_reason: 'No specific status set',
          status_set_at: new Date().toISOString()
        });
      }
    });

    setVehicleStatuses(prev => [...prev, ...missingStatuses]);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'safe':
        return CheckCircleIcon;
      case 'conditional':
        return ExclamationTriangleIcon;
      case 'prohibited':
      case 'out_of_service':
        return XCircleIcon;
      default:
        return ClockIcon;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'safe':
        return 'text-green-500';
      case 'conditional':
        return 'text-yellow-500';
      case 'prohibited':
      case 'out_of_service':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'safe':
        return 'bg-green-100 text-green-800';
      case 'conditional':
        return 'bg-yellow-100 text-yellow-800';
      case 'prohibited':
      case 'out_of_service':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUpdateStatus = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsUpdateStatusOpen(true);
  };

  const handleStatusUpdated = () => {
    setIsUpdateStatusOpen(false);
    setSelectedVehicle(null);
    fetchData();
  };

  const filteredVehicles = vehicleStatuses.filter(vehicle => {
    if (filterStatus === 'all') return true;
    return vehicle.current_status === filterStatus;
  });

  const statusCounts = {
    all: vehicleStatuses.length,
    safe: vehicleStatuses.filter(v => v.current_status === 'safe').length,
    conditional: vehicleStatuses.filter(v => v.current_status === 'conditional').length,
    prohibited: vehicleStatuses.filter(v => v.current_status === 'prohibited').length,
    out_of_service: vehicleStatuses.filter(v => v.current_status === 'out_of_service').length
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading vehicle status...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vehicle Operation Status</h1>
        <p className="text-gray-600">CFR 396.7 - Monitor vehicle safety status and operation compliance</p>
      </div>

      {/* Compliance Alerts */}
      <ComplianceAlerts vehicleStatuses={vehicleStatuses} />

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div 
          className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer border-2 ${filterStatus === 'all' ? 'border-blue-500' : 'border-transparent'}`}
          onClick={() => setFilterStatus('all')}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TruckIcon className="h-8 w-8 text-gray-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Vehicles</dt>
                  <dd className="text-lg font-medium text-gray-900">{statusCounts.all}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer border-2 ${filterStatus === 'safe' ? 'border-green-500' : 'border-transparent'}`}
          onClick={() => setFilterStatus('safe')}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Safe to Operate</dt>
                  <dd className="text-lg font-medium text-green-600">{statusCounts.safe}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer border-2 ${filterStatus === 'conditional' ? 'border-yellow-500' : 'border-transparent'}`}
          onClick={() => setFilterStatus('conditional')}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Conditional</dt>
                  <dd className="text-lg font-medium text-yellow-600">{statusCounts.conditional}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer border-2 ${filterStatus === 'prohibited' ? 'border-red-500' : 'border-transparent'}`}
          onClick={() => setFilterStatus('prohibited')}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-8 w-8 text-red-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Prohibited</dt>
                  <dd className="text-lg font-medium text-red-600">{statusCounts.prohibited}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer border-2 ${filterStatus === 'out_of_service' ? 'border-red-700' : 'border-transparent'}`}
          onClick={() => setFilterStatus('out_of_service')}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-8 w-8 text-red-700" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Out of Service</dt>
                  <dd className="text-lg font-medium text-red-700">{statusCounts.out_of_service}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Status Grid */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Vehicle Status Details ({filteredVehicles.length} vehicles)
          </h2>
        </div>

        {filteredVehicles.length === 0 ? (
          <div className="text-center py-8">
            <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No vehicles found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filterStatus === 'all' ? 'No vehicles in system.' : `No vehicles with ${filterStatus} status.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {filteredVehicles.map((vehicle) => (
              <VehicleStatusCard
                key={vehicle.id}
                vehicle={vehicle}
                onUpdateStatus={handleUpdateStatus}
              />
            ))}
          </div>
        )}
      </div>

      {/* Update Status Modal */}
      {isUpdateStatusOpen && selectedVehicle && (
        <UpdateVehicleStatus
          isOpen={isUpdateStatusOpen}
          onClose={() => setIsUpdateStatusOpen(false)}
          vehicle={selectedVehicle}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  );
}

export default VehicleStatusDashboard;