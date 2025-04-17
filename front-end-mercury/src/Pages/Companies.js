import React, { useState, useEffect } from 'react';
import AddCompany from '../components/AddCompany';
import EditCompany from '../components/EditCompany';
import { useSession } from '../providers/SessionProvider';
import axios from 'axios';
import BASE_URL from '../config';

function Companies() {
  const { session, refreshAccessToken } = useSession();
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

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
    if (filter === 'active') return company.active;
    if (filter === 'inactive') return !company.active;
    return true;
  });

  const getTitle = () => {
    if (filter === 'active') return 'Active Companies';
    if (filter === 'inactive') return 'Inactive Companies';
    return 'All Companies';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{getTitle()}</h1>
        <div className="flex items-center space-x-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 p-2 rounded"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={handleAddCompanyClick}
          >
            + Add Company
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
        <p>Loading companies...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">Name</th>
                <th className="border border-gray-300 px-4 py-2">Address</th>
                <th className="border border-gray-300 px-4 py-2">Phone</th>
                <th className="border border-gray-300 px-4 py-2">Email</th>
                <th className="border border-gray-300 px-4 py-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td
                    className={`border border-gray-300 px-4 py-2 cursor-pointer hover:underline ${
                      company.active ? 'text-blue-500' : 'text-red-500'
                    }`}
                    onClick={() => handleEditCompanyClick(company)}
                  >
                    {company.name}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">{company.address}</td>
                  <td className="border border-gray-300 px-4 py-2">{company.phone}</td>
                  <td className="border border-gray-300 px-4 py-2">{company.email}</td>
                  <td className="border border-gray-300 px-4 py-2">{company.active ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isEditCompanyOpen && (
        <EditCompany company={selectedCompany} onClose={handleCloseEditCompany} />
      )}
    </div>
  );
}

export default Companies;
