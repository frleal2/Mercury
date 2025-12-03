import React from 'react';
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TruckIcon,
  PencilIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline';

function VehicleStatusCard({ vehicle, onUpdateStatus }) {
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
        return 'text-green-600 bg-green-50 border-green-200';
      case 'conditional':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'prohibited':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'out_of_service':
        return 'text-red-700 bg-red-100 border-red-300';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status, canOperate) => {
    if (!canOperate) {
      return 'bg-red-500 text-white';
    }
    switch (status) {
      case 'safe':
        return 'bg-green-500 text-white';
      case 'conditional':
        return 'bg-yellow-500 text-white';
      case 'prohibited':
        return 'bg-red-500 text-white';
      case 'out_of_service':
        return 'bg-red-700 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const StatusIcon = getStatusIcon(vehicle.current_status);
  const vehicleInfo = vehicle.truck_info || vehicle.trailer_info;
  const vehicleType = vehicle.truck_info ? 'Truck' : 'Trailer';

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  const getVehicleIdentifier = () => {
    if (vehicleInfo?.unit_number) {
      return vehicleInfo.unit_number;
    }
    if (vehicleInfo?.license_plate) {
      return vehicleInfo.license_plate;
    }
    return 'Unknown Vehicle';
  };

  const getVehicleDetails = () => {
    if (vehicle.truck_info) {
      return `${vehicleInfo.make || 'Unknown'} ${vehicleInfo.model || ''} - VIN: ${vehicleInfo.vin || 'N/A'}`;
    } else if (vehicle.trailer_info) {
      return `${vehicleInfo.trailer_type || 'Trailer'} - ${vehicleInfo.model || 'Unknown Model'}`;
    }
    return 'No details available';
  };

  return (
    <div className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${getStatusColor(vehicle.current_status)}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <TruckIcon className="h-5 w-5 text-gray-500 mr-2" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{vehicleType}</h3>
            <p className="text-lg font-bold text-gray-700">{getVehicleIdentifier()}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <StatusIcon className={`h-6 w-6 ${vehicle.can_operate ? getStatusColor(vehicle.current_status).split(' ')[0] : 'text-red-500'}`} />
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(vehicle.current_status, vehicle.can_operate)}`}>
            {vehicle.can_operate ? 'OPERATIONAL' : 'RESTRICTED'}
          </span>
        </div>
      </div>

      {/* Vehicle Details */}
      <div className="mb-3">
        <p className="text-sm text-gray-600 mb-1">{getVehicleDetails()}</p>
        {vehicleInfo?.license_plate && (
          <p className="text-sm text-gray-500">License: {vehicleInfo.license_plate}</p>
        )}
      </div>

      {/* Status Information */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Current Status:</span>
          <span className={`text-sm font-medium ${getStatusColor(vehicle.current_status).split(' ')[0]}`}>
            {vehicle.current_status_display || vehicle.current_status}
          </span>
        </div>
        
        {vehicle.status_reason && (
          <div className="text-sm text-gray-600">
            <p className="font-medium">Reason:</p>
            <p className="text-gray-500">{vehicle.status_reason}</p>
          </div>
        )}

        <div className="flex items-center text-xs text-gray-500">
          <CalendarIcon className="h-4 w-4 mr-1" />
          <span>Updated: {formatDateTime(vehicle.status_set_at)}</span>
        </div>

        {vehicle.set_by_user && (
          <div className="flex items-center text-xs text-gray-500">
            <UserIcon className="h-4 w-4 mr-1" />
            <span>By: {vehicle.set_by_user}</span>
          </div>
        )}
      </div>

      {/* Compliance Indicators */}
      <div className="space-y-1 mb-4">
        {!vehicle.can_operate && (
          <div className="flex items-center text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
            <span>CFR 396.7 - Operation Prohibited</span>
          </div>
        )}
        
        {vehicle.current_status === 'conditional' && (
          <div className="flex items-center text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
            <span>Conditional Operation - Monitor Required</span>
          </div>
        )}

        {vehicle.current_status === 'safe' && vehicle.can_operate && (
          <div className="flex items-center text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
            <CheckCircleIcon className="h-4 w-4 mr-1" />
            <span>Compliant - Safe to Operate</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={() => onUpdateStatus(vehicle)}
        className="w-full flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <PencilIcon className="h-4 w-4 mr-1" />
        Update Status
      </button>
    </div>
  );
}

export default VehicleStatusCard;