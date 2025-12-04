import React, { useState, useEffect } from 'react';
import { useSession } from '../providers/SessionProvider';
import axios from 'axios';
import BASE_URL from '../config';
import { XMarkIcon, TruckIcon, CalendarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

function AddMaintenanceRecord({ onClose, onRecordAdded, trucks, trailers, inspectionData, inspectionContext }) {
  const { session } = useSession();
  const [formData, setFormData] = useState({
    vehicle_type: 'truck',
    truck: '',
    trailer: '',
    maintenance_type: '',
    work_order_number: '',
    scheduled_date: '',
    due_mileage: '',
    priority: 'medium',
    description: '',
    parts_used: '',
    labor_hours: '',
    total_cost: '',
    service_provider: '',
    technician_name: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Pre-fill form when coming from failed inspection
  useEffect(() => {
    if (inspectionContext) {
      // New inspection context from ViewTripDetails
      setFormData(prev => ({
        ...prev,
        vehicle_type: inspectionContext.vehicleType,
        truck: inspectionContext.vehicleType === 'truck' ? inspectionContext.vehicleId : '',
        trailer: inspectionContext.vehicleType === 'trailer' ? inspectionContext.vehicleId : '',
        maintenance_type: 'other', // Use 'other' for inspection-related maintenance
        priority: inspectionContext.priority?.toLowerCase() || 'high',
        description: inspectionContext.description,
        notes: `Related to ${inspectionContext.tripNumber} ${inspectionContext.inspectionType} inspection on ${inspectionContext.inspectionDate}`,
        scheduled_date: new Date().toISOString().split('T')[0] // Today's date
      }));
    } else if (inspectionData) {
      // Legacy inspection data support
      const inspectionDescription = `Failed ${inspectionData.inspectionType?.replace('_', '-')} inspection for Trip #${inspectionData.tripId}. Defects found: ${inspectionData.defects}`;
      
      setFormData(prev => ({
        ...prev,
        vehicle_type: inspectionData.truckId ? 'truck' : 'trailer',
        truck: inspectionData.truckId || '',
        trailer: inspectionData.trailerId || '',
        maintenance_type: 'other', // Default to 'other' for inspection-related maintenance
        priority: 'high', // Failed inspections are high priority
        description: inspectionDescription,
        notes: `Created from failed inspection ID: ${inspectionData.inspectionId}. Original inspection notes: ${inspectionData.defects}`,
        scheduled_date: new Date().toISOString().split('T')[0] // Today's date
      }));
    }
  }, [inspectionContext, inspectionData]);

  // Maintenance type categories and options
  const maintenanceTypes = [
    {
      category: 'Engine & Powertrain',
      options: [
        { value: 'oil_change', label: 'Oil Change' },
        { value: 'transmission_service', label: 'Transmission Service' },
        { value: 'differential_service', label: 'Differential Service' },
        { value: 'engine_tune_up', label: 'Engine Tune-Up' },
      ]
    },
    {
      category: 'Brakes & Safety',
      options: [
        { value: 'brake_inspection', label: 'Brake Inspection' },
        { value: 'brake_pad_replacement', label: 'Brake Pad Replacement' },
        { value: 'air_brake_service', label: 'Air Brake Service' },
      ]
    },
    {
      category: 'Tires & Wheels',
      options: [
        { value: 'tire_rotation', label: 'Tire Rotation' },
        { value: 'tire_replacement', label: 'Tire Replacement' },
        { value: 'wheel_alignment', label: 'Wheel Alignment' },
      ]
    },
    {
      category: 'Electrical & Lighting',
      options: [
        { value: 'lighting_inspection', label: 'Lighting Inspection' },
        { value: 'battery_service', label: 'Battery Service' },
        { value: 'alternator_service', label: 'Alternator Service' },
      ]
    },
    {
      category: 'HVAC & Climate',
      options: [
        { value: 'ac_service', label: 'A/C Service' },
        { value: 'heater_service', label: 'Heater Service' },
      ]
    },
    {
      category: 'Body & Frame',
      options: [
        { value: 'body_repair', label: 'Body Repair' },
        { value: 'frame_inspection', label: 'Frame Inspection' },
      ]
    },
    {
      category: 'Preventive Maintenance',
      options: [
        { value: 'a_service', label: 'A-Service (Basic)' },
        { value: 'b_service', label: 'B-Service (Intermediate)' },
        { value: 'c_service', label: 'C-Service (Complete)' },
      ]
    },
    {
      category: 'DOT Inspections',
      options: [
        { value: 'annual_dot_inspection', label: 'Annual DOT Inspection' },
        { value: 'quarterly_inspection', label: '90-Day Inspection' },
        { value: 'pre_trip_inspection', label: 'Pre-Trip Inspection' },
      ]
    },
    {
      category: 'Other',
      options: [
        { value: 'other', label: 'Other' },
      ]
    }
  ];

  const [filteredTypes, setFilteredTypes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  // Generate work order number on component mount
  useEffect(() => {
    const generateWorkOrderNumber = () => {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const time = String(Date.now()).slice(-4);
      return `WO-${year}${month}${day}-${time}`;
    };

    setFormData(prev => ({
      ...prev,
      work_order_number: generateWorkOrderNumber(),
      scheduled_date: new Date().toISOString().split('T')[0] // Today's date
    }));

    // Initialize with all maintenance types
    const allTypes = maintenanceTypes.flatMap(category => category.options);
    setFilteredTypes(allTypes);
  }, []);

  // Filter maintenance types when category changes
  const handleCategoryChange = (categoryName) => {
    setSelectedCategory(categoryName);
    if (categoryName === '') {
      const allTypes = maintenanceTypes.flatMap(category => category.options);
      setFilteredTypes(allTypes);
    } else {
      const category = maintenanceTypes.find(cat => cat.category === categoryName);
      setFilteredTypes(category ? category.options : []);
    }
    setFormData(prev => ({ ...prev, maintenance_type: '' }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.vehicle_type) newErrors.vehicle_type = 'Vehicle type is required';
    if (formData.vehicle_type === 'truck' && !formData.truck) newErrors.truck = 'Please select a truck';
    if (formData.vehicle_type === 'trailer' && !formData.trailer) newErrors.trailer = 'Please select a trailer';
    if (!formData.maintenance_type) newErrors.maintenance_type = 'Maintenance type is required';
    if (!formData.work_order_number) newErrors.work_order_number = 'Work order number is required';
    if (!formData.scheduled_date) newErrors.scheduled_date = 'Scheduled date is required';
    if (!formData.description) newErrors.description = 'Description is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const submitData = {
        ...formData,
        truck: formData.vehicle_type === 'truck' ? formData.truck : null,
        trailer: formData.vehicle_type === 'trailer' ? formData.trailer : null,
        due_mileage: formData.due_mileage ? parseInt(formData.due_mileage) : null,
        labor_hours: formData.labor_hours ? parseFloat(formData.labor_hours) : null,
        total_cost: formData.total_cost ? parseFloat(formData.total_cost) : null,
      };

      await axios.post(`${BASE_URL}/api/maintenance-records/`, submitData, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
      });

      onRecordAdded();
      onClose();
    } catch (error) {
      console.error('Error creating maintenance record:', error);
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        alert('Failed to create maintenance record. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <TruckIcon className="h-6 w-6 mr-2 text-blue-600" />
              {inspectionContext ? 'Schedule Maintenance for Failed Inspection' : 'Add Maintenance Record'}
            </h3>
            {(inspectionContext || inspectionData) && (
              <div className="flex items-center mt-1">
                <ExclamationTriangleIcon className="h-4 w-4 mr-1 text-orange-500" />
                <span className="text-sm text-orange-600 font-medium">
                  {inspectionContext 
                    ? `From ${inspectionContext.tripNumber} - ${inspectionContext.vehicleName}` 
                    : `Created from Failed Inspection - Trip #${inspectionData.tripId}`
                  }
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Detailed Inspection Context */}
        {inspectionContext && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-orange-400" />
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-orange-800">
                  Inspection Failed - {inspectionContext.inspectionType.toUpperCase()} on {inspectionContext.inspectionDate}
                </h4>
                <p className="text-sm text-orange-700 mt-1">
                  Vehicle: {inspectionContext.vehicleName}
                </p>
                {inspectionContext.failedItems.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-orange-800">Failed Inspection Items:</p>
                    <ul className="text-sm text-orange-700 mt-1 list-disc list-inside">
                      {inspectionContext.failedItems.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vehicle Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type *</label>
              <select
                name="vehicle_type"
                value={formData.vehicle_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="truck">Truck</option>
                <option value="trailer">Trailer</option>
              </select>
              {errors.vehicle_type && <p className="text-red-500 text-xs mt-1">{errors.vehicle_type}</p>}
            </div>

            <div>
              {formData.vehicle_type === 'truck' ? (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Truck *</label>
                  <select
                    name="truck"
                    value={formData.truck}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a truck...</option>
                    {trucks.map(truck => (
                      <option key={truck.id} value={truck.id}>
                        {truck.unit_number} - {truck.license_plate}
                      </option>
                    ))}
                  </select>
                  {errors.truck && <p className="text-red-500 text-xs mt-1">{errors.truck}</p>}
                </>
              ) : (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Trailer *</label>
                  <select
                    name="trailer"
                    value={formData.trailer}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a trailer...</option>
                    {trailers.map(trailer => (
                      <option key={trailer.id} value={trailer.id}>
                        {trailer.license_plate} - {trailer.model}
                      </option>
                    ))}
                  </select>
                  {errors.trailer && <p className="text-red-500 text-xs mt-1">{errors.trailer}</p>}
                </>
              )}
            </div>
          </div>

          {/* Maintenance Type and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {maintenanceTypes.map(category => (
                  <option key={category.category} value={category.category}>
                    {category.category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Type *</label>
              <select
                name="maintenance_type"
                value={formData.maintenance_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose maintenance type...</option>
                {filteredTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.maintenance_type && <p className="text-red-500 text-xs mt-1">{errors.maintenance_type}</p>}
            </div>
          </div>

          {/* Work Order and Scheduling */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Order Number *</label>
              <input
                type="text"
                name="work_order_number"
                value={formData.work_order_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.work_order_number && <p className="text-red-500 text-xs mt-1">{errors.work_order_number}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date *</label>
              <input
                type="date"
                name="scheduled_date"
                value={formData.scheduled_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.scheduled_date && <p className="text-red-500 text-xs mt-1">{errors.scheduled_date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the maintenance work to be performed..."
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Mileage</label>
              <input
                type="number"
                name="due_mileage"
                value={formData.due_mileage}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Miles when maintenance is due"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Labor Hours</label>
              <input
                type="number"
                step="0.5"
                name="labor_hours"
                value={formData.labor_hours}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Estimated hours"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Provider</label>
              <input
                type="text"
                name="service_provider"
                value={formData.service_provider}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Shop or facility name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost</label>
              <input
                type="number"
                step="0.01"
                name="total_cost"
                value={formData.total_cost}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Parts and Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parts/Components</label>
            <textarea
              name="parts_used"
              value={formData.parts_used}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="List parts or components needed..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional notes or special instructions..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Maintenance Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddMaintenanceRecord;