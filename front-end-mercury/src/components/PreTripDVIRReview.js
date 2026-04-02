import React, { useState, useEffect } from 'react';
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
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (trip && isOpen) {
      // Clear any existing error state when modal opens
      setError('');
      setLastDVIR(null);
      fetchLastDVIR();
    }
  }, [trip, isOpen]);

  const fetchLastDVIR = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      
      console.log('Fetching last DVIR for trip:', trip);
      console.log('Truck ID:', trip.truck);
      
      // Get the last post-trip inspection for this truck
      const response = await axios.get(`${BASE_URL}/api/trip-inspections/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
        params: {
          truck: trip.truck,
          inspection_type: 'post_trip',
          limit: 1,
          ordering: '-completed_at'
        }
      });
      
      console.log('DVIR API response:', response.data);

      // Handle both paginated ({results: [...]}) and flat array responses
      const inspections = response.data.results || response.data;
      if (Array.isArray(inspections) && inspections.length > 0) {
        setLastDVIR(inspections[0]);
      } else {
        setLastDVIR(null); // No previous DVIR found
      }
    } catch (error) {
      console.error('Error fetching last DVIR:', error);
      
      // Don't show error for expected cases:
      // - 404: No previous DVIR exists (normal for new vehicles/first trips)
      // - 401: Authentication issues (handled automatically by session management)
      // - 403: Permission errors that result in empty data (normal for drivers)
      if (error.response?.status === 404 || 
          error.response?.status === 401 || 
          (error.response?.status === 403 && error.response?.data?.detail?.includes('access'))) {
        // These are expected scenarios - clear error and log
        setError('');
        console.log('Expected API response suppressed - no previous DVIR or permission limitation');
      } else {
        // Only show errors for unexpected issues
        console.error('Unexpected error response:', error.response);
        setError(`Failed to load last DVIR: ${error.response?.data?.detail || error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!acknowledged) {
      setError('Please check the acknowledgment box to continue');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const acknowledgmentText = lastDVIR 
        ? `DVIR Reviewed - Trip #${lastDVIR.trip.trip_number} (${formatDate(lastDVIR.completed_at)}): Driver reviewed and acknowledged vehicle is safe to operate.`
        : `No Previous DVIR - New/First Trip: Driver acknowledges no previous DVIR exists and certifies vehicle is safe to operate per CFR 396.13.`;

      const response = await axios.patch(`${BASE_URL}/api/driver/trips/${trip.id}/dvir-review/`, {
        last_dvir_reviewed: true,
        last_dvir_reviewed_at: new Date().toISOString(),
        last_dvir_acknowledgment: acknowledgmentText
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50" onClick={onClose}></div>
      <div className="relative top-10 mx-auto p-5 border w-11/12 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-2" />
            {lastDVIR ? `DVIR Review - Trip #${trip.id}` : `DVIR Check - Trip #${trip.id}`}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

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
                              lastDVIR.is_inspection_passed ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {lastDVIR.is_inspection_passed ? '✓ Passed' : '⚠ Failed'}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Trip:</span>
                            <p>#{lastDVIR.trip_number || lastDVIR.trip_id}</p>
                          </div>
                        </div>

                        {/* CFR 396.11 Inspection Items */}
                        <div className="mt-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">CFR 396.11 Inspection Items:</h5>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { key: 'service_brakes', label: 'Service Brakes' },
                              { key: 'parking_brake', label: 'Parking Brake' },
                              { key: 'steering_mechanism', label: 'Steering' },
                              { key: 'lighting_devices', label: 'Lights & Reflectors' },
                              { key: 'tires_condition', label: 'Tires' },
                              { key: 'horn', label: 'Horn' },
                              { key: 'windshield_wipers', label: 'Wipers' },
                              { key: 'rear_vision_mirrors', label: 'Mirrors' },
                              { key: 'coupling_devices', label: 'Coupling Devices' },
                              { key: 'wheels_and_rims', label: 'Wheels & Rims' },
                              { key: 'emergency_equipment', label: 'Emergency Equip.' },
                              { key: 'trailer_attached_properly', label: 'Trailer Attachment' },
                              { key: 'trailer_lights_working', label: 'Trailer Lights' },
                              { key: 'cargo_secured', label: 'Cargo Secured' },
                            ].map(item => {
                              const val = lastDVIR[item.key];
                              if (!val || val === 'na') return null;
                              return (
                                <div key={item.key} className="flex items-center text-sm">
                                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${val === 'pass' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                  <span className="text-gray-600">{item.label}:</span>
                                  <span className={`ml-1 font-medium ${val === 'pass' ? 'text-green-600' : 'text-red-600'}`}>
                                    {val === 'pass' ? 'Pass' : 'Fail'}
                                  </span>
                                </div>
                              );
                            }).filter(Boolean)}
                          </div>
                        </div>

                        {lastDVIR.defects_noted && (
                          <div className="mt-4">
                            <span className="font-medium text-gray-600">Defects Noted:</span>
                            <p className="text-sm text-gray-800 mt-1">{lastDVIR.defects_noted}</p>
                          </div>
                        )}

                        {lastDVIR.inspection_notes && (
                          <div className="mt-4">
                            <span className="font-medium text-gray-600">Notes:</span>
                            <p className="text-sm text-gray-800 mt-1">{lastDVIR.inspection_notes}</p>
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
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                          <div>
                            <h4 className="font-semibold text-blue-900">No Previous DVIR Found</h4>
                            <p className="text-sm text-blue-800 mt-1">
                              No previous Driver Vehicle Inspection Report found for this vehicle (new vehicle or first trip).
                            </p>
                            <p className="text-sm text-blue-800 mt-2 font-medium">
                              Per CFR 396.13: Acknowledge that no defects were reported or that all previously reported defects have been certified as repaired.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Driver Acknowledgment */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={acknowledged}
                          onChange={(e) => { setAcknowledged(e.target.checked); setError(''); }}
                          className="mt-0.5 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {lastDVIR 
                            ? "I have reviewed the above DVIR and certify that all reported defects have been addressed. The vehicle is safe to operate."
                            : "I acknowledge that no previous DVIR exists for this vehicle. I certify that the vehicle is safe to operate and will conduct my pre-trip inspection per CFR 396.13."
                          }
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={onClose}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleReviewSubmit}
                    disabled={submitting || loading || !acknowledged}
                  >
                    {submitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Recording...
                      </div>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4 mr-2 inline" />
                        {lastDVIR ? 'Complete DVIR Review' : 'Acknowledge & Continue'}
                      </>
                    )}
                  </button>
                </div>
      </div>
    </div>
  );
}

export default PreTripDVIRReview;