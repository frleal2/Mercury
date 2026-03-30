import React, { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon, TruckIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

const PostTripInspection = ({ isOpen, onClose, tripId, onInspectionComplete }) => {
  const { session, refreshAccessToken } = useSession();
  const [loading, setLoading] = useState(false);
  
  const initialData = {
    // CFR 396.11 Required Inspection Items (49 CFR 396.11(a)(1)(i-xi))
    service_brakes: 'fail',
    parking_brake: 'fail',
    steering_mechanism: 'fail',
    lighting_devices: 'fail',
    tires_condition: 'fail',
    horn: 'fail',
    windshield_wipers: 'fail',
    rear_vision_mirrors: 'fail',
    coupling_devices: 'fail',
    wheels_and_rims: 'fail',
    emergency_equipment: 'fail',
    
    // Trailer-specific CFR 396.11 Requirements
    trailer_attached_properly: 'fail',
    trailer_lights_working: 'fail',
    cargo_secured: 'fail',

    // Post-trip specific
    inspection_notes: '',
  };

  const [inspectionData, setInspectionData] = useState(initialData);

  const cfrItems = [
    { key: 'service_brakes', label: 'Service Brakes & Trailer Brake Connections', help: 'Service brakes including trailer brake connections (CFR 396.11(a)(1)(i))' },
    { key: 'parking_brake', label: 'Parking Brake', help: 'Parking brake operational' },
    { key: 'steering_mechanism', label: 'Steering Mechanism', help: 'Steering mechanism responsive' },
    { key: 'lighting_devices', label: 'Lighting Devices & Reflectors', help: 'Lighting devices and reflectors' },
    { key: 'tires_condition', label: 'Tires', help: 'Tires - proper pressure, no damage' },
    { key: 'horn', label: 'Horn', help: 'Horn functional' },
    { key: 'windshield_wipers', label: 'Windshield Wipers', help: 'Windshield wipers operational' },
    { key: 'rear_vision_mirrors', label: 'Rear Vision Mirrors', help: 'Rear vision mirrors properly adjusted' },
    { key: 'coupling_devices', label: 'Coupling Devices', help: 'Coupling devices secure' },
    { key: 'wheels_and_rims', label: 'Wheels and Rims', help: 'Wheels and rims - no cracks or damage' },
    { key: 'emergency_equipment', label: 'Emergency Equipment', help: 'Emergency equipment present and functional' },
  ];

  const trailerItems = [
    { key: 'trailer_attached_properly', label: 'Trailer Attachment', help: 'King pin, fifth wheel connection secure (CFR 396.11(b)(v))' },
    { key: 'trailer_lights_working', label: 'Trailer Lights & Markers', help: 'Trailer lights, markers, conspicuity material (CFR 396.11(b)(ii))' },
    { key: 'cargo_secured', label: 'Cargo Securement', help: 'Cargo properly secured per regulations' },
  ];

  const handleInputChange = (key, value) => {
    setInspectionData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const validateForm = () => {
    const allRequiredFields = [...cfrItems.map(item => item.key), ...trailerItems.map(item => item.key)];
    
    for (const field of allRequiredFields) {
      if (!inspectionData[field] || inspectionData[field] === '') {
        const fieldItem = [...cfrItems, ...trailerItems].find(item => item.key === field);
        alert(`Please complete: ${fieldItem?.label}`);
        return false;
      }
      if (!['pass', 'fail', 'na'].includes(inspectionData[field])) {
        const fieldItem = [...cfrItems, ...trailerItems].find(item => item.key === field);
        alert(`Invalid selection for: ${fieldItem?.label}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const formData = new FormData();
      
      // Add all inspection data
      Object.keys(inspectionData).forEach(key => {
        if (inspectionData[key] !== null && inspectionData[key] !== undefined) {
          formData.append(key, inspectionData[key]);
        }
      });
      
      formData.append('trip', tripId);
      formData.append('inspection_type', 'post_trip');

      const response = await axios.post(`${BASE_URL}/api/trips/${tripId}/inspection/post_trip/`, formData, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 201) {
        alert('Post-trip inspection completed successfully!');
        
        const allInspectionFields = [...cfrItems.map(item => item.key), ...trailerItems.map(item => item.key)];
        const inspectionPassed = allInspectionFields.every(field => inspectionData[field] === 'pass');
        
        const inspectionResult = {
          type: 'post_trip',
          passed: inspectionPassed,
          hasDefects: !inspectionPassed,
          defectsDescription: inspectionPassed ? '' : 'One or more CFR 396.11 required items failed inspection'
        };
        
        onInspectionComplete?.(inspectionResult);
        onClose();
        
        setInspectionData(initialData);
      }
    } catch (error) {
      console.error('Error submitting inspection:', error);
      console.error('Error response:', error.response?.data);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      } else {
        let errorMessage = 'Error submitting inspection. Please try again.';
        
        if (error.response?.data?.details) {
          const validationErrors = error.response.data.details;
          const errorDetails = Object.entries(validationErrors)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('\n');
          errorMessage += `\n\nValidation errors:\n${errorDetails}`;
        } else if (error.response?.data?.error) {
          errorMessage += `\n\nDetails: ${error.response.data.error}`;
        } else if (error.response?.data) {
          errorMessage += `\n\nDetails: ${JSON.stringify(error.response.data)}`;
        } else {
          errorMessage += `\n\nDetails: ${error.message}`;
        }
        
        alert(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
            <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <DialogTitle className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Post-Trip Inspection (CFR 396.11)
                </DialogTitle>
                
                <form onSubmit={handleSubmit} className="mt-6">
                  <div className="space-y-6">
                    <p className="text-sm text-gray-600 mb-6">
                      Complete the required post-trip inspection items per CFR 396.11. Mark each item as Pass or Fail.
                    </p>

                    {/* Truck/Tractor Inspection Section */}
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
                        <TruckIcon className="h-5 w-5 mr-2 text-blue-600" />
                        Truck/Tractor Inspection (CFR 396.11)
                      </h3>
                      <div className="space-y-4">
                        {cfrItems.map((item) => (
                          <div key={item.key} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">{item.label}</h4>
                                <p className="text-xs text-gray-500 mt-1">{item.help}</p>
                              </div>
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">Required</span>
                            </div>
                            
                            <div className="flex space-x-6">
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name={item.key}
                                  value="pass"
                                  checked={inspectionData[item.key] === 'pass'}
                                  onChange={(e) => handleInputChange(item.key, e.target.value)}
                                  className="mr-2 text-green-600 focus:ring-green-500"
                                />
                                <span className="text-sm font-medium text-green-600">Pass</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name={item.key}
                                  value="fail"
                                  checked={inspectionData[item.key] === 'fail'}
                                  onChange={(e) => handleInputChange(item.key, e.target.value)}
                                  className="mr-2 text-red-600 focus:ring-red-500"
                                />
                                <span className="text-sm font-medium text-red-600">Fail</span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Trailer Inspection Section */}
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="h-5 w-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Trailer Inspection (CFR 396.11)
                      </h3>
                      <div className="space-y-4">
                        {trailerItems.map((item) => (
                          <div key={item.key} className="bg-orange-50 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">{item.label}</h4>
                                <p className="text-xs text-gray-500 mt-1">{item.help}</p>
                              </div>
                              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">Trailer Required</span>
                            </div>
                            
                            <div className="flex space-x-6">
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name={item.key}
                                  value="pass"
                                  checked={inspectionData[item.key] === 'pass'}
                                  onChange={(e) => handleInputChange(item.key, e.target.value)}
                                  className="mr-2 text-green-600 focus:ring-green-500"
                                />
                                <span className="text-sm font-medium text-green-600">Pass</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name={item.key}
                                  value="fail"
                                  checked={inspectionData[item.key] === 'fail'}
                                  onChange={(e) => handleInputChange(item.key, e.target.value)}
                                  className="mr-2 text-red-600 focus:ring-red-500"
                                />
                                <span className="text-sm font-medium text-red-600">Fail</span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Additional Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Notes (optional):
                      </label>
                      <textarea
                        value={inspectionData.inspection_notes}
                        onChange={(e) => handleInputChange('inspection_notes', e.target.value)}
                        rows={3}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Any additional notes or observations about the post-trip condition..."
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="mt-6 sm:flex sm:flex-row-reverse sm:gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:w-auto ${
                        loading
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500'
                      }`}
                    >
                      {loading ? 'Submitting...' : 'Complete Post-Trip Inspection'}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default PostTripInspection;
