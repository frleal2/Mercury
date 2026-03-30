import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import {
  MapPinIcon,
  ClockIcon,
  PhoneIcon,
  TruckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  ClipboardDocumentListIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';

const EVENT_ICONS = {
  created: ClipboardDocumentListIcon,
  booked: ClipboardDocumentListIcon,
  dispatched: TruckIcon,
  driver_assigned: TruckIcon,
  carrier_assigned: TruckIcon,
  picked_up: CheckCircleIcon,
  in_transit: TruckIcon,
  check_call: PhoneIcon,
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

const EVENT_COLORS = {
  created: 'bg-gray-100 text-gray-600',
  booked: 'bg-blue-100 text-blue-600',
  dispatched: 'bg-indigo-100 text-indigo-600',
  picked_up: 'bg-green-100 text-green-600',
  in_transit: 'bg-yellow-100 text-yellow-600',
  check_call: 'bg-purple-100 text-purple-600',
  eta_updated: 'bg-cyan-100 text-cyan-600',
  arrived_delivery: 'bg-emerald-100 text-emerald-600',
  delivered: 'bg-green-100 text-green-700',
  pod_received: 'bg-teal-100 text-teal-600',
  invoiced: 'bg-sky-100 text-sky-600',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
  delay: 'bg-orange-100 text-orange-600',
  issue: 'bg-red-100 text-red-600',
};

const CHECK_CALL_TYPES = [
  { value: 'location_update', label: 'Location Update' },
  { value: 'eta_update', label: 'ETA Update' },
  { value: 'pickup_arrived', label: 'Arrived at Pickup' },
  { value: 'pickup_completed', label: 'Pickup Completed' },
  { value: 'delivery_arrived', label: 'Arrived at Delivery' },
  { value: 'delivery_completed', label: 'Delivery Completed' },
  { value: 'delay', label: 'Delay Report' },
  { value: 'issue', label: 'Issue Report' },
  { value: 'other', label: 'Other' },
];

const LoadTracking = ({ loadId, load }) => {
  const { session } = useSession();
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCheckCallForm, setShowCheckCallForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [checkCallData, setCheckCallData] = useState({
    load: loadId,
    call_type: 'location_update',
    location: '',
    eta: '',
    notes: '',
  });

  const headers = { Authorization: `Bearer ${session.accessToken}` };

  const fetchTimeline = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/loads/${loadId}/tracking/`, { headers });
      setTimeline(response.data);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  }, [loadId, session.accessToken]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const handleSubmitCheckCall = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await axios.post(`${BASE_URL}/api/check-calls/`, checkCallData, { headers });
      setCheckCallData({ load: loadId, call_type: 'location_update', location: '', eta: '', notes: '' });
      setShowCheckCallForm(false);
      fetchTimeline();
    } catch (error) {
      console.error('Error submitting check call:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendTrackingLink = async () => {
    try {
      setSendingLink(true);
      await axios.post(`${BASE_URL}/api/loads/${loadId}/send-tracking-link/`, {}, { headers });
      setLinkSent(true);
      setTimeout(() => setLinkSent(false), 5000);
    } catch (error) {
      console.error('Error sending tracking link:', error);
    } finally {
      setSendingLink(false);
    }
  };

  const copyTrackingToken = () => {
    if (timeline?.tracking_token) {
      navigator.clipboard.writeText(timeline.tracking_token);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-sm text-gray-500">Loading tracking data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tracking Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Last Known Location</p>
          <p className="text-sm font-medium text-gray-900">
            {timeline?.last_known_location || 'No updates yet'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Current ETA</p>
          <p className="text-sm font-medium text-gray-900">
            {timeline?.current_eta
              ? new Date(timeline.current_eta).toLocaleString()
              : 'Not set'}
          </p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowCheckCallForm(!showCheckCallForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          <PhoneIcon className="h-4 w-4" />
          Log Check Call
        </button>
        <button
          onClick={handleSendTrackingLink}
          disabled={sendingLink}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
          {sendingLink ? 'Sending...' : linkSent ? 'Sent!' : 'Send Tracking Link'}
        </button>
        <button
          onClick={copyTrackingToken}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          title="Copy tracking token"
        >
          <LinkIcon className="h-4 w-4" />
          Copy Token
        </button>
      </div>

      {/* Check Call Form */}
      {showCheckCallForm && (
        <form onSubmit={handleSubmitCheckCall} className="bg-blue-50 rounded-lg p-4 space-y-3 border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-800">New Check Call</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                value={checkCallData.call_type}
                onChange={(e) => setCheckCallData(prev => ({ ...prev, call_type: e.target.value }))}
                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {CHECK_CALL_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={checkCallData.location}
                onChange={(e) => setCheckCallData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Memphis, TN"
                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">ETA (optional)</label>
            <input
              type="datetime-local"
              value={checkCallData.eta}
              onChange={(e) => setCheckCallData(prev => ({ ...prev, eta: e.target.value }))}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={checkCallData.notes}
              onChange={(e) => setCheckCallData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              placeholder="Additional details..."
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCheckCallForm(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Submit Check Call'}
            </button>
          </div>
        </form>
      )}

      {/* Timeline */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Tracking Timeline</h4>
        {timeline?.events?.length > 0 ? (
          <div className="flow-root">
            <ul className="-mb-8">
              {timeline.events.map((event, idx) => {
                const Icon = EVENT_ICONS[event.event_type] || ClipboardDocumentListIcon;
                const colorClass = EVENT_COLORS[event.event_type] || 'bg-gray-100 text-gray-600';
                const isLast = idx === timeline.events.length - 1;
                return (
                  <li key={event.id}>
                    <div className="relative pb-8">
                      {!isLast && (
                        <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                      )}
                      <div className="relative flex items-start space-x-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">{event.event_type_display}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(event.created_at).toLocaleString()}
                            </p>
                          </div>
                          {event.description && (
                            <p className="mt-0.5 text-sm text-gray-600">{event.description}</p>
                          )}
                          {event.location && (
                            <p className="mt-0.5 text-xs text-gray-500 flex items-center gap-1">
                              <MapPinIcon className="h-3 w-3" /> {event.location}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">by {event.created_by_name}</p>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">No tracking events yet.</p>
        )}
      </div>

      {/* Check Calls History */}
      {timeline?.check_calls?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Check Call History</h4>
          <div className="space-y-2">
            {timeline.check_calls.map(call => (
              <div key={call.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <PhoneIcon className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{call.call_type_display}</p>
                    <p className="text-xs text-gray-500">{new Date(call.created_at).toLocaleString()}</p>
                  </div>
                  {call.location && <p className="text-sm text-gray-600">{call.location}</p>}
                  {call.eta && <p className="text-xs text-gray-500">ETA: {new Date(call.eta).toLocaleString()}</p>}
                  {call.notes && <p className="text-sm text-gray-600 mt-1">{call.notes}</p>}
                  <p className="text-xs text-gray-400">{call.created_by_name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadTracking;
