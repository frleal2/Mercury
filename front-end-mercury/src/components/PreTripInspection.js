import React, { useState } from 'react';
import { XMarkIcon, TruckIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

const PreTripInspection = ({ isOpen, onClose, tripId, onInspectionComplete }) => {
  const { session, refreshAccessToken } = useSession();
  const [loading, setLoading] = useState(false);
  
  const [inspectionData, setInspectionData] = useState({
    // CFR 396.11 Required Inspection Items (49 CFR 396.11(a)(1)(i-xi))
    // Initialize with 'fail' default to match backend model expectations
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
    
    // Trailer-specific CFR 396.11 Requirements (when trailer is attached)
    trailer_attached_properly: 'fail',
    trailer_lights_working: 'fail',
    cargo_secured: 'fail',
  });

  const cfrItems = [
    { key: 'service_brakes', label: 'Service Brakes & Trailer Brake Connections', help: 'Service brakes including trailer brake connections (CFR 396.11(a)(1)(i))', section: 'truck' },
    { key: 'parking_brake', label: 'Parking Brake', help: 'Parking brake operational', section: 'truck' },
    { key: 'steering_mechanism', label: 'Steering Mechanism', help: 'Steering mechanism responsive', section: 'truck' },
    { key: 'lighting_devices', label: 'Lighting Devices & Reflectors', help: 'Lighting devices and reflectors', section: 'truck' },
    { key: 'tires_condition', label: 'Tires', help: 'Tires - proper pressure, no damage', section: 'truck' },
    { key: 'horn', label: 'Horn', help: 'Horn functional', section: 'truck' },
    { key: 'windshield_wipers', label: 'Windshield Wipers', help: 'Windshield wipers operational', section: 'truck' },
    { key: 'rear_vision_mirrors', label: 'Rear Vision Mirrors', help: 'Rear vision mirrors properly adjusted', section: 'truck' },
    { key: 'coupling_devices', label: 'Coupling Devices', help: 'Coupling devices secure', section: 'truck' },
    { key: 'wheels_and_rims', label: 'Wheels and Rims', help: 'Wheels and rims - no cracks or damage', section: 'truck' },
    { key: 'emergency_equipment', label: 'Emergency Equipment', help: 'Emergency equipment present and functional', section: 'truck' },
  ];

  const trailerItems = [
    { key: 'trailer_attached_properly', label: 'Trailer Attachment', help: 'King pin, fifth wheel connection secure (CFR 396.11(b)(v))', section: 'trailer' },
    { key: 'trailer_lights_working', label: 'Trailer Lights & Markers', help: 'Trailer lights, markers, conspicuity material (CFR 396.11(b)(ii))', section: 'trailer' },  
    { key: 'cargo_secured', label: 'Cargo Securement', help: 'Cargo properly secured per regulations', section: 'trailer' },
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
      // Ensure valid choice (pass, fail, na)
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
      formData.append('inspection_type', 'pre_trip');

      // Log the data being sent for debugging
      console.log('Submitting pre-trip inspection with data:', Object.fromEntries(formData));

      const response = await axios.post(`${BASE_URL}/api/trips/${tripId}/inspection/pre_trip/`, formData, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 201) {
        alert('Pre-trip inspection completed successfully!');
        
        // Calculate if inspection actually passed based on CFR 396.11 fields
        const allInspectionFields = [...cfrItems.map(item => item.key), ...trailerItems.map(item => item.key)];
        const inspectionPassed = allInspectionFields.every(field => inspectionData[field] === 'pass');
        
        const inspectionResult = {
          type: 'pre_trip',
          passed: inspectionPassed,
          hasDefects: !inspectionPassed, // Has defects if any CFR items failed
          defectsDescription: inspectionPassed ? '' : 'One or more CFR 396.11 required items failed inspection'
        };
        
        onInspectionComplete?.(inspectionResult);
        onClose();
        
        // Reset form
        setInspectionData({
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
          trailer_attached_properly: 'fail',
          trailer_lights_working: 'fail',
          cargo_secured: 'fail',
        });
      }
    } catch (error) {
      console.error('Error submitting inspection:', error);
      console.error('Error response:', error.response?.data);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      } else {
        let errorMessage = 'Error submitting inspection. Please try again.';
        
        if (error.response?.data?.details) {
          // Show detailed validation errors
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50" onClick={onClose}></div>
      <div className="relative top-10 mx-auto p-5 border w-11/12 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <ClipboardDocumentCheckIcon className="h-6 w-6 text-blue-600 mr-2" />
            Pre-Trip Inspection (CFR 396.11)
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
                
                <form onSubmit={handleSubmit} className="mt-6">
                  <div className="space-y-6">
                    <p className="text-sm text-gray-600 mb-6">
                      Complete the required pre-trip inspection items per CFR 396.11. Mark each item as Pass or Fail.
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
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        loading
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {loading ? 'Submitting...' : 'Complete Inspection'}
                    </button>
                  </div>
                </form>
      </div>
    </div>
  );
};

export default PreTripInspection;