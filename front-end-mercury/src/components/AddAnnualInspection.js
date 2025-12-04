import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import { 
  XMarkIcon,
  PlusIcon,
  CalendarIcon,
  InformationCircleIcon,
  XCircleIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

function AddAnnualInspection({ isOpen, onClose, onInspectionAdded }) {
  const { session, refreshAccessToken } = useSession();
  const [trucks, setTrucks] = useState([]);
  const [trailers, setTrailers] = useState([]);
  const [qualifiedInspectors, setQualifiedInspectors] = useState([]);
  const [formData, setFormData] = useState({
    vehicle_type: 'truck',
    truck: '',
    trailer: '',
    inspection_date: '',
    inspector_name: '',
    inspection_facility: '',
    passed: true,
    notes: '',
    inspection_certificate_pdf: null
  });
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchFormData();
    }
  }, [isOpen]);

  const fetchFormData = async () => {
    try {
      setDataLoading(true);
      
      const [trucksResponse, trailersResponse, inspectorsResponse] = await Promise.all([
        axios.get(`${BASE_URL}/api/trucks/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        }),
        axios.get(`${BASE_URL}/api/trailers/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        }),
        axios.get(`${BASE_URL}/api/qualified-inspectors/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        })
      ]);

      setTrucks(trucksResponse.data);
      setTrailers(trailersResponse.data);
      setQualifiedInspectors(inspectorsResponse.data);
      
    } catch (error) {
      console.error('Error fetching form data:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        vehicle_type: formData.vehicle_type,
        truck: formData.vehicle_type === 'truck' ? formData.truck : null,
        trailer: formData.vehicle_type === 'trailer' ? formData.trailer : null,
        inspection_date: formData.inspection_date,
        inspector_name: formData.inspector_name,
        inspection_facility: formData.inspection_facility,
        passed: formData.passed,
        notes: formData.notes
      };

      await axios.post(`${BASE_URL}/api/annual-inspections/`, submitData, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });

      onInspectionAdded();
    } catch (error) {
      console.error('Error adding annual inspection:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
      setError(error.response?.data?.error || 'Failed to add annual inspection');
    } finally {
      setLoading(false);
    }
  };

  const getVehicleOptions = () => {
    return formData.vehicle_type === 'truck' ? trucks : trailers;
  };

  const getVehicleDisplayName = (vehicle) => {
    if (formData.vehicle_type === 'truck') {
      return `${vehicle.unit_number} - ${vehicle.make} ${vehicle.model} (${vehicle.license_plate})`;
    } else {
      return `${vehicle.unit_number} - ${vehicle.trailer_type} (${vehicle.license_plate})`;
    }
  };

  if (dataLoading) {
    return (
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <div className="fixed inset-0 bg-black bg-opacity-25" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl p-6">
                <div className="flex justify-center items-center h-32">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="ml-3 text-gray-600">Loading form data...</p>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>
    );
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex items-center justify-between mb-6">
                  <span className="flex items-center">
                    <PlusIcon className="h-6 w-6 mr-2" />
                    Schedule Annual Inspection
                  </span>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Vehicle Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Type *
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="vehicle_type"
                          value="truck"
                          checked={formData.vehicle_type === 'truck'}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            vehicle_type: e.target.value,
                            truck: '',
                            trailer: ''
                          }))}
                          className="mr-2"
                        />
                        Truck
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="vehicle_type"
                          value="trailer"
                          checked={formData.vehicle_type === 'trailer'}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            vehicle_type: e.target.value,
                            truck: '',
                            trailer: ''
                          }))}
                          className="mr-2"
                        />
                        Trailer
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select {formData.vehicle_type === 'truck' ? 'Truck' : 'Trailer'} *
                    </label>
                    <select
                      value={formData.vehicle_type === 'truck' ? formData.truck : formData.trailer}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        [formData.vehicle_type]: e.target.value 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select a {formData.vehicle_type}...</option>
                      {getVehicleOptions().map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {getVehicleDisplayName(vehicle)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Inspection Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="inspection_date" className="block text-sm font-medium text-gray-700 mb-1">
                        Inspection Date *
                      </label>
                      <input
                        type="date"
                        id="inspection_date"
                        value={formData.inspection_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, inspection_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="inspector_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Inspector Name *
                      </label>
                      <select
                        id="inspector_name"
                        value={formData.inspector_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, inspector_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select inspector...</option>
                        {qualifiedInspectors.map((inspector) => (
                          <option key={inspector.id} value={inspector.name}>
                            {inspector.name} - {inspector.certification_number}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="inspection_facility" className="block text-sm font-medium text-gray-700 mb-1">
                      Inspection Facility *
                    </label>
                    <input
                      type="text"
                      id="inspection_facility"
                      value={formData.inspection_facility}
                      onChange={(e) => setFormData(prev => ({ ...prev, inspection_facility: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Name and address of inspection facility"
                      required
                    />
                  </div>

                  {/* Inspection Result */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Inspection Result *
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="passed"
                          value="true"
                          checked={formData.passed === true}
                          onChange={(e) => setFormData(prev => ({ ...prev, passed: true }))}
                          className="mr-2"
                        />
                        <span className="text-green-600">Passed</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="passed"
                          value="false"
                          checked={formData.passed === false}
                          onChange={(e) => setFormData(prev => ({ ...prev, passed: false }))}
                          className="mr-2"
                        />
                        <span className="text-red-600">Failed</span>
                      </label>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                      Inspection Notes
                    </label>
                    <textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any defects found, repairs needed, or other inspection details..."
                    />
                  </div>

                  {/* CFR Notice */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start">
                      <InformationCircleIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">CFR 396.17 Compliance</p>
                        <p className="mt-1">
                          Annual inspections are valid for 12 months from the inspection date. 
                          Only qualified inspectors may perform these inspections.
                        </p>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      disabled={loading}
                    >
                      {loading ? 'Scheduling...' : 'Schedule Inspection'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default AddAnnualInspection;