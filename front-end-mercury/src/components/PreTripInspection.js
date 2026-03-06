import React, { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

const PreTripInspection = ({ isOpen, onClose, tripId, onInspectionComplete }) => {
  const { session, refreshAccessToken } = useSession();
  const [loading, setLoading] = useState(false);
  
  const [inspectionData, setInspectionData] = useState({
    // CFR 396.11 Required Inspection Items (49 CFR 396.11(a)(1)(i-xi))
    service_brakes: '',
    parking_brake: '',
    steering_mechanism: '',
    lighting_devices: '',
    tires_condition: '',
    horn: '',
    windshield_wipers: '',
    rear_vision_mirrors: '',
    coupling_devices: '',
    wheels_and_rims: '',
    emergency_equipment: '',
  });

  const cfrItems = [
    { key: 'service_brakes', label: 'Service Brakes', help: 'Service brakes including trailer brake connections' },
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

  const handleInputChange = (key, value) => {
    setInspectionData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const validateForm = () => {
    const requiredFields = cfrItems.map(item => item.key);
    
    for (const field of requiredFields) {
      if (!inspectionData[field]) {
        alert(`Please complete: ${cfrItems.find(item => item.key === field)?.label}`);
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

      const response = await axios.post(`${BASE_URL}/api/trips/${tripId}/inspection/pre_trip/`, formData, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 201) {
        alert('Pre-trip inspection completed successfully!');
        
        // Calculate if inspection actually passed based on CFR 396.11 fields
        const cfrFields = cfrItems.map(item => item.key);
        const inspectionPassed = cfrFields.every(field => inspectionData[field] === 'pass');
        
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
          service_brakes: '',
          parking_brake: '',
          steering_mechanism: '',
          lighting_devices: '',
          tires_condition: '',
          horn: '',
          windshield_wipers: '',
          rear_vision_mirrors: '',
          coupling_devices: '',
          wheels_and_rims: '',
          emergency_equipment: '',
        });
      }
    } catch (error) {
      console.error('Error submitting inspection:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      } else {
        const errorMessage = error.response?.data ? 
          JSON.stringify(error.response.data) : 
          error.message;
        alert(`Error submitting inspection. Please try again.\nDetails: ${errorMessage}`);
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
                  Pre-Trip Inspection (CFR 396.11)
                </DialogTitle>
                
                <form onSubmit={handleSubmit} className="mt-6">
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 mb-6">
                      Complete the required pre-trip inspection items per CFR 396.11. Mark each item as Pass or Fail.
                    </p>

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

                  {/* Submit Button */}
                  <div className="mt-6 sm:flex sm:flex-row-reverse sm:gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:w-auto ${
                        loading
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
                      }`}
                    >
                      {loading ? 'Submitting...' : 'Complete Inspection'}
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

export default PreTripInspection;