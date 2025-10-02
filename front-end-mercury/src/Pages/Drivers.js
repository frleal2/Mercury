import React, { useState, useEffect } from 'react';
import AddDriver from '../components/AddDriver';
import EditDriver from '../components/EditDriver';
import DriverTestHistory from '../components/DriverTestHistory'; // Import the new component
import TripsHistory from '../components/TripsHistory'; // Import the new component
import { useSession } from '../providers/SessionProvider';
import axios from 'axios';
import BASE_URL from '../config';

function Drivers() {
  const { session, refreshAccessToken } = useSession();
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isEditDriverOpen, setIsEditDriverOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [historyDriver, setHistoryDriver] = useState(null); // Track a single driver for the history modal
  const [tripDriver, setTripDriver] = useState(null); // Track the driver for the trip history modal
  const [companies, setCompanies] = useState({}); // Store company data as a map

  const handleAddDriverClick = () => {
    setIsAddDriverOpen(true);
  };

  const handleCloseAddDriver = () => {
    setIsAddDriverOpen(false);
    fetchDrivers();
  };

  const handleEditDriverClick = (driver) => {
    setSelectedDriver(driver);
    setIsEditDriverOpen(true);
  };

  const handleCloseEditDriver = () => {
    setIsEditDriverOpen(false);
    setSelectedDriver(null);
    fetchDrivers(); // Refresh the driver table after closing the edit modal
  };

  const handleHistoryClick = (driver) => {
    setHistoryDriver(driver); // Set the selected driver for the history modal
  };

  const handleCloseHistory = () => {
    setHistoryDriver(null); // Clear the selected driver when the modal is closed
  };

  const handleTripsClick = (driver) => {
    setTripDriver(driver); // Set the selected driver for the trip history modal
  };

  const handleCloseTrips = () => {
    setTripDriver(null); // Clear the selected driver when the modal is closed
  };

  const handleDriverUpdated = () => {
    fetchDrivers(); // Refresh the driver table
  };

  const fetchDrivers = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/drivers/`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });

    

      setDrivers(response.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          return fetchDrivers();
        }
      }
      console.error('Error fetching drivers:', error);
      alert('Failed to fetch drivers.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/companies/`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });

      const companyMap = response.data.reduce((map, company) => {
        map[company.id] = company.name; // Map company ID to company name
        return map;
      }, {});

      setCompanies(companyMap);
    } catch (error) {
      console.error('Error fetching companies:', error);
      alert('Failed to fetch companies.');
    }
  };

  useEffect(() => {
    fetchDrivers();
    fetchCompanies(); // Fetch companies when the component loads
  }, []);

  const filteredDrivers = drivers.filter((driver) => {
    if (filter === 'active') return driver.active;
    if (filter === 'inactive') return !driver.active;
    return true;
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
          onDriverAdded={fetchDrivers}
        />
      )}
      {loading ? (
        <p>Loading drivers...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">CDL Number</th>
                <th className="border border-gray-300 px-4 py-2">First Name</th>
                <th className="border border-gray-300 px-4 py-2">Last Name</th>
                <th className="border border-gray-300 px-4 py-2">Company</th>
                <th className="border border-gray-300 px-4 py-2">Phone</th>
                <th className="border border-gray-300 px-4 py-2">CDL</th>
                <th className="border border-gray-300 px-4 py-2">Medical Examination</th>
                <th className="border border-gray-300 px-4 py-2">Latest D&A Result</th>
                <th className="border border-gray-300 px-4 py-2">D&A History</th>
                <th className="border border-gray-300 px-4 py-2">Trip History</th>
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
                  <td className="border border-gray-300 px-4 py-2">
                    {companies[driver.company] || 'Unknown Company'} {/* Map company ID to name */}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">{driver.phone}</td>
                  <td className="border border-gray-300 px-4 py-2">
                    {(() => {
                      const expirationDate = new Date(driver.cdl_expiration_date);
                      const today = new Date();
                      const timeDiff = expirationDate - today;
                      const daysUntilExpiration = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

                      if (timeDiff < 0) {
                        return <span className="text-red-500">Expired</span>;
                      } else if (daysUntilExpiration <= 30) {
                        return <span className="text-yellow-500">{daysUntilExpiration} days until expired</span>;
                      } else {
                        return <span className="text-green-500">Active</span>;
                      }
                    })()}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {(() => {
                      const expirationDate = new Date(driver.physical_date);
                      const today = new Date();
                      const timeDiff = expirationDate - today;
                      const daysUntilExpiration = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

                      if (timeDiff < 0) {
                        return <span className="text-red-500">Expired</span>;
                      } else if (daysUntilExpiration <= 30) {
                        return <span className="text-yellow-500">{daysUntilExpiration} days until expired</span>;
                      } else {
                        return <span className="text-green-500">Active</span>;
                      }
                    })()}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {(() => {
                      // Sort the tests array by completion_date
                      const sortedTests = driver.tests.sort((a, b) => {
                        const dateA = new Date(a.completion_date);
                        const dateB = new Date(b.completion_date);
                        return dateA - dateB; // Ascending order
                      });

                      // Log the test result of the most recent completion_date
                      if (sortedTests.length > 0) {
                        const mostRecentTest = sortedTests[sortedTests.length - 1];
                        //console.log('Most recent test result for driver', driver.id, mostRecentTest.test_result);

                        // Display the most recent test result
                        return (
                          <span
                            className={
                              mostRecentTest.test_result === 'Fail' || mostRecentTest.test_result === 'Incomplete'
                                ? 'text-red-500'
                                : mostRecentTest.test_result === 'Pass'
                                ? 'text-green-500'
                                : ''
                            }
                          >
                            {mostRecentTest.test_result}
                          </span>
                        );
                      } else {
                        return <span className="text-red-500">Incomplete</span>;
                      }
                    })()}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <button
                      className="text-blue-500 hover:underline"
                      onClick={() => handleHistoryClick(driver)}
                    >
                      History
                    </button>
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <button
                      className="text-blue-500 hover:underline"
                      onClick={() => handleTripsClick(driver)}
                    >
                      Trips
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isEditDriverOpen && (
        <EditDriver
          driver={selectedDriver}
          onClose={handleCloseEditDriver}
          onDriverUpdated={fetchDrivers}
        />
      )}
      {historyDriver && (
        <DriverTestHistory
          driver={historyDriver} // Pass the correct driver object
          onClose={handleCloseHistory}
        />
      )}
      {tripDriver && (
        <TripsHistory
          driver={tripDriver} // Pass the correct driver object
          onClose={handleCloseTrips}
        />
      )}
    </div>
  );
}

export default Drivers;
