import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import {
  ShieldCheckIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const NATIONAL_AVG = { vehicle_oos: 20.72, driver_oos: 5.51 };

function safetyBadge(rating) {
  const map = {
    satisfactory: { bg: 'bg-green-100 text-green-800', label: 'Satisfactory' },
    conditional: { bg: 'bg-yellow-100 text-yellow-800', label: 'Conditional' },
    unsatisfactory: { bg: 'bg-red-100 text-red-800', label: 'Unsatisfactory' },
    not_rated: { bg: 'bg-gray-100 text-gray-600', label: 'Not Rated' },
  };
  const m = map[rating] || map.not_rated;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${m.bg}`}>{m.label}</span>;
}

export default function CarrierSafety({ carrierId }) {
  const { session, refreshAccessToken } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchSafety = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${BASE_URL}/api/carriers/${carrierId}/safety/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      setData(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) return fetchSafety();
      }
      if (err.response?.status === 404) {
        setError('No FMCSA data — carrier may not have a DOT number.');
      } else {
        setError('Failed to load safety data.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await axios.post(`${BASE_URL}/api/carriers/${carrierId}/safety/refresh/`, {}, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      await fetchSafety();
    } catch (err) {
      if (err.response?.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) return handleRefresh();
      }
      alert(err.response?.data?.error || 'Failed to refresh FMCSA data.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (carrierId) fetchSafety();
  }, [carrierId]);

  if (loading) {
    return (
      <div className="py-4 text-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-500 mt-1">Loading FMCSA data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-3 px-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-2">
        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-yellow-700">{error}</p>
          <button onClick={handleRefresh} className="text-xs text-blue-600 hover:text-blue-800 mt-1">
            Try fetching from FMCSA
          </button>
        </div>
      </div>
    );
  }

  const fmcsa = data?.fmcsa;

  if (!fmcsa) {
    return (
      <div className="py-3 px-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <InformationCircleIcon className="mx-auto h-8 w-8 text-gray-400 mb-1" />
        <p className="text-sm text-gray-600">No FMCSA data available</p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
        >
          <ArrowPathIcon className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Fetching...' : 'Fetch from FMCSA'}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-800 flex items-center">
          <ShieldCheckIcon className="h-5 w-5 mr-1 text-blue-600" />
          FMCSA Federal Data
        </h4>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center"
        >
          <ArrowPathIcon className={`h-3.5 w-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Safety Rating & Authority */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-50 rounded p-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Safety Rating</p>
          {safetyBadge(fmcsa.safety_rating)}
        </div>
        <div className="bg-gray-50 rounded p-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Authority</p>
          <span className={`text-xs font-medium ${fmcsa.authority_status === 'active' ? 'text-green-700' : 'text-red-600'}`}>
            {fmcsa.authority_status?.replace('_', ' ').toUpperCase()}
          </span>
          <div className="mt-0.5 text-xs text-gray-500 space-x-1">
            {fmcsa.common_authority && <span className="bg-blue-50 px-1 rounded">Common</span>}
            {fmcsa.contract_authority && <span className="bg-blue-50 px-1 rounded">Contract</span>}
            {fmcsa.broker_authority && <span className="bg-purple-50 px-1 rounded">Broker</span>}
          </div>
        </div>
      </div>

      {/* Fleet & Legal */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-50 rounded p-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Fleet Size</p>
          <p className="text-sm text-gray-900">{fmcsa.total_power_units ?? '—'} units, {fmcsa.total_drivers ?? '—'} drivers</p>
        </div>
        <div className="bg-gray-50 rounded p-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Legal Name</p>
          <p className="text-sm text-gray-900 truncate">{fmcsa.legal_name || '—'}</p>
          {fmcsa.dba_name && <p className="text-xs text-gray-500 truncate">DBA: {fmcsa.dba_name}</p>}
        </div>
      </div>

      {/* OOS Rates */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-700 mb-2">Out-of-Service Rates</p>
        <OosRow label="Vehicle" rate={fmcsa.vehicle_oos_rate} natAvg={NATIONAL_AVG.vehicle_oos} />
        <OosRow label="Driver" rate={fmcsa.driver_oos_rate} natAvg={NATIONAL_AVG.driver_oos} />
      </div>

      {/* Crashes */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-700 mb-2">Crashes (24 months)</p>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-gray-50 rounded p-2">
            <p className="font-bold text-gray-900">{fmcsa.total_crashes}</p>
            <p className="text-gray-500">Total</p>
          </div>
          <div className="bg-red-50 rounded p-2">
            <p className="font-bold text-red-700">{fmcsa.fatal_crashes}</p>
            <p className="text-gray-500">Fatal</p>
          </div>
          <div className="bg-orange-50 rounded p-2">
            <p className="font-bold text-orange-700">{fmcsa.injury_crashes}</p>
            <p className="text-gray-500">Injury</p>
          </div>
          <div className="bg-yellow-50 rounded p-2">
            <p className="font-bold text-yellow-700">{fmcsa.towaway_crashes}</p>
            <p className="text-gray-500">Tow-Away</p>
          </div>
        </div>
      </div>

      {/* Insurance */}
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2">Insurance on File</p>
        <div className="space-y-1">
          <InsRow label="BIPD" onFile={fmcsa.bipd_insurance_on_file} amount={fmcsa.bipd_insurance_amount} />
          <InsRow label="Cargo" onFile={fmcsa.cargo_insurance_on_file} amount={fmcsa.cargo_insurance_amount} />
          <InsRow label="Bond/Surety" onFile={fmcsa.bond_surety_on_file} />
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3">Last fetched: {new Date(fmcsa.fetched_at).toLocaleString()}</p>
    </div>
  );
}

function OosRow({ label, rate, natAvg }) {
  const r = parseFloat(rate);
  const above = !isNaN(r) && r > natAvg;
  return (
    <div className="flex items-center justify-between text-xs mb-1">
      <span className="text-gray-600">{label}</span>
      <span className={`font-medium ${isNaN(r) ? 'text-gray-400' : above ? 'text-red-600' : 'text-green-600'}`}>
        {isNaN(r) ? '—' : `${r.toFixed(1)}%`}
        <span className="text-gray-400 ml-1">(avg {natAvg}%)</span>
      </span>
    </div>
  );
}

function InsRow({ label, onFile, amount }) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      {onFile ? <CheckCircleIcon className="h-4 w-4 text-green-500" /> : <XCircleIcon className="h-4 w-4 text-red-400" />}
      <span className="text-gray-700">{label}</span>
      {onFile && amount && <span className="text-gray-500">${parseFloat(amount).toLocaleString()}</span>}
    </div>
  );
}
