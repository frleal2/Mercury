import React from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  UserIcon,
  CalendarIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

const cfrItems = [
  { key: 'service_brakes', label: 'Service Brakes & Trailer Brake Connections', help: 'CFR 396.11(a)(1)(i)' },
  { key: 'parking_brake', label: 'Parking Brake', help: 'CFR 396.11(a)(1)(ii)' },
  { key: 'steering_mechanism', label: 'Steering Mechanism', help: 'CFR 396.11(a)(1)(iii)' },
  { key: 'lighting_devices', label: 'Lighting Devices & Reflectors', help: 'CFR 396.11(a)(1)(iv)' },
  { key: 'tires_condition', label: 'Tires', help: 'CFR 396.11(a)(1)(v)' },
  { key: 'horn', label: 'Horn', help: 'CFR 396.11(a)(1)(vi)' },
  { key: 'windshield_wipers', label: 'Windshield Wipers', help: 'CFR 396.11(a)(1)(vii)' },
  { key: 'rear_vision_mirrors', label: 'Rear Vision Mirrors', help: 'CFR 396.11(a)(1)(viii)' },
  { key: 'coupling_devices', label: 'Coupling Devices', help: 'CFR 396.11(a)(1)(ix)' },
  { key: 'wheels_and_rims', label: 'Wheels and Rims', help: 'CFR 396.11(a)(1)(x)' },
  { key: 'emergency_equipment', label: 'Emergency Equipment', help: 'CFR 396.11(a)(1)(xi)' },
];

const trailerItems = [
  { key: 'trailer_attached_properly', label: 'Trailer Attachment', help: 'CFR 396.11(b)(v)' },
  { key: 'trailer_lights_working', label: 'Trailer Lights & Markers', help: 'CFR 396.11(b)(ii)' },
  { key: 'cargo_secured', label: 'Cargo Securement', help: 'Cargo regulations' },
];

function InspectionDetailModal({ isOpen, onClose, inspection }) {
  if (!inspection) return null;

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (value) => {
    if (!value || value === 'na') {
      return <span className="text-xs text-gray-400">N/A</span>;
    }
    if (value === 'pass') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircleIcon className="h-3 w-3 mr-1" />
          Pass
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircleIcon className="h-3 w-3 mr-1" />
        Fail
      </span>
    );
  };

  const inspectionType = inspection.inspection_type === 'pre_trip' ? 'Pre-Trip' : 'Post-Trip';
  const passed = inspection.is_inspection_passed;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
            <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
              <button type="button" onClick={onClose} className="rounded-md bg-white text-gray-400 hover:text-gray-500">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <DialogTitle className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  {inspectionType} Inspection Details
                </DialogTitle>

                {/* Header Info */}
                <div className={`rounded-lg p-4 mb-6 ${passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {passed ? (
                        <CheckCircleIcon className="h-8 w-8 text-green-600 mr-3" />
                      ) : (
                        <XCircleIcon className="h-8 w-8 text-red-600 mr-3" />
                      )}
                      <div>
                        <h3 className={`text-lg font-semibold ${passed ? 'text-green-800' : 'text-red-800'}`}>
                          {passed ? 'Inspection Passed' : 'Inspection Failed'}
                        </h3>
                        <p className="text-sm text-gray-600">{inspectionType} • CFR 396.11</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                </div>

                {/* Meta Info Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div className="flex items-center text-gray-600">
                    <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                    <div>
                      <span className="font-medium">Completed:</span>
                      <p>{formatDateTime(inspection.completed_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                    <div>
                      <span className="font-medium">Inspector:</span>
                      <p>{inspection.completed_by_name || 'N/A'}</p>
                    </div>
                  </div>
                  {inspection.truck_info && (
                    <div className="flex items-center text-gray-600">
                      <TruckIcon className="h-4 w-4 mr-2 text-gray-400" />
                      <div>
                        <span className="font-medium">Truck:</span>
                        <p>{inspection.truck_info.unit_number} — {inspection.truck_info.make_model}</p>
                      </div>
                    </div>
                  )}
                  {inspection.trailer_info && (
                    <div className="flex items-center text-gray-600">
                      <TruckIcon className="h-4 w-4 mr-2 text-gray-400" />
                      <div>
                        <span className="font-medium">Trailer:</span>
                        <p>{inspection.trailer_info.unit_number} — {inspection.trailer_info.trailer_type || inspection.trailer_info.model}</p>
                      </div>
                    </div>
                  )}
                  {inspection.trip_number && (
                    <div className="flex items-center text-gray-600">
                      <DocumentTextIcon className="h-4 w-4 mr-2 text-gray-400" />
                      <div>
                        <span className="font-medium">Trip:</span>
                        <p>#{inspection.trip_number}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Truck/Tractor Inspection Items */}
                <div className="mb-6">
                  <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                    <TruckIcon className="h-5 w-5 mr-2 text-blue-600" />
                    Truck/Tractor Items (CFR 396.11)
                  </h4>
                  <div className="space-y-2">
                    {cfrItems.map(item => (
                      <div key={item.key} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{item.label}</span>
                          <span className="text-xs text-gray-400 ml-2">{item.help}</span>
                        </div>
                        {getStatusBadge(inspection[item.key])}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trailer Inspection Items */}
                <div className="mb-6">
                  <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="h-5 w-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Trailer Items (CFR 396.11)
                  </h4>
                  <div className="space-y-2">
                    {trailerItems.map(item => (
                      <div key={item.key} className="flex items-center justify-between bg-orange-50 rounded-lg px-4 py-2">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{item.label}</span>
                          <span className="text-xs text-gray-400 ml-2">{item.help}</span>
                        </div>
                        {getStatusBadge(inspection[item.key])}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Failed Items Summary */}
                {inspection.failed_items && inspection.failed_items.length > 0 && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-red-800 mb-2">Failed Items ({inspection.failed_items.length})</h4>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                      {inspection.failed_items.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Notes */}
                {inspection.inspection_notes && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Notes:</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{inspection.inspection_notes}</p>
                  </div>
                )}

                {/* Close Button */}
                <div className="mt-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:w-auto"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

export default InspectionDetailModal;
