import React, { useState, useEffect } from 'react';
import { XMarkIcon, TruckIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

const AddTrip = ({ onClose }) => {
  const { session, refreshAccessToken } = useSession();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [allDrivers, setAllDrivers] = useState([]);
  const [allTrucks, setAllTrucks] = useState([]);
  const [allTrailers, setAllTrailers] = useState([]);
  const [filteredDrivers, setFilteredDrivers] = useState([]);
  
  const [formData, setFormData] = useState({
    company: '',
    driver: '',
    truck: '',
    trailer: '',
    origin: '',
    destination: '',
    planned_departure: '',
    planned_arrival: '',
    load_description: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchFormData();
  }, []);

  // Initialize filtered drivers when company is pre-selected
  useEffect(() => {
    if (formData.company && allDrivers.length > 0) {
      const companyDrivers = allDrivers.filter(driver => 
        driver.company === parseInt(formData.company) || driver.company?.id === parseInt(formData.company)
      );
      setFilteredDrivers(companyDrivers);
    } else {
      setFilteredDrivers([]);
    }
  }, [formData.company, allDrivers]);

  const fetchFormData = async () => {
    try {
      const [companiesRes, driversRes, trucksRes, trailersRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/companies/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        }),
        axios.get(`${BASE_URL}/api/drivers/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        }),
        axios.get(`${BASE_URL}/api/trucks/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        }),
        axios.get(`${BASE_URL}/api/trailers/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        })
      ]);

      setCompanies(companiesRes.data);
      setAllDrivers(driversRes.data);
      setAllTrucks(trucksRes.data);
      setAllTrailers(trailersRes.data);
    } catch (error) {
      console.error('Error fetching form data:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'company') {
      // Filter drivers by selected company
      const companyDrivers = allDrivers.filter(driver => 
        driver.company === parseInt(value) || driver.company?.id === parseInt(value)
      );
      setFilteredDrivers(companyDrivers);
      
      // Reset dependent fields
      setFormData(prev => ({
        ...prev,
        company: value,
        driver: '',
        truck: '',
        trailer: ''
      }));
    } else if (name === 'driver') {
      // Find the selected driver
      const selectedDriver = allDrivers.find(driver => driver.id === parseInt(value));
      
      if (selectedDriver) {
        // Find the truck assigned to this driver
        const assignedTruck = allTrucks.find(truck => 
          truck.driver === selectedDriver.id || truck.driver?.id === selectedDriver.id
        );
        
        if (assignedTruck) {
          // Find the trailer assigned to this truck
          const assignedTrailer = allTrailers.find(trailer => 
            trailer.truck === assignedTruck.id || trailer.truck?.id === assignedTruck.id
          );
          
          setFormData(prev => ({
            ...prev,
            driver: value,
            truck: assignedTruck.id.toString(),
            trailer: assignedTrailer ? assignedTrailer.id.toString() : ''
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            driver: value,
            truck: '',
            trailer: ''
          }));
        }
      } else {
        setFormData(prev => ({
          ...prev,
          driver: value,
          truck: '',
          trailer: ''
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.company) newErrors.company = 'Company is required';
    if (!formData.driver) newErrors.driver = 'Driver is required';
    if (!formData.truck) newErrors.truck = 'Truck is required';
    if (!formData.origin) newErrors.origin = 'Origin is required';
    if (!formData.destination) newErrors.destination = 'Destination is required';
    if (!formData.planned_departure) newErrors.planned_departure = 'Planned departure is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/api/trips/management/`, formData, {
        headers: { 
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      alert('Trip created successfully!');
      onClose();
    } catch (error) {
      console.error('Error creating trip:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      } else if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        alert('Failed to create trip. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      company: '',
      driver: '',
      truck: '',
      trailer: '',
      origin: '',
      destination: '',
      planned_departure: '',
      planned_arrival: '',
      load_description: '',
      notes: ''
    });
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <TruckIcon className="h-6 w-6 mr-2 text-blue-600" />
            Create New Trip
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Assignment Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Assignment Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
                <select
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Company</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                {errors.company && <p className="text-red-500 text-xs mt-1">{errors.company}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver *</label>
                <select
                  name="driver"
                  value={formData.driver}
                  onChange={handleChange}
                  disabled={!formData.company}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!formData.company ? "Select Company First" : "Select Driver"}
                  </option>
                  {filteredDrivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.first_name} {driver.last_name}
                    </option>
                  ))}
                </select>
                {errors.driver && <p className="text-red-500 text-xs mt-1">{errors.driver}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Truck * (Auto-assigned)</label>
                <select
                  name="truck"
                  value={formData.truck}
                  onChange={handleChange}
                  disabled={true}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-100 cursor-not-allowed"
                >
                  <option value="">
                    {!formData.driver ? "Select Driver First" : "No Truck Assigned"}
                  </option>
                  {allTrucks.map(truck => (
                    <option key={truck.id} value={truck.id}>
                      {truck.unit_number} - {truck.make} {truck.model}
                    </option>
                  ))}
                </select>
                {formData.truck && (
                  <p className="text-green-600 text-xs mt-1">
                    ✓ Truck automatically assigned to selected driver
                  </p>
                )}
                {errors.truck && <p className="text-red-500 text-xs mt-1">{errors.truck}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trailer (Auto-assigned)</label>
                <select
                  name="trailer"
                  value={formData.trailer}
                  onChange={handleChange}
                  disabled={true}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-100 cursor-not-allowed"
                >
                  <option value="">
                    {!formData.truck ? "Select Driver/Truck First" : "No Trailer Assigned"}
                  </option>
                  {allTrailers.map(trailer => (
                    <option key={trailer.id} value={trailer.id}>
                      {trailer.license_plate} - {trailer.model || 'Standard Trailer'}
                    </option>
                  ))}
                </select>
                {formData.trailer && (
                  <p className="text-green-600 text-xs mt-1">
                    ✓ Trailer automatically assigned to selected truck
                  </p>
                )}
                {!formData.trailer && formData.truck && (
                  <p className="text-blue-600 text-xs mt-1">
                    ℹ No trailer assigned to this truck
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Trip Details */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Trip Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Origin *</label>
                <input
                  type="text"
                  name="origin"
                  value={formData.origin}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Origin address or location"
                />
                {errors.origin && <p className="text-red-500 text-xs mt-1">{errors.origin}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination *</label>
                <input
                  type="text"
                  name="destination"
                  value={formData.destination}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Destination address or location"
                />
                {errors.destination && <p className="text-red-500 text-xs mt-1">{errors.destination}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Planned Departure *</label>
                <input
                  type="date"
                  name="planned_departure"
                  value={formData.planned_departure}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.planned_departure && <p className="text-red-500 text-xs mt-1">{errors.planned_departure}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Planned Arrival</label>
                <input
                  type="date"
                  name="planned_arrival"
                  value={formData.planned_arrival}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Additional Information</h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Load Description</label>
                <textarea
                  name="load_description"
                  value={formData.load_description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the load/cargo for this trip"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes or special instructions"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTrip;