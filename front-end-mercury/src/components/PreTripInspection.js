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
    
    // Additional vehicle checks
    vehicle_exterior_condition: '',
    engine_fluids_ok: '',
    
    // Legacy fields (for backward compatibility)
    lights_working: '',
    brakes_working: '',
    
    // Trailer checks (if applicable)
    trailer_attached_properly: '',
    trailer_lights_working: '',
    cargo_secured: '',
    
    // Documentation
    inspection_notes: '',
    issues_found: ''
  });

  const [defectPhotos, setDefectPhotos] = useState([]);

  const inspectionItems = [
    {
      category: 'CFR 396.11 Required Inspection Items',
      required: true,
      items: [
        { key: 'service_brakes', label: 'Service Brakes', description: 'Service brakes including trailer brake connections (CFR 396.11(a)(1)(i))', required: true },
        { key: 'parking_brake', label: 'Parking Brake', description: 'Parking brake operational (CFR 396.11(a)(1)(ii))', required: true },
        { key: 'steering_mechanism', label: 'Steering Mechanism', description: 'Steering mechanism responsive and secure (CFR 396.11(a)(1)(iii))', required: true },
        { key: 'lighting_devices', label: 'Lighting Devices & Reflectors', description: 'All lighting devices and reflectors functional (CFR 396.11(a)(1)(iv))', required: true },
        { key: 'tires_condition', label: 'Tires', description: 'Tire pressure, tread depth, and sidewall condition (CFR 396.11(a)(1)(v))', required: true },
        { key: 'horn', label: 'Horn', description: 'Horn operational and audible (CFR 396.11(a)(1)(vi))', required: true },
        { key: 'windshield_wipers', label: 'Windshield Wipers', description: 'Windshield wipers operational (CFR 396.11(a)(1)(vii))', required: true },
        { key: 'rear_vision_mirrors', label: 'Rear Vision Mirrors', description: 'Mirrors clean, secure, and properly adjusted (CFR 396.11(a)(1)(viii))', required: true },
        { key: 'coupling_devices', label: 'Coupling Devices', description: 'Coupling devices secure and functional (CFR 396.11(a)(1)(ix))', required: true },
        { key: 'wheels_and_rims', label: 'Wheels and Rims', description: 'Wheels and rims - no cracks, damage, or missing lugs (CFR 396.11(a)(1)(x))', required: true },
        { key: 'emergency_equipment', label: 'Emergency Equipment', description: 'Emergency equipment present and accessible (CFR 396.11(a)(1)(xi))', required: true }
      ]
    },
    {
      category: 'Additional Vehicle Safety Checks',
      required: false,
      items: [
        { key: 'vehicle_exterior_condition', label: 'Vehicle Exterior Condition', description: 'Overall exterior condition - damage, cleanliness', required: false },
        { key: 'engine_fluids_ok', label: 'Engine Fluids', description: 'Oil, coolant, and other fluid levels', required: false }
      ]
    },
    {
      category: 'Trailer Inspection Items (if applicable)',
      required: false,
      items: [
        { key: 'trailer_attached_properly', label: 'Trailer Attachment', description: 'Verify trailer is securely connected and coupling is locked', required: false },
        { key: 'trailer_lights_working', label: 'Trailer Lights', description: 'Test all trailer lights and electrical connections', required: false },
        { key: 'cargo_secured', label: 'Cargo Security', description: 'Ensure load is properly secured and distributed', required: false }
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
      
      // Add inspection data as strings
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

      await axios.post(`${BASE_URL}/api/trips/${tripId}/inspection/pre_trip/`, formData, {
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
                        <div className="flex items-center mb-3">
                          <h4 className="text-lg font-medium text-gray-900">{category.category}</h4>
                          {category.required && (
                            <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Federal Requirement
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {category.items.map((item) => (
                            <div key={item.key} className={`flex items-center justify-between p-3 rounded-lg ${
                              item.required ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                            }`}>
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <label className="block text-sm font-medium text-gray-700">
                                    {item.label}
                                  </label>
                                  {item.required && (
                                    <span className="ml-2 text-xs text-red-600 font-medium">*Required</span>
                                  )}
                                </div>
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