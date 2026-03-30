import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

const ReassignDispatchModal = ({ isOpen, onClose, load, trip, onReassigned }) => {
  const { session, refreshAccessToken } = useSession();
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [trailers, setTrailers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedTruck, setSelectedTruck] = useState('');
  const [selectedTrailer, setSelectedTrailer] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState('');

  // Determine the load ID and company from either prop
  const loadId = load?.id;
  const companyId = load?.company || trip?.company;

  useEffect(() => {
    if (isOpen && (load || trip)) {
      fetchResources();
    }
  }, [isOpen, load, trip]);

  const fetchResources = async () => {
    setFetchingData(true);
    try {
      const [driversRes, trucksRes, trailersRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/drivers/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        }),
        axios.get(`${BASE_URL}/api/trucks/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        }),
        axios.get(`${BASE_URL}/api/trailers/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        }),
      ]);
      const cid = companyId;
      setDrivers(driversRes.data.filter(d => d.company === cid || d.company?.id === cid));
      setTrucks(trucksRes.data.filter(t => t.company === cid || t.company?.id === cid));
      setTrailers(trailersRes.data.filter(t => t.company === cid || t.company?.id === cid));

      // Pre-select current assignment
      if (trip) {
        setSelectedDriver(trip.driver?.toString() || '');
        setSelectedTruck(trip.truck?.toString() || '');
        setSelectedTrailer(trip.trailer?.toString() || '');
      } else if (load?.trip_id) {
        // If opened from load context, we may have trip driver/truck info embedded
        // The load serializer doesn't return trip.driver_id directly, so leave blank
        // and user picks new assignment
      }
    } catch (err) {
      console.error('Error fetching resources:', err);
      if (err.response?.status === 401) await refreshAccessToken();
    } finally {
      setFetchingData(false);
    }
  };

  const handleDriverChange = (driverId) => {
    setSelectedDriver(driverId);
    setError('');
    if (!driverId) {
      setSelectedTruck('');
      setSelectedTrailer('');
      return;
    }
    const driver = drivers.find(d => d.id === parseInt(driverId));
    if (driver) {
      const assignedTruck = trucks.find(t => t.driver === driver.id || t.driver?.id === driver.id);
      if (assignedTruck) {
        setSelectedTruck(assignedTruck.id.toString());
        const assignedTrailer = trailers.find(tr => tr.truck === assignedTruck.id || tr.truck?.id === assignedTruck.id);
        setSelectedTrailer(assignedTrailer ? assignedTrailer.id.toString() : '');
      } else {
        setSelectedTruck('');
        setSelectedTrailer('');
      }
    }
  };

  const handleReassign = async () => {
    if (!selectedDriver) {
      setError('Please select a driver.');
      return;
    }
    if (!selectedTruck) {
      setError('A truck is required. Select a driver with an assigned truck or choose one manually.');
      return;
    }
    if (!loadId) {
      setError('No load associated with this trip.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        driver_id: parseInt(selectedDriver),
        truck_id: parseInt(selectedTruck),
      };
      if (selectedTrailer) payload.trailer_id = parseInt(selectedTrailer);

      const res = await axios.post(`${BASE_URL}/api/loads/${loadId}/reassign/`, payload, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });
      onReassigned(res.data);
      handleClose();
    } catch (err) {
      console.error('Error reassigning load:', err);
      setError(err.response?.data?.error || 'Failed to reassign. Please try again.');
      if (err.response?.status === 401) await refreshAccessToken();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedDriver('');
    setSelectedTruck('');
    setSelectedTrailer('');
    setError('');
    onClose();
  };

  const displayTitle = load?.load_number || (trip?.load_number ? trip.load_number : trip?.trip_number);
  const currentDriverName = load?.trip_driver_name || trip?.driver_name || 'Unknown';

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative w-full max-w-lg transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all">
                {/* Header */}
                <div className="bg-amber-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ArrowPathIcon className="h-6 w-6 text-amber-200" />
                      <div>
                        <Dialog.Title className="text-lg font-semibold text-white">Reassign Driver & Equipment</Dialog.Title>
                        <p className="text-sm text-amber-200">{displayTitle} — Currently: {currentDriverName}</p>
                      </div>
                    </div>
                    <button onClick={handleClose} className="text-amber-200 hover:text-white">
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* Current Assignment Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Current Assignment</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Driver:</span>
                        <span className="ml-1 font-medium text-gray-900">{currentDriverName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Truck:</span>
                        <span className="ml-1 font-medium text-gray-900">
                          {load?.trip_truck_unit_number || trip?.truck_unit_number || '—'}
                        </span>
                      </div>
                      {(load?.pickup_location_display || trip?.origin_display) && (
                        <div>
                          <span className="text-gray-500">Route:</span>
                          <span className="ml-1 font-medium text-gray-900">
                            {load?.pickup_location_display || trip?.origin_display} → {load?.delivery_location_display || trip?.destination_display}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span className="ml-1 font-medium text-gray-900">
                          {load?.status_display || trip?.status_display || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Driver Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Driver <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedDriver}
                      onChange={(e) => handleDriverChange(e.target.value)}
                      disabled={fetchingData}
                      className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-amber-500 focus:ring-amber-500"
                    >
                      <option value="">Select a driver...</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.first_name} {d.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Truck */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Truck <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedTruck}
                      onChange={(e) => { setSelectedTruck(e.target.value); setError(''); }}
                      disabled={fetchingData}
                      className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-amber-500 focus:ring-amber-500"
                    >
                      <option value="">Select a truck...</option>
                      {trucks.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.unit_number} — {t.make} {t.model}
                        </option>
                      ))}
                    </select>
                    {selectedDriver && !selectedTruck && (
                      <p className="mt-1 text-xs text-amber-600">No truck auto-assigned. Please select one manually.</p>
                    )}
                  </div>

                  {/* Trailer */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trailer (optional)</label>
                    <select
                      value={selectedTrailer}
                      onChange={(e) => setSelectedTrailer(e.target.value)}
                      disabled={fetchingData}
                      className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-amber-500 focus:ring-amber-500"
                    >
                      <option value="">None</option>
                      {trailers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.unit_number} — {t.trailer_type || 'Standard'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Info box */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                    This will update the driver, truck, and trailer on the linked trip. The load status and trip status remain unchanged.
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReassign}
                    disabled={loading || fetchingData}
                    className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50"
                  >
                    {loading ? 'Reassigning...' : 'Reassign'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ReassignDispatchModal;
