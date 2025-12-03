import React from 'react';
import { 
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';

function ComplianceAlerts({ vehicleStatuses }) {
  const getComplianceIssues = () => {
    const issues = [];
    
    // Count vehicles that cannot operate
    const inoperableVehicles = vehicleStatuses.filter(v => !v.can_operate);
    if (inoperableVehicles.length > 0) {
      issues.push({
        type: 'critical',
        title: 'CFR 396.7 Violation - Unsafe Operation Prohibited',
        message: `${inoperableVehicles.length} vehicle(s) are marked as unsafe and cannot be operated until issues are resolved.`,
        count: inoperableVehicles.length,
        vehicles: inoperableVehicles.map(v => {
          const info = v.truck_info || v.trailer_info;
          return info?.unit_number || info?.license_plate || 'Unknown Vehicle';
        })
      });
    }

    // Count vehicles with conditional status
    const conditionalVehicles = vehicleStatuses.filter(v => v.current_status === 'conditional');
    if (conditionalVehicles.length > 0) {
      issues.push({
        type: 'warning',
        title: 'Conditional Operation Status',
        message: `${conditionalVehicles.length} vehicle(s) have conditional operation status and require monitoring.`,
        count: conditionalVehicles.length,
        vehicles: conditionalVehicles.map(v => {
          const info = v.truck_info || v.trailer_info;
          return info?.unit_number || info?.license_plate || 'Unknown Vehicle';
        })
      });
    }

    // Count vehicles out of service
    const outOfServiceVehicles = vehicleStatuses.filter(v => v.current_status === 'out_of_service');
    if (outOfServiceVehicles.length > 0) {
      issues.push({
        type: 'critical',
        title: 'Vehicles Out of Service',
        message: `${outOfServiceVehicles.length} vehicle(s) are out of service and unavailable for operations.`,
        count: outOfServiceVehicles.length,
        vehicles: outOfServiceVehicles.map(v => {
          const info = v.truck_info || v.trailer_info;
          return info?.unit_number || info?.license_plate || 'Unknown Vehicle';
        })
      });
    }

    // Count vehicles with prohibited status
    const prohibitedVehicles = vehicleStatuses.filter(v => v.current_status === 'prohibited');
    if (prohibitedVehicles.length > 0) {
      issues.push({
        type: 'critical',
        title: 'Prohibited Operation Status',
        message: `${prohibitedVehicles.length} vehicle(s) are prohibited from operation due to safety violations.`,
        count: prohibitedVehicles.length,
        vehicles: prohibitedVehicles.map(v => {
          const info = v.truck_info || v.trailer_info;
          return info?.unit_number || info?.license_plate || 'Unknown Vehicle';
        })
      });
    }

    return issues;
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'critical':
        return XCircleIcon;
      case 'warning':
        return ExclamationTriangleIcon;
      case 'info':
        return InformationCircleIcon;
      default:
        return ShieldExclamationIcon;
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case 'critical':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const complianceIssues = getComplianceIssues();
  const safeVehicles = vehicleStatuses.filter(v => v.current_status === 'safe' && v.can_operate);

  if (complianceIssues.length === 0 && vehicleStatuses.length > 0) {
    return (
      <div className="mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <InformationCircleIcon className="h-5 w-5 text-green-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                All Vehicles Compliant
              </h3>
              <p className="text-sm text-green-700 mt-1">
                All {safeVehicles.length} vehicles are safe to operate and compliant with CFR 396.7 regulations.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (complianceIssues.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <ShieldExclamationIcon className="h-5 w-5 text-red-500 mr-2" />
            Compliance Alerts ({complianceIssues.length})
          </h2>
        </div>
        
        <div className="p-6 space-y-4">
          {complianceIssues.map((issue, index) => {
            const AlertIcon = getAlertIcon(issue.type);
            return (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getAlertColor(issue.type)}`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <AlertIcon className={`h-5 w-5 ${getIconColor(issue.type)}`} />
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium">
                      {issue.title}
                    </h3>
                    <p className="text-sm mt-1">
                      {issue.message}
                    </p>
                    
                    {issue.vehicles && issue.vehicles.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium mb-1">Affected Vehicles:</p>
                        <div className="flex flex-wrap gap-1">
                          {issue.vehicles.slice(0, 5).map((vehicle, vehicleIndex) => (
                            <span
                              key={vehicleIndex}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-white bg-opacity-50"
                            >
                              {vehicle}
                            </span>
                          ))}
                          {issue.vehicles.length > 5 && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-white bg-opacity-50">
                              +{issue.vehicles.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs font-medium">
                        Action Required: Update vehicle status or complete repairs
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        issue.type === 'critical' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'
                      }`}>
                        {issue.type === 'critical' ? 'CRITICAL' : 'WARNING'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ComplianceAlerts;