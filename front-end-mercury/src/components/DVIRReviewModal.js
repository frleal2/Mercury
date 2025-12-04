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
  DocumentTextIcon,
  ClockIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

function DVIRReviewModal({ isOpen, onClose, trip, onReviewCompleted }) {
  const { session, refreshAccessToken } = useSession();
  const [inspections, setInspections] = useState([]);
  const [reviewData, setReviewData] = useState({
    pre_trip_dvir_reviewed: trip.pre_trip_dvir_reviewed || false,
    post_trip_dvir_reviewed: trip.post_trip_dvir_reviewed || false,
    pre_trip_review_notes: trip.pre_trip_review_notes || '',
    post_trip_review_notes: trip.post_trip_review_notes || ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (trip && isOpen) {
      fetchTripInspections();
    }
  }, [trip, isOpen]);

  const fetchTripInspections = async () => {
    try {
      setLoading(true);
      
      const response = await axios.get(`${BASE_URL}/api/trip-inspections/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
        params: { trip: trip.id }
      });

      setInspections(response.data);
    } catch (error) {
      console.error('Error fetching trip inspections:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const submitData = {
        ...reviewData,
        pre_trip_dvir_reviewed_at: reviewData.pre_trip_dvir_reviewed ? new Date().toISOString() : null,
        post_trip_dvir_reviewed_at: reviewData.post_trip_dvir_reviewed ? new Date().toISOString() : null
      };

      await axios.patch(`${BASE_URL}/api/trips/${trip.id}/`, submitData, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });

      onReviewCompleted();
    } catch (error) {
      console.error('Error updating DVIR review:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
      setError(error.response?.data?.error || 'Failed to update DVIR review');
    } finally {
      setSubmitting(false);
    }
  };

  const getInspectionsByType = (type) => {
    return inspections.filter(inspection => inspection.inspection_type === type);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not performed';
    return new Date(dateString).toLocaleString();
  };

  const getDefectSeverity = (inspection) => {
    if (!inspection.defects_found) return null;
    
    const hasCritical = inspection.defects && inspection.defects.some(d => 
      d.severity === 'critical' || d.puts_vehicle_out_of_service
    );
    const hasMajor = inspection.defects && inspection.defects.some(d => 
      d.severity === 'major'
    );
    
    if (hasCritical) return { level: 'critical', label: 'Critical Defects', color: 'text-red-600' };
    if (hasMajor) return { level: 'major', label: 'Major Defects', color: 'text-yellow-600' };
    return { level: 'minor', label: 'Minor Defects', color: 'text-blue-600' };
  };

  const renderInspectionSection = (inspectionType, title, reviewField, notesField) => {
    const sectionInspections = getInspectionsByType(inspectionType);
    const hasInspection = sectionInspections.length > 0;
    const inspection = hasInspection ? sectionInspections[0] : null;
    const defectInfo = inspection ? getDefectSeverity(inspection) : null;

    return (
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
          <DocumentTextIcon className="h-5 w-5 mr-2" />
          {title}
        </h3>

        {!hasInspection ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
              <p className="text-sm text-yellow-800">
                No {inspectionType} inspection recorded for this trip
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Inspection Date:</span>
                <p className="font-medium">{formatDateTime(inspection.inspection_date)}</p>
              </div>
              <div>
                <span className="text-gray-500">Inspector:</span>
                <p className="font-medium">{inspection.inspector_name || 'Not specified'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Defects Found:</span>
                <div className="flex items-center">
                  {inspection.defects_found ? (
                    <>
                      <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                      <span className="text-red-600 font-medium">Yes</span>
                      {defectInfo && (
                        <span className={`ml-2 text-xs px-2 py-1 rounded-full bg-opacity-20 ${defectInfo.color} bg-current`}>
                          {defectInfo.label}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-green-600 font-medium">No</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Vehicle Condition:</span>
                <p className={`font-medium ${inspection.vehicle_safe_to_operate ? 'text-green-600' : 'text-red-600'}`}>
                  {inspection.vehicle_safe_to_operate ? 'Safe to Operate' : 'Unsafe - Do Not Operate'}
                </p>
              </div>
            </div>

            {inspection.defects_found && inspection.defects && inspection.defects.length > 0 && (
              <div className="mt-3">
                <span className="text-sm text-gray-500">Defects:</span>
                <div className="mt-1 space-y-1">
                  {inspection.defects.map((defect, index) => (
                    <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{defect.component}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          defect.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          defect.severity === 'major' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {defect.severity}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1">{defect.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {inspection.notes && (
              <div>
                <span className="text-sm text-gray-500">Inspection Notes:</span>
                <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">{inspection.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Review Section */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id={reviewField}
              checked={reviewData[reviewField]}
              onChange={(e) => setReviewData(prev => ({ 
                ...prev, 
                [reviewField]: e.target.checked 
              }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={reviewField} className="ml-2 text-sm font-medium text-gray-900">
              Mark {title.toLowerCase()} as reviewed (CFR 396.13)
            </label>
          </div>

          <div>
            <label htmlFor={notesField} className="block text-sm font-medium text-gray-700 mb-1">
              Review Notes
            </label>
            <textarea
              id={notesField}
              value={reviewData[notesField]}
              onChange={(e) => setReviewData(prev => ({ 
                ...prev, 
                [notesField]: e.target.value 
              }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notes about the inspection review, any corrective actions needed, etc..."
            />
          </div>

          {reviewData[reviewField] && (
            <div className="mt-2 flex items-start">
              <InformationCircleIcon className="h-4 w-4 text-blue-500 mr-1 mt-0.5" />
              <p className="text-xs text-blue-600">
                This will record that you have reviewed the {inspectionType} inspection as required by CFR 396.13
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <div className="fixed inset-0 bg-black bg-opacity-25" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-4xl bg-white rounded-2xl p-6">
                <div className="flex justify-center items-center h-32">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="ml-3 text-gray-600">Loading inspection data...</p>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>
    );
  }

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
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h2" className="text-xl font-bold leading-6 text-gray-900 flex items-center justify-between mb-6">
                  <span>DVIR Review - Trip #{trip.id}</span>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </Dialog.Title>

                {/* Trip Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Route:</span>
                      <p className="font-medium">{trip.pickup_location} → {trip.destination}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Driver:</span>
                      <p className="font-medium">{trip.driver_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Vehicle:</span>
                      <p className="font-medium">{trip.truck_unit_number} / {trip.trailer_unit_number}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Completed:</span>
                      <p className="font-medium">{formatDateTime(trip.actual_end_date)}</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pre-trip Inspection Review */}
                    {renderInspectionSection(
                      'pre_trip', 
                      'Pre-trip Inspection', 
                      'pre_trip_dvir_reviewed', 
                      'pre_trip_review_notes'
                    )}

                    {/* Post-trip Inspection Review */}
                    {renderInspectionSection(
                      'post_trip', 
                      'Post-trip Inspection', 
                      'post_trip_dvir_reviewed', 
                      'post_trip_review_notes'
                    )}
                  </div>

                  {/* CFR Compliance Notice */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <InformationCircleIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">CFR 396.13 Compliance Requirement</p>
                        <p className="mt-1">
                          Motor carriers must review driver vehicle inspection reports. The review must be completed 
                          and the motor carrier must certify that any defects reported have been noted and that 
                          required repairs have been performed.
                        </p>
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

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      disabled={submitting}
                    >
                      {submitting ? 'Saving Review...' : 'Complete Review'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default DVIRReviewModal;