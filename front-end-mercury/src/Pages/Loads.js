import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import AddLoad from '../components/AddLoad';
import ViewLoadDetails from '../components/ViewLoadDetails';
import { 
  PlusIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  TruckIcon,
  UserIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

function Loads() {
  const { session, refreshAccessToken } = useSession();
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateLoadOpen, setIsCreateLoadOpen] = useState(false);
  const [selectedLoadId, setSelectedLoadId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLoads();
  }, []);

  const fetchLoads = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/loads/`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });
      setLoads(response.data);
    } catch (error) {
      console.error('Error fetching loads:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCreateLoad = () => {
    setIsCreateLoadOpen(false);
    fetchLoads();
  };

  const handleCloseViewLoad = () => {
    setSelectedLoadId(null);
    fetchLoads();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'quoted': return 'bg-purple-100 text-purple-800';
      case 'booked': return 'bg-blue-100 text-blue-800';
      case 'dispatched': return 'bg-indigo-100 text-indigo-800';
      case 'in_transit': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'invoiced': return 'bg-teal-100 text-teal-800';
      case 'paid': return 'bg-emerald-100 text-emerald-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLoads = loads.filter(load => {
    const matchesFilter = filter === 'all' || load.status === filter;
    const matchesSearch = 
      load.load_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.customer_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.pickup_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.delivery_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.commodity?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Summary stats
  const stats = {
    total: loads.length,
    active: loads.filter(l => ['booked', 'dispatched', 'in_transit'].includes(l.status)).length,
    delivered: loads.filter(l => l.status === 'delivered').length,
    revenue: loads.reduce((sum, l) => sum + (parseFloat(l.total_revenue) || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading loads...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Load Management</h1>
        <p className="text-gray-600">Manage freight loads, customers, and billing</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CubeIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Loads</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TruckIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapPinIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Delivered</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.delivered}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">${stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by load #, customer, reference, city, commodity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Loads</option>
            <option value="quoted">Quoted</option>
            <option value="booked">Booked</option>
            <option value="dispatched">Dispatched</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="invoiced">Invoiced</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={() => fetchLoads()}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon className="h-5 w-5 text-gray-500" />
          </button>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            onClick={() => setIsCreateLoadOpen(true)}
          >
            <PlusIcon className="h-5 w-5" />
            <span>New Load</span>
          </button>
        </div>
      </div>

      {/* Loads Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {filteredLoads.length} Load{filteredLoads.length !== 1 ? 's' : ''}
          </h2>
        </div>
        
        {filteredLoads.length === 0 ? (
          <div className="text-center py-12">
            <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No loads found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by creating a new load.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => setIsCreateLoadOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  New Load
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Load</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pickup Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equipment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLoads.map((load) => (
                  <tr key={load.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedLoadId(load.id)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <CubeIcon className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{load.load_number}</div>
                          {load.customer_reference && (
                            <div className="text-xs text-gray-500">Ref: {load.customer_reference}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900">{load.customer_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center mb-1">
                          <MapPinIcon className="h-4 w-4 text-green-500 mr-1" />
                          <span>{load.pickup_location_display || 'TBD'}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 text-red-500 mr-1" />
                          <span>{load.delivery_location_display || 'TBD'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {load.pickup_date 
                        ? new Date(load.pickup_date).toLocaleDateString() 
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {load.equipment_type_display}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(load.status)}`}>
                        {load.status_display}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {load.customer_rate ? (
                        <div>
                          <div className="font-medium text-gray-900">
                            ${parseFloat(load.customer_rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                          {load.profit && (
                            <div className={`text-xs ${parseFloat(load.profit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${parseFloat(load.profit).toLocaleString('en-US', { minimumFractionDigits: 2 })} margin
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedLoadId(load.id); }}
                        className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                        title="View Details"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Load Modal */}
      {isCreateLoadOpen && (
        <AddLoad
          isOpen={isCreateLoadOpen}
          onClose={handleCloseCreateLoad}
        />
      )}

      {/* View Load Details Modal */}
      {selectedLoadId && (
        <ViewLoadDetails
          loadId={selectedLoadId}
          isOpen={!!selectedLoadId}
          onClose={handleCloseViewLoad}
        />
      )}
    </div>
  );
}

export default Loads;
