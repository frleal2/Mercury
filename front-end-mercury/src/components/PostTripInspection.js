import React, { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon, CameraIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

const PostTripInspection = ({ isOpen, onClose, tripId, onInspectionComplete }) => {
  const { session, refreshAccessToken } = useSession();
  const [loading, setLoading] = useState(false);
  
  const [inspectionData, setInspectionData] = useState({
    // Vehicle checks (matching backend model)
    vehicle_exterior_condition: '',
    lights_working: '',
    tires_condition: '',
    brakes_working: '',
    engine_fluids_ok: '',
    
    // Trailer checks (if applicable)
    trailer_attached_properly: '',
    trailer_lights_working: '',
    cargo_secured: '',
    
    // Documentation
    inspection_notes: '',
    issues_found: ''
  });

  const [defectPhotos, setDefectPhotos] = useState([]);
  const [tripPhotos, setTripPhotos] = useState([]);

  const inspectionItems = [
    {
      category: 'Vehicle Safety Checks',
      items: [
        { key: 'vehicle_exterior_condition', label: 'Vehicle Exterior', description: 'Check for damage, cleanliness, and overall condition' },
        { key: 'lights_working', label: 'Lights', description: 'Test all lights (headlights, taillights, turn signals, hazards)' },
        { key: 'tires_condition', label: 'Tires', description: 'Check tire pressure, tread depth, and sidewall condition' },
        { key: 'brakes_working', label: 'Brakes', description: 'Test brake responsiveness and check brake fluid' },
        { key: 'engine_fluids_ok', label: 'Engine Fluids', description: 'Check oil, coolant, and brake fluid levels' }
      ]
    },
    {
      category: 'Trailer Checks (if applicable)',
      items: [
        { key: 'trailer_attached_properly', label: 'Trailer Attachment', description: 'Verify trailer is securely connected' },
        { key: 'trailer_lights_working', label: 'Trailer Lights', description: 'Test all trailer lights and connections' },
        { key: 'cargo_secured', label: 'Cargo Security', description: 'Ensure load is properly secured' }
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

  const handleDefectPhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    setDefectPhotos(prev => [...prev, ...files]);
  };

  const handleTripPhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    setTripPhotos(prev => [...prev, ...files]);
  };

  const removeDefectPhoto = (index) => {
    setDefectPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeTripPhoto = (index) => {
    setTripPhotos(prev => prev.filter((_, i) => i !== index));
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
    
    if (!inspectionData.vehicle_safe_for_next_trip) {
      alert('Please indicate whether the vehicle is safe for the next trip.');
      return false;
    }
    
    if (!inspectionData.cargo_delivered_successfully) {
      alert('Please indicate whether cargo was delivered successfully.');
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
      formData.append('inspection_type', 'post_trip');
      formData.append('inspection_datetime', new Date().toISOString());
      
      // Add defect photos
      defectPhotos.forEach((photo, index) => {
        formData.append(`defect_photos_${index}`, photo);
      });
      
      // Add trip photos
      tripPhotos.forEach((photo, index) => {
        formData.append(`trip_photos_${index}`, photo);
      });

      await axios.post(`${BASE_URL}/api/trips/${tripId}/inspection/post_trip/`, formData, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      onInspectionComplete('post_trip');
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
      engine_condition_post: '', engine_temperature_normal: '', oil_leaks_check: '',
      coolant_leaks_check: '', fuel_level_check: '', brake_performance: '',
      brake_temperature: '', brake_wear_check: '', tire_wear_front: '',
      tire_wear_rear: '', tire_damage_check: '', tire_pressure_post: '',
      lights_functionality_check: '', damage_to_lights: '', body_damage_new: '',
      mirrors_condition_post: '', windshield_damage_new: '', cargo_area_condition: '',
      odometer_end: '', fuel_consumed: '', trip_duration: '',
      cargo_delivered_successfully: '', delivery_issues: '', mechanical_issues_during_trip: '',
      mechanical_issues_description: '', traffic_incidents: '', traffic_incidents_description: '',
      weather_conditions: '', road_conditions: '', vehicle_safe_for_next_trip: '',
      maintenance_required: '', maintenance_description: '', defects_found: false,
      defects_description: '', inspector_signature: '', inspection_notes: ''
    });
    setDefectPhotos([]);
    setTripPhotos([]);
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
                  Post-Trip Inspection
                </DialogTitle>
                <p className="mt-2 text-sm text-gray-600">
                  Complete the post-trip inspection to finalize your trip. Document any issues found and trip completion details.
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

                  {/* Trip Completion Details */}
                  <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-blue-50">
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Trip Completion Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Final Odometer Reading
                        </label>
                        <input
                          type="number"
                          value={inspectionData.odometer_end}
                          onChange={(e) => handleInputChange('odometer_end', e.target.value)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Miles"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fuel Consumed (gallons)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={inspectionData.fuel_consumed}
                          onChange={(e) => handleInputChange('fuel_consumed', e.target.value)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Gallons"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Trip Duration (hours)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={inspectionData.trip_duration}
                          onChange={(e) => handleInputChange('trip_duration', e.target.value)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Hours"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cargo Delivered Successfully?
                        </label>
                        <select
                          value={inspectionData.cargo_delivered_successfully}
                          onChange={(e) => handleInputChange('cargo_delivered_successfully', e.target.value)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="">Select...</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="partial">Partial</option>
                        </select>
                      </div>
                    </div>
                    
                    {inspectionData.cargo_delivered_successfully === 'no' || inspectionData.cargo_delivered_successfully === 'partial' ? (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Describe delivery issues:
                        </label>
                        <textarea
                          value={inspectionData.delivery_issues}
                          onChange={(e) => handleInputChange('delivery_issues', e.target.value)}
                          rows={3}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Describe any delivery issues encountered..."
                        />
                      </div>
                    ) : null}
                  </div>

                  {/* Trip Issues */}
                  <div className="mt-6 p-4 border border-gray-200 rounded-lg">
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Trip Issues & Conditions</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Any mechanical issues during trip?
                        </label>
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="mechanical_issues_during_trip"
                              value="no"
                              checked={inspectionData.mechanical_issues_during_trip === 'no'}
                              onChange={(e) => handleInputChange('mechanical_issues_during_trip', e.target.value)}
                              className="mr-2 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm">No issues</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="mechanical_issues_during_trip"
                              value="yes"
                              checked={inspectionData.mechanical_issues_during_trip === 'yes'}
                              onChange={(e) => handleInputChange('mechanical_issues_during_trip', e.target.value)}
                              className="mr-2 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm">Issues occurred</span>
                          </label>
                        </div>
                        {inspectionData.mechanical_issues_during_trip === 'yes' && (
                          <textarea
                            value={inspectionData.mechanical_issues_description}
                            onChange={(e) => handleInputChange('mechanical_issues_description', e.target.value)}
                            rows={3}
                            className="mt-2 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Describe mechanical issues encountered..."
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Weather Conditions
                          </label>
                          <select
                            value={inspectionData.weather_conditions}
                            onChange={(e) => handleInputChange('weather_conditions', e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="">Select...</option>
                            <option value="clear">Clear</option>
                            <option value="rain">Rain</option>
                            <option value="snow">Snow</option>
                            <option value="fog">Fog</option>
                            <option value="wind">High Wind</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Road Conditions
                          </label>
                          <select
                            value={inspectionData.road_conditions}
                            onChange={(e) => handleInputChange('road_conditions', e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="">Select...</option>
                            <option value="good">Good</option>
                            <option value="fair">Fair</option>
                            <option value="poor">Poor</option>
                            <option value="construction">Construction</option>
                            <option value="ice">Ice/Snow</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Defects Section */}
                  <div className="mt-6 p-4 border border-gray-200 rounded-lg">
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Defects Assessment</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Were any defects found during post-trip inspection?
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
                              Upload photos of defects:
                            </label>
                            <div className="flex items-center space-x-4">
                              <label className="cursor-pointer bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                                <CameraIcon className="h-5 w-5 inline mr-2" />
                                Add Defect Photos
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  onChange={handleDefectPhotoUpload}
                                  className="hidden"
                                />
                              </label>
                              <span className="text-sm text-gray-500">
                                {defectPhotos.length} defect photo(s) selected
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
                                      onClick={() => removeDefectPhoto(index)}
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
                      
                      {/* Trip Photos */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Upload trip completion photos (optional):
                        </label>
                        <div className="flex items-center space-x-4">
                          <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                            <CameraIcon className="h-5 w-5 inline mr-2" />
                            Add Trip Photos
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handleTripPhotoUpload}
                              className="hidden"
                            />
                          </label>
                          <span className="text-sm text-gray-500">
                            {tripPhotos.length} trip photo(s) selected
                          </span>
                        </div>
                        {tripPhotos.length > 0 && (
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {tripPhotos.map((photo, index) => (
                              <div key={index} className="relative">
                                <img
                                  src={URL.createObjectURL(photo)}
                                  alt={`Trip ${index + 1}`}
                                  className="h-20 w-20 object-cover rounded-md"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeTripPhoto(index)}
                                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs hover:bg-red-700"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Overall Assessment */}
                  <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-green-50">
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Final Assessment</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Is this vehicle safe for the next trip?
                        </label>
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="vehicle_safe_for_next_trip"
                              value="yes"
                              checked={inspectionData.vehicle_safe_for_next_trip === 'yes'}
                              onChange={(e) => handleInputChange('vehicle_safe_for_next_trip', e.target.value)}
                              className="mr-2 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm font-medium text-green-600">Yes, safe for next trip</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="vehicle_safe_for_next_trip"
                              value="no"
                              checked={inspectionData.vehicle_safe_for_next_trip === 'no'}
                              onChange={(e) => handleInputChange('vehicle_safe_for_next_trip', e.target.value)}
                              className="mr-2 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm font-medium text-red-600">No, maintenance required</span>
                          </label>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Does this vehicle require maintenance?
                        </label>
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="maintenance_required"
                              value="no"
                              checked={inspectionData.maintenance_required === 'no'}
                              onChange={(e) => handleInputChange('maintenance_required', e.target.value)}
                              className="mr-2 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm">No maintenance needed</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="maintenance_required"
                              value="yes"
                              checked={inspectionData.maintenance_required === 'yes'}
                              onChange={(e) => handleInputChange('maintenance_required', e.target.value)}
                              className="mr-2 text-yellow-600 focus:ring-yellow-500"
                            />
                            <span className="text-sm">Maintenance required</span>
                          </label>
                        </div>
                        {inspectionData.maintenance_required === 'yes' && (
                          <textarea
                            value={inspectionData.maintenance_description}
                            onChange={(e) => handleInputChange('maintenance_description', e.target.value)}
                            rows={3}
                            className="mt-2 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Describe maintenance requirements..."
                          />
                        )}
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
                      placeholder="Any additional notes or observations about the trip..."
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
                      className="bg-green-600 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Submitting...' : 'Complete Post-Trip Inspection'}
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