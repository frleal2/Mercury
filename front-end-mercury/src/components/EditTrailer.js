import React, { useState, useEffect } from 'react';
import { useSession } from '../providers/SessionProvider';
import axios from 'axios';
import BASE_URL from '../config';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { RectangleStackIcon } from '@heroicons/react/24/outline';

function EditTrailer({ trailer, onClose, onTrailerUpdated }) {
  const { session, refreshAccessToken } = useSession();
  const [companies, setCompanies] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [formData, setFormData] = useState({ 
    ...trailer,
    active: trailer.active !== undefined ? trailer.active : true
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companiesResponse, trucksResponse] = await Promise.all([
          axios.get(`${BASE_URL}/api/companies/`, {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          }),
          axios.get(`${BASE_URL}/api/trucks/`, {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          }),
        ]);
        setCompanies(companiesResponse.data);
        setTrucks(trucksResponse.data);
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

    if (!formData.license_plate.trim()) newErrors.license_plate = 'License plate is required';
    if (!formData.model.trim()) newErrors.model = 'Model is required';
    if (!formData.company) newErrors.company = 'Company is required';

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
      await axios.put(`${BASE_URL}/api/trailers/${trailer.id}/`, formData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (onTrailerUpdated) onTrailerUpdated();
      onClose();
    } catch (error) {
      if (error.response && error.response.status === 401) {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          try {
            await axios.put(`${BASE_URL}/api/trailers/${trailer.id}/`, formData, {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${newAccessToken}`,
              },
            });
            if (onTrailerUpdated) onTrailerUpdated();
            onClose();
          } catch (retryError) {
            console.error('Error retrying update trailer:', retryError);
            if (retryError.response?.data) {
              setErrors(retryError.response.data);
            } else {
              alert('Failed to update trailer after refreshing token.');
            }
          }
        } else {
          alert('Failed to refresh access token.');
        }
      } else {
        console.error('Error updating trailer:', error);
        if (error.response?.data) {
          setErrors(error.response.data);
        } else {
          alert('Failed to update trailer. Please try again.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 xl:w-1/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <RectangleStackIcon className="h-6 w-6 mr-2 text-blue-600" />
            Edit Trailer - {trailer.license_plate}
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
            <div className="grid grid-cols-1 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Dry Van, Flatbed, Reefer"
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

          {/* Assignment & Status */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Assignment & Status</h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Truck</label>
                <select
                  name="truck"
                  value={formData.truck}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Unassigned</option>
                  {trucks.map((truck) => (
                    <option key={truck.id} value={truck.id}>
                      {truck.unit_number} - {truck.license_plate}
                    </option>
                  ))}
                </select>
                {errors.truck && <p className="text-red-500 text-xs mt-1">{errors.truck}</p>}
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Trailer is active</span>
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
              {submitting ? 'Updating Trailer...' : 'Update Trailer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditTrailer;