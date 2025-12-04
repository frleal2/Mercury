import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import { 
  XMarkIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

function CancelReassignTripModal({ isOpen, onClose, trip, onTripCancelled }) {
  const { session } = useSession();
  const [availableTrucks, setAvailableTrucks] = useState([]);
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [createNewTrip, setCreateNewTrip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchAvailableTrucks();
      setCancellationReason('Maintenance delays prevent timely completion');
      setCreateNewTrip(false);
      setSelectedTruckId('');
      setError('');
    }
  }, [isOpen]);

  const fetchAvailableTrucks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/available-trucks/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });
      setAvailableTrucks(response.data.available_trucks);
    } catch (error) {
      console.error('Error fetching available trucks:', error);
      setError('Failed to load available trucks');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!cancellationReason.trim()) {
      setError('Please provide a cancellation reason');
      return;
    }

    if (createNewTrip && !selectedTruckId) {
      setError('Please select a truck for the new trip');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await axios.post(`${BASE_URL}/api/trips/${trip.id}/cancel-reassign/`, {
        reason: cancellationReason,
        create_new_trip: createNewTrip,
        new_truck_id: createNewTrip ? parseInt(selectedTruckId) : null
      }, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });

      console.log('Trip cancellation response:', response.data);
      onTripCancelled(response.data);
      onClose();
    } catch (error) {
      console.error('Error cancelling trip:', error);
      setError(error.response?.data?.error || 'Failed to cancel trip');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTruck = availableTrucks.find(t => t.id === parseInt(selectedTruckId));

  if (!trip) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="h-6 w-6 mr-2 text-orange-600" />
                      <span>Cancel & Reassign Trip</span>
                    </div>
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </Dialog.Title>

                {error && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Trip Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Trip Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Trip:</span> #{trip.trip_number || trip.id}
                      </div>
                      <div>
                        <span className="font-medium">Driver:</span> {trip.driver_name}
                      </div>
                      <div>
                        <span className="font-medium">Current Truck:</span> {trip.truck_number}
                      </div>
                      <div>
                        <span className="font-medium">Route:</span> {trip.origin} → {trip.destination}
                      </div>
                    </div>
                  </div>

                  {/* Cancellation Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cancellation Reason *
                    </label>
                    <textarea
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Explain why this trip needs to be cancelled..."
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      required
                    />
                  </div>

                  {/* Create New Trip Option */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        checked={createNewTrip}
                        onChange={(e) => setCreateNewTrip(e.target.checked)}
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        Create new trip with different truck
                      </span>
                    </label>
                  </div>

                  {/* Truck Selection */}
                  {createNewTrip && (
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Select Replacement Truck</h4>
                      
                      {loading ? (
                        <div className="text-center py-4">
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <p className="mt-2 text-sm text-gray-600">Loading available trucks...</p>
                        </div>
                      ) : availableTrucks.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          No trucks available for reassignment
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {availableTrucks.map((truck) => (
                            <label
                              key={truck.id}
                              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedTruckId === truck.id.toString()
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              <input
                                type="radio"
                                name="selectedTruck"
                                value={truck.id}
                                checked={selectedTruckId === truck.id.toString()}
                                onChange={(e) => setSelectedTruckId(e.target.value)}
                                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              />
                              <div className="ml-3 flex items-center">
                                <TruckIcon className="h-5 w-5 text-gray-400 mr-2" />
                                <div>
                                  <div className="font-medium text-gray-900">
                                    Truck {truck.unit_number}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {truck.make} {truck.model} • {truck.license_plate}
                                  </div>
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Reassignment Summary */}
                      {selectedTruck && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center text-sm">
                            <span className="font-medium">{trip.truck_number}</span>
                            <ArrowRightIcon className="h-4 w-4 mx-2 text-gray-400" />
                            <span className="font-medium text-green-700">Truck {selectedTruck.unit_number}</span>
                          </div>
                          <p className="text-xs text-green-600 mt-1">
                            New trip will be created with same driver, route, and schedule
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      onClick={onClose}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          {createNewTrip ? 'Cancel & Reassign' : 'Cancel Trip'}
                        </div>
                      )}
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

export default CancelReassignTripModal;