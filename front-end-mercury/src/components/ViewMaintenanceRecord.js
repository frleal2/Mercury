import React from 'react';
import { XMarkIcon, TruckIcon, CalendarIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

function ViewMaintenanceRecord({ record, onClose }) {
  if (!record) return null;

  const getStatusBadge = (status) => {
    const statusClasses = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ').toUpperCase()}
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
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityClasses[priority] || 'bg-gray-100 text-gray-800'}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const getTimeInfo = (record) => {
    if (record.status === 'completed') {
      return {
        text: `Completed ${new Date(record.completed_date).toLocaleDateString()}`,
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
        icon: ExclamationTriangleIcon
      };
    }
    
    return {
      text: `Due ${new Date(record.scheduled_date).toLocaleDateString()}`,
      color: 'text-gray-600',
      icon: CalendarIcon
    };
  };

  const timeInfo = getTimeInfo(record);
  const TimeIcon = timeInfo.icon;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center mb-2">
              <TruckIcon className="h-6 w-6 mr-2 text-blue-600" />
              Work Order: {record.work_order_number}
            </h3>
            <div className="flex items-center space-x-4">
              {getStatusBadge(record.status)}
              {getPriorityBadge(record.priority)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Vehicle and Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Vehicle Information</h4>
              <p className="mt-1 text-lg font-medium text-gray-900">{record.vehicle_identifier}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Maintenance Type</h4>
              <p className="mt-1 text-lg text-gray-900">{record.maintenance_type_name}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Timing</h4>
              <div className={`mt-1 flex items-center ${timeInfo.color}`}>
                <TimeIcon className="h-5 w-5 mr-2" />
                <span className="font-medium">{timeInfo.text}</span>
              </div>
            </div>

            {record.due_mileage && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Due Mileage</h4>
                <p className="mt-1 text-lg text-gray-900">{record.due_mileage.toLocaleString()} miles</p>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Description</h4>
          <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{record.description}</p>
        </div>

        {/* Work Details */}
        {(record.parts_used || record.labor_hours || record.total_cost) && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Work Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {record.parts_used && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700">Parts Used</h5>
                  <p className="mt-1 text-gray-900">{record.parts_used}</p>
                </div>
              )}
              {record.labor_hours && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700">Labor Hours</h5>
                  <p className="mt-1 text-gray-900">{record.labor_hours} hours</p>
                </div>
              )}
              {record.total_cost && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700">Total Cost</h5>
                  <p className="mt-1 text-gray-900">${parseFloat(record.total_cost).toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Service Provider */}
        {(record.service_provider || record.technician_name) && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Service Provider</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {record.service_provider && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700">Company</h5>
                  <p className="mt-1 text-gray-900">{record.service_provider}</p>
                </div>
              )}
              {record.technician_name && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700">Technician</h5>
                  <p className="mt-1 text-gray-900">{record.technician_name}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {record.notes && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Additional Notes</h4>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{record.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ViewMaintenanceRecord;