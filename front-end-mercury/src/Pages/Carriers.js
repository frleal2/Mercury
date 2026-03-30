import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import AddCarrier from '../components/AddCarrier';
import EditCarrier from '../components/EditCarrier';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  TruckIcon,
  PhoneIcon,
  EnvelopeIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

function Carriers() {
  const { session, refreshAccessToken } = useSession();
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddCarrierOpen, setIsAddCarrierOpen] = useState(false);
  const [selectedCarrierId, setSelectedCarrierId] = useState(null);
  const [filter, setFilter] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCarriers();
  }, []);

  const fetchCarriers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/carriers/`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });
      setCarriers(response.data);
    } catch (error) {
      console.error('Error fetching carriers:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAddCarrier = () => {
    setIsAddCarrierOpen(false);
    fetchCarriers();
  };

  const handleCarrierCreated = () => {
    setIsAddCarrierOpen(false);
    fetchCarriers();
  };

  const handleCloseEditCarrier = () => {
    setSelectedCarrierId(null);
    fetchCarriers();
  };

  const filteredCarriers = carriers.filter(carrier => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && carrier.status === 'active') ||
      (filter === 'inactive' && carrier.status === 'inactive') ||
      (filter === 'pending' && carrier.status === 'pending') ||
      (filter === 'blacklisted' && carrier.status === 'blacklisted');
    const matchesSearch =
      !searchTerm ||
      carrier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carrier.mc_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carrier.dot_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carrier.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carrier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carrier.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carrier.state?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: carriers.length,
    active: carriers.filter(c => c.status === 'active').length,
    pending: carriers.filter(c => c.status === 'pending').length,
    hazmat: carriers.filter(c => c.hazmat_certified).length,
  };

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    blacklisted: 'bg-red-100 text-red-800',
  };

  const safetyColors = {
    satisfactory: 'text-green-600',
    conditional: 'text-yellow-600',
    unsatisfactory: 'text-red-600',
    not_rated: 'text-gray-400',
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading carriers...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Carriers</h1>
        <p className="text-gray-600">Manage your carrier partners for brokered loads</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TruckIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Carriers</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Hazmat Certified</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.hazmat}</p>
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
            placeholder="Search by name, MC#, DOT#, contact, city, state..."
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
            <option value="all">All Carriers</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="blacklisted">Blacklisted</option>
          </select>
          <button
            onClick={() => fetchCarriers()}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon className="h-5 w-5 text-gray-500" />
          </button>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            onClick={() => setIsAddCarrierOpen(true)}
          >
            <PlusIcon className="h-5 w-5" />
            <span>New Carrier</span>
          </button>
        </div>
      </div>

      {/* Carriers Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {filteredCarriers.length} Carrier{filteredCarriers.length !== 1 ? 's' : ''}
          </h2>
        </div>

        {filteredCarriers.length === 0 ? (
          <div className="text-center py-12">
            <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No carriers found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding a new carrier.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => setIsAddCarrierOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  New Carrier
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Carrier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MC# / DOT#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Safety</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loads</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCarriers.map((carrier) => (
                  <tr
                    key={carrier.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedCarrierId(carrier.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <TruckIcon className="h-5 w-5 text-indigo-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{carrier.name}</div>
                          {carrier.hazmat_certified && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                              HAZMAT
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{carrier.mc_number || '—'}</div>
                      {carrier.dot_number && (
                        <div className="text-xs text-gray-500">DOT: {carrier.dot_number}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{carrier.contact_name || '—'}</div>
                      {carrier.email && (
                        <div className="flex items-center text-xs text-gray-500 mt-0.5">
                          <EnvelopeIcon className="h-3 w-3 mr-1" />
                          {carrier.email}
                        </div>
                      )}
                      {carrier.phone && (
                        <div className="flex items-center text-xs text-gray-500 mt-0.5">
                          <PhoneIcon className="h-3 w-3 mr-1" />
                          {carrier.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {carrier.city && carrier.state
                        ? `${carrier.city}, ${carrier.state}`
                        : carrier.city || carrier.state || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${safetyColors[carrier.safety_rating] || 'text-gray-400'}`}>
                        {carrier.safety_rating_display || 'Not Rated'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {carrier.load_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[carrier.status] || 'bg-gray-100 text-gray-800'}`}>
                        {carrier.status_display}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCarrierId(carrier.id);
                        }}
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

      {/* Add Carrier Modal */}
      {isAddCarrierOpen && (
        <AddCarrier
          isOpen={isAddCarrierOpen}
          onClose={handleCloseAddCarrier}
          onCarrierCreated={handleCarrierCreated}
        />
      )}

      {/* Edit Carrier Modal */}
      {selectedCarrierId && (
        <EditCarrier
          carrierId={selectedCarrierId}
          isOpen={!!selectedCarrierId}
          onClose={handleCloseEditCarrier}
        />
      )}
    </div>
  );
}

export default Carriers;
