import React, { useState } from 'react';

const drivers = [
  { id: 1, company: 'Company A', firstName: 'John', lastName: 'Doe', cdlExpirationDate: '2024-01-01', physicalDate: '2023-01-01', annualVMRDate: '2023-05-01' },
  { id: 2, company: 'Company A', firstName: 'Alice', lastName: 'Brown', cdlExpirationDate: '2024-06-01', physicalDate: '2023-12-01', annualVMRDate: '2023-11-01' },
  { id: 3, company: 'Company A', firstName: 'Michael', lastName: 'Williams', cdlExpirationDate: '2024-02-15', physicalDate: '2023-03-01', annualVMRDate: '2023-12-01' },
  { id: 4, company: 'Company A', firstName: 'Sophia', lastName: 'Miller', cdlExpirationDate: '2023-05-01', physicalDate: '2023-07-15', annualVMRDate: '2023-12-10' },
  { id: 5, company: 'Company A', firstName: 'David', lastName: 'Lee', cdlExpirationDate: '2024-09-01', physicalDate: '2023-04-10', annualVMRDate: '2023-06-20' },
  { id: 6, company: 'Company A', firstName: 'Emily', lastName: 'Clark', cdlExpirationDate: '2023-04-15', physicalDate: '2023-02-10', annualVMRDate: '2023-12-05' },
  { id: 7, company: 'Company B', firstName: 'Jane', lastName: 'Smith', cdlExpirationDate: '2024-07-01', physicalDate: '2022-06-01', annualVMRDate: '2023-08-01' },
  { id: 8, company: 'Company B', firstName: 'Mark', lastName: 'Johnson', cdlExpirationDate: '2024-03-10', physicalDate: '2023-02-01', annualVMRDate: '2023-12-15' },
];

const getExpiredCount = (drivers, type) => {
  const today = new Date();
  return drivers.filter((driver) => {
    const expirationDate = new Date(driver[type]);
    if (isNaN(expirationDate)) return false; // Avoid invalid date issues
    return expirationDate < today;
  }).length;
};

const ExpirationModal = ({ company, drivers, onClose }) => {
  const expiredCdlCount = getExpiredCount(drivers, 'cdlExpirationDate');
  const expiredPhysicalCount = getExpiredCount(drivers, 'physicalDate');
  const expiredVmrCount = getExpiredCount(drivers, 'annualVMRDate');

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-gray-500 bg-opacity-50">
      <div className="bg-white p-6 rounded-md shadow-lg max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">{company} Compliance</h2>
        <div>
          <p><strong>Expired CDL: </strong>{expiredCdlCount} out of {drivers.length} drivers</p>
          <p><strong>Expired Physicals: </strong>{expiredPhysicalCount} out of {drivers.length} drivers</p>
          <p><strong>Expired Annual VMR: </strong>{expiredVmrCount} out of {drivers.length} drivers</p>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const ActiveCompanies = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [companies, setCompanies] = useState(['Company A', 'Company B']);

  const handleCompanyClick = (companyName) => {
    setSelectedCompany(companyName);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCompany(null);
  };

  const handleOpenAddCompanyModal = () => {
    setIsAddCompanyModalOpen(true);
  };

  const handleCloseAddCompanyModal = () => {
    setIsAddCompanyModalOpen(false);
    setNewCompanyName('');
  };

  const handleAddCompany = () => {
    if (newCompanyName.trim() !== '') {
      setCompanies([...companies, newCompanyName.trim()]);
      setNewCompanyName('');
      setIsAddCompanyModalOpen(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Active Companies</h1>

      {/* "+" Button to add a company */}
      <button
        onClick={handleOpenAddCompanyModal}
        className="fixed bottom-6 right-6 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-400 transition"
      >
        +
      </button>

      {/* Add Company Modal */}
      {isAddCompanyModalOpen && (
        <div className="fixed inset-0 flex justify-center items-center bg-gray-500 bg-opacity-50">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Add New Company</h2>
            <div className="mb-4">
              <label htmlFor="companyName" className="block mb-2">Company Name</label>
              <input
                type="text"
                id="companyName"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="border border-gray-300 p-2 w-full rounded-md"
              />
            </div>
            <div className="flex justify-between">
              <button
                onClick={handleAddCompany}
                className="bg-blue-500 text-white px-4 py-2 rounded-md"
              >
                Add Company
              </button>
              <button
                onClick={handleCloseAddCompanyModal}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable table container for responsiveness */}
      <div className="overflow-x-auto mt-6">
        <table className="min-w-full bg-white border border-gray-300 table-auto">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="px-4 py-2 border">Company Name</th>
              <th className="px-4 py-2 border">Number of Drivers</th>
              <th className="px-4 py-2 border">Number of Trucks</th>
              <th className="px-4 py-2 border">Number of Trailers</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => {
              const companyDrivers = drivers.filter((driver) => driver.company === company);
              return (
                <tr key={company}>
                  <td className="px-4 py-2 border">{company}</td>
                  <td className="px-4 py-2 border">{companyDrivers.length}</td>
                  <td className="px-4 py-2 border">12</td>
                  <td className="px-4 py-2 border">14</td>
                  <td className="px-4 py-2 border text-center">
                    <button
                      onClick={() => handleCompanyClick(company)}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
                    >
                      View Compliance
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <ExpirationModal
          company={selectedCompany}
          drivers={drivers.filter((driver) => driver.company === selectedCompany)}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default ActiveCompanies;
