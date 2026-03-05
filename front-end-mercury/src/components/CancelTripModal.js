import React, { useState } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import { 
  Dialog,
  Transition 
} from '@headlessui/react';
import { Fragment } from 'react';
import { 
  ExclamationTriangleIcon,
  XCircleIcon 
} from '@heroicons/react/24/outline';

function CancelTripModal({ isOpen, onClose, trip, onTripCancelled }) {
  const { session } = useSession();
  const [cancellationReason, setCancellationReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!cancellationReason.trim()) {
      setError('Please provide a reason for cancelling this trip.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${BASE_URL}/api/trips/${trip.id}/cancel/`,
        {
          reason: cancellationReason
        },
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
          },
        }
      );

      // Call the parent callback to refresh trips list
      if (onTripCancelled) {
        onTripCancelled({
          message: response.data.message,
          cancelledTripId: response.data.cancelled_trip_id
        });
      }

      // Reset form and close modal
      setCancellationReason('');
      setError('');
      onClose();
      
    } catch (error) {
      console.error('Error cancelling trip:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('An error occurred while cancelling the trip. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCancellationReason('');
    setError('');
    onClose();
  };

  if (!trip) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={handleClose}>
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                  </div>
                  <Dialog.Title as="h3" className="text-lg font-medium text-gray-900">
                    Cancel Trip
                  </Dialog.Title>
                </div>

                {/* Trip Information */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Trip Number:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {trip.trip_number || `Trip #${trip.id}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Driver:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {trip.driver_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Route:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {trip.origin_display} → {trip.destination_display}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Status:</span>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {trip.status_display}
                      </span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label htmlFor="cancellationReason" className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Cancellation <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="cancellationReason"
                      name="cancellationReason"
                      rows={3}
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Please provide a reason for cancelling this trip..."
                      required
                    />
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex">
                        <XCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="ml-2 text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={handleClose}
                      disabled={loading}
                    >
                      Keep Trip
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Cancelling...
                        </>
                      ) : (
                        'Cancel Trip'
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

export default CancelTripModal;