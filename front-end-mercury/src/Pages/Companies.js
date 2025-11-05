import React, { useState, useEffect } from 'react';
import AddCompany from '../components/AddCompany';
import EditCompany from '../components/EditCompany';
import { useSession } from '../providers/SessionProvider';
import axios from 'axios';
import BASE_URL from '../config';
import {
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  PencilIcon,
  EyeIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

function Companies() {
  const { session, refreshAccessToken } = useSession();
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddCompanyClick = () => {
    setIsAddCompanyOpen(true);
  };

  const handleCloseAddCompany = () => {
    setIsAddCompanyOpen(false);
    fetchCompanies();
  };

  const handleEditCompanyClick = (company) => {
    setSelectedCompany(company);
    setIsEditCompanyOpen(true);
  };

  const handleCloseEditCompany = () => {
    setIsEditCompanyOpen(false);
    setSelectedCompany(null);
    fetchCompanies();
  };

  const fetchCompanies = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/companies/`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });
      setCompanies(response.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          return fetchCompanies();
        }
      }
      console.error('Error fetching companies:', error);
      alert('Failed to fetch companies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const filteredCompanies = companies.filter((company) => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'active' && company.active) || 
                         (filter === 'inactive' && !company.active);
    
    const matchesSearch = searchTerm === '' || 
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.email && company.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.phone && company.phone.includes(searchTerm));
    
    return matchesFilter && matchesSearch;
  });

  const getTitle = () => {
    if (filter === 'active') return 'Active Companies';
    if (filter === 'inactive') return 'Inactive Companies';
    return 'All Companies';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{getTitle()}</h1>
        <p className="text-gray-600">Manage company information and contact details</p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by company name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="active">Active Companies</option>
            <option value="inactive">Inactive Companies</option>
            <option value="all">All Companies</option>
          </select>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            onClick={handleAddCompanyClick}
          >
            <BuildingOfficeIcon className="h-5 w-5" />
            <span>Add Company</span>
          </button>
        </div>
      </div>

      {isAddCompanyOpen && (
        <AddCompany
          onClose={handleCloseAddCompany}
          onCompanyAdded={fetchCompanies}
        />
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading companies...</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {filteredCompanies.length} Compan{filteredCompanies.length !== 1 ? 'ies' : 'y'}
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            company.active ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <BuildingOfficeIcon className={`h-6 w-6 ${
                              company.active ? 'text-blue-600' : 'text-gray-400'
                            }`} />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {company.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        {company.email && (
                          <div className="flex items-center">
                            <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <a href={`mailto:${company.email}`} className="text-blue-600 hover:text-blue-800">
                              {company.email}
                            </a>
                          </div>
                        )}
                        {company.phone && (
                          <div className="flex items-center">
                            <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <a href={`tel:${company.phone}`} className="text-blue-600 hover:text-blue-800">
                              {company.phone}
                            </a>
                          </div>
                        )}
                        {!company.email && !company.phone && (
                          <span className="text-gray-400">No contact info</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {company.address ? (
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="truncate max-w-xs">{company.address}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">No address</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        company.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {company.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEditCompanyClick(company)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Edit Company"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        {company.email && (
                          <a
                            href={`mailto:${company.email}`}
                            className="text-gray-600 hover:text-gray-800 p-1"
                            title="Send Email"
                          >
                            <EnvelopeIcon className="h-5 w-5" />
                          </a>
                        )}
                        {company.phone && (
                          <a
                            href={`tel:${company.phone}`}
                            className="text-green-600 hover:text-green-800 p-1"
                            title="Call"
                          >
                            <PhoneIcon className="h-5 w-5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredCompanies.length === 0 && (
              <div className="text-center py-8">
                <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No companies found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding a new company.'}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <button
                      onClick={handleAddCompanyClick}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                      Add Company
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isEditCompanyOpen && (
        <EditCompany company={selectedCompany} onClose={handleCloseEditCompany} />
      )}
    </div>
  );
}

export default Companies;
