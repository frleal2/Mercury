import React, { useState, useEffect } from 'react';
import { TruckIcon, XMarkIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

const DispatchLoadModal = ({ isOpen, onClose, load, onDispatched }) => {
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
  const [driverActiveLoads, setDriverActiveLoads] = useState({});

  // Broker mode: load has a carrier assigned, so driver/truck are the carrier's responsibility
  const isBrokered = !!(load?.carrier || load?.carrier_name);

  useEffect(() => {
    if (isOpen && load && !isBrokered) {
      fetchResources();
    } else if (isOpen && isBrokered) {
      setFetchingData(false);
    }
  }, [isOpen, load]);

  const fetchResources = async () => {
    setFetchingData(true);
    try {
      const headers = { 'Authorization': `Bearer ${session.accessToken}` };
      const [driversRes, trucksRes, trailersRes, dispatchedRes, inTransitRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/drivers/`, { headers }),
        axios.get(`${BASE_URL}/api/trucks/`, { headers }),
        axios.get(`${BASE_URL}/api/trailers/`, { headers }),
        axios.get(`${BASE_URL}/api/loads/?status=dispatched`, { headers }),
        axios.get(`${BASE_URL}/api/loads/?status=in_transit`, { headers }),
      ]);
      // Filter by load's company
      const companyId = load.company;
      setDrivers(driversRes.data.filter(d => d.company === companyId || d.company?.id === companyId));
      setTrucks(trucksRes.data.filter(t => t.company === companyId || t.company?.id === companyId));
      setTrailers(trailersRes.data.filter(t => t.company === companyId || t.company?.id === companyId));

      // Build driver → active load count map
      const activeLoads = [...dispatchedRes.data, ...inTransitRes.data];
      const loadsByDriver = {};
      activeLoads.forEach(l => {
        if (l.trip_driver_id) {
          if (!loadsByDriver[l.trip_driver_id]) loadsByDriver[l.trip_driver_id] = [];
          loadsByDriver[l.trip_driver_id].push(l.load_number);
        }
      });
      setDriverActiveLoads(loadsByDriver);
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

  const handleDispatch = async () => {
    if (!isBrokered) {
      if (!selectedDriver) {
        setError('Please select a driver.');
        return;
      }
      if (!selectedTruck) {
        setError('A truck is required. Select a driver with an assigned truck or choose one manually.');
        return;
      }
    }
    setLoading(true);
    setError('');
    try {
      const payload = {};
      if (!isBrokered) {
        payload.driver_id = parseInt(selectedDriver);
        payload.truck_id = parseInt(selectedTruck);
        if (selectedTrailer) payload.trailer_id = parseInt(selectedTrailer);
      } else {
        payload.broker_dispatch = true;
      }

      const res = await axios.post(`${BASE_URL}/api/loads/${load.id}/dispatch/`, payload, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });
      onDispatched(res.data);
      handleClose();
    } catch (err) {
      console.error('Error dispatching load:', err);
      setError(err.response?.data?.error || 'Failed to dispatch load.');
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

  if (!load) return null;
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <TruckIcon className="h-6 w-6 mr-2 text-blue-600" />
              Dispatch Load
            </h3>
            <p className="text-sm text-gray-500 ml-8">
              {load.load_number} — {isBrokered ? 'Brokered to carrier' : 'Assign driver & equipment'}
            </p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-5">
                  {/* Load Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Load Summary</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Customer:</span>
                        <span className="ml-1 font-medium text-gray-900">{load.customer_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Equipment:</span>
                        <span className="ml-1 font-medium text-gray-900">{load.equipment_type_display}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Pickup:</span>
                        <span className="ml-1 font-medium text-gray-900">{load.pickup_location_display}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Delivery:</span>
                        <span className="ml-1 font-medium text-gray-900">{load.delivery_location_display}</span>
                      </div>
                      {load.pickup_date && (
                        <div>
                          <span className="text-gray-500">Pickup Date:</span>
                          <span className="ml-1 font-medium text-gray-900">
                            {new Date(load.pickup_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {load.customer_rate && (
                        <div>
                          <span className="text-gray-500">Rate:</span>
                          <span className="ml-1 font-medium text-green-700">
                            ${parseFloat(load.customer_rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isBrokered ? (
                    /* Broker dispatch mode */
                    <>
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <BuildingOfficeIcon className="h-5 w-5 text-indigo-600" />
                          <h4 className="text-sm font-semibold text-indigo-900">Brokered Load</h4>
                        </div>
                        <p className="text-sm text-indigo-800">
                          Carrier: <span className="font-medium">{load.carrier_name}</span>
                        </p>
                        <p className="text-xs text-indigo-600 mt-2">
                          The assigned carrier is responsible for driver and equipment. Dispatching will update the load status and notify the carrier.
                        </p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                        No trip will be created for brokered loads — the carrier manages their own execution.
                        Status syncs will need to be updated manually or via carrier check-calls.
                      </div>
                    </>
                  ) : (
                    /* Carrier/self-haul dispatch mode */
                    <>
                  {/* Driver Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Driver <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedDriver}
                      onChange={(e) => handleDriverChange(e.target.value)}
                      disabled={fetchingData}
                      className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Select a driver...</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.first_name} {d.last_name}{driverActiveLoads[d.id] ? ` ⚠ (${driverActiveLoads[d.id].length} active)` : ''}
                        </option>
                      ))}
                    </select>
                    {selectedDriver && driverActiveLoads[parseInt(selectedDriver)] && (
                      <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-amber-800">
                          ⚠ This driver has {driverActiveLoads[parseInt(selectedDriver)].length} active load{driverActiveLoads[parseInt(selectedDriver)].length > 1 ? 's' : ''}:
                        </p>
                        <ul className="mt-1 text-xs text-amber-700 list-disc list-inside">
                          {driverActiveLoads[parseInt(selectedDriver)].map(ln => (
                            <li key={ln}>{ln}</li>
                          ))}
                        </ul>
                        <p className="mt-1 text-xs text-amber-600">You can still dispatch, but verify the driver's availability.</p>
                      </div>
                    )}
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
                      className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                      className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                    Dispatching will create a Trip linked to this load. The trip will track inspections, DVIR compliance, and driver HOS.
                    Status syncs automatically: Trip starts → Load moves to In Transit. Trip completes → Load moves to Delivered.
                  </div>
                    </>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDispatch}
                    disabled={loading || fetchingData}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Dispatching...' : 'Dispatch Load'}
                  </button>
                </div>
      </div>
    </div>
  );
};

export default DispatchLoadModal;
