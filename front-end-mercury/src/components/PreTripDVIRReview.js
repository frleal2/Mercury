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
  DocumentTextIcon,
  ClockIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

function PreTripDVIRReview({ isOpen, onClose, trip, onReviewCompleted }) {
  const { session, refreshAccessToken } = useSession();
  const [lastDVIR, setLastDVIR] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [acknowledgment, setAcknowledgment] = useState('');

  useEffect(() => {
    if (trip && isOpen) {
      fetchLastDVIR();
    }
  }, [trip, isOpen]);

  const fetchLastDVIR = async () => {
    try {
      setLoading(true);
      
      // Get the last post-trip inspection for this truck
      const response = await axios.get(`${BASE_URL}/api/TripInspection/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
        params: {
          truck: trip.truck,
          inspection_type: 'post_trip',
          limit: 1,
          ordering: '-completed_at'
        }
      });

      if (response.data.results && response.data.results.length > 0) {
        setLastDVIR(response.data.results[0]);
      } else {
        setLastDVIR(null); // No previous DVIR found
      }
    } catch (error) {
      console.error('Error fetching last DVIR:', error);
      setError('Failed to load last DVIR');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!acknowledgment.trim()) {
      setError('Please provide acknowledgment text');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await axios.patch(`${BASE_URL}/api/Trips/${trip.id}/`, {
        last_dvir_reviewed: true,
        last_dvir_reviewed_at: new Date().toISOString(),
        last_dvir_acknowledgment: acknowledgment
      }, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });

      console.log('DVIR review recorded successfully');
      onReviewCompleted();
      onClose();
    } catch (error) {
      console.error('Error recording DVIR review:', error);
      setError(error.response?.data?.error || 'Failed to record DVIR review');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (!trip) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
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
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-6 w-6 mr-2 text-blue-600" />
                    <span>Pre-Trip DVIR Review - Trip #{trip.id}</span>
                  </div>
                </Dialog.Title>

                {error && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                      {error}
                    </div>
                  </div>
                )}

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading last DVIR...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* CFR Requirement Notice */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                        <div>
                          <h4 className="font-semibold text-blue-900">CFR 396.13 Requirement</h4>
                          <p className="text-sm text-blue-800 mt-1">
                            Before operating this vehicle, you must review the last Driver Vehicle Inspection Report (DVIR) 
                            and acknowledge that the vehicle is safe to operate.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Last DVIR Display */}
                    {lastDVIR ? (
                      <div className="bg-gray-50 border rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Last Post-Trip DVIR</h4>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Completed:</span>
                            <p>{formatDate(lastDVIR.completed_at)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Driver:</span>
                            <p>{lastDVIR.completed_by_name}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Overall Status:</span>
                            <p className={`font-medium ${
                              lastDVIR.overall_status === 'satisfactory' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {lastDVIR.overall_status === 'satisfactory' ? '✓ No Defects' : '⚠ Defects Found'}
                            </p>
                          </div>
                        </div>

                        {lastDVIR.defects_noted && (
                          <div className="mt-4">
                            <span className="font-medium text-gray-600">Defects Noted:</span>
                            <p className="text-sm text-gray-800 mt-1">{lastDVIR.defects_noted}</p>
                          </div>
                        )}

                        {lastDVIR.repair_certifications && lastDVIR.repair_certifications.length > 0 && (
                          <div className="mt-4">
                            <span className="font-medium text-gray-600">Outstanding Issues:</span>
                            <ul className="mt-2 space-y-1">
                              {lastDVIR.repair_certifications.filter(cert => !cert.repair_completed).map((cert, index) => (
                                <li key={index} className="text-sm">
                                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                    cert.affects_safety ? 'bg-red-500' : 'bg-yellow-500'
                                  }`}></span>
                                  {cert.defect_description}
                                  {cert.affects_safety && <span className="text-red-600 font-medium"> (SAFETY CRITICAL)</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                          <div>
                            <h4 className="font-semibold text-yellow-900">No Previous DVIR Found</h4>
                            <p className="text-sm text-yellow-800 mt-1">
                              No previous Driver Vehicle Inspection Report found for this vehicle. 
                              You may proceed with acknowledgment that you have inspected the vehicle.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Driver Acknowledgment */}
                    <div>
                      <label htmlFor="acknowledgment" className="block text-sm font-medium text-gray-700 mb-2">
                        Driver Acknowledgment *
                      </label>
                      <textarea
                        id="acknowledgment"
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="I have reviewed the above information and certify that the vehicle is safe to operate..."
                        value={acknowledgment}
                        onChange={(e) => setAcknowledgment(e.target.value)}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Required: Acknowledge that you have reviewed the last DVIR and the vehicle is safe to operate.
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    onClick={onClose}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleReviewSubmit}
                    disabled={submitting || loading || !acknowledgment.trim()}
                  >
                    {submitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Recording...
                      </div>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4 mr-2 inline" />
                        Complete DVIR Review
                      </>
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default PreTripDVIRReview;