import React, { useState, useEffect, useRef } from 'react';
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
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';

const NATIONAL_AVG = { vehicle_oos: 20.72, driver_oos: 5.51 };

/* ── Tooltip component ── */
function Tooltip({ text }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <span className="relative inline-flex ml-1" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-gray-400 hover:text-gray-600 focus:outline-none"
        aria-label="More info"
      >
        <InformationCircleIcon className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-white" />
        </div>
      )}
    </span>
  );
}

/* ── Trend arrow ── */
function TrendIndicator({ current, previous }) {
  if (current == null || previous == null) return null;
  const delta = Math.round((current - previous) * 10) / 10;
  if (delta === 0) return <span className="text-xs text-gray-400 ml-1">— no change</span>;
  const isUp = delta > 0;
  return (
    <span className={`inline-flex items-center text-xs ml-1.5 ${isUp ? 'text-green-600' : 'text-red-600'}`}>
      {isUp
        ? <ArrowTrendingUpIcon className="h-3.5 w-3.5 mr-0.5" />
        : <ArrowTrendingDownIcon className="h-3.5 w-3.5 mr-0.5" />}
      {isUp ? '+' : ''}{delta}%
    </span>
  );
}

/* ── Attention banner — collects risks from FMCSA + compliance data ── */
function AttentionBanner({ fmcsa, compliance }) {
  const alerts = [];

  // FMCSA-sourced alerts
  if (fmcsa) {
    if (fmcsa.safety_rating === 'conditional')
      alerts.push({ severity: 'warning', text: 'Safety rating is Conditional — deficiencies found during last DOT review.' });
    if (fmcsa.safety_rating === 'unsatisfactory')
      alerts.push({ severity: 'critical', text: 'Safety rating is Unsatisfactory — immediate corrective action required.' });
    if (fmcsa.authority_status === 'revoked')
      alerts.push({ severity: 'critical', text: 'Operating authority has been REVOKED.' });
    if (fmcsa.authority_status === 'inactive')
      alerts.push({ severity: 'warning', text: 'Operating authority is inactive.' });

    const vOos = parseFloat(fmcsa.vehicle_oos_rate);
    if (!isNaN(vOos) && vOos > NATIONAL_AVG.vehicle_oos)
      alerts.push({ severity: 'warning', text: `Vehicle OOS rate (${vOos.toFixed(1)}%) exceeds national average (${NATIONAL_AVG.vehicle_oos}%). Increases audit risk.` });
    const dOos = parseFloat(fmcsa.driver_oos_rate);
    if (!isNaN(dOos) && dOos > NATIONAL_AVG.driver_oos)
      alerts.push({ severity: 'warning', text: `Driver OOS rate (${dOos.toFixed(1)}%) exceeds national average (${NATIONAL_AVG.driver_oos}%). Increases audit risk.` });

    if (fmcsa.fatal_crashes > 0)
      alerts.push({ severity: 'critical', text: `${fmcsa.fatal_crashes} fatal crash(es) in past 24 months.` });

    if (!fmcsa.bipd_insurance_on_file)
      alerts.push({ severity: 'critical', text: 'BIPD insurance not on file with FMCSA.' });
    if (!fmcsa.cargo_insurance_on_file)
      alerts.push({ severity: 'warning', text: 'Cargo insurance not on file with FMCSA.' });
  }

  // Internal compliance alerts
  if (compliance) {
    const lowThreshold = 70;
    const checks = [
      { pct: compliance.cdl_compliance_pct, label: 'CDL compliance' },
      { pct: compliance.medical_compliance_pct, label: 'Medical cert compliance' },
      { pct: compliance.mvr_compliance_pct, label: 'MVR compliance' },
      { pct: compliance.annual_inspection_pct, label: 'Annual inspection compliance' },
      { pct: compliance.registration_pct, label: 'Vehicle registration' },
      { pct: compliance.insurance_pct, label: 'Vehicle insurance' },
      { pct: compliance.pre_trip_pct, label: 'Pre-trip inspection completion' },
      { pct: compliance.post_trip_pct, label: 'Post-trip inspection completion' },
    ];
    checks.forEach(({ pct, label }) => {
      if (pct != null && pct < lowThreshold)
        alerts.push({ severity: 'warning', text: `${label} is at ${pct}% — below 70% target.` });
    });

    if (compliance.maintenance_overdue > 0)
      alerts.push({ severity: 'warning', text: `${compliance.maintenance_overdue} overdue maintenance work order(s).` });
    if (compliance.hos_violations > 0)
      alerts.push({ severity: 'warning', text: `${compliance.hos_violations} HOS violation(s) detected in this period.` });
    if (compliance.vehicles_prohibited_status > 0)
      alerts.push({ severity: 'critical', text: `${compliance.vehicles_prohibited_status} vehicle(s) in Prohibited status.` });
    if (compliance.vehicles_oos_status > 0)
      alerts.push({ severity: 'critical', text: `${compliance.vehicles_oos_status} vehicle(s) currently Out of Service.` });
  }

  if (alerts.length === 0) return null;

  const criticals = alerts.filter(a => a.severity === 'critical');
  const warnings = alerts.filter(a => a.severity === 'warning');

  return (
    <div className="mb-6 border rounded-lg overflow-hidden">
      <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center">
        <BellAlertIcon className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
        <h3 className="text-sm font-semibold text-red-800">
          Attention Needed — {alerts.length} issue{alerts.length !== 1 ? 's' : ''} found
        </h3>
      </div>
      <div className="px-4 py-3 space-y-1.5 bg-white">
        {criticals.map((a, i) => (
          <div key={`c-${i}`} className="flex items-start space-x-2 text-sm">
            <XCircleIcon className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="text-red-700">{a.text}</span>
          </div>
        ))}
        {warnings.map((a, i) => (
          <div key={`w-${i}`} className="flex items-start space-x-2 text-sm">
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            <span className="text-yellow-800">{a.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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

function MetricCard({ label, value, total, pct, icon: Icon, trend, tooltip }) {
  return (
    <div className={`border rounded-lg p-4 ${pctBg(pct)}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {label}
          {tooltip && <Tooltip text={tooltip} />}
        </span>
        {Icon && <Icon className="h-5 w-5 text-gray-400" />}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className={`text-2xl font-bold ${pctColor(pct)}`}>{pct != null ? `${pct}%` : '—'}</span>
          {total != null && <span className="text-xs text-gray-500 ml-2">{value}/{total}</span>}
          {trend != null && <TrendIndicator current={pct} previous={trend} />}
        </div>
      </div>
      {pct != null && (
        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
          <div className={`h-1.5 rounded-full ${pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      )}
      {pct != null && (
        <p className="text-xs text-gray-400 mt-1">Target: ≥ 90%</p>
      )}
    </div>
  );
}

function CompanySafety() {
  const { session, refreshAccessToken } = useSession();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState(null); // previous period metrics for trends
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
      // Backend returns a list of companies — take the first one
      const results = response.data;
      if (Array.isArray(results) && results.length > 0) {
        setData(results[0]);
      } else if (Array.isArray(results) && results.length === 0) {
        setError('No company with DOT number found or company not set as asset/hybrid type.');
      } else {
        // Single object response
        setData(results);
      }
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

  // Fetch previous-period compliance metrics for trend comparison
  const fetchHistory = async (companyId) => {
    try {
      const url = companyId
        ? `${BASE_URL}/api/company-safety/metrics/history/?company_id=${companyId}&limit=2`
        : `${BASE_URL}/api/company-safety/metrics/history/?limit=2`;
      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      // results[0] = current, results[1] = previous period
      const results = response.data;
      if (Array.isArray(results) && results.length >= 2) {
        setHistory(results[1]); // previous period
      } else {
        setHistory(null);
      }
    } catch {
      // Non-critical — trends just won't show
      setHistory(null);
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
      await fetchHistory(selectedCompany);
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
    fetchHistory(selectedCompany);
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
  const prev = history; // previous period for trend comparison

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

      {/* ── Attention Banner ── */}
      <AttentionBanner fmcsa={fmcsa} compliance={compliance} />

      {/* ── FMCSA Section ── */}
      {fmcsa ? (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <ShieldCheckIcon className="h-6 w-6 mr-2 text-blue-600" />
            FMCSA Federal Data
            <Tooltip text="Federal data sourced from the FMCSA QCMobile API. This reflects your carrier profile in the national SAFER system and is used by DOT officers during roadside inspections and compliance reviews." />
            <span className="ml-auto text-xs font-normal text-gray-500">
              Last fetched: {new Date(fmcsa.fetched_at).toLocaleString()}
            </span>
          </h2>

          {/* Top-level stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500 mb-1">
                Safety Rating
                <Tooltip text="Assigned by FMCSA after a Compliance Review (CR). 'Satisfactory' means no critical violations. 'Conditional' means deficiencies were found. 'Unsatisfactory' requires immediate corrective action or face an operations out-of-service order." />
              </p>
              {safetyBadge(fmcsa.safety_rating)}
              {fmcsa.safety_rating_date && (
                <p className="text-xs text-gray-400 mt-1">Rated: {fmcsa.safety_rating_date}</p>
              )}
            </div>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500 mb-1">
                Authority Status
                <Tooltip text="Your operating authority from FMCSA. 'Active' means you are authorized to operate. Inactive or revoked authority means you cannot legally operate as a for-hire carrier." />
              </p>
              {authorityBadge(fmcsa.authority_status)}
              <div className="mt-1 text-xs text-gray-500 space-x-2">
                {fmcsa.common_authority && <span className="bg-blue-50 px-1 rounded">Common</span>}
                {fmcsa.contract_authority && <span className="bg-blue-50 px-1 rounded">Contract</span>}
                {fmcsa.broker_authority && <span className="bg-purple-50 px-1 rounded">Broker</span>}
              </div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500 mb-1">
                Fleet Size
                <Tooltip text="Number of power units and drivers registered with FMCSA on your MCS-150 form. Update your MCS-150 biennially to keep this current." />
              </p>
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
              <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center">
                Out-of-Service Rates
                <Tooltip text="Percentage of roadside inspections where a vehicle or driver was placed out of service for safety violations. Rates above the national average increase your likelihood of being selected for a FMCSA compliance intervention or audit." />
              </h3>
              <p className="text-xs text-gray-400 mb-3">Dashed line = national average. Red = above average.</p>
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
              <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center">
                Crash Summary (24 months)
                <Tooltip text="DOT-reportable crashes involving a fatality, bodily injury requiring immediate medical treatment away from the scene, or a tow-away of any vehicle. These counts do not indicate fault." />
              </h3>
              <p className="text-xs text-gray-400 mb-3">DOT-reportable crashes only. Does not imply fault.</p>
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
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
              Insurance Filings on File with FMCSA
              <Tooltip text="Insurance filings reported to FMCSA by your insurance provider. BIPD minimum is $750,000 for general freight carriers ($1M+ for hazmat). Missing filings can result in authority revocation." />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InsuranceItem label="BIPD (Bodily Injury / Property Damage)" onFile={fmcsa.bipd_insurance_on_file} amount={fmcsa.bipd_insurance_amount} required={750000} />
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
            <Tooltip text="Aggregated from your Fleetly data (drivers, vehicles, trips, maintenance). Computed nightly. Green ≥ 90%, Yellow ≥ 70%, Red < 70%. Arrows show change vs. previous period." />
            <span className="ml-auto text-xs font-normal text-gray-500">
              Period: {compliance.period_start} — {compliance.period_end}
            </span>
          </h2>

          {/* Driver Compliance */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
              <UserGroupIcon className="h-5 w-5 mr-1 text-blue-500" /> Driver Compliance ({compliance.total_drivers} drivers)
              <Tooltip text="Tracks CDL expiration, medical certificate validity, annual MVR reviews, and drug/alcohol testing compliance per FMCSA Part 382/391 requirements." />
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="CDL Current" value={compliance.drivers_cdl_current} total={compliance.total_drivers} pct={compliance.cdl_compliance_pct} trend={prev?.cdl_compliance_pct} tooltip="Percentage of active drivers with a non-expired CDL on file." />
              <MetricCard label="Medical Cert" value={compliance.drivers_medical_current} total={compliance.total_drivers} pct={compliance.medical_compliance_pct} trend={prev?.medical_compliance_pct} tooltip="Drivers with a valid medical examiner's certificate (DOT physical) per 49 CFR 391.45." />
              <MetricCard label="MVR on File" value={compliance.drivers_mvr_current} total={compliance.total_drivers} pct={compliance.mvr_compliance_pct} trend={prev?.mvr_compliance_pct} tooltip="Annual Motor Vehicle Record review required per 49 CFR 391.25." />
              <MetricCard label="Drug Tests" value={compliance.drug_tests_compliant} total={compliance.drug_tests_required} pct={compliance.drug_test_compliance_pct} trend={prev?.drug_test_compliance_pct} tooltip="Compliance with DOT drug & alcohol testing program per 49 CFR Part 382." />
            </div>
          </div>

          {/* Vehicle Compliance */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
              <TruckIcon className="h-5 w-5 mr-1 text-indigo-500" /> Vehicle Compliance ({compliance.total_trucks} trucks, {compliance.total_trailers} trailers)
              <Tooltip text="Tracks annual inspections (49 CFR 396.17), vehicle registration, and insurance currency for your fleet." />
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Annual Inspection" value={compliance.trucks_annual_inspection_current} total={compliance.total_trucks} pct={compliance.annual_inspection_pct} trend={prev?.annual_inspection_pct} tooltip="Vehicles with a current annual inspection per 49 CFR 396.17 (valid for 14 months)." />
              <MetricCard label="Registration" value={compliance.trucks_registration_current} total={compliance.total_trucks} pct={compliance.registration_pct} trend={prev?.registration_pct} tooltip="Vehicles with non-expired registration." />
              <MetricCard label="Insurance" value={compliance.trucks_insurance_current} total={compliance.total_trucks} pct={compliance.insurance_pct} trend={prev?.insurance_pct} tooltip="Vehicles with current insurance coverage on file." />
              <div className="border rounded-lg p-4 bg-white">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Vehicle Status
                  <Tooltip text="Current operational status per 49 CFR 396.7. 'Prohibited' and 'OOS' vehicles cannot be operated until defects are repaired." />
                </p>
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
              <Tooltip text="Pre-trip and post-trip DVIR (Driver Vehicle Inspection Report) completion rates per 49 CFR 396.11-396.13." />
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Pre-Trip Completed" value={compliance.trips_with_pre_trip} total={compliance.total_trips} pct={compliance.pre_trip_pct} trend={prev?.pre_trip_pct} tooltip="Trips where drivers completed a pre-trip vehicle inspection before departure." />
              <MetricCard label="Post-Trip Completed" value={compliance.trips_with_post_trip} total={compliance.total_trips} pct={compliance.post_trip_pct} trend={prev?.post_trip_pct} tooltip="Trips where drivers completed a post-trip vehicle inspection at destination." />
              <div className="border rounded-lg p-4 bg-white">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Inspections
                  <Tooltip text="Total roadside and facility inspections recorded, with defect rate. Lower defect rates indicate better vehicle maintenance." />
                </p>
                <p className="text-2xl font-bold text-gray-900">{compliance.total_inspections}</p>
                <p className="text-xs text-gray-500">{compliance.inspections_with_defects} with defects ({compliance.defect_rate}% defect rate)</p>
              </div>
              <div className="border rounded-lg p-4 bg-white">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  DVIR Review Rate
                  <Tooltip text="Percentage of DVIRs that have been reviewed and signed off by a supervisor, as required per 49 CFR 396.13." />
                </p>
                <p className="text-2xl font-bold text-gray-900">{compliance.dvir_review_rate}%</p>
              </div>
            </div>
          </div>

          {/* Maintenance & HOS */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
              <WrenchScrewdriverIcon className="h-5 w-5 mr-1 text-orange-500" /> Maintenance & HOS
              <Tooltip text="Preventive maintenance schedule adherence and Hours of Service compliance. HOS violations are flagged when driving time exceeds 11 hours per day (49 CFR 395.3)." />
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Maintenance On-Time" value={compliance.maintenance_on_time} total={compliance.maintenance_on_time + compliance.maintenance_overdue} pct={compliance.maintenance_on_time_pct} icon={WrenchScrewdriverIcon} trend={prev?.maintenance_on_time_pct} tooltip="Work orders completed on or before their scheduled date." />
              <div className="border rounded-lg p-4 bg-white">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Overdue Work Orders
                  <Tooltip text="Maintenance work orders past their scheduled date. Overdue maintenance increases breakdown and violation risk." />
                </p>
                <p className={`text-2xl font-bold ${compliance.maintenance_overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>{compliance.maintenance_overdue}</p>
              </div>
              <div className="border rounded-lg p-4 bg-white">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  HOS Violations
                  <Tooltip text="Instances where a driver exceeded the 11-hour daily driving limit per 49 CFR 395.3. Violations can result in fines and CSA points." />
                </p>
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
          <div className="absolute top-0 h-2 border-l-2 border-dashed border-gray-600" style={{ left: `${Math.min(natAvg, 100)}%` }} title={`National Average: ${natAvg}%`} />
        )}
      </div>
      {inspections != null && <p className="text-xs text-gray-400 mt-0.5">{inspections} inspections</p>}
      {!isNaN(r) && aboveAvg && (
        <p className="text-xs text-red-500 mt-0.5">Above national average — higher intervention risk</p>
      )}
    </div>
  );
}

function InsuranceItem({ label, onFile, amount, required }) {
  const amt = amount ? parseFloat(amount) : null;
  const belowMin = required && amt && amt < required;
  return (
    <div className="flex items-start space-x-2">
      {onFile ? (
        <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
      ) : (
        <XCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
      )}
      <div>
        <p className="text-sm text-gray-700">{label}</p>
        {onFile && amt && (
          <p className={`text-xs ${belowMin ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
            ${amt.toLocaleString()}
            {required && (
              <span className="text-gray-400 ml-1">(min: ${required.toLocaleString()})</span>
            )}
          </p>
        )}
        {!onFile && <p className="text-xs text-red-500">Not on file</p>}
      </div>
    </div>
  );
}

export default CompanySafety;
