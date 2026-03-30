import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import AddRateLane from '../components/AddRateLane';
import EditRateLane from '../components/EditRateLane';
import AddAccessorial from '../components/AddAccessorial';
import EditAccessorial from '../components/EditAccessorial';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  TruckIcon,
  FireIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const TABS = [
  { key: 'lanes', label: 'Rate Lanes', icon: MapPinIcon },
  { key: 'accessorials', label: 'Accessorials', icon: CurrencyDollarIcon },
  { key: 'fuel', label: 'Fuel Surcharges', icon: FireIcon },
];

const EQUIPMENT_TYPE_LABELS = {
  dry_van: 'Dry Van', reefer: 'Reefer', flatbed: 'Flatbed', step_deck: 'Step Deck',
  lowboy: 'Lowboy', tanker: 'Tanker', power_only: 'Power Only', box_truck: 'Box Truck',
  hotshot: 'Hotshot', other: 'Other',
};

function RateManagement() {
  const { session } = useSession();
  const [activeTab, setActiveTab] = useState('lanes');
  const [rateLanes, setRateLanes] = useState([]);
  const [accessorials, setAccessorials] = useState([]);
  const [fuelSchedules, setFuelSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isAddLaneOpen, setIsAddLaneOpen] = useState(false);
  const [editLaneId, setEditLaneId] = useState(null);
  const [isAddAccessorialOpen, setIsAddAccessorialOpen] = useState(false);
  const [editAccessorialId, setEditAccessorialId] = useState(null);
  const [isAddFuelOpen, setIsAddFuelOpen] = useState(false);
  const [editFuelId, setEditFuelId] = useState(null);

  // Fuel form state (inline for simplicity — it's a small form)
  const [fuelForm, setFuelForm] = useState({
    name: '', base_fuel_price: '', surcharge_per_gallon_increment: '0.01',
    surcharge_rate_per_mile: '0.01', current_fuel_price: '', effective_date: '',
    expiration_date: '', notes: '', active: true,
  });

  const headers = { 'Authorization': `Bearer ${session.accessToken}` };

  const fetchRateLanes = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/rate-lanes/`, { headers });
      setRateLanes(res.data);
    } catch (e) { console.error('Error fetching rate lanes:', e); }
  }, [session.accessToken]);

  const fetchAccessorials = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/accessorial-charges/`, { headers });
      setAccessorials(res.data);
    } catch (e) { console.error('Error fetching accessorials:', e); }
  }, [session.accessToken]);

  const fetchFuelSchedules = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/fuel-surcharge-schedules/`, { headers });
      setFuelSchedules(res.data);
    } catch (e) { console.error('Error fetching fuel schedules:', e); }
  }, [session.accessToken]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchRateLanes(), fetchAccessorials(), fetchFuelSchedules()]);
      setLoading(false);
    };
    fetchAll();
  }, [fetchRateLanes, fetchAccessorials, fetchFuelSchedules]);

  const handleDelete = async (type, id) => {
    if (!window.confirm('Are you sure you want to delete this?')) return;
    try {
      const endpoints = {
        lane: 'rate-lanes', accessorial: 'accessorial-charges', fuel: 'fuel-surcharge-schedules',
      };
      await axios.delete(`${BASE_URL}/api/${endpoints[type]}/${id}/`, { headers });
      if (type === 'lane') fetchRateLanes();
      else if (type === 'accessorial') fetchAccessorials();
      else fetchFuelSchedules();
    } catch (e) { console.error('Error deleting:', e); }
  };

  // Fuel surcharge CRUD (inline — small form)
  const handleFuelSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...fuelForm };
      if (!payload.expiration_date) delete payload.expiration_date;
      if (!payload.current_fuel_price) delete payload.current_fuel_price;
      if (editFuelId) {
        await axios.put(`${BASE_URL}/api/fuel-surcharge-schedules/${editFuelId}/`, payload, { headers });
      } else {
        await axios.post(`${BASE_URL}/api/fuel-surcharge-schedules/`, payload, { headers });
      }
      setIsAddFuelOpen(false);
      setEditFuelId(null);
      setFuelForm({ name: '', base_fuel_price: '', surcharge_per_gallon_increment: '0.01', surcharge_rate_per_mile: '0.01', current_fuel_price: '', effective_date: '', expiration_date: '', notes: '', active: true });
      fetchFuelSchedules();
    } catch (e) { console.error('Error saving fuel schedule:', e); }
  };

  const openEditFuel = (schedule) => {
    setFuelForm({
      name: schedule.name, base_fuel_price: schedule.base_fuel_price,
      surcharge_per_gallon_increment: schedule.surcharge_per_gallon_increment,
      surcharge_rate_per_mile: schedule.surcharge_rate_per_mile,
      current_fuel_price: schedule.current_fuel_price || '',
      effective_date: schedule.effective_date, expiration_date: schedule.expiration_date || '',
      notes: schedule.notes, active: schedule.active,
    });
    setEditFuelId(schedule.id);
    setIsAddFuelOpen(true);
  };

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '—';
    return `$${parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filter rate lanes
  const filteredLanes = rateLanes.filter(lane => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return lane.origin_city?.toLowerCase().includes(t) || lane.origin_state?.toLowerCase().includes(t) ||
      lane.destination_city?.toLowerCase().includes(t) || lane.destination_state?.toLowerCase().includes(t) ||
      lane.customer_name?.toLowerCase().includes(t) || lane.equipment_type_display?.toLowerCase().includes(t);
  });

  const filteredAccessorials = accessorials.filter(a => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return a.name?.toLowerCase().includes(t) || a.code?.toLowerCase().includes(t) || a.description?.toLowerCase().includes(t);
  });

  // Stats
  const activeLanes = rateLanes.filter(l => l.active && !l.is_expired);
  const expiredLanes = rateLanes.filter(l => l.is_expired);
  const activeAccessorials = accessorials.filter(a => a.active);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading rate management...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rate Management</h1>
        <p className="text-sm text-gray-500">Manage lane rates, accessorial charges, and fuel surcharges</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <MapPinIcon className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500">Active Lanes</p>
              <p className="text-2xl font-bold text-gray-900">{activeLanes.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-500">Expired Lanes</p>
              <p className="text-2xl font-bold text-yellow-600">{expiredLanes.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-gray-500">Accessorial Types</p>
              <p className="text-2xl font-bold text-gray-900">{activeAccessorials.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <FireIcon className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-gray-500">Fuel Schedules</p>
              <p className="text-2xl font-bold text-gray-900">{fuelSchedules.filter(f => f.active).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex border-b border-gray-200">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSearchTerm(''); }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
          </div>
          <button
            onClick={() => {
              if (activeTab === 'lanes') setIsAddLaneOpen(true);
              else if (activeTab === 'accessorials') setIsAddAccessorialOpen(true);
              else {
                setFuelForm({ name: '', base_fuel_price: '', surcharge_per_gallon_increment: '0.01', surcharge_rate_per_mile: '0.01', current_fuel_price: '', effective_date: '', expiration_date: '', notes: '', active: true });
                setEditFuelId(null);
                setIsAddFuelOpen(true);
              }
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add {activeTab === 'lanes' ? 'Rate Lane' : activeTab === 'accessorials' ? 'Accessorial' : 'Fuel Schedule'}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'lanes' && (
        <RateLanesTable
          lanes={filteredLanes}
          onEdit={setEditLaneId}
          onDelete={(id) => handleDelete('lane', id)}
          formatCurrency={formatCurrency}
        />
      )}

      {activeTab === 'accessorials' && (
        <AccessorialsTable
          accessorials={filteredAccessorials}
          onEdit={setEditAccessorialId}
          onDelete={(id) => handleDelete('accessorial', id)}
          formatCurrency={formatCurrency}
        />
      )}

      {activeTab === 'fuel' && (
        <>
          <FuelSchedulesTable
            schedules={fuelSchedules}
            onEdit={openEditFuel}
            onDelete={(id) => handleDelete('fuel', id)}
            formatCurrency={formatCurrency}
          />
          {/* Inline Fuel Schedule Form */}
          {isAddFuelOpen && (
            <div className="mt-4 bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editFuelId ? 'Edit Fuel Schedule' : 'Add Fuel Schedule'}
              </h3>
              <form onSubmit={handleFuelSubmit} className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input type="text" required value={fuelForm.name} onChange={e => setFuelForm({...fuelForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g., Standard Fuel Schedule 2025" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Fuel Price ($/gal)</label>
                  <input type="number" step="0.001" required value={fuelForm.base_fuel_price} onChange={e => setFuelForm({...fuelForm, base_fuel_price: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g., 3.500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current DOE Price ($/gal)</label>
                  <input type="number" step="0.001" value={fuelForm.current_fuel_price} onChange={e => setFuelForm({...fuelForm, current_fuel_price: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g., 3.850" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Increment ($/gal)</label>
                  <input type="number" step="0.001" required value={fuelForm.surcharge_per_gallon_increment} onChange={e => setFuelForm({...fuelForm, surcharge_per_gallon_increment: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Surcharge Rate ($/mi per step)</label>
                  <input type="number" step="0.001" required value={fuelForm.surcharge_rate_per_mile} onChange={e => setFuelForm({...fuelForm, surcharge_rate_per_mile: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
                  <input type="date" required value={fuelForm.effective_date} onChange={e => setFuelForm({...fuelForm, effective_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                  <input type="date" value={fuelForm.expiration_date} onChange={e => setFuelForm({...fuelForm, expiration_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input type="text" value={fuelForm.notes} onChange={e => setFuelForm({...fuelForm, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="col-span-3 flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={fuelForm.active} onChange={e => setFuelForm({...fuelForm, active: e.target.checked})}
                      className="rounded border-gray-300" />
                    Active
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setIsAddFuelOpen(false); setEditFuelId(null); }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                      Cancel
                    </button>
                    <button type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                      {editFuelId ? 'Update' : 'Create'} Schedule
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {isAddLaneOpen && (
        <AddRateLane isOpen={isAddLaneOpen} onClose={() => { setIsAddLaneOpen(false); fetchRateLanes(); }} />
      )}
      {editLaneId && (
        <EditRateLane laneId={editLaneId} isOpen={!!editLaneId} onClose={() => { setEditLaneId(null); fetchRateLanes(); }} />
      )}
      {isAddAccessorialOpen && (
        <AddAccessorial isOpen={isAddAccessorialOpen} onClose={() => { setIsAddAccessorialOpen(false); fetchAccessorials(); }} />
      )}
      {editAccessorialId && (
        <EditAccessorial accessorialId={editAccessorialId} isOpen={!!editAccessorialId} onClose={() => { setEditAccessorialId(null); fetchAccessorials(); }} />
      )}
    </div>
  );
}

/* ===== Rate Lanes Table ===== */
function RateLanesTable({ lanes, onEdit, onDelete, formatCurrency }) {
  if (lanes.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <MapPinIcon className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No rate lanes</h3>
        <p className="mt-1 text-sm text-gray-500">Create rate lanes to enable quick quoting on loads.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lane</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipment</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Customer Rate</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Carrier Cost</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Validity</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {lanes.map(lane => (
            <tr key={lane.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 text-sm">
                  <span className="font-medium text-gray-900">{lane.origin_city}, {lane.origin_state}</span>
                  <ArrowRightIcon className="h-3 w-3 text-gray-400" />
                  <span className="font-medium text-gray-900">{lane.destination_city}, {lane.destination_state}</span>
                </div>
                {lane.estimated_miles && (
                  <p className="text-xs text-gray-400">{lane.estimated_miles} mi · {lane.rate_type_display}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  <TruckIcon className="h-3 w-3 mr-1" />
                  {lane.equipment_type_display}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {lane.customer_name || <span className="text-gray-400 italic">Default</span>}
              </td>
              <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(lane.customer_rate)}</td>
              <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(lane.carrier_cost)}</td>
              <td className="px-4 py-3 text-sm text-right">
                {lane.estimated_margin !== null ? (
                  <span className={`font-medium ${parseFloat(lane.estimated_margin) >= 15 ? 'text-green-600' : parseFloat(lane.estimated_margin) >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {lane.estimated_margin}%
                  </span>
                ) : '—'}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {lane.effective_date}
                {lane.expiration_date && ` → ${lane.expiration_date}`}
              </td>
              <td className="px-4 py-3 text-center">
                {lane.is_expired ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <XCircleIcon className="h-3 w-3 mr-0.5" />Expired
                  </span>
                ) : lane.active ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircleIcon className="h-3 w-3 mr-0.5" />Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Inactive
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => onEdit(lane.id)} className="p-1 text-gray-400 hover:text-blue-600" title="Edit">
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button onClick={() => onDelete(lane.id)} className="p-1 text-gray-400 hover:text-red-600" title="Delete">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ===== Accessorials Table ===== */
function AccessorialsTable({ accessorials, onEdit, onDelete, formatCurrency }) {
  if (accessorials.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No accessorial charges</h3>
        <p className="mt-1 text-sm text-gray-500">Define standard accessorial charge types for your operations.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Default Rate</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate Unit</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {accessorials.map(acc => (
            <tr key={acc.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{acc.name}</td>
              <td className="px-4 py-3">
                {acc.code ? (
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-700">{acc.code}</span>
                ) : '—'}
              </td>
              <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(acc.default_rate)}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{acc.rate_unit_display}</td>
              <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{acc.description || '—'}</td>
              <td className="px-4 py-3 text-center">
                {acc.active ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Inactive</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => onEdit(acc.id)} className="p-1 text-gray-400 hover:text-blue-600" title="Edit">
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button onClick={() => onDelete(acc.id)} className="p-1 text-gray-400 hover:text-red-600" title="Delete">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ===== Fuel Schedules Table ===== */
function FuelSchedulesTable({ schedules, onEdit, onDelete, formatCurrency }) {
  if (schedules.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <FireIcon className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No fuel surcharge schedules</h3>
        <p className="mt-1 text-sm text-gray-500">Create fuel surcharge schedules based on DOE diesel price index.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Base Price</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current DOE</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current FSC/mi</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {schedules.map(sch => (
            <tr key={sch.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{sch.name}</td>
              <td className="px-4 py-3 text-sm text-right text-gray-600">${sch.base_fuel_price}/gal</td>
              <td className="px-4 py-3 text-sm text-right text-gray-600">
                {sch.current_fuel_price ? `$${sch.current_fuel_price}/gal` : '—'}
              </td>
              <td className="px-4 py-3 text-sm text-right font-medium text-orange-600">
                {sch.current_surcharge_per_mile ? `$${sch.current_surcharge_per_mile}/mi` : '$0.000/mi'}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {sch.effective_date}
                {sch.expiration_date && ` → ${sch.expiration_date}`}
              </td>
              <td className="px-4 py-3 text-center">
                {sch.active ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Inactive</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => onEdit(sch)} className="p-1 text-gray-400 hover:text-blue-600" title="Edit">
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button onClick={() => onDelete(sch.id)} className="p-1 text-gray-400 hover:text-red-600" title="Delete">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RateManagement;
