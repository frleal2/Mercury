import React, { useState, useEffect } from 'react';
import AddDriver from '../components/AddDriver';
import EditDriver from '../components/EditDriver'; // Corrected import path
import { useSession } from '../providers/SessionProvider'; // Import useSession
import axios from 'axios';
import BASE_URL from '../config';

function Drivers() {
  const { session, refreshAccessToken } = useSession(); // Access session and refreshAccessToken
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isEditDriverOpen, setIsEditDriverOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null); // State for selected driver
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // Filter state: 'active', 'inactive', or 'all'

  const handleAddDriverClick = () => {
    setIsAddDriverOpen(true);
  };

  const handleCloseAddDriver = () => {
    setIsAddDriverOpen(false);
    fetchDrivers(); // Ensure drivers are refreshed after adding
  };

  const handleEditDriverClick = (driver) => {
    setSelectedDriver(driver); // Set the selected driver
    setIsEditDriverOpen(true);
  };

  const handleCloseEditDriver = () => {
    setIsEditDriverOpen(false);
    setSelectedDriver(null);
    fetchDrivers(); // Refresh the drivers list after editing a driver
  };

  const fetchDrivers = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/drivers/`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`, // Add Authorization header
        },
      });
      setDrivers(response.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          // Retry the request with the new access token
          return fetchDrivers();
        }
      }
      console.error('Error fetching drivers:', error);
      alert('Failed to fetch drivers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const filteredDrivers = drivers.filter((driver) => {
    if (filter === 'active') return driver.active;
    if (filter === 'inactive') return !driver.active;
    return true; // Show all drivers if filter is 'all'
  });

  const getTitle = () => {
    if (filter === 'active') return 'Active Drivers';
    if (filter === 'inactive') return 'Inactive Drivers';
    return 'All Drivers';
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
            onClick={handleAddDriverClick}
          >
            + Add Drivers
          </button>
        </div>
      </div>
      {isAddDriverOpen && (
        <AddDriver
          onClose={handleCloseAddDriver}
          onDriverAdded={fetchDrivers} // Ensure drivers are refreshed after adding
        />
      )}
      {loading ? (
        <p>Loading drivers...</p>
      ) : (
        <div className="overflow-x-auto"> {/* Add this wrapper for horizontal scrolling */}
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">CDL Number</th>
                <th className="border border-gray-300 px-4 py-2">First Name</th>
                <th className="border border-gray-300 px-4 py-2">Last Name</th>
                <th className="border border-gray-300 px-4 py-2">Company</th>
                <th className="border border-gray-300 px-4 py-2">State</th>
                <th className="border border-gray-300 px-4 py-2">Phone</th>
                <th className="border border-gray-300 px-4 py-2">Employee Verification</th>
                <th className="border border-gray-300 px-4 py-2">CDL Expiration Date</th>
                <th className="border border-gray-300 px-4 py-2">Physical Date</th>
                <th className="border border-gray-300 px-4 py-2">Annual VMR Date</th>
                <th className="border border-gray-300 px-4 py-2">Date of Birth</th>
                <th className="border border-gray-300 px-4 py-2">SSN</th>
                <th className="border border-gray-300 px-4 py-2">Hire Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-gray-50">
                  <td
                    className={`border border-gray-300 px-4 py-2 cursor-pointer hover:underline ${
                      driver.active ? 'text-blue-500' : 'text-red-500'
                    }`}
                    onClick={() => handleEditDriverClick(driver)}
                  >
                    {driver.cdl_number}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">{driver.first_name}</td>
                  <td className="border border-gray-300 px-4 py-2">{driver.last_name}</td>
                  <td className="border border-gray-300 px-4 py-2">{driver.company_name}</td>
                  <td className="border border-gray-300 px-4 py-2">{driver.state}</td>
                  <td className="border border-gray-300 px-4 py-2">{driver.phone}</td>
                  <td className="border border-gray-300 px-4 py-2">{driver.employee_verification ? 'Yes' : 'No'}</td>
                  <td className="border border-gray-300 px-4 py-2">{driver.cdl_expiration_date}</td>
                  <td className="border border-gray-300 px-4 py-2">{driver.physical_date}</td>
                  <td className="border border-gray-300 px-4 py-2">{driver.annual_vmr_date}</td>
                  <td className="border border-gray-300 px-4 py-2">{driver.dob}</td>
                  <td className="border border-gray-300 px-4 py-2">{driver.ssn}</td>
                  <td className="border border-gray-300 px-4 py-2">{driver.hire_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isEditDriverOpen && (
        <EditDriver driver={selectedDriver} onClose={handleCloseEditDriver} />
      )}
    </div>
  );
}

export default Drivers;
