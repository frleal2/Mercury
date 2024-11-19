// Drivers.js
import React, { useState } from 'react';
import DriverModal from '../components/DriverModal';
import DriverRow from '../components/DriverRow';

const drivers = [
  { id: 1, company: 'Company A', firstName: 'John', lastName: 'Doe', employeeVerification: true, state: 'TX', cdlNumber: '12345', cdlExpirationDate: '2024-01-01', physicalDate: '2023-01-01', annualVMRDate: '2023-05-01', dob: '1990-01-01', ssn: '123-45-6789', hireDate: '2020-06-15', phone: '555-1234' },
  { id: 2, company: 'Company B', firstName: 'Jane', lastName: 'Smith', employeeVerification: false, state: 'CA', cdlNumber: '67890', cdlExpirationDate: '2024-07-01', physicalDate: '2022-06-01', annualVMRDate: '2023-08-01', dob: '1985-06-15', ssn: '987-65-4321', hireDate: '2021-04-10', phone: '555-5678' },
  // More driver data...
];

function Drivers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driversList, setDriversList] = useState(drivers);
  const [sortConfig, setSortConfig] = useState({ key: 'company', direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedDrivers = [...driversList].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const filteredDrivers = sortedDrivers.filter((driver) => {
    const lowercasedTerm = searchTerm.toLowerCase();
    return (
      driver.company.toLowerCase().includes(lowercasedTerm) ||
      driver.firstName.toLowerCase().includes(lowercasedTerm) ||
      driver.lastName.toLowerCase().includes(lowercasedTerm) ||
      driver.state.toLowerCase().includes(lowercasedTerm) ||
      driver.cdlNumber.toLowerCase().includes(lowercasedTerm)
    );
  });

  const handleEditClick = (driver) => {
    setSelectedDriver(driver);
  };

  const handleSave = (editedDriver) => {
    setDriversList((prevDrivers) =>
      prevDrivers.map((driver) =>
        driver.id === editedDriver.id ? editedDriver : driver
      )
    );
  };

  const handleCloseModal = () => {
    setSelectedDriver(null);
  };

  const calculateDaysUntil = (date) => {
    const today = new Date();
    const targetDate = new Date(date);
    const timeDiff = targetDate - today;
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const addOneYear = (date) => {
    const targetDate = new Date(date);
    targetDate.setFullYear(targetDate.getFullYear() + 1);
    return targetDate;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Active Drivers</h1>
      <input
        type="text"
        className="mb-4 p-2 border border-gray-300"
        placeholder="Search drivers..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="border px-4 py-2 cursor-pointer" onClick={() => handleSort('company')}>
                Company {sortConfig.key === 'company' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="border px-4 py-2 cursor-pointer" onClick={() => handleSort('firstName')}>
                First Name {sortConfig.key === 'firstName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="border px-4 py-2 cursor-pointer" onClick={() => handleSort('lastName')}>
                Last Name {sortConfig.key === 'lastName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="border px-4 py-2">Employee Verification</th>
              <th className="border px-4 py-2 cursor-pointer" onClick={() => handleSort('state')}>
                State {sortConfig.key === 'state' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="border px-4 py-2">CDL #</th>
              <th className="border px-4 py-2">CDL Expiration Date</th>
              <th className="border px-4 py-2">CDL Expires In (Days)</th>
              <th className="border px-4 py-2">Physical Date</th>
              <th className="border px-4 py-2">Physical Expiration Date</th>
              <th className="border px-4 py-2">Physical Expires In (Days)</th>
              <th className="border px-4 py-2">Annual VMR Certification Date</th>
              <th className="border px-4 py-2">Annual VMR Expiration Date</th>
              <th className="border px-4 py-2">Annual VMR Expires In (Days)</th>
              <th className="border px-4 py-2">DOB</th>
              <th className="border px-4 py-2">SSN</th>
              <th className="border px-4 py-2">Hire Date</th>
              <th className="border px-4 py-2">Phone #</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.map((driver) => (
              <DriverRow
                key={driver.id}
                driver={driver}
                onEditClick={handleEditClick}
                calculateDaysUntil={calculateDaysUntil}
                addOneYear={addOneYear}
              />
            ))}
          </tbody>
        </table>
      </div>
      {selectedDriver && (
        <DriverModal driver={selectedDriver} onClose={handleCloseModal} onSave={handleSave} />
      )}
    </div>
  );
}

export default Drivers;
