import React, { useState, useEffect } from 'react';
import AddDriver from '../components/AddDriver';
import EditDriver from '../components/EditDriver';
import DriverTestHistory from '../components/DriverTestHistory'; // Import the new component
import TripsHistory from '../components/TripsHistory'; // Import the new component
import { useSession } from '../providers/SessionProvider';
import axios from 'axios';
import BASE_URL from '../config';
import { 
  UserIcon,
  PhoneIcon,
  EyeIcon,
  PencilIcon,
  ClockIcon,
  DocumentTextIcon,
  MapPinIcon,
  IdentificationIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

function Drivers() {
  const { session, refreshAccessToken } = useSession();
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isEditDriverOpen, setIsEditDriverOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
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
    const matchesFilter = filter === 'all' || 
                         (filter === 'active' && driver.active) || 
                         (filter === 'inactive' && !driver.active);
    
    const matchesSearch = searchTerm === '' || 
      `${driver.first_name} ${driver.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.cdl_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (driver.phone && driver.phone.includes(searchTerm)) ||
      (companies[driver.company] && companies[driver.company].toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  const getStatusInfo = (expirationDate) => {
    const expDate = new Date(expirationDate);
    const today = new Date();
    const timeDiff = expDate - today;
    const daysUntilExpiration = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    if (timeDiff < 0) {
      return { status: 'Expired', color: 'text-red-600 bg-red-100', icon: ExclamationTriangleIcon };
    } else if (daysUntilExpiration <= 30) {
      return { status: `${daysUntilExpiration}d remaining`, color: 'text-yellow-600 bg-yellow-100', icon: ClockIcon };
    } else {
      return { status: 'Active', color: 'text-green-600 bg-green-100', icon: CheckCircleIcon };
    }
  };

  const getTestResult = (driver) => {
    if (!driver.tests || driver.tests.length === 0) {
      return { result: 'No Tests', color: 'text-gray-600 bg-gray-100' };
    }

    const sortedTests = driver.tests.sort((a, b) => {
      const dateA = new Date(a.test_completion_date);
      const dateB = new Date(b.test_completion_date);
      return dateB - dateA; // Descending order (most recent first)
    });

    const mostRecentTest = sortedTests[0];
    let color = 'text-gray-600 bg-gray-100';
    
    if (mostRecentTest.test_result === 'Pass') {
      color = 'text-green-600 bg-green-100';
    } else if (mostRecentTest.test_result === 'Fail') {
      color = 'text-red-600 bg-red-100';
    } else if (mostRecentTest.test_result === 'Pending') {
      color = 'text-yellow-600 bg-yellow-100';
    }

    return { 
      result: mostRecentTest.test_result, 
      color: color,
      date: mostRecentTest.test_completion_date
    };
  };

  const getTitle = () => {
    if (filter === 'active') return 'Active Drivers';
    if (filter === 'inactive') return 'Inactive Drivers';
    return 'All Drivers';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{getTitle()}</h1>
        <p className="text-gray-600">Manage driver information and compliance status</p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, CDL number, phone, or company..."
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
            <option value="active">Active Drivers</option>
            <option value="inactive">Inactive Drivers</option>
            <option value="all">All Drivers</option>
          </select>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            onClick={handleAddDriverClick}
          >
            <UserIcon className="h-5 w-5" />
            <span>Add Driver</span>
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
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading drivers...</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {filteredDrivers.length} Driver{filteredDrivers.length !== 1 ? 's' : ''}
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CDL Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Medical Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Latest Test
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDrivers.map((driver) => {
                  const cdlStatus = getStatusInfo(driver.cdl_expiration_date);
                  const medicalStatus = getStatusInfo(driver.physical_date);
                  const testResult = getTestResult(driver);
                  
                  return (
                    <tr key={driver.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              driver.active ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <span className={`text-sm font-medium ${
                                driver.active ? 'text-blue-800' : 'text-gray-500'
                              }`}>
                                {driver.first_name.charAt(0)}{driver.last_name.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {driver.first_name} {driver.last_name}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center space-x-4">
                              <span className="flex items-center">
                                <IdentificationIcon className="h-4 w-4 mr-1" />
                                {driver.cdl_number}
                              </span>
                              {driver.phone && (
                                <a href={`tel:${driver.phone}`} className="flex items-center text-blue-600 hover:text-blue-800">
                                  <PhoneIcon className="h-4 w-4 mr-1" />
                                  {driver.phone}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                          {companies[driver.company] || 'Unknown Company'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cdlStatus.color}`}>
                          <cdlStatus.icon className="h-3 w-3 mr-1" />
                          {cdlStatus.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${medicalStatus.color}`}>
                          <medicalStatus.icon className="h-3 w-3 mr-1" />
                          {medicalStatus.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${testResult.color}`}>
                          {testResult.result}
                        </span>
                        {testResult.date && (
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(testResult.date).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEditDriverClick(driver)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Edit Driver"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleHistoryClick(driver)}
                            className="text-green-600 hover:text-green-800 p-1"
                            title="Test History"
                          >
                            <DocumentTextIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleTripsClick(driver)}
                            className="text-purple-600 hover:text-purple-800 p-1"
                            title="Trip History"
                          >
                            <CalendarIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredDrivers.length === 0 && (
              <div className="text-center py-8">
                <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No drivers found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding a new driver.'}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <button
                      onClick={handleAddDriverClick}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <UserIcon className="h-5 w-5 mr-2" />
                      Add Driver
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {isEditDriverOpen && (
        <EditDriver
          driver={selectedDriver}
          onClose={handleCloseEditDriver}
          onDriverUpdated={fetchDrivers}
        />
      )}
      {historyDriver && (
        <DriverTestHistory
          driver={historyDriver}
          onClose={handleCloseHistory}
        />
      )}
      {tripDriver && (
        <TripsHistory
          driver={tripDriver}
          onClose={handleCloseTrips}
        />
      )}
    </div>
  );
}

export default Drivers;
