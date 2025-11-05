import React, { useState, useEffect } from 'react';
import { useSession } from '../providers/SessionProvider';
import axios from 'axios';
import BASE_URL from '../config';
import { XMarkIcon, TruckIcon } from '@heroicons/react/24/outline';

function EditMaintenanceRecord({ record, onClose, onRecordUpdated, trucks, trailers }) {
  const { session } = useSession();
  const [formData, setFormData] = useState({
    vehicle_type: '',
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
    notes: '',
    status: 'scheduled'
  });

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
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Populate form data when record is provided
  useEffect(() => {
    if (record) {
      setFormData({
        vehicle_type: record.vehicle_type,
        truck: record.truck || '',
        trailer: record.trailer || '',
        maintenance_type: record.maintenance_type,
        work_order_number: record.work_order_number,
        scheduled_date: record.scheduled_date,
        due_mileage: record.due_mileage || '',
        priority: record.priority,
        description: record.description,
        parts_used: record.parts_used || '',
        labor_hours: record.labor_hours || '',
        total_cost: record.total_cost || '',
        service_provider: record.service_provider || '',
        technician_name: record.technician_name || '',
        notes: record.notes || '',
        status: record.status
      });

      // Initialize with all maintenance types
      const allTypes = maintenanceTypes.flatMap(category => category.options);
      setFilteredTypes(allTypes);
    }
  }, [record]);

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

      await axios.put(`${BASE_URL}/api/maintenance-records/${record.record_id}/`, submitData, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
      });

      onRecordUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating maintenance record:', error);
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        alert('Failed to update maintenance record. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!record) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <TruckIcon className="h-6 w-6 mr-2 text-blue-600" />
            Edit Maintenance Record
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Work Order and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Order Number *</label>
              <input
                type="text"
                name="work_order_number"
                value={formData.work_order_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

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

          {/* Maintenance Type */}
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

          {/* Scheduling and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Mileage</label>
              <input
                type="number"
                name="due_mileage"
                value={formData.due_mileage}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
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
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          {/* Work Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Labor Hours</label>
              <input
                type="number"
                step="0.5"
                name="labor_hours"
                value={formData.labor_hours}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost</label>
              <input
                type="number"
                step="0.01"
                name="total_cost"
                value={formData.total_cost}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Technician Name</label>
              <input
                type="text"
                name="technician_name"
                value={formData.technician_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Parts and Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parts Used</label>
            <textarea
              name="parts_used"
              value={formData.parts_used}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              {submitting ? 'Updating...' : 'Update Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditMaintenanceRecord;