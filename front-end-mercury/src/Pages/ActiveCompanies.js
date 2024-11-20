import React, { useState } from 'react';
import AddCompanyModal from '../components/AddCompanyModal';

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

const companyNames = ['Company A', 'Company B', 'Company C', 'Company D'];

const CompanyPage = () => {
    const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
    const [companies, setCompanies] = useState(companyNames);
  
    const handleOpenAddCompanyModal = () => {
      setIsAddCompanyModalOpen(true);
    };
  
    const handleCloseAddCompanyModal = () => {
      setIsAddCompanyModalOpen(false);
    };
  
    const handleAddCompany = (newCompanyName) => {
      if (!companies.includes(newCompanyName)) {
        setCompanies([...companies, newCompanyName]);
      }
    };
  
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-6">Active Companies</h1>
        <button
          onClick={handleOpenAddCompanyModal}
          className="fixed bottom-6 right-6 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-400 transition"
        >
          +
        </button>
        <div className="overflow-x-auto mt-6">
          <table className="min-w-full bg-white border border-gray-300 table-auto">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-2 border">Company Name</th>
                <th className="px-4 py-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 border">{company}</td>
                  <td className="px-4 py-2 border text-center">
                    <button
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
  
        <AddCompanyModal
          isOpen={isAddCompanyModalOpen}
          onClose={handleCloseAddCompanyModal}
          onAddCompany={handleAddCompany}
        />
      </div>
    );
  };
  
  export default CompanyPage;