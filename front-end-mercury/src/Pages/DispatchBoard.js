import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import ViewLoadDetails from '../components/ViewLoadDetails';
import DispatchLoadModal from '../components/DispatchLoadModal';
import ReassignDispatchModal from '../components/ReassignDispatchModal';
import DispatchMap from '../components/DispatchMap';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  CubeIcon,
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  ArrowRightIcon,
  CurrencyDollarIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

const BOARD_COLUMNS = [
  { key: 'booked', label: 'Booked', color: 'blue', description: 'Ready to dispatch' },
  { key: 'dispatched', label: 'Dispatched', color: 'indigo', description: 'Carrier/driver assigned' },
  { key: 'in_transit', label: 'In Transit', color: 'yellow', description: 'On the road' },
  { key: 'delivered', label: 'Delivered', color: 'green', description: 'At destination' },
];

const STATUS_COLORS = {
  quoted: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-800', header: 'bg-purple-600' },
  booked: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800', header: 'bg-blue-600' },
  dispatched: { bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-800', header: 'bg-indigo-600' },
  in_transit: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-800', header: 'bg-yellow-500' },
  delivered: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-800', header: 'bg-green-600' },
  invoiced: { bg: 'bg-teal-50', border: 'border-teal-200', badge: 'bg-teal-100 text-teal-800', header: 'bg-teal-600' },
  paid: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800', header: 'bg-emerald-600' },
  cancelled: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-800', header: 'bg-red-600' },
};

const NEXT_STATUSES = {
  booked: ['dispatched', 'cancelled'],
  dispatched: ['in_transit', 'cancelled'],
  in_transit: ['delivered'],
  delivered: [],  // Invoiced status is set automatically when an invoice is created
};

function DispatchBoard() {
  const { session, refreshAccessToken } = useSession();
  const [loads, setLoads] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoadId, setSelectedLoadId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showQuoted, setShowQuoted] = useState(false);
  const [updatingLoadId, setUpdatingLoadId] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [dispatchLoad, setDispatchLoad] = useState(null);
  const [reassignLoad, setReassignLoad] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [loadsRes, driversRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/loads/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` },
        }),
        axios.get(`${BASE_URL}/api/drivers/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` },
        }),
      ]);
      setLoads(loadsRes.data);
      setDrivers(driversRes.data.filter(d => d.active));
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching dispatch data:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
    } finally {
      setLoading(false);
    }
  }, [session.accessToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleStatusChange = async (loadId, newStatus) => {
    // Intercept dispatch action to open modal
    if (newStatus === 'dispatched') {
      const load = loads.find(l => l.id === loadId);
      if (load) {
        setDispatchLoad(load);
        return;
      }
    }
    try {
      setUpdatingLoadId(loadId);
      await axios.patch(`${BASE_URL}/api/loads/${loadId}/`, { status: newStatus }, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      setLoads(prev => prev.map(l => l.id === loadId ? { ...l, status: newStatus } : l));
    } catch (error) {
      console.error('Error updating load status:', error);
    } finally {
      setUpdatingLoadId(null);
    }
  };

  const handleLoadDispatched = (updatedLoad) => {
    setLoads(prev => prev.map(l => l.id === updatedLoad.id ? updatedLoad : l));
    setDispatchLoad(null);
  };

  const handleLoadReassigned = (updatedLoad) => {
    setLoads(prev => prev.map(l => l.id === updatedLoad.id ? updatedLoad : l));
    setReassignLoad(null);
  };

  const handleCloseViewLoad = () => {
    setSelectedLoadId(null);
    fetchData();
  };

  // Filter loads by search
  const filteredLoads = loads.filter(load => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      load.load_number?.toLowerCase().includes(term) ||
      load.customer_name?.toLowerCase().includes(term) ||
      load.carrier_name?.toLowerCase().includes(term) ||
      load.pickup_city?.toLowerCase().includes(term) ||
      load.delivery_city?.toLowerCase().includes(term) ||
      load.commodity?.toLowerCase().includes(term)
    );
  });

  // Group loads by status for board columns
  const loadsByStatus = {};
  BOARD_COLUMNS.forEach(col => {
    loadsByStatus[col.key] = filteredLoads.filter(l => l.status === col.key);
  });

  // Quoted loads (shown in side panel if toggled)
  const quotedLoads = filteredLoads.filter(l => l.status === 'quoted');

  // Active operational loads (booked through delivered)
  const activeStatuses = ['booked', 'dispatched', 'in_transit', 'delivered'];
  const activeLoads = filteredLoads.filter(l => activeStatuses.includes(l.status));

  // Stats
  const stats = {
    totalActive: activeLoads.length,
    booked: loadsByStatus['booked']?.length || 0,
    dispatched: loadsByStatus['dispatched']?.length || 0,
    inTransit: loadsByStatus['in_transit']?.length || 0,
    delivered: loadsByStatus['delivered']?.length || 0,
    quoted: quotedLoads.length,
    activeRevenue: activeLoads.reduce((sum, l) => sum + (parseFloat(l.total_revenue) || 0), 0),
    availableDrivers: drivers.length,
  };

  const formatCurrency = (val) => {
    if (!val) return '—';
    return `$${parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = (load) => {
    if (!load.delivery_date) return false;
    const now = new Date();
    const delivery = new Date(load.delivery_date);
    return load.status === 'in_transit' && delivery < now;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading dispatch board...</p>
      </div>
    );
  }

  return (
    <div className="p-4 h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dispatch Board</h1>
            <p className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 60s
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search loads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>
            <button
              onClick={() => setShowQuoted(!showQuoted)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                showQuoted
                  ? 'bg-purple-50 border-purple-300 text-purple-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="h-4 w-4" />
              Quoted ({stats.quoted})
            </button>
            <button
              onClick={fetchData}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-6 gap-3">
          <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
            <div className="flex items-center gap-2">
              <CubeIcon className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">Active Loads</p>
                <p className="text-lg font-bold text-gray-900">{stats.totalActive}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">Needs Dispatch</p>
                <p className="text-lg font-bold text-blue-600">{stats.booked}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
            <div className="flex items-center gap-2">
              <TruckIcon className="h-5 w-5 text-indigo-500" />
              <div>
                <p className="text-xs text-gray-500">Dispatched</p>
                <p className="text-lg font-bold text-indigo-600">{stats.dispatched}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-xs text-gray-500">In Transit</p>
                <p className="text-lg font-bold text-yellow-600">{stats.inTransit}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-gray-500">Delivered</p>
                <p className="text-lg font-bold text-green-600">{stats.delivered}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
            <div className="flex items-center gap-2">
              <CurrencyDollarIcon className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-xs text-gray-500">Active Revenue</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(stats.activeRevenue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Fleet Map */}
        <div className="my-4">
          <DispatchMap onSelectLoad={setSelectedLoadId} />
        </div>
      </div>

      {/* Board Content */}
      <div className="flex-1 flex gap-3 overflow-hidden">
        {/* Quoted Loads Sidebar */}
        {showQuoted && (
          <div className="w-72 flex-shrink-0 flex flex-col bg-white rounded-lg shadow-sm border border-purple-200 overflow-hidden">
            <div className="bg-purple-600 px-4 py-3">
              <h3 className="text-sm font-semibold text-white flex items-center justify-between">
                Quoted
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">{quotedLoads.length}</span>
              </h3>
              <p className="text-xs text-purple-200">Pending customer confirmation</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {quotedLoads.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No quoted loads</p>
              ) : (
                quotedLoads.map(load => (
                  <LoadCard
                    key={load.id}
                    load={load}
                    onSelect={setSelectedLoadId}
                    onStatusChange={handleStatusChange}
                    updatingLoadId={updatingLoadId}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                    isOverdue={isOverdue}
                    compact
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Kanban Columns */}
        {BOARD_COLUMNS.map(column => {
          const columnLoads = loadsByStatus[column.key] || [];
          const colors = STATUS_COLORS[column.key];
          return (
            <div key={column.key} className="flex-1 min-w-[260px] flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Column Header */}
              <div className={`${colors.header} px-4 py-3`}>
                <h3 className="text-sm font-semibold text-white flex items-center justify-between">
                  {column.label}
                  <span className="bg-white bg-opacity-20 text-white text-xs px-2 py-0.5 rounded-full">
                    {columnLoads.length}
                  </span>
                </h3>
                <p className="text-xs text-white text-opacity-75">{column.description}</p>
              </div>

              {/* Column Body */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {columnLoads.length === 0 ? (
                  <div className="text-center py-8">
                    <CubeIcon className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-400 mt-1">No loads</p>
                  </div>
                ) : (
                  columnLoads.map(load => (
                    <LoadCard
                      key={load.id}
                      load={load}
                      onSelect={setSelectedLoadId}
                      onStatusChange={handleStatusChange}
                      onReassign={setReassignLoad}
                      updatingLoadId={updatingLoadId}
                      formatCurrency={formatCurrency}
                      formatDate={formatDate}
                      isOverdue={isOverdue}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* View Load Details Modal */}
      {selectedLoadId && (
        <ViewLoadDetails
          loadId={selectedLoadId}
          isOpen={!!selectedLoadId}
          onClose={handleCloseViewLoad}
        />
      )}

      {/* Dispatch Load Modal */}
      <DispatchLoadModal
        isOpen={!!dispatchLoad}
        onClose={() => setDispatchLoad(null)}
        load={dispatchLoad}
        onDispatched={handleLoadDispatched}
      />

      {/* Reassign Dispatch Modal */}
      <ReassignDispatchModal
        isOpen={!!reassignLoad}
        onClose={() => setReassignLoad(null)}
        load={reassignLoad}
        onReassigned={handleLoadReassigned}
      />
    </div>
  );
}

/* Load Card Component */
function LoadCard({ load, onSelect, onStatusChange, onReassign, updatingLoadId, formatCurrency, formatDate, isOverdue, compact }) {
  const nextStatuses = NEXT_STATUSES[load.status] || [];
  const overdue = isOverdue(load);
  const isUpdating = updatingLoadId === load.id;
  const canReassign = ['dispatched', 'in_transit'].includes(load.status) && load.trip_id;

  const getNextLabel = (status) => {
    switch (status) {
      case 'booked': return 'Book';
      case 'dispatched': return 'Dispatch';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'invoiced': return 'Invoice';
      case 'cancelled': return 'Cancel';
      default: return status;
    }
  };

  const getActionColor = (status) => {
    if (status === 'cancelled') return 'text-red-600 hover:bg-red-50 border-red-200';
    return 'text-blue-600 hover:bg-blue-50 border-blue-200';
  };

  return (
    <div
      className={`bg-white rounded-lg border ${overdue ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-200'} p-3 cursor-pointer hover:shadow-md transition-shadow`}
      onClick={() => onSelect(load.id)}
    >
      {/* Top: Load # and Rate */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-bold text-gray-900">{load.load_number}</span>
        <span className="text-sm font-semibold text-emerald-600">{formatCurrency(load.total_revenue)}</span>
      </div>

      {/* Customer */}
      <p className="text-xs text-gray-500 truncate mb-1.5">{load.customer_name}</p>

      {/* Route */}
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-xs text-gray-700 truncate max-w-[90px]">{load.pickup_location_display || 'TBD'}</span>
        <ArrowRightIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
        <span className="text-xs text-gray-700 truncate max-w-[90px]">{load.delivery_location_display || 'TBD'}</span>
      </div>

      {/* Dates */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
        <span>PU: {formatDate(load.pickup_date)}</span>
        <span>DEL: {formatDate(load.delivery_date)}</span>
      </div>

      {/* Carrier / Equipment / Trip */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {load.trip_number && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
            {load.trip_number}
          </span>
        )}
        {load.trip_driver_name && (
          <span className="text-xs text-gray-600 truncate max-w-[100px]">{load.trip_driver_name}</span>
        )}
        {load.carrier_name && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 truncate max-w-[120px]">
            <TruckIcon className="h-3 w-3 mr-0.5 flex-shrink-0" />
            {load.carrier_name}
          </span>
        )}
        {load.equipment_type_display && !compact && (
          <span className="text-xs text-gray-400">{load.equipment_type_display}</span>
        )}
        {load.hazmat && (
          <span className="text-xs font-medium text-red-600">HAZ</span>
        )}
        {overdue && (
          <span className="inline-flex items-center text-xs font-medium text-red-600">
            <ExclamationTriangleIcon className="h-3 w-3 mr-0.5" />
            Late
          </span>
        )}
      </div>

      {/* Quick Actions */}
      {(nextStatuses.length > 0 || canReassign) && (
        <div className="flex gap-1.5 border-t border-gray-100 pt-2">
          {canReassign && onReassign && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReassign(load);
              }}
              className="flex-1 text-xs font-medium py-1 px-2 rounded border transition-colors text-amber-600 hover:bg-amber-50 border-amber-200"
            >
              Reassign
            </button>
          )}
          {nextStatuses.map(ns => (
            <button
              key={ns}
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(load.id, ns);
              }}
              disabled={isUpdating}
              className={`flex-1 text-xs font-medium py-1 px-2 rounded border transition-colors ${getActionColor(ns)} ${isUpdating ? 'opacity-50' : ''}`}
            >
              {isUpdating ? '...' : getNextLabel(ns)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default DispatchBoard;
