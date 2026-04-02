import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom truck icons by status
const createTruckIcon = (status) => {
  const colors = {
    dispatched: '#6366f1', // indigo
    in_transit: '#eab308', // yellow
  };
  const color = colors[status] || '#3b82f6';

  return L.divIcon({
    className: 'custom-truck-marker',
    html: `<div style="
      background: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" width="18" height="18">
        <path d="M6.5 3c-1.051 0-2.093.04-3.22.12A1.612 1.612 0 002 4.72V10.5h3.5V8a.5.5 0 01.5-.5h2.5V3.462A41.012 41.012 0 006.5 3zM10 7.5V3.282a41.442 41.442 0 016.5.363A1.612 1.612 0 0118 5.265V10.5h-8V8a.5.5 0 00-.5-.5H10zM2 12v1.049C2 14.68 3.157 16 4.576 16h.424a3 3 0 016 0h.5a3 3 0 016 0h.5c.552 0 1-.45 1-1.005V12H2zm5.5 4a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm8 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
};

// Auto-fit bounds when load locations change
function FitBounds({ locations }) {
  const map = useMap();
  useEffect(() => {
    if (locations.length === 0) return;
    const validLocs = locations.filter(l => l.latitude && l.longitude);
    if (validLocs.length === 0) return;
    const bounds = L.latLngBounds(validLocs.map(l => [parseFloat(l.latitude), parseFloat(l.longitude)]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [locations, map]);
  return null;
}

function DispatchMap({ onSelectLoad }) {
  const { session, refreshAccessToken } = useSession();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/dispatch/map-locations/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      setLocations(res.data);
    } catch (error) {
      if (error.response?.status === 401) await refreshAccessToken();
    } finally {
      setLoading(false);
    }
  }, [session.accessToken]);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  // Auto-refresh every 90 seconds
  useEffect(() => {
    const interval = setInterval(fetchLocations, 90000);
    return () => clearInterval(interval);
  }, [fetchLocations]);

  const loadsWithLocation = locations.filter(l => l.latitude && l.longitude);
  const loadsWithoutLocation = locations.filter(l => !l.latitude || !l.longitude);

  const formatCurrency = (val) => {
    if (!val) return '—';
    return `$${parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all ${expanded ? 'h-[600px]' : 'h-80'}`}>
      {/* Map Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-700">Live Fleet Map</h3>
          <span className="text-xs text-gray-400">
            {loadsWithLocation.length} tracked · {loadsWithoutLocation.length} no GPS
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="flex items-center gap-3 mr-3">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Dispatched
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> In Transit
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
          <button
            onClick={fetchLocations}
            className="text-xs text-gray-500 hover:text-gray-700"
            title="Refresh locations"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Map */}
      {loading ? (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2" />
            <p className="text-sm text-gray-500">Loading map...</p>
          </div>
        </div>
      ) : loadsWithLocation.length === 0 ? (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center px-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-sm font-medium text-gray-500">No GPS data available</p>
            <p className="text-xs text-gray-400 mt-1">
              Connect an ELD integration to see live positions, or add check calls with coordinates.
            </p>
          </div>
        </div>
      ) : (
        <MapContainer
          center={[39.8283, -98.5795]} // Center of US
          zoom={5}
          className="h-full w-full"
          style={{ height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds locations={loadsWithLocation} />
          {loadsWithLocation.map(load => (
            <Marker
              key={load.load_id}
              position={[parseFloat(load.latitude), parseFloat(load.longitude)]}
              icon={createTruckIcon(load.status)}
            >
              <Popup>
                <div className="min-w-[200px]" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '14px' }}>{load.load_number}</strong>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: load.status === 'in_transit' ? '#fef3c7' : '#e0e7ff',
                      color: load.status === 'in_transit' ? '#92400e' : '#3730a3',
                    }}>
                      {load.status === 'in_transit' ? 'In Transit' : 'Dispatched'}
                    </span>
                  </div>
                  {load.customer_name && (
                    <p style={{ margin: '2px 0', fontSize: '12px', color: '#6b7280' }}>{load.customer_name}</p>
                  )}
                  <p style={{ margin: '4px 0', fontSize: '12px' }}>
                    {load.pickup_location_display} → {load.delivery_location_display}
                  </p>
                  {load.trip_driver_name && (
                    <p style={{ margin: '2px 0', fontSize: '12px', color: '#374151' }}>
                      🚛 {load.trip_driver_name}
                      {load.truck_unit_number && ` · ${load.truck_unit_number}`}
                    </p>
                  )}
                  {load.carrier_name && (
                    <p style={{ margin: '2px 0', fontSize: '12px', color: '#374151' }}>
                      Carrier: {load.carrier_name}
                    </p>
                  )}
                  {load.speed_mph && (
                    <p style={{ margin: '2px 0', fontSize: '11px', color: '#9ca3af' }}>
                      {parseFloat(load.speed_mph).toFixed(0)} mph
                      {load.location_updated_at && ` · ${new Date(load.location_updated_at).toLocaleTimeString()}`}
                    </p>
                  )}
                  <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#059669', fontWeight: 600 }}>{formatCurrency(load.total_revenue)}</span>
                    {load.current_eta && (
                      <span style={{ color: '#6b7280' }}>ETA: {new Date(load.current_eta).toLocaleDateString()}</span>
                    )}
                  </div>
                  {onSelectLoad && (
                    <button
                      onClick={() => onSelectLoad(load.load_id)}
                      style={{
                        marginTop: '8px',
                        width: '100%',
                        padding: '4px 0',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#2563eb',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      View Details
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}

export default DispatchMap;
