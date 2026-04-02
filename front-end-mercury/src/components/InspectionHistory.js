import React, { useState, useEffect } from 'react';

import { useSession } from '../providers/SessionProvider';
import axios from 'axios';
import BASE_URL from '../config';
import InspectionDetailModal from './InspectionDetailModal';
import { 
  XMarkIcon,
  TruckIcon,
  UserIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

function InspectionHistory({ truck, trailer, onClose }) {
  const { session, refreshAccessToken } = useSession();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const vehicle = truck || trailer;
  const vehicleType = truck ? 'Truck' : 'Trailer';
  const vehicleLabel = truck
    ? `${truck.unit_number} — ${truck.year} ${truck.make} ${truck.model}`
    : `${trailer.unit_number || trailer.license_plate} — ${trailer.trailer_type || trailer.model || 'Trailer'}`;

  useEffect(() => {
    if (vehicle) {
      fetchInspections();
    }
  }, [vehicle]);

  const fetchInspections = async () => {
    try {
      setLoading(true);
      
      const params = {};
      if (truck) {
        params.truck = truck.id;
      } else if (trailer) {
        params.trailer = trailer.id;
      }

      const response = await axios.get(`${BASE_URL}/api/trip-inspections/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
        params,
      });

      const data = response.data.results || response.data;
      setInspections(Array.isArray(data) ? data : []);
      setError(null);
    } catch (error) {
      console.error('Error fetching inspections:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
        return fetchInspections();
      }
      setError('Failed to load inspection history');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const handleViewDetails = (inspection) => {
    setSelectedInspection(inspection);
    setDetailModalOpen(true);
  };

  const passedCount = inspections.filter(i => i.is_inspection_passed).length;
  const failedCount = inspections.filter(i => !i.is_inspection_passed).length;

  return (
    <>
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50" onClick={onClose}></div>
      <div className="relative top-10 mx-auto p-5 border w-11/12 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <ClipboardDocumentCheckIcon className="h-6 w-6 text-blue-600 mr-2" />
            Inspection History — {vehicleType}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-6">{vehicleLabel}</p>

                {loading ? (
                  <div className="flex justify-center items-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-3 text-gray-600">Loading inspections...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
                    <p className="mt-2 text-gray-600">{error}</p>
                    <button onClick={fetchInspections} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                      Retry
                    </button>
                  </div>
                ) : inspections.length === 0 ? (
                  <div className="text-center py-8">
                    <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No inspections found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      This {vehicleType.toLowerCase()} hasn't had any trip inspections yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="flex gap-4 mb-4">
                      <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-blue-700">{inspections.length}</p>
                        <p className="text-xs text-blue-600">Total</p>
                      </div>
                      <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-green-700">{passedCount}</p>
                        <p className="text-xs text-green-600">Passed</p>
                      </div>
                      <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-red-700">{failedCount}</p>
                        <p className="text-xs text-red-600">Failed</p>
                      </div>
                    </div>

                    {/* Inspection List */}
                    <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
                      {inspections.map((inspection) => {
                        const passed = inspection.is_inspection_passed;
                        const type = inspection.inspection_type === 'pre_trip' ? 'Pre-Trip' : 'Post-Trip';

                        return (
                          <div 
                            key={inspection.inspection_id} 
                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => handleViewDetails(inspection)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center min-w-0">
                                <div className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${
                                  passed ? 'bg-green-100' : 'bg-red-100'
                                }`}>
                                  {passed ? (
                                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                  ) : (
                                    <XCircleIcon className="h-5 w-5 text-red-600" />
                                  )}
                                </div>
                                <div className="ml-3 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-900">{type}</span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                      passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {passed ? 'Pass' : 'Fail'}
                                    </span>
                                    {inspection.trip_number && (
                                      <span className="text-xs text-gray-400">Trip #{inspection.trip_number}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                                    <span className="flex items-center">
                                      <CalendarIcon className="h-3 w-3 mr-1" />
                                      {formatDateTime(inspection.completed_at)}
                                    </span>
                                    {inspection.completed_by_name && (
                                      <span className="flex items-center">
                                        <UserIcon className="h-3 w-3 mr-1" />
                                        {inspection.completed_by_name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <EyeIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Close
                  </button>
                </div>
      </div>
    </div>
    <InspectionDetailModal
      isOpen={detailModalOpen}
      onClose={() => { setDetailModalOpen(false); setSelectedInspection(null); }}
      inspection={selectedInspection}
    />
    </>
  );
}

export default InspectionHistory;
