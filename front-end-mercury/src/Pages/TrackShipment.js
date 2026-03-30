import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import BASE_URL from '../config';
import {
  MagnifyingGlassIcon,
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';

const EVENT_ICONS = {
  created: ClipboardDocumentListIcon,
  booked: ClipboardDocumentListIcon,
  dispatched: TruckIcon,
  picked_up: CheckCircleIcon,
  in_transit: TruckIcon,
  check_call: MapPinIcon,
  eta_updated: ClockIcon,
  arrived_delivery: MapPinIcon,
  delivered: CheckCircleIcon,
  pod_received: ClipboardDocumentListIcon,
  invoiced: ClipboardDocumentListIcon,
  paid: CheckCircleIcon,
  cancelled: ExclamationTriangleIcon,
  delay: ExclamationTriangleIcon,
  issue: ExclamationTriangleIcon,
};

const STATUS_COLORS = {
  quoted: 'bg-purple-100 text-purple-800',
  booked: 'bg-blue-100 text-blue-800',
  dispatched: 'bg-indigo-100 text-indigo-800',
  in_transit: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-green-100 text-green-800',
  invoiced: 'bg-teal-100 text-teal-800',
  paid: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

const TrackShipment = () => {
  const { token: urlToken } = useParams();
  const [token, setToken] = useState(urlToken || '');
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTracking = async (trackingToken) => {
    if (!trackingToken.trim()) return;
    try {
      setLoading(true);
      setError('');
      setShipment(null);
      const response = await axios.get(`${BASE_URL}/api/tracking/${trackingToken.trim()}/`);
      setShipment(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Shipment not found. Please check your tracking token.');
      } else {
        setError('Unable to load tracking information. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlToken) {
      fetchTracking(urlToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlToken]);

  const handleTrack = async (e) => {
    e.preventDefault();
    fetchTracking(token);
  };

  const getProgressStep = (status) => {
    const steps = ['booked', 'dispatched', 'in_transit', 'delivered'];
    const idx = steps.indexOf(status);
    return idx >= 0 ? idx : status === 'paid' || status === 'invoiced' ? 3 : -1;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600">
        <div className="max-w-3xl mx-auto px-4 py-8 text-center">
          <TruckIcon className="h-12 w-12 text-white mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white">Track Your Shipment</h1>
          <p className="mt-2 text-blue-100">Enter your tracking token to view real-time shipment updates</p>
        </div>
      </div>

      {/* Search Form */}
      <div className="max-w-3xl mx-auto px-4 -mt-6">
        <form onSubmit={handleTrack} className="bg-white rounded-lg shadow-md p-4 flex gap-3">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter tracking token..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Tracking...' : 'Track'}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        </div>
      )}

      {/* Results */}
      {shipment && (
        <div className="max-w-3xl mx-auto px-4 mt-6 pb-12 space-y-4">
          {/* Shipment Summary Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CubeIcon className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Load {shipment.load_number}</h2>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[shipment.status] || 'bg-gray-100 text-gray-800'}`}>
                {shipment.status_display}
              </span>
            </div>

            {/* Route */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <p className="text-xs text-gray-500">Origin</p>
                <p className="text-sm font-medium text-gray-900">{shipment.pickup_location_display || 'TBD'}</p>
                {shipment.pickup_date && (
                  <p className="text-xs text-gray-500">{new Date(shipment.pickup_date).toLocaleDateString()}</p>
                )}
              </div>
              <div className="flex-shrink-0 text-gray-300">→</div>
              <div className="flex-1 text-right">
                <p className="text-xs text-gray-500">Destination</p>
                <p className="text-sm font-medium text-gray-900">{shipment.delivery_location_display || 'TBD'}</p>
                {shipment.delivery_date && (
                  <p className="text-xs text-gray-500">{new Date(shipment.delivery_date).toLocaleDateString()}</p>
                )}
              </div>
            </div>

            {/* Last Location + ETA */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Last Known Location</p>
                <p className="text-sm font-medium text-gray-900">{shipment.last_known_location || 'No updates yet'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Current ETA</p>
                <p className="text-sm font-medium text-gray-900">
                  {shipment.current_eta ? new Date(shipment.current_eta).toLocaleString() : 'Not set'}
                </p>
              </div>
            </div>

            {/* Reference Info */}
            <div className="mt-3 flex gap-4 text-xs text-gray-500">
              {shipment.customer_reference && <span>Ref: {shipment.customer_reference}</span>}
              {shipment.bol_number && <span>BOL: {shipment.bol_number}</span>}
              {shipment.commodity && <span>Commodity: {shipment.commodity}</span>}
              {shipment.equipment_type_display && <span>Equipment: {shipment.equipment_type_display}</span>}
            </div>

            {/* Progress Bar */}
            {shipment.status !== 'cancelled' && (
              <div className="mt-4">
                <div className="flex justify-between mb-1">
                  {['Booked', 'Dispatched', 'In Transit', 'Delivered'].map((label, idx) => (
                    <span key={label} className={`text-xs font-medium ${
                      idx <= getProgressStep(shipment.status) ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      {label}
                    </span>
                  ))}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(((getProgressStep(shipment.status) + 1) / 4) * 100, 5)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tracking Events Timeline */}
          {shipment.tracking_events?.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Shipment Updates</h3>
              <div className="flow-root">
                <ul className="-mb-8">
                  {shipment.tracking_events.map((event, idx) => {
                    const Icon = EVENT_ICONS[event.event_type] || ClipboardDocumentListIcon;
                    const isLast = idx === shipment.tracking_events.length - 1;
                    return (
                      <li key={event.id}>
                        <div className="relative pb-8">
                          {!isLast && (
                            <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                          )}
                          <div className="relative flex items-start space-x-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900">{event.event_type_display}</p>
                                <p className="text-xs text-gray-500">{new Date(event.created_at).toLocaleString()}</p>
                              </div>
                              {event.description && (
                                <p className="mt-0.5 text-sm text-gray-600">{event.description}</p>
                              )}
                              {event.location && (
                                <p className="mt-0.5 text-xs text-gray-500 flex items-center gap-1">
                                  <MapPinIcon className="h-3 w-3" /> {event.location}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackShipment;
