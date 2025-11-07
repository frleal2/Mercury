import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import { XMarkIcon, TruckIcon } from '@heroicons/react/24/outline';

function EditTruck({ truck, onClose, onTruckUpdated }) {
  const { session, refreshAccessToken } = useSession();
  const [formData, setFormData] = useState({ 
    ...truck,
    active: truck.active !== undefined ? truck.active : true
  });
  const [companies, setCompanies] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // US States for dropdown
  const US_STATES = [
    { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companiesResponse, driversResponse] = await Promise.all([
          axios.get(`${BASE_URL}/api/companies/`, {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          }),
          axios.get(`${BASE_URL}/api/drivers/`, {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          }),
        ]);
        setCompanies(companiesResponse.data);
        setDrivers(driversResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load data.');
      }
    };
    fetchData();
  }, [session]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue,
    }));
    
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.unit_number.trim()) newErrors.unit_number = 'Unit number is required';
    if (!formData.license_plate.trim()) newErrors.license_plate = 'License plate is required';
    if (!formData.license_plate_state) newErrors.license_plate_state = 'License plate state is required';
    if (!formData.company) newErrors.company = 'Company is required';
    if (formData.year && (formData.year < 1900 || formData.year > new Date().getFullYear() + 1)) {
      newErrors.year = 'Please enter a valid year';
    }
    if (formData.license_plate_expiration && new Date(formData.license_plate_expiration) < new Date()) {
      newErrors.license_plate_expiration = 'License plate expiration cannot be in the past';
    }

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
      await axios.put(`${BASE_URL}/api/trucks/${truck.id}/`, formData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (onTruckUpdated) onTruckUpdated();
      onClose();
    } catch (error) {
      if (error.response && error.response.status === 401) {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          try {
            await axios.put(`${BASE_URL}/api/trucks/${truck.id}/`, formData, {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${newAccessToken}`,
              },
            });
            if (onTruckUpdated) onTruckUpdated();
            onClose();
          } catch (retryError) {
            console.error('Error retrying update truck:', retryError);
            if (retryError.response?.data) {
              setErrors(retryError.response.data);
            } else {
              alert('Failed to update truck after refreshing token.');
            }
          }
        } else {
          alert('Failed to refresh access token.');
        }
      } else {
        console.error('Error updating truck:', error);
        if (error.response?.data) {
          setErrors(error.response.data);
        } else {
          alert('Failed to update truck. Please try again.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <TruckIcon className="h-6 w-6 mr-2 text-blue-600" />
            Edit Truck - {truck.unit_number}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Number *</label>
                <input
                  type="text"
                  name="unit_number"
                  value={formData.unit_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter unit number"
                />
                {errors.unit_number && <p className="text-red-500 text-xs mt-1">{errors.unit_number}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
                <input
                  type="text"
                  name="vin"
                  value={formData.vin}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter VIN number"
                  maxLength="17"
                />
                {errors.vin && <p className="text-red-500 text-xs mt-1">{errors.vin}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 2020"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
                {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                <input
                  type="text"
                  name="make"
                  value={formData.make}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Freightliner"
                />
                {errors.make && <p className="text-red-500 text-xs mt-1">{errors.make}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Cascadia"
                />
                {errors.model && <p className="text-red-500 text-xs mt-1">{errors.model}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
                <select
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                {errors.company && <p className="text-red-500 text-xs mt-1">{errors.company}</p>}
              </div>
            </div>
          </div>

          {/* License & Registration */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">License & Registration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Plate *</label>
                <input
                  type="text"
                  name="license_plate"
                  value={formData.license_plate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter license plate"
                />
                {errors.license_plate && <p className="text-red-500 text-xs mt-1">{errors.license_plate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Plate State *</label>
                <select
                  name="license_plate_state"
                  value={formData.license_plate_state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a state</option>
                  {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
                {errors.license_plate_state && <p className="text-red-500 text-xs mt-1">{errors.license_plate_state}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Plate Expiration</label>
                <input
                  type="date"
                  name="license_plate_expiration"
                  value={formData.license_plate_expiration}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.license_plate_expiration && <p className="text-red-500 text-xs mt-1">{errors.license_plate_expiration}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Expiration</label>
                <input
                  type="date"
                  name="registration_expiration"
                  value={formData.registration_expiration}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.registration_expiration && <p className="text-red-500 text-xs mt-1">{errors.registration_expiration}</p>}
              </div>
            </div>
          </div>

          {/* Insurance & Inspections */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Insurance & Inspections</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Expiration</label>
                <input
                  type="date"
                  name="insurance_expiration"
                  value={formData.insurance_expiration}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.insurance_expiration && <p className="text-red-500 text-xs mt-1">{errors.insurance_expiration}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Annual DOT Inspection Date</label>
                <input
                  type="date"
                  name="annual_dot_inspection_date"
                  value={formData.annual_dot_inspection_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.annual_dot_inspection_date && <p className="text-red-500 text-xs mt-1">{errors.annual_dot_inspection_date}</p>}
              </div>
            </div>
          </div>

          {/* Assignment & Status */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Assignment & Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Driver</label>
                <select
                  name="driver"
                  value={formData.driver}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Unassigned</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.first_name} {driver.last_name}
                    </option>
                  ))}
                </select>
                {errors.driver && <p className="text-red-500 text-xs mt-1">{errors.driver}</p>}
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Truck is active</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {submitting ? 'Updating Truck...' : 'Update Truck'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditTruck;