import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import AddCustomer from '../components/AddCustomer';
import EditCustomer from '../components/EditCustomer';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  ArrowPathIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

function Customers() {
  const { session, refreshAccessToken } = useSession();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [filter, setFilter] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/customers/`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAddCustomer = () => {
    setIsAddCustomerOpen(false);
    fetchCustomers();
  };

  const handleCustomerCreated = (newCustomer) => {
    setIsAddCustomerOpen(false);
    fetchCustomers();
  };

  const handleCloseEditCustomer = () => {
    setSelectedCustomerId(null);
    fetchCustomers();
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && customer.active) ||
      (filter === 'inactive' && !customer.active);
    const matchesSearch =
      !searchTerm ||
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.state?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: customers.length,
    active: customers.filter(c => c.active).length,
    inactive: customers.filter(c => !c.active).length,
    totalCreditLimit: customers
      .filter(c => c.active && c.credit_limit)
      .reduce((sum, c) => sum + (parseFloat(c.credit_limit) || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading customers...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Customers</h1>
        <p className="text-gray-600">Manage your shippers and customer relationships</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Customers</p>
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
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Inactive</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.inactive}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Credit</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${stats.totalCreditLimit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
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
            placeholder="Search by name, contact, email, phone, city, state..."
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
            <option value="all">All Customers</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={() => fetchCustomers()}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon className="h-5 w-5 text-gray-500" />
          </button>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            onClick={() => setIsAddCustomerOpen(true)}
          >
            <PlusIcon className="h-5 w-5" />
            <span>New Customer</span>
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {filteredCustomers.length} Customer{filteredCustomers.length !== 1 ? 's' : ''}
          </h2>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding a new customer.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => setIsAddCustomerOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  New Customer
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Terms</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Limit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedCustomerId(customer.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                          {customer.company_name && (
                            <div className="text-xs text-gray-500">{customer.company_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.contact_name || '—'}</div>
                      {customer.email && (
                        <div className="flex items-center text-xs text-gray-500 mt-0.5">
                          <EnvelopeIcon className="h-3 w-3 mr-1" />
                          {customer.email}
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center text-xs text-gray-500 mt-0.5">
                          <PhoneIcon className="h-3 w-3 mr-1" />
                          {customer.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.city && customer.state
                        ? `${customer.city}, ${customer.state}`
                        : customer.city || customer.state || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.payment_terms_display || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.credit_limit
                        ? `$${parseFloat(customer.credit_limit).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          customer.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {customer.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomerId(customer.id);
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

      {/* Add Customer Modal */}
      {isAddCustomerOpen && (
        <AddCustomer
          isOpen={isAddCustomerOpen}
          onClose={handleCloseAddCustomer}
          onCustomerCreated={handleCustomerCreated}
        />
      )}

      {/* Edit Customer Modal */}
      {selectedCustomerId && (
        <EditCustomer
          customerId={selectedCustomerId}
          isOpen={!!selectedCustomerId}
          onClose={handleCloseEditCustomer}
        />
      )}
    </div>
  );
}

export default Customers;
