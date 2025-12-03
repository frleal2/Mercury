import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import { 
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

function UpdateVehicleStatus({ isOpen, onClose, vehicle, onStatusUpdated }) {
  const { session, refreshAccessToken } = useSession();
  const [formData, setFormData] = useState({
    current_status: '',
    status_reason: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (vehicle) {
      setFormData({
        current_status: vehicle.current_status || 'safe',
        status_reason: vehicle.status_reason || '',
        notes: vehicle.notes || ''
      });
    }
  }, [vehicle]);

  const statusOptions = [
    {
      value: 'safe',
      label: 'Safe to Operate',
      description: 'Vehicle has no known defects and is safe for operation',
      icon: CheckCircleIcon,
      color: 'text-green-600'
    },
    {
      value: 'conditional',
      label: 'Conditional Operation',
      description: 'Vehicle has minor defects but can operate with monitoring',
      icon: ExclamationTriangleIcon,
      color: 'text-yellow-600'
    },
    {
      value: 'prohibited',
      label: 'Operation Prohibited',
      description: 'Vehicle has safety defects that prohibit operation',
      icon: XCircleIcon,
      color: 'text-red-600'
    },
    {
      value: 'out_of_service',
      label: 'Out of Service',
      description: 'Vehicle is out of service for maintenance or other reasons',
      icon: XCircleIcon,
      color: 'text-red-700'
    }
  ];

  const getVehicleDisplayName = () => {
    if (!vehicle) return 'Unknown Vehicle';
    const info = vehicle.truck_info || vehicle.trailer_info;
    const type = vehicle.truck_info ? 'Truck' : 'Trailer';
    const identifier = info?.unit_number || info?.license_plate || 'Unknown';
    return `${type} ${identifier}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        vehicle_type: vehicle.truck_info ? 'truck' : 'trailer',
        truck: vehicle.truck_info ? vehicle.truck : null,
        trailer: vehicle.trailer_info ? vehicle.trailer : null,
        current_status: formData.current_status,
        status_reason: formData.status_reason,
        notes: formData.notes
      };

      // Determine if this is a new status or update
      const isNewStatus = !vehicle.id || vehicle.id.toString().startsWith('temp-');
      
      if (isNewStatus) {
        // Create new status
        await axios.post(`${BASE_URL}/api/vehicle-operation-status/`, submitData, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        });
      } else {
        // Update existing status
        await axios.patch(`${BASE_URL}/api/vehicle-operation-status/${vehicle.id}/`, submitData, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        });
      }

      onStatusUpdated();
    } catch (error) {
      console.error('Error updating vehicle status:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
      setError(error.response?.data?.error || 'Failed to update vehicle status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusWarning = (status) => {
    switch (status) {
      case 'prohibited':
      case 'out_of_service':
        return {
          type: 'error',
          message: 'This status will prevent the vehicle from being used in operations. Ensure all safety issues are resolved before changing status.'
        };
      case 'conditional':
        return {
          type: 'warning',
          message: 'This status allows operation but requires increased monitoring and documentation of the conditional issues.'
        };
      case 'safe':
        return {
          type: 'success',
          message: 'This status confirms the vehicle meets all safety requirements and is fully operational.'
        };
      default:
        return null;
    }
  };

  const statusWarning = getStatusWarning(formData.current_status);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex items-center justify-between">
                  <span>Update Vehicle Status</span>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </Dialog.Title>

                <div className="mt-4">
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-gray-900">{getVehicleDisplayName()}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Current Status: {vehicle?.current_status_display || vehicle?.current_status || 'Not Set'}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Status Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Operation Status *
                      </label>
                      <div className="space-y-2">
                        {statusOptions.map((option) => {
                          const IconComponent = option.icon;
                          return (
                            <label
                              key={option.value}
                              className={`flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                                formData.current_status === option.value
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="current_status"
                                value={option.value}
                                checked={formData.current_status === option.value}
                                onChange={(e) => setFormData(prev => ({ ...prev, current_status: e.target.value }))}
                                className="sr-only"
                              />
                              <div className="flex items-start w-full">
                                <IconComponent className={`h-5 w-5 ${option.color} mr-3 mt-0.5 flex-shrink-0`} />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {option.label}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {option.description}
                                  </div>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Status Warning */}
                    {statusWarning && (
                      <div className={`p-3 rounded-lg border ${
                        statusWarning.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                        statusWarning.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                        'bg-green-50 border-green-200 text-green-800'
                      }`}>
                        <div className="flex items-start">
                          <InformationCircleIcon className={`h-5 w-5 ${
                            statusWarning.type === 'error' ? 'text-red-500' :
                            statusWarning.type === 'warning' ? 'text-yellow-500' :
                            'text-green-500'
                          } mr-2 mt-0.5 flex-shrink-0`} />
                          <p className="text-sm">{statusWarning.message}</p>
                        </div>
                      </div>
                    )}

                    {/* Status Reason */}
                    <div>
                      <label htmlFor="status_reason" className="block text-sm font-medium text-gray-700 mb-1">
                        Status Reason *
                      </label>
                      <input
                        type="text"
                        id="status_reason"
                        value={formData.status_reason}
                        onChange={(e) => setFormData(prev => ({ ...prev, status_reason: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Brief reason for this status..."
                        required
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Notes
                      </label>
                      <textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Additional details, maintenance required, timeline, etc..."
                      />
                    </div>

                    {/* Compliance Notice */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start">
                        <InformationCircleIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium">CFR 396.7 Compliance</p>
                          <p className="mt-1">This status update will be recorded for DOT compliance and audit purposes.</p>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center">
                          <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                          <p className="text-sm text-red-800">{error}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        disabled={loading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        disabled={loading}
                      >
                        {loading ? 'Updating...' : 'Update Status'}
                      </button>
                    </div>
                  </form>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default UpdateVehicleStatus;