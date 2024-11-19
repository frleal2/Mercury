import React, { useState } from 'react';
import DriverRow from '../components/InactiveDriverRow';
import InactiveDriverModal from '../components/InactiveDriverModal';

const drivers = [
  { id: 1, company: 'Company A', firstName: 'John', lastName: 'Doe', teamLeader: 'Alice', state: 'TX', recruitingSource: 'Referral', hireDate: '2020-05-01', terminationDate: '2023-05-01' },
  { id: 2, company: 'Company B', firstName: 'Jane', lastName: 'Smith', teamLeader: 'Bob', state: 'CA', recruitingSource: 'Job Board', hireDate: '2019-11-15', terminationDate: '2023-11-15' },
  { id: 3, company: 'Company A', firstName: 'Tom', lastName: 'Johnson', teamLeader: 'Alice', state: 'NY', recruitingSource: 'Agency', hireDate: '2021-01-10', terminationDate: '2024-01-10' },

  // Add more driver data as needed
];

function InactiveDrivers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'company', direction: 'asc' });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedDrivers = [...drivers].sort((a, b) => {
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
      driver.teamLeader.toLowerCase().includes(lowercasedTerm) ||
      driver.state.toLowerCase().includes(lowercasedTerm) ||
      driver.recruitingSource.toLowerCase().includes(lowercasedTerm)
    );
  });

  const calculateDaysEmployed = (hireDate, terminationDate) => {
    const hireDateObj = new Date(hireDate);
    const terminationDateObj = new Date(terminationDate);
    const timeDiff = terminationDateObj - hireDateObj;
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const openModal = (driver) => {
    setSelectedDriver(driver);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedDriver(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedDriver((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveDriverData = () => {
    const updatedDrivers = drivers.map((driver) =>
      driver.id === selectedDriver.id ? selectedDriver : driver
    );
    console.log("Updated Driver Data: ", updatedDrivers);
    closeModal();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Inactive Drivers</h1>
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
              <th className="border px-4 py-2">Team Leader</th>
              <th className="border px-4 py-2">State</th>
              <th className="border px-4 py-2">Recruiting Source</th>
              <th className="border px-4 py-2">Hire Date</th>
              <th className="border px-4 py-2">Termination Date</th>
              <th className="border px-4 py-2">Days Employed</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.map((driver) => (
              <DriverRow
                key={driver.id}
                driver={driver}
                onEditClick={openModal}
                calculateDaysEmployed={calculateDaysEmployed}
              />
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <InactiveDriverModal
          selectedDriver={selectedDriver}
          onClose={closeModal}
          onSave={saveDriverData}
          onInputChange={handleInputChange}
        />
      )}
    </div>
  );
}

export default InactiveDrivers;
