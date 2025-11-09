import React, { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon, CameraIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

const PreTripInspection = ({ isOpen, onClose, tripId, onInspectionComplete }) => {
  const { session, refreshAccessToken } = useSession();
  const [loading, setLoading] = useState(false);
  
  const [inspectionData, setInspectionData] = useState({
    // Engine checks
    engine_oil_level: '',
    engine_coolant_level: '',
    engine_belts_condition: '',
    engine_hoses_condition: '',
    engine_leaks_check: '',
    
    // Brake system
    brake_pedal_feel: '',
    brake_fluid_level: '',
    brake_lines_condition: '',
    air_pressure_gauge: '',
    
    // Tires and wheels
    tire_condition_front: '',
    tire_condition_rear: '',
    tire_pressure_front: '',
    tire_pressure_rear: '',
    wheel_nuts_torque: '',
    
    // Lights and electrical
    headlights_condition: '',
    taillights_condition: '',
    turn_signals_condition: '',
    hazard_lights_condition: '',
    interior_lights_condition: '',
    
    // Steering and suspension
    steering_wheel_play: '',
    steering_fluid_level: '',
    suspension_condition: '',
    
    // Body and frame
    mirrors_condition: '',
    windshield_condition: '',
    wipers_condition: '',
    doors_condition: '',
    body_damage_check: '',
    
    // Documentation
    registration_documents: '',
    insurance_documents: '',
    logbook_current: '',
    
    // Overall assessment
    vehicle_safe_to_operate: '',
    defects_found: false,
    defects_description: '',
    inspector_signature: '',
    inspection_notes: ''
  });

  const [defectPhotos, setDefectPhotos] = useState([]);

  const inspectionItems = [
    {
      category: 'Engine Checks',
      items: [
        { key: 'engine_oil_level', label: 'Oil Level', description: 'Check engine oil level using dipstick' },
        { key: 'engine_coolant_level', label: 'Coolant Level', description: 'Check coolant reservoir level' },
        { key: 'engine_belts_condition', label: 'Belt Condition', description: 'Inspect belts for cracks, fraying, or looseness' },
        { key: 'engine_hoses_condition', label: 'Hose Condition', description: 'Check hoses for leaks, cracks, or damage' },
        { key: 'engine_leaks_check', label: 'Leak Check', description: 'Look for oil, coolant, or fuel leaks' }
      ]
    },
    {
      category: 'Brake System',
      items: [
        { key: 'brake_pedal_feel', label: 'Brake Pedal Feel', description: 'Test brake pedal responsiveness' },
        { key: 'brake_fluid_level', label: 'Brake Fluid Level', description: 'Check brake fluid reservoir' },
        { key: 'brake_lines_condition', label: 'Brake Lines', description: 'Inspect brake lines for damage or leaks' },
        { key: 'air_pressure_gauge', label: 'Air Pressure', description: 'Check air brake pressure gauge (if applicable)' }
      ]
    },
    {
      category: 'Tires and Wheels',
      items: [
        { key: 'tire_condition_front', label: 'Front Tires', description: 'Check tread depth and sidewall condition' },
        { key: 'tire_condition_rear', label: 'Rear Tires', description: 'Check tread depth and sidewall condition' },
        { key: 'tire_pressure_front', label: 'Front Tire Pressure', description: 'Verify tire pressure meets specifications' },
        { key: 'tire_pressure_rear', label: 'Rear Tire Pressure', description: 'Verify tire pressure meets specifications' },
        { key: 'wheel_nuts_torque', label: 'Wheel Nuts', description: 'Check wheel nuts are properly tightened' }
      ]
    },
    {
      category: 'Lights and Electrical',
      items: [
        { key: 'headlights_condition', label: 'Headlights', description: 'Test headlight operation and lens condition' },
        { key: 'taillights_condition', label: 'Taillights', description: 'Test taillight operation' },
        { key: 'turn_signals_condition', label: 'Turn Signals', description: 'Test all turn signal operations' },
        { key: 'hazard_lights_condition', label: 'Hazard Lights', description: 'Test hazard light operation' },
        { key: 'interior_lights_condition', label: 'Interior Lights', description: 'Check dashboard and cabin lights' }
      ]
    },
    {
      category: 'Steering and Suspension',
      items: [
        { key: 'steering_wheel_play', label: 'Steering Play', description: 'Check for excessive steering wheel play' },
        { key: 'steering_fluid_level', label: 'Power Steering Fluid', description: 'Check power steering fluid level' },
        { key: 'suspension_condition', label: 'Suspension', description: 'Visual inspection of suspension components' }
      ]
    },
    {
      category: 'Body and Frame',
      items: [
        { key: 'mirrors_condition', label: 'Mirrors', description: 'Check all mirrors for damage and proper adjustment' },
        { key: 'windshield_condition', label: 'Windshield', description: 'Check for cracks, chips, or obstruction' },
        { key: 'wipers_condition', label: 'Wipers', description: 'Test wiper operation and blade condition' },
        { key: 'doors_condition', label: 'Doors', description: 'Check door operation and sealing' },
        { key: 'body_damage_check', label: 'Body Damage', description: 'Visual inspection for dents, scratches, or damage' }
      ]
    },
    {
      category: 'Documentation',
      items: [
        { key: 'registration_documents', label: 'Registration', description: 'Verify vehicle registration is current' },
        { key: 'insurance_documents', label: 'Insurance', description: 'Verify insurance documentation is current' },
        { key: 'logbook_current', label: 'Logbook', description: 'Check driver logbook is up to date' }
      ]
    }
  ];

  const handleInputChange = (key, value) => {
    setInspectionData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleDefectToggle = (hasDefects) => {
    setInspectionData(prev => ({
      ...prev,
      defects_found: hasDefects,
      defects_description: hasDefects ? prev.defects_description : ''
    }));
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    setDefectPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index) => {
    setDefectPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const validateInspection = () => {
    // Check that all required fields are completed
    const requiredFields = inspectionItems.flatMap(category => 
      category.items.map(item => item.key)
    );
    
    const missingFields = requiredFields.filter(field => 
      !inspectionData[field] || inspectionData[field] === ''
    );
    
    if (missingFields.length > 0) {
      alert(`Please complete all inspection items before submitting.`);
      return false;
    }
    
    if (!inspectionData.vehicle_safe_to_operate) {
      alert('Please indicate whether the vehicle is safe to operate.');
      return false;
    }
    
    if (inspectionData.defects_found && !inspectionData.defects_description.trim()) {
      alert('Please describe the defects found.');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateInspection()) {
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      
      // Add inspection data
      Object.keys(inspectionData).forEach(key => {
        formData.append(key, inspectionData[key]);
      });
      
      formData.append('trip', tripId);
      formData.append('inspection_type', 'pre_trip');
      formData.append('inspection_datetime', new Date().toISOString());
      
      // Add photos
      defectPhotos.forEach((photo, index) => {
        formData.append(`defect_photos_${index}`, photo);
      });

      await axios.post(`${BASE_URL}/api/trip-inspections/`, formData, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      onInspectionComplete('pre_trip');
      onClose();
    } catch (error) {
      console.error('Error submitting inspection:', error);
      if (error.response && error.response.status === 401) {
        await refreshAccessToken();
      }
      alert('Error submitting inspection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInspectionData({
      engine_oil_level: '', engine_coolant_level: '', engine_belts_condition: '',
      engine_hoses_condition: '', engine_leaks_check: '', brake_pedal_feel: '',
      brake_fluid_level: '', brake_lines_condition: '', air_pressure_gauge: '',
      tire_condition_front: '', tire_condition_rear: '', tire_pressure_front: '',
      tire_pressure_rear: '', wheel_nuts_torque: '', headlights_condition: '',
      taillights_condition: '', turn_signals_condition: '', hazard_lights_condition: '',
      interior_lights_condition: '', steering_wheel_play: '', steering_fluid_level: '',
      suspension_condition: '', mirrors_condition: '', windshield_condition: '',
      wipers_condition: '', doors_condition: '', body_damage_check: '',
      registration_documents: '', insurance_documents: '', logbook_current: '',
      vehicle_safe_to_operate: '', defects_found: false, defects_description: '',
      inspector_signature: '', inspection_notes: ''
    });
    setDefectPhotos([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6">
            <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <DialogTitle as="h3" className="text-base font-semibold leading-6 text-gray-900">
                  Pre-Trip Inspection
                </DialogTitle>
                <p className="mt-2 text-sm text-gray-600">
                  Complete all inspection items before starting your trip. Mark any defects found and provide photos if applicable.
                </p>
                
                <form onSubmit={handleSubmit} className="mt-6">
                  <div className="max-h-96 overflow-y-auto space-y-6">
                    {inspectionItems.map((category) => (
                      <div key={category.category} className="border-b border-gray-200 pb-4">
                        <h4 className="text-lg font-medium text-gray-900 mb-3">{category.category}</h4>
                        <div className="grid grid-cols-1 gap-4">
                          {category.items.map((item) => (
                            <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700">
                                  {item.label}
                                </label>
                                <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                              </div>
                              <div className="flex space-x-2 ml-4">
                                <label className="flex items-center">
                                  <input
                                    type="radio"
                                    name={item.key}
                                    value="pass"
                                    checked={inspectionData[item.key] === 'pass'}
                                    onChange={(e) => handleInputChange(item.key, e.target.value)}
                                    className="mr-1 text-green-600 focus:ring-green-500"
                                  />
                                  <span className="text-sm text-green-600">Pass</span>
                                </label>
                                <label className="flex items-center">
                                  <input
                                    type="radio"
                                    name={item.key}
                                    value="fail"
                                    checked={inspectionData[item.key] === 'fail'}
                                    onChange={(e) => handleInputChange(item.key, e.target.value)}
                                    className="mr-1 text-red-600 focus:ring-red-500"
                                  />
                                  <span className="text-sm text-red-600">Fail</span>
                                </label>
                                <label className="flex items-center">
                                  <input
                                    type="radio"
                                    name={item.key}
                                    value="na"
                                    checked={inspectionData[item.key] === 'na'}
                                    onChange={(e) => handleInputChange(item.key, e.target.value)}
                                    className="mr-1 text-gray-600 focus:ring-gray-500"
                                  />
                                  <span className="text-sm text-gray-600">N/A</span>
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Defects Section */}
                  <div className="mt-6 p-4 border border-gray-200 rounded-lg">
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Defects Assessment</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Were any defects found during inspection?
                        </label>
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="defects_found"
                              value="false"
                              checked={!inspectionData.defects_found}
                              onChange={() => handleDefectToggle(false)}
                              className="mr-2 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm">No defects found</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="defects_found"
                              value="true"
                              checked={inspectionData.defects_found}
                              onChange={() => handleDefectToggle(true)}
                              className="mr-2 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm">Defects found</span>
                          </label>
                        </div>
                      </div>

                      {inspectionData.defects_found && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Describe the defects found:
                            </label>
                            <textarea
                              value={inspectionData.defects_description}
                              onChange={(e) => handleInputChange('defects_description', e.target.value)}
                              rows={4}
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              placeholder="Provide detailed description of all defects found..."
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Upload photos of defects (optional):
                            </label>
                            <div className="flex items-center space-x-4">
                              <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                <CameraIcon className="h-5 w-5 inline mr-2" />
                                Add Photos
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  onChange={handlePhotoUpload}
                                  className="hidden"
                                />
                              </label>
                              <span className="text-sm text-gray-500">
                                {defectPhotos.length} photo(s) selected
                              </span>
                            </div>
                            {defectPhotos.length > 0 && (
                              <div className="mt-2 grid grid-cols-3 gap-2">
                                {defectPhotos.map((photo, index) => (
                                  <div key={index} className="relative">
                                    <img
                                      src={URL.createObjectURL(photo)}
                                      alt={`Defect ${index + 1}`}
                                      className="h-20 w-20 object-cover rounded-md"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removePhoto(index)}
                                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs hover:bg-red-700"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Overall Assessment */}
                  <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-blue-50">
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Overall Assessment</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Is this vehicle safe to operate?
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="vehicle_safe_to_operate"
                            value="yes"
                            checked={inspectionData.vehicle_safe_to_operate === 'yes'}
                            onChange={(e) => handleInputChange('vehicle_safe_to_operate', e.target.value)}
                            className="mr-2 text-green-600 focus:ring-green-500"
                          />
                          <span className="text-sm font-medium text-green-600">Yes, safe to operate</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="vehicle_safe_to_operate"
                            value="no"
                            checked={inspectionData.vehicle_safe_to_operate === 'no'}
                            onChange={(e) => handleInputChange('vehicle_safe_to_operate', e.target.value)}
                            className="mr-2 text-red-600 focus:ring-red-500"
                          />
                          <span className="text-sm font-medium text-red-600">No, unsafe to operate</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes (optional):
                    </label>
                    <textarea
                      value={inspectionData.inspection_notes}
                      onChange={(e) => handleInputChange('inspection_notes', e.target.value)}
                      rows={3}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Any additional notes or observations..."
                    />
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="bg-white px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Submitting...' : 'Complete Pre-Trip Inspection'}
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