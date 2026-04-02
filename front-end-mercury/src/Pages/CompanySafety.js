import React, { useState, useEffect } from 'react';
import { useSession } from '../providers/SessionProvider';
import axios from 'axios';
import BASE_URL from '../config';
import {
  ShieldCheckIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  WrenchScrewdriverIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const NATIONAL_AVG = { vehicle_oos: 20.72, driver_oos: 5.51 };

function pctColor(pct) {
  if (pct == null) return 'text-gray-400';
  if (pct >= 90) return 'text-green-600';
  if (pct >= 70) return 'text-yellow-600';
  return 'text-red-600';
}

function pctBg(pct) {
  if (pct == null) return 'bg-gray-100';
  if (pct >= 90) return 'bg-green-50 border-green-200';
  if (pct >= 70) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}

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

function authorityBadge(status) {
  const map = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-600',
    revoked: 'bg-red-100 text-red-800',
    not_authorized: 'bg-gray-100 text-gray-600',
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || map.not_authorized}`}>{status?.replace('_', ' ').toUpperCase() || 'N/A'}</span>;
}

function MetricCard({ label, value, total, pct, icon: Icon }) {
  return (
    <div className={`border rounded-lg p-4 ${pctBg(pct)}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {Icon && <Icon className="h-5 w-5 text-gray-400" />}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className={`text-2xl font-bold ${pctColor(pct)}`}>{pct != null ? `${pct}%` : '—'}</span>
          {total != null && <span className="text-xs text-gray-500 ml-2">{value}/{total}</span>}
        </div>
      </div>
      {pct != null && (
        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
          <div className={`h-1.5 rounded-full ${pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      )}
    </div>
  );
}

function CompanySafety() {
  const { session, refreshAccessToken } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState('');

  const fetchSafetyData = async (companyId) => {
    try {
      setLoading(true);
      setError(null);
      const url = companyId
        ? `${BASE_URL}/api/company-safety/?company_id=${companyId}`
        : `${BASE_URL}/api/company-safety/`;
      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      setData(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) return fetchSafetyData(companyId);
      }
      if (err.response?.status === 404) {
        setError('No company with DOT number found or company not set as asset/hybrid type.');
      } else {
        setError('Failed to load safety data. Please try again.');
      }
      console.error('Error fetching safety data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await axios.post(`${BASE_URL}/api/company-safety/refresh/`, 
        selectedCompany ? { company_id: selectedCompany } : {},
        { headers: { 'Authorization': `Bearer ${session.accessToken}` } }
      );
      await fetchSafetyData(selectedCompany);
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
    fetchSafetyData(selectedCompany);
  }, [selectedCompany]);

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading safety data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">FMCSA Safety Dashboard</h1>
          <p className="text-gray-600">Monitor your company's FMCSA and internal compliance data</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500 mb-3" />
          <h3 className="text-lg font-medium text-yellow-800 mb-1">No Safety Data Available</h3>
          <p className="text-sm text-yellow-700">{error}</p>
          <p className="text-sm text-gray-500 mt-2">
            Ensure your company has a USDOT number set and the company type is "Asset" or "Hybrid".
          </p>
        </div>
      </div>
    );
  }

  const fmcsa = data?.fmcsa;
  const compliance = data?.compliance;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">FMCSA Safety Dashboard</h1>
          <p className="text-gray-600">
            {data?.company_name || 'Company'} — DOT# {data?.dot_number || '—'}
            {data?.mc_number && <span className="ml-2">| MC# {data.mc_number}</span>}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh FMCSA Data'}
        </button>
      </div>

      {/* ── FMCSA Section ── */}
      {fmcsa ? (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <ShieldCheckIcon className="h-6 w-6 mr-2 text-blue-600" />
            FMCSA Federal Data
            <span className="ml-auto text-xs font-normal text-gray-500">
              Last fetched: {new Date(fmcsa.fetched_at).toLocaleString()}
            </span>
          </h2>

          {/* Top-level stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500 mb-1">Safety Rating</p>
              {safetyBadge(fmcsa.safety_rating)}
              {fmcsa.safety_rating_date && (
                <p className="text-xs text-gray-400 mt-1">Rated: {fmcsa.safety_rating_date}</p>
              )}
            </div>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500 mb-1">Authority Status</p>
              {authorityBadge(fmcsa.authority_status)}
              <div className="mt-1 text-xs text-gray-500 space-x-2">
                {fmcsa.common_authority && <span className="bg-blue-50 px-1 rounded">Common</span>}
                {fmcsa.contract_authority && <span className="bg-blue-50 px-1 rounded">Contract</span>}
                {fmcsa.broker_authority && <span className="bg-purple-50 px-1 rounded">Broker</span>}
              </div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500 mb-1">Fleet Size</p>
              <div className="flex items-baseline space-x-4">
                <div>
                  <span className="text-2xl font-bold text-gray-900">{fmcsa.total_power_units ?? '—'}</span>
                  <span className="text-xs text-gray-500 ml-1">units</span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-gray-900">{fmcsa.total_drivers ?? '—'}</span>
                  <span className="text-xs text-gray-500 ml-1">drivers</span>
                </div>
              </div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500 mb-1">Legal Name</p>
              <p className="text-sm font-medium text-gray-900">{fmcsa.legal_name || '—'}</p>
              {fmcsa.dba_name && <p className="text-xs text-gray-500">DBA: {fmcsa.dba_name}</p>}
              <p className="text-xs text-gray-500">{fmcsa.phy_city}{fmcsa.phy_state && `, ${fmcsa.phy_state}`}</p>
            </div>
          </div>

          {/* OOS Rates & Crashes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* OOS Rates */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Out-of-Service Rates</h3>
              <div className="space-y-3">
                <OosBar label="Vehicle OOS" rate={fmcsa.vehicle_oos_rate} inspections={fmcsa.vehicle_inspections_count} natAvg={NATIONAL_AVG.vehicle_oos} />
                <OosBar label="Driver OOS" rate={fmcsa.driver_oos_rate} inspections={fmcsa.driver_inspections_count} natAvg={NATIONAL_AVG.driver_oos} />
                {fmcsa.hazmat_oos_rate != null && (
                  <OosBar label="Hazmat OOS" rate={fmcsa.hazmat_oos_rate} natAvg={33.0} />
                )}
              </div>
            </div>

            {/* Crash Data */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Crash Summary (24 months)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-3xl font-bold text-gray-900">{fmcsa.total_crashes}</p>
                  <p className="text-xs text-gray-500">Total Crashes</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-3xl font-bold text-red-600">{fmcsa.fatal_crashes}</p>
                  <p className="text-xs text-gray-500">Fatal</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-3xl font-bold text-orange-600">{fmcsa.injury_crashes}</p>
                  <p className="text-xs text-gray-500">Injury</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-3xl font-bold text-yellow-700">{fmcsa.towaway_crashes}</p>
                  <p className="text-xs text-gray-500">Tow-Away</p>
                </div>
              </div>
            </div>
          </div>

          {/* Insurance */}
          <div className="bg-white border rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Insurance Filings on File with FMCSA</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InsuranceItem label="BIPD (Bodily Injury / Property Damage)" onFile={fmcsa.bipd_insurance_on_file} amount={fmcsa.bipd_insurance_amount} />
              <InsuranceItem label="Cargo Insurance" onFile={fmcsa.cargo_insurance_on_file} amount={fmcsa.cargo_insurance_amount} />
              <InsuranceItem label="Bond / Surety" onFile={fmcsa.bond_surety_on_file} />
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <InformationCircleIcon className="mx-auto h-10 w-10 text-gray-400 mb-2" />
          <p className="text-gray-600">No FMCSA data available yet. Click "Refresh FMCSA Data" to fetch.</p>
        </div>
      )}

      {/* ── Internal Compliance Section ── */}
      {compliance ? (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <ClipboardDocumentCheckIcon className="h-6 w-6 mr-2 text-green-600" />
            Internal Compliance Metrics
            <span className="ml-auto text-xs font-normal text-gray-500">
              Period: {compliance.period_start} — {compliance.period_end}
            </span>
          </h2>

          {/* Driver Compliance */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
              <UserGroupIcon className="h-5 w-5 mr-1 text-blue-500" /> Driver Compliance ({compliance.total_drivers} drivers)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="CDL Current" value={compliance.drivers_cdl_current} total={compliance.total_drivers} pct={compliance.cdl_compliance_pct} />
              <MetricCard label="Medical Cert" value={compliance.drivers_medical_current} total={compliance.total_drivers} pct={compliance.medical_compliance_pct} />
              <MetricCard label="MVR on File" value={compliance.drivers_mvr_current} total={compliance.total_drivers} pct={compliance.mvr_compliance_pct} />
              <MetricCard label="Drug Tests" value={compliance.drug_tests_compliant} total={compliance.drug_tests_required} pct={compliance.drug_test_compliance_pct} />
            </div>
          </div>

          {/* Vehicle Compliance */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
              <TruckIcon className="h-5 w-5 mr-1 text-indigo-500" /> Vehicle Compliance ({compliance.total_trucks} trucks, {compliance.total_trailers} trailers)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Annual Inspection" value={compliance.trucks_annual_inspection_current} total={compliance.total_trucks} pct={compliance.annual_inspection_pct} />
              <MetricCard label="Registration" value={compliance.trucks_registration_current} total={compliance.total_trucks} pct={compliance.registration_pct} />
              <MetricCard label="Insurance" value={compliance.trucks_insurance_current} total={compliance.total_trucks} pct={compliance.insurance_pct} />
              <div className="border rounded-lg p-4 bg-white">
                <p className="text-sm font-medium text-gray-700 mb-2">Vehicle Status</p>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-green-50 rounded p-2">
                    <p className="text-lg font-bold text-green-700">{compliance.vehicles_safe_status}</p>
                    <p className="text-gray-600">Safe</p>
                  </div>
                  <div className="bg-yellow-50 rounded p-2">
                    <p className="text-lg font-bold text-yellow-700">{compliance.vehicles_conditional_status}</p>
                    <p className="text-gray-600">Conditional</p>
                  </div>
                  <div className="bg-red-50 rounded p-2">
                    <p className="text-lg font-bold text-red-700">{compliance.vehicles_prohibited_status}</p>
                    <p className="text-gray-600">Prohibited</p>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-lg font-bold text-gray-700">{compliance.vehicles_oos_status}</p>
                    <p className="text-gray-600">OOS</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trip & Inspection Compliance */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
              <ClipboardDocumentCheckIcon className="h-5 w-5 mr-1 text-teal-500" /> Trip & Inspection ({compliance.total_trips} trips)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Pre-Trip Completed" value={compliance.trips_with_pre_trip} total={compliance.total_trips} pct={compliance.pre_trip_pct} />
              <MetricCard label="Post-Trip Completed" value={compliance.trips_with_post_trip} total={compliance.total_trips} pct={compliance.post_trip_pct} />
              <div className="border rounded-lg p-4 bg-white">
                <p className="text-sm font-medium text-gray-700 mb-2">Inspections</p>
                <p className="text-2xl font-bold text-gray-900">{compliance.total_inspections}</p>
                <p className="text-xs text-gray-500">{compliance.inspections_with_defects} with defects ({compliance.defect_rate}% defect rate)</p>
              </div>
              <div className="border rounded-lg p-4 bg-white">
                <p className="text-sm font-medium text-gray-700 mb-2">DVIR Review Rate</p>
                <p className="text-2xl font-bold text-gray-900">{compliance.dvir_review_rate}%</p>
              </div>
            </div>
          </div>

          {/* Maintenance & HOS */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
              <WrenchScrewdriverIcon className="h-5 w-5 mr-1 text-orange-500" /> Maintenance & HOS
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Maintenance On-Time" value={compliance.maintenance_on_time} total={compliance.maintenance_on_time + compliance.maintenance_overdue} pct={compliance.maintenance_on_time_pct} icon={WrenchScrewdriverIcon} />
              <div className="border rounded-lg p-4 bg-white">
                <p className="text-sm font-medium text-gray-700 mb-2">Overdue Work Orders</p>
                <p className={`text-2xl font-bold ${compliance.maintenance_overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>{compliance.maintenance_overdue}</p>
              </div>
              <div className="border rounded-lg p-4 bg-white">
                <p className="text-sm font-medium text-gray-700 mb-2">HOS Violations</p>
                <p className={`text-2xl font-bold ${compliance.hos_violations > 0 ? 'text-red-600' : 'text-green-600'}`}>{compliance.hos_violations}</p>
                <p className="text-xs text-gray-500">{compliance.total_hos_records} total HOS records</p>
              </div>
              <div className="border rounded-lg p-4 bg-white">
                <p className="text-sm font-medium text-gray-700 mb-2">Maintenance Cost</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${parseFloat(compliance.maintenance_total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <ClipboardDocumentCheckIcon className="mx-auto h-10 w-10 text-gray-400 mb-2" />
          <p className="text-gray-600">No internal compliance metrics computed yet. Data is generated nightly.</p>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function OosBar({ label, rate, inspections, natAvg }) {
  const r = parseFloat(rate);
  const aboveAvg = !isNaN(r) && r > natAvg;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span className={`font-medium ${isNaN(r) ? 'text-gray-400' : aboveAvg ? 'text-red-600' : 'text-green-600'}`}>
          {isNaN(r) ? '—' : `${r.toFixed(1)}%`}
          {!isNaN(r) && <span className="text-xs text-gray-400 ml-1">(nat. avg {natAvg}%)</span>}
        </span>
      </div>
      <div className="relative w-full bg-gray-200 rounded-full h-2">
        {!isNaN(r) && (
          <div className={`h-2 rounded-full ${aboveAvg ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(r, 100)}%` }} />
        )}
        {natAvg && (
          <div className="absolute top-0 h-2 border-l-2 border-gray-500" style={{ left: `${Math.min(natAvg, 100)}%` }} title={`National Average: ${natAvg}%`} />
        )}
      </div>
      {inspections != null && <p className="text-xs text-gray-400 mt-0.5">{inspections} inspections</p>}
    </div>
  );
}

function InsuranceItem({ label, onFile, amount }) {
  return (
    <div className="flex items-start space-x-2">
      {onFile ? (
        <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
      ) : (
        <XCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
      )}
      <div>
        <p className="text-sm text-gray-700">{label}</p>
        {onFile && amount && (
          <p className="text-xs text-gray-500">${parseFloat(amount).toLocaleString()}</p>
        )}
        {!onFile && <p className="text-xs text-red-500">Not on file</p>}
      </div>
    </div>
  );
}

export default CompanySafety;
