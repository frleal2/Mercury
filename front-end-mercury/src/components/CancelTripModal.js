import React, { useState } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import { 
  ExclamationTriangleIcon,
  XCircleIcon,
  XMarkIcon
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 xl:w-1/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 mr-2 text-red-600" />
            Cancel Trip
          </h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
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

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      onClick={handleClose}
                      disabled={loading}
                    >
                      Keep Trip
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>
    </div>
  );
}

export default CancelTripModal;