import React, { useState, useEffect } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

const AddTrip = ({ isOpen, onClose, onTripAdded }) => {
  const { session, refreshAccessToken } = useSession();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [trailers, setTrailers] = useState([]);
  
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
    if (isOpen) {
      fetchFormData();
    }
  }, [isOpen]);

  const fetchFormData = async () => {
    try {
      const [companiesRes, driversRes, trucksRes, trailersRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/Company/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        }),
        axios.get(`${BASE_URL}/api/Driver/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        }),
        axios.get(`${BASE_URL}/api/Truck/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        }),
        axios.get(`${BASE_URL}/api/Trailer/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        })
      ]);

      setCompanies(companiesRes.data);
      setDrivers(driversRes.data);
      setTrucks(trucksRes.data);
      setTrailers(trailersRes.data);
    } catch (error) {
      console.error('Error fetching form data:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });
      
      onTripAdded();
      handleClose();
    } catch (error) {
      console.error('Error creating trip:', error);
      if (error.response && error.response.status === 401) {
        await refreshAccessToken();
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
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
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
                  Create New Trip
                </DialogTitle>
                
                <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {/* Company Selection */}
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                        Company *
                      </label>
                      <select
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.company ? 'border-red-300' : ''}`}
                      >
                        <option value="">Select Company</option>
                        {companies.map(company => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                      {errors.company && <p className="mt-1 text-sm text-red-600">{errors.company}</p>}
                    </div>

                    {/* Driver Selection */}
                    <div>
                      <label htmlFor="driver" className="block text-sm font-medium text-gray-700">
                        Driver *
                      </label>
                      <select
                        id="driver"
                        name="driver"
                        value={formData.driver}
                        onChange={handleInputChange}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.driver ? 'border-red-300' : ''}`}
                      >
                        <option value="">Select Driver</option>
                        {drivers.map(driver => (
                          <option key={driver.id} value={driver.id}>
                            {driver.first_name} {driver.last_name}
                          </option>
                        ))}
                      </select>
                      {errors.driver && <p className="mt-1 text-sm text-red-600">{errors.driver}</p>}
                    </div>

                    {/* Truck Selection */}
                    <div>
                      <label htmlFor="truck" className="block text-sm font-medium text-gray-700">
                        Truck *
                      </label>
                      <select
                        id="truck"
                        name="truck"
                        value={formData.truck}
                        onChange={handleInputChange}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.truck ? 'border-red-300' : ''}`}
                      >
                        <option value="">Select Truck</option>
                        {trucks.map(truck => (
                          <option key={truck.id} value={truck.id}>
                            {truck.unit_number} - {truck.make} {truck.model}
                          </option>
                        ))}
                      </select>
                      {errors.truck && <p className="mt-1 text-sm text-red-600">{errors.truck}</p>}
                    </div>

                    {/* Trailer Selection */}
                    <div>
                      <label htmlFor="trailer" className="block text-sm font-medium text-gray-700">
                        Trailer
                      </label>
                      <select
                        id="trailer"
                        name="trailer"
                        value={formData.trailer}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="">Select Trailer (Optional)</option>
                        {trailers.map(trailer => (
                          <option key={trailer.id} value={trailer.id}>
                            {trailer.unit_number} - {trailer.trailer_type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Trip Details */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="origin" className="block text-sm font-medium text-gray-700">
                        Origin *
                      </label>
                      <input
                        type="text"
                        id="origin"
                        name="origin"
                        value={formData.origin}
                        onChange={handleInputChange}
                        placeholder="Origin address or location"
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.origin ? 'border-red-300' : ''}`}
                      />
                      {errors.origin && <p className="mt-1 text-sm text-red-600">{errors.origin}</p>}
                    </div>

                    <div>
                      <label htmlFor="destination" className="block text-sm font-medium text-gray-700">
                        Destination *
                      </label>
                      <input
                        type="text"
                        id="destination"
                        name="destination"
                        value={formData.destination}
                        onChange={handleInputChange}
                        placeholder="Destination address or location"
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.destination ? 'border-red-300' : ''}`}
                      />
                      {errors.destination && <p className="mt-1 text-sm text-red-600">{errors.destination}</p>}
                    </div>

                    <div>
                      <label htmlFor="planned_departure" className="block text-sm font-medium text-gray-700">
                        Planned Departure *
                      </label>
                      <input
                        type="datetime-local"
                        id="planned_departure"
                        name="planned_departure"
                        value={formData.planned_departure}
                        onChange={handleInputChange}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.planned_departure ? 'border-red-300' : ''}`}
                      />
                      {errors.planned_departure && <p className="mt-1 text-sm text-red-600">{errors.planned_departure}</p>}
                    </div>

                    <div>
                      <label htmlFor="planned_arrival" className="block text-sm font-medium text-gray-700">
                        Planned Arrival
                      </label>
                      <input
                        type="datetime-local"
                        id="planned_arrival"
                        name="planned_arrival"
                        value={formData.planned_arrival}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* Load Description */}
                  <div>
                    <label htmlFor="load_description" className="block text-sm font-medium text-gray-700">
                      Load Description
                    </label>
                    <textarea
                      id="load_description"
                      name="load_description"
                      rows={3}
                      value={formData.load_description}
                      onChange={handleInputChange}
                      placeholder="Describe the load/cargo for this trip"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={3}
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Additional notes or special instructions"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creating...' : 'Create Trip'}
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
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

export default AddTrip;