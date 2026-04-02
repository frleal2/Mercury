import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import { Fragment } from 'react';
import {
  Cog6ToothIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  LinkIcon,
  XMarkIcon,
  SignalIcon,
  TruckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const PROVIDERS = [
  {
    key: 'motive',
    name: 'Motive',
    subtitle: 'Formerly KeepTruckin',
    description: 'Live GPS tracking, HOS logs, DVIRs, and engine diagnostics.',
    color: 'blue',
    logo: '🔵',
    features: ['Live GPS Tracking', 'HOS Duty Status', 'DVIRs', 'Fault Codes', 'IFTA'],
  },
  {
    key: 'samsara',
    name: 'Samsara',
    subtitle: 'Connected Operations',
    description: 'Real-time GPS, HOS, route tracking, temperature monitoring.',
    color: 'green',
    logo: '🟢',
    features: ['Live GPS Tracking', 'HOS Duty Status', 'Route History', 'Temperature', 'Dash Cam'],
  },
  {
    key: 'geotab',
    name: 'Geotab',
    subtitle: 'Fleet Telematics',
    description: 'GPS tracking, engine diagnostics, driver behavior scoring.',
    color: 'purple',
    logo: '🟣',
    features: ['Live GPS Tracking', 'Engine Data', 'Driver Scoring', 'Fuel Usage'],
    comingSoon: true,
  },
];

const STATUS_STYLES = {
  connected: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon, label: 'Connected' },
  disconnected: { bg: 'bg-gray-100', text: 'text-gray-600', icon: LinkIcon, label: 'Disconnected' },
  error: { bg: 'bg-red-100', text: 'text-red-800', icon: ExclamationTriangleIcon, label: 'Error' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Cog6ToothIcon, label: 'Pending Setup' },
};

