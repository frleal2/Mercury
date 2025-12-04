import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, XCircleIcon, ClipboardDocumentCheckIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

const ViewTripDetails = ({ tripId, onClose }) => {
  const { session, refreshAccessToken } = useSession();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (tripId) {
      fetchTripDetails();
      fetchInspections();
    }
  }, [tripId]);

  const fetchTripDetails = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/trips/${tripId}/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });
      setTrip(response.data);
    } catch (error) {
      console.error('Error fetching trip details:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
    }
  };

  const fetchInspections = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/trip-inspections/?trip=${tripId}`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });
      setInspections(response.data);
    } catch (error) {
      console.error('Error fetching inspections:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getInspectionStatus = (inspection) => {
    // CFR 396.11 required inspection items
    const cfrChecks = [
      inspection.service_brakes,
      inspection.parking_brake,
      inspection.steering_mechanism,
      inspection.lighting_devices,
      inspection.tires_condition,
      inspection.horn,
      inspection.windshield_wipers,
      inspection.rear_vision_mirrors,
      inspection.coupling_devices,
      inspection.wheels_and_rims,
      inspection.emergency_equipment,
    ];
    
    // Additional vehicle checks
    const additionalChecks = [
      inspection.vehicle_exterior_condition,
      inspection.engine_fluids_ok,
    ];
    
    // Legacy field support (backward compatibility)
    if (inspection.lights_working && !inspection.lighting_devices) {
      additionalChecks.push(inspection.lights_working);
    }
    if (inspection.brakes_working && !inspection.service_brakes) {
      additionalChecks.push(inspection.brakes_working);
    }
    
    // Only include trailer checks if they exist (not null/undefined/na)
    if (inspection.trailer_attached_properly !== null && inspection.trailer_attached_properly !== undefined && inspection.trailer_attached_properly !== 'na') {
      cfrChecks.push(inspection.trailer_attached_properly);
    }
    if (inspection.trailer_lights_working !== null && inspection.trailer_lights_working !== undefined && inspection.trailer_lights_working !== 'na') {
      cfrChecks.push(inspection.trailer_lights_working);
    }
    if (inspection.cargo_secured !== null && inspection.cargo_secured !== undefined && inspection.cargo_secured !== 'na') {
      cfrChecks.push(inspection.cargo_secured);
    }
    
    const allChecks = [...cfrChecks, ...additionalChecks].filter(check => check !== null && check !== undefined);
    const passedChecks = allChecks.filter(check => check === 'pass').length;
    const totalChecks = allChecks.length;
    return { passed: passedChecks === totalChecks, passedChecks, totalChecks };
  };

  const handleCreateMaintenanceRecord = (inspection) => {
    // Navigate to maintenance page and trigger add maintenance modal
    // Pass inspection data via URL params or state
    const inspectionData = {
      tripId: trip.id,
      truckId: trip.truck?.id,
      trailerId: trip.trailer?.id,
      defects: inspection.issues_found || 'Failed inspection items',
      inspectionType: inspection.inspection_type,
      inspectionId: inspection.id
    };
    
    // Close this modal first
    onClose();
    
    // Navigate to maintenance page with inspection context
    navigate('/maintenance', { 
      state: { 
        openAddModal: true, 
        inspectionData 
      } 
    });
  };

  const renderInspectionChecklist = (inspection) => {
    // CFR 396.11 Required Inspection Items
    const cfrChecks = [
      { label: 'Service Brakes', value: inspection.service_brakes, key: 'service_brakes', required: true },
      { label: 'Parking Brake', value: inspection.parking_brake, key: 'parking_brake', required: true },
      { label: 'Steering Mechanism', value: inspection.steering_mechanism, key: 'steering_mechanism', required: true },
      { label: 'Lighting Devices & Reflectors', value: inspection.lighting_devices, key: 'lighting_devices', required: true },
      { label: 'Tires', value: inspection.tires_condition, key: 'tires_condition', required: true },
      { label: 'Horn', value: inspection.horn, key: 'horn', required: true },
      { label: 'Windshield Wipers', value: inspection.windshield_wipers, key: 'windshield_wipers', required: true },
      { label: 'Rear Vision Mirrors', value: inspection.rear_vision_mirrors, key: 'rear_vision_mirrors', required: true },
      { label: 'Coupling Devices', value: inspection.coupling_devices, key: 'coupling_devices', required: true },
      { label: 'Wheels and Rims', value: inspection.wheels_and_rims, key: 'wheels_and_rims', required: true },
      { label: 'Emergency Equipment', value: inspection.emergency_equipment, key: 'emergency_equipment', required: true },
    ];

    // Additional vehicle checks
    const additionalChecks = [
      { label: 'Vehicle Exterior Condition', value: inspection.vehicle_exterior_condition, key: 'vehicle_exterior_condition', required: false },
      { label: 'Engine Fluids', value: inspection.engine_fluids_ok, key: 'engine_fluids_ok', required: false },
    ];

    // Legacy fields (for backward compatibility)
    const legacyChecks = [];
    if (inspection.lights_working && !inspection.lighting_devices) {
      legacyChecks.push({ label: 'Lights Working (Legacy)', value: inspection.lights_working, key: 'lights_working', required: false });
    }
    if (inspection.brakes_working && !inspection.service_brakes) {
      legacyChecks.push({ label: 'Brakes Working (Legacy)', value: inspection.brakes_working, key: 'brakes_working', required: false });
    }

    // Trailer checks (if applicable)
    const trailerChecks = [];
    if (inspection.trailer_attached_properly !== null && inspection.trailer_attached_properly !== undefined && inspection.trailer_attached_properly !== 'na') {
      trailerChecks.push({ label: 'Trailer Attached Properly', value: inspection.trailer_attached_properly, key: 'trailer_attached_properly', required: false });
    }
    if (inspection.trailer_lights_working !== null && inspection.trailer_lights_working !== undefined && inspection.trailer_lights_working !== 'na') {
      trailerChecks.push({ label: 'Trailer Lights Working', value: inspection.trailer_lights_working, key: 'trailer_lights_working', required: false });
    }
    if (inspection.cargo_secured !== null && inspection.cargo_secured !== undefined && inspection.cargo_secured !== 'na') {
      trailerChecks.push({ label: 'Cargo Secured', value: inspection.cargo_secured, key: 'cargo_secured', required: false });
    }

    return (
      <div className="space-y-4">
        {/* CFR 396.11 Required Items */}
        <div>
          <h6 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-1">CFR 396.11 Required Inspection Items</h6>
          <div className="space-y-2">
            {cfrChecks.filter(check => check.value !== null && check.value !== undefined).map((check) => {
              const isPassed = check.value === 'pass';
              const isFailed = check.value === 'fail';
              const isNA = check.value === 'na';
              
              return (
                <div key={check.key} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-700">{check.label}</span>
                    {check.required && (
                      <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">Required</span>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    isPassed ? 'bg-green-100 text-green-800' :
                    isFailed ? 'bg-red-100 text-red-800' :
                    isNA ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isPassed ? '✓ Pass' : isFailed ? '✗ Fail' : isNA ? 'N/A' : 'Unknown'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional Vehicle Checks */}
        {additionalChecks.filter(check => check.value !== null && check.value !== undefined).length > 0 && (
          <div>
            <h6 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-1">Additional Vehicle Checks</h6>
            <div className="space-y-2">
              {additionalChecks.filter(check => check.value !== null && check.value !== undefined).map((check) => {
                const isPassed = check.value === 'pass';
                const isFailed = check.value === 'fail';
                const isNA = check.value === 'na';
                
                return (
                  <div key={check.key} className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                    <span className="text-sm font-medium text-gray-700">{check.label}</span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      isPassed ? 'bg-green-100 text-green-800' :
                      isFailed ? 'bg-red-100 text-red-800' :
                      isNA ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isPassed ? '✓ Pass' : isFailed ? '✗ Fail' : isNA ? 'N/A' : 'Unknown'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Trailer Checks */}
        {trailerChecks.length > 0 && (
          <div>
            <h6 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-1">Trailer Inspection Items</h6>
            <div className="space-y-2">
              {trailerChecks.map((check) => {
                const isPassed = check.value === 'pass';
                const isFailed = check.value === 'fail';
                const isNA = check.value === 'na';
                
                return (
                  <div key={check.key} className="flex items-center justify-between p-3 rounded-lg bg-yellow-50">
                    <span className="text-sm font-medium text-gray-700">{check.label}</span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      isPassed ? 'bg-green-100 text-green-800' :
                      isFailed ? 'bg-red-100 text-red-800' :
                      isNA ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isPassed ? '✓ Pass' : isFailed ? '✗ Fail' : isNA ? 'N/A' : 'Unknown'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Legacy Checks (for backward compatibility) */}
        {legacyChecks.length > 0 && (
          <div>
            <h6 className="text-sm font-semibold text-gray-600 mb-3 border-b pb-1">Legacy Fields</h6>
            <div className="space-y-2">
              {legacyChecks.map((check) => {
                const isPassed = check.value === 'pass';
                const isFailed = check.value === 'fail';
                const isNA = check.value === 'na';
                
                return (
                  <div key={check.key} className="flex items-center justify-between p-3 rounded-lg bg-orange-50">
                    <span className="text-sm font-medium text-gray-700">{check.label}</span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      isPassed ? 'bg-green-100 text-green-800' :
                      isFailed ? 'bg-red-100 text-red-800' :
                      isNA ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isPassed ? '✓ Pass' : isFailed ? '✗ Fail' : isNA ? 'N/A' : 'Unknown'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-lg rounded-md bg-white">
          <div className="flex justify-center items-center h-64">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-3 text-gray-600">Loading trip details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  const preTrip = inspections.find(insp => insp.inspection_type === 'pre_trip');
  const postTrip = inspections.find(insp => insp.inspection_type === 'post_trip');

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Trip Details - {trip.trip_number || `Trip #${trip.id}`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('inspections')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'inspections'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Inspections
              {(preTrip || postTrip) && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {[preTrip, postTrip].filter(Boolean).length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Trip Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Trip Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Trip Number</label>
                  <p className="mt-1 text-sm text-gray-900">{trip.trip_number || `Trip #${trip.id}`}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      trip.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      trip.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {trip.status_display}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Scheduled Start</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDateTime(trip.scheduled_start_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Scheduled End</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDateTime(trip.scheduled_end_date)}</p>
                </div>
              </div>
            </div>

            {/* Assignment Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Assignment</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Driver</label>
                  <p className="mt-1 text-sm text-gray-900">{trip.driver_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Truck</label>
                  <p className="mt-1 text-sm text-gray-900">{trip.truck_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Trailer</label>
                  <p className="mt-1 text-sm text-gray-900">{trip.trailer_number || 'No trailer assigned'}</p>
                </div>
              </div>
            </div>

            {/* Route Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Route</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Origin</label>
                  <p className="mt-1 text-sm text-gray-900">{trip.origin_display}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Destination</label>
                  <p className="mt-1 text-sm text-gray-900">{trip.destination_display}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {trip.notes && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Notes</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{trip.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inspections' && (
          <div className="space-y-6">
            {/* Pre-Trip Inspection */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900 flex items-center">
                  <ClipboardDocumentCheckIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Pre-Trip Inspection
                </h4>
                {preTrip ? (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    getInspectionStatus(preTrip).passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {getInspectionStatus(preTrip).passed ? 'Passed' : 'Failed'}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    Not Completed
                  </span>
                )}
              </div>

              {preTrip ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="font-medium text-gray-700">Completed By:</label>
                      <p className="text-gray-900">{preTrip.completed_by_name}</p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-700">Completed At:</label>
                      <p className="text-gray-900">{formatDateTime(preTrip.completed_at)}</p>
                    </div>
                  </div>

                  {/* Vehicle Identification (CFR 396.11 Requirement) */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-3">Vehicle Identification (CFR 396.11)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-gray-700">Truck:</label>
                        <p className="text-gray-900">
                          Unit #{trip.truck?.unit_number} - {trip.truck?.license_plate}
                          <br />
                          <span className="text-gray-600">
                            {trip.truck?.year} {trip.truck?.make} {trip.truck?.model}
                          </span>
                          {trip.truck?.vin && (
                            <><br /><span className="text-xs text-gray-500">VIN: {trip.truck.vin}</span></>
                          )}
                        </p>
                      </div>
                      {trip.trailer && (
                        <div>
                          <label className="font-medium text-gray-700">Trailer:</label>
                          <p className="text-gray-900">
                            Unit #{trip.trailer?.unit_number} - {trip.trailer?.license_plate}
                            <br />
                            <span className="text-gray-600">
                              {trip.trailer?.trailer_type} {trip.trailer?.model}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-700 mb-3">Inspection Checklist (CFR 396.11 Compliant):</h5>
                    {renderInspectionChecklist(preTrip)}
                  </div>

                  {preTrip.inspection_notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notes:</label>
                      <p className="text-sm text-gray-900 bg-white p-3 rounded border">{preTrip.inspection_notes}</p>
                    </div>
                  )}

                  {preTrip.issues_found && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Issues Found:</label>
                      <p className="text-sm text-red-700 bg-red-50 p-3 rounded border border-red-200">{preTrip.issues_found}</p>
                      
                      {/* Create Maintenance Record Button for Failed Inspections */}
                      {!getInspectionStatus(preTrip).passed && (
                        <div className="mt-4">
                          <button
                            onClick={() => handleCreateMaintenanceRecord(preTrip)}
                            className="inline-flex items-center px-4 py-2 border border-orange-300 rounded-md shadow-sm text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                          >
                            <WrenchScrewdriverIcon className="h-4 w-4 mr-2" />
                            Create Maintenance Record
                          </button>
                          <p className="text-xs text-gray-500 mt-1">Create maintenance records for failed inspection items</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Pre-trip inspection has not been completed yet.</p>
              )}
            </div>

            {/* Post-Trip Inspection */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900 flex items-center">
                  <ClipboardDocumentCheckIcon className="h-5 w-5 mr-2 text-orange-600" />
                  Post-Trip Inspection
                </h4>
                {postTrip ? (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    getInspectionStatus(postTrip).passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {getInspectionStatus(postTrip).passed ? 'Passed' : 'Failed'}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    Not Completed
                  </span>
                )}
              </div>

              {postTrip ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="font-medium text-gray-700">Completed By:</label>
                      <p className="text-gray-900">{postTrip.completed_by_name}</p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-700">Completed At:</label>
                      <p className="text-gray-900">{formatDateTime(postTrip.completed_at)}</p>
                    </div>
                  </div>

                  {/* Vehicle Identification (CFR 396.11 Requirement) */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-3">Vehicle Identification (CFR 396.11)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-gray-700">Truck:</label>
                        <p className="text-gray-900">
                          Unit #{trip.truck?.unit_number} - {trip.truck?.license_plate}
                          <br />
                          <span className="text-gray-600">
                            {trip.truck?.year} {trip.truck?.make} {trip.truck?.model}
                          </span>
                          {trip.truck?.vin && (
                            <><br /><span className="text-xs text-gray-500">VIN: {trip.truck.vin}</span></>
                          )}
                        </p>
                      </div>
                      {trip.trailer && (
                        <div>
                          <label className="font-medium text-gray-700">Trailer:</label>
                          <p className="text-gray-900">
                            Unit #{trip.trailer?.unit_number} - {trip.trailer?.license_plate}
                            <br />
                            <span className="text-gray-600">
                              {trip.trailer?.trailer_type} {trip.trailer?.model}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-700 mb-3">Inspection Checklist (CFR 396.11 Compliant):</h5>
                    {renderInspectionChecklist(postTrip)}
                  </div>

                  {postTrip.inspection_notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notes:</label>
                      <p className="text-sm text-gray-900 bg-white p-3 rounded border">{postTrip.inspection_notes}</p>
                    </div>
                  )}

                  {postTrip.issues_found && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Issues Found:</label>
                      <p className="text-sm text-red-700 bg-red-50 p-3 rounded border border-red-200">{postTrip.issues_found}</p>
                      
                      {/* Create Maintenance Record Button for Failed Inspections */}
                      {!getInspectionStatus(postTrip).passed && (
                        <div className="mt-4">
                          <button
                            onClick={() => handleCreateMaintenanceRecord(postTrip)}
                            className="inline-flex items-center px-4 py-2 border border-orange-300 rounded-md shadow-sm text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                          >
                            <WrenchScrewdriverIcon className="h-4 w-4 mr-2" />
                            Create Maintenance Record
                          </button>
                          <p className="text-xs text-gray-500 mt-1">Create maintenance records for failed inspection items</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Post-trip inspection has not been completed yet.</p>
              )}
            </div>

            {/* Summary */}
            {(preTrip || postTrip) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-blue-900 mb-2">Inspection Summary</h4>
                <div className="text-sm text-blue-800">
                  {preTrip && postTrip ? (
                    <p>Both pre-trip and post-trip inspections have been completed.</p>
                  ) : preTrip ? (
                    <p>Pre-trip inspection completed. Post-trip inspection pending.</p>
                  ) : postTrip ? (
                    <p>Post-trip inspection completed. Pre-trip inspection data may be unavailable.</p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewTripDetails;