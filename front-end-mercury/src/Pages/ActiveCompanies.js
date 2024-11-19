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

const CompanyPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const companies = ['Company A', 'Company B'];

  const handleCompanyClick = (companyName) => {
    setSelectedCompany(companyName);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCompany(null);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Active Companies</h1>
      <table className="min-w-full bg-white border border-gray-300">
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
                <td className="px-4 py-2 border">{"12"}</td>
                <td className="px-4 py-2 border">{"14"}</td>
                <td className="px-4 py-2 border text-center"> {/* Use text-center to center the button */}
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

export default CompanyPage;