function Integrations() {
  const { session, refreshAccessToken } = useSession();
  const [providers, setProviders] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [setupModal, setSetupModal] = useState(null); // provider key
  const [detailModal, setDetailModal] = useState(null); // provider obj

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [provRes, compRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/eld-providers/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` },
        }),
        axios.get(`${BASE_URL}/api/companies/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` },
        }),
      ]);
      setProviders(provRes.data);
      setCompanies(compRes.data);
    } catch (error) {
      if (error.response?.status === 401) await refreshAccessToken();
    } finally {
      setLoading(false);
    }
  }, [session.accessToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getProviderConnection = (providerKey) => {
    return providers.find(p => p.provider === providerKey);
  };

  const handleDisconnect = async (providerId) => {
    if (!window.confirm('Disconnect this integration? Location syncing will stop.')) return;
    try {
      await axios.delete(`${BASE_URL}/api/eld-providers/${providerId}/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      fetchData();
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <p className="ml-3 text-gray-600">Loading integrations...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connect your ELD provider to enable live GPS tracking, automatic HOS syncing, and more.
        </p>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PROVIDERS.map(prov => {
          const connection = getProviderConnection(prov.key);
          const isConnected = connection?.status === 'connected';
          const statusStyle = connection ? STATUS_STYLES[connection.status] : null;

          return (
            <div
              key={prov.key}
              className={`bg-white rounded-xl border-2 transition-all ${
                isConnected ? 'border-green-300 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              } ${prov.comingSoon ? 'opacity-60' : 'cursor-pointer'}`}
              onClick={() => {
                if (prov.comingSoon) return;
                if (connection) {
                  setDetailModal(connection);
                } else {
                  setSetupModal(prov.key);
                }
              }}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{prov.logo}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{prov.name}</h3>
                      <p className="text-xs text-gray-500">{prov.subtitle}</p>
                    </div>
                  </div>
                  {prov.comingSoon && (
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
                      Coming Soon
                    </span>
                  )}
                  {statusStyle && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                      <statusStyle.icon className="h-3.5 w-3.5" />
                      {statusStyle.label}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4">{prov.description}</p>

                {/* Features */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {prov.features.map(f => (
                    <span key={f} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                      {f}
                    </span>
                  ))}
                </div>

                {/* Stats for connected providers */}
                {connection && (
                  <div className="border-t border-gray-100 pt-3 flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <TruckIcon className="h-3.5 w-3.5" />
                      {connection.vehicle_mapping_count} vehicles
                    </span>
                    <span className="flex items-center gap-1">
                      <UserGroupIcon className="h-3.5 w-3.5" />
                      {connection.driver_mapping_count} drivers
                    </span>
                    {connection.last_sync_at && (
                      <span className="flex items-center gap-1">
                        <SignalIcon className="h-3.5 w-3.5" />
                        Last sync: {new Date(connection.last_sync_at).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )}

                {/* CTA */}
                <div className="mt-4">
                  {prov.comingSoon ? (
                    <div className="text-center text-sm text-gray-400 py-2">Not available yet</div>
                  ) : connection ? (
                    <button className="w-full py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                      Manage Integration
                    </button>
                  ) : (
                    <button className="w-full py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Setup Modal */}
      <SetupIntegrationModal
        isOpen={!!setupModal}
        providerKey={setupModal}
        companies={companies}
        onClose={() => setSetupModal(null)}
        onCreated={() => { setSetupModal(null); fetchData(); }}
        session={session}
      />

      {/* Detail / Manage Modal */}
      <ManageIntegrationModal
        isOpen={!!detailModal}
        provider={detailModal}
        onClose={() => setDetailModal(null)}
        onUpdated={() => { setDetailModal(null); fetchData(); }}
        onDisconnect={(id) => { setDetailModal(null); handleDisconnect(id); }}
        session={session}
      />
    </div>
  );
}


/* ─── Setup New Integration Modal ──────────────────────────────────────────── */

function SetupIntegrationModal({ isOpen, providerKey, companies, onClose, onCreated, session }) {
  const [selectedCompany, setSelectedCompany] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState(null);

  const providerInfo = PROVIDERS.find(p => p.key === providerKey);

  useEffect(() => {
    if (isOpen) {
      setApiKey('');
      setSelectedCompany(companies.length === 1 ? String(companies[0].id) : '');
      setError('');
      setTestResult(null);
    }
  }, [isOpen, companies]);

  const handleTestConnection = async () => {
    if (!apiKey.trim()) { setError('API key is required'); return; }
    if (!selectedCompany) { setError('Select a company'); return; }
    setTesting(true);
    setError('');
    setTestResult(null);
    try {
      // Create the provider first, then test
      const createRes = await axios.post(`${BASE_URL}/api/eld-providers/`, {
        company: parseInt(selectedCompany),
        provider: providerKey,
        api_key: apiKey.trim(),
      }, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });

      const testRes = await axios.post(
        `${BASE_URL}/api/eld-providers/${createRes.data.id}/test_connection/`,
        {},
        { headers: { 'Authorization': `Bearer ${session.accessToken}` } }
      );

      if (testRes.data.connected) {
        setTestResult('success');
        // Auto-sync assets
        await axios.post(
          `${BASE_URL}/api/eld-providers/${createRes.data.id}/sync_assets/`,
          {},
          { headers: { 'Authorization': `Bearer ${session.accessToken}` } }
        );
        onCreated();
      } else {
        setTestResult('failed');
        setError(testRes.data.error || 'Connection test failed');
        // Clean up the failed provider
        await axios.delete(`${BASE_URL}/api/eld-providers/${createRes.data.id}/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` },
        });
      }
    } catch (err) {
      setTestResult('failed');
      setError(err.response?.data?.error || err.response?.data?.detail || 'Connection failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-gray-500/75" />
        </TransitionChild>
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <DialogPanel className="w-full max-w-md transform rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <DialogTitle className="text-lg font-semibold text-gray-900">
                    Connect {providerInfo?.name}
                  </DialogTitle>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <p className="text-sm text-gray-500 mb-6">
                  Enter your {providerInfo?.name} API key to connect. You can find this in your {providerInfo?.name} dashboard under Settings → API Keys.
                </p>

                {/* Company selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select company...</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* API Key */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* Test result */}
                {testResult === 'success' && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5" />
                    Connected successfully! Vehicles and drivers have been synced.
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTestConnection}
                    disabled={testing || !apiKey.trim() || !selectedCompany}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {testing ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Connect & Sync'
                    )}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}


/* ─── Manage Existing Integration Modal ────────────────────────────────────── */

function ManageIntegrationModal({ isOpen, provider, onClose, onUpdated, onDisconnect, session }) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (isOpen && provider) {
      // Fetch full detail with mappings
      axios.get(`${BASE_URL}/api/eld-providers/${provider.id}/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      }).then(res => setDetail(res.data)).catch(() => {});
    } else {
      setDetail(null);
      setSyncResult(null);
    }
  }, [isOpen, provider, session.accessToken]);

  const handleSyncAssets = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await axios.post(
        `${BASE_URL}/api/eld-providers/${provider.id}/sync_assets/`,
        {},
        { headers: { 'Authorization': `Bearer ${session.accessToken}` } }
      );
      setSyncResult(res.data);
      // Refresh detail
      const detailRes = await axios.get(`${BASE_URL}/api/eld-providers/${provider.id}/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      setDetail(detailRes.data);
    } catch (err) {
      setSyncResult({ error: 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncLocations = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(
        `${BASE_URL}/api/eld-providers/${provider.id}/sync_locations/`,
        {},
        { headers: { 'Authorization': `Bearer ${session.accessToken}` } }
      );
      setSyncResult(res.data);
    } catch (err) {
      setSyncResult({ error: 'Location sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  const providerInfo = PROVIDERS.find(p => p.key === provider?.provider);

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-gray-500/75" />
        </TransitionChild>
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <DialogPanel className="w-full max-w-lg transform rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <span className="text-2xl">{providerInfo?.logo}</span>
                    {providerInfo?.name} Integration
                  </DialogTitle>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Status & Company */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{provider?.company_name}</p>
                      <p className="text-xs text-gray-500">
                        Connected {provider?.created_at ? new Date(provider.created_at).toLocaleDateString() : ''}
                      </p>
                    </div>
                    {provider && STATUS_STYLES[provider.status] && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[provider.status].bg} ${STATUS_STYLES[provider.status].text}`}>
                        {STATUS_STYLES[provider.status].label}
                      </span>
                    )}
                  </div>
                  {provider?.last_error && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                      {provider.last_error}
                    </div>
                  )}
                </div>

                {/* Mapped Assets */}
                {detail && (
                  <div className="mb-4 space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Synced Assets</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <TruckIcon className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-lg font-bold text-blue-900">{detail.vehicle_mappings?.length || 0}</p>
                            <p className="text-xs text-blue-600">Vehicles Mapped</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-indigo-50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <UserGroupIcon className="h-5 w-5 text-indigo-600" />
                          <div>
                            <p className="text-lg font-bold text-indigo-900">{detail.driver_mappings?.length || 0}</p>
                            <p className="text-xs text-indigo-600">Drivers Mapped</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle list */}
                    {detail.vehicle_mappings?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Vehicle Mappings</p>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {detail.vehicle_mappings.map(vm => (
                            <div key={vm.id} className="flex items-center justify-between text-xs bg-white border rounded px-2 py-1.5">
                              <span className="font-medium text-gray-900">{vm.truck_unit_number}</span>
                              <span className="text-gray-400">↔</span>
                              <span className="text-gray-600">{vm.external_vehicle_name || vm.external_vehicle_id}</span>
                              {vm.auto_matched && <span className="ml-1 text-green-600 text-[10px]">Auto</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Sync Result */}
                {syncResult && !syncResult.error && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    {syncResult.locations_synced !== undefined
                      ? `Synced ${syncResult.locations_synced} locations from ${syncResult.total_from_provider} vehicles.`
                      : `Found ${syncResult.vehicles_found} vehicles (${syncResult.vehicles_matched} matched), ${syncResult.drivers_found} drivers (${syncResult.drivers_matched} matched).`
                    }
                  </div>
                )}
                {syncResult?.error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {syncResult.error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 mt-6">
                  <div className="flex gap-2">
                    <button
                      onClick={handleSyncAssets}
                      disabled={syncing}
                      className="flex-1 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <ArrowPathIcon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                      Sync Vehicles & Drivers
                    </button>
                    <button
                      onClick={handleSyncLocations}
                      disabled={syncing}
                      className="flex-1 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <SignalIcon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                      Sync Locations Now
                    </button>
                  </div>
                  <button
                    onClick={() => onDisconnect(provider.id)}
                    className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                  >
                    Disconnect Integration
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default Integrations;
