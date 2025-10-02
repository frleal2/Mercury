import React, { useState, useEffect } from 'react';
import AddTruck from '../components/AddTruck';
import EditTruck from '../components/EditTruck';
import { useSession } from '../providers/SessionProvider';
import axios from 'axios';
import BASE_URL from '../config';
import InspectionHistory from '../components/InspectionHistory';

function Trucks() {
  const { session, refreshAccessToken } = useSession();
  const [isAddTruckOpen, setIsAddTruckOpen] = useState(false);
  const [isEditTruckOpen, setIsEditTruckOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [isInspectionHistoryOpen, setIsInspectionHistoryOpen] = useState(false);

  const handleAddTruckClick = () => {
    setIsAddTruckOpen(true);
  };

  const handleCloseAddTruck = () => {
    setIsAddTruckOpen(false);
    fetchTrucks();
  };

  const handleEditTruckClick = (truck) => {
    setSelectedTruck(truck);
    setIsEditTruckOpen(true);
  };

  const handleCloseEditTruck = () => {
    setIsEditTruckOpen(false);
    setSelectedTruck(null);
    fetchTrucks();
  };

  const handleOpenInspectionHistory = () => {
    setIsInspectionHistoryOpen(true);
  };

  const handleCloseInspectionHistory = () => {
    setIsInspectionHistoryOpen(false);
  };

  const fetchTrucks = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/trucks/`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });
      setTrucks(response.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          return fetchTrucks();
        }
      }
      console.error('Error fetching trucks:', error);
      alert('Failed to fetch trucks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrucks();
  }, []);

  const filteredTrucks = trucks.filter((truck) => {
    if (filter === 'active') return truck.active;
    if (filter === 'inactive') return !truck.active;
    return true;
  });

  const getTitle = () => {
    if (filter === 'active') return 'Active Trucks';
    if (filter === 'inactive') return 'Inactive Trucks';
    return 'All Trucks';
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
            onClick={handleAddTruckClick}
          >
            + Add Truck
          </button>
        </div>
      </div>
      {isAddTruckOpen && (
        <AddTruck
          onClose={handleCloseAddTruck}
          onTruckAdded={fetchTrucks}
        />
      )}
      {loading ? (
        <p>Loading trucks...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">License Plate</th>
                <th className="border border-gray-300 px-4 py-2">Company</th>
                <th className="border border-gray-300 px-4 py-2">Driver</th>
                <th className="border border-gray-300 px-4 py-2">Annual DOT Inspection</th>
                <th className="border border-gray-300 px-4 py-2">Plates</th>
                <th className="border border-gray-300 px-4 py-2">Registration</th>
                <th className="border border-gray-300 px-4 py-2">Insurance</th>
                <th className="border border-gray-300 px-4 py-2">Inspection</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrucks.map((truck) => (
                <tr key={truck.id} className="hover:bg-gray-50">
                  <td
                    className={`border border-gray-300 px-4 py-2 cursor-pointer hover:underline ${
                      truck.active ? 'text-blue-500' : 'text-red-500'
                    }`}
                    onClick={() => handleEditTruckClick(truck)}
                  >
                    {truck.license_plate}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">{truck.company_name || 'Unassigned'}</td>
                  <td className="border border-gray-300 px-4 py-2">{truck.driver_name || 'Unassigned'}</td>
                  <td className="border border-gray-300 px-4 py-2">
                    {(() => {
                      const expirationDate = new Date(truck.annual_dot_inspection_date);
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
                      const expirationDate = new Date(truck.license_plate_expiration);
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
                      const expirationDate = new Date(truck.registration_expiration);
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
                      const expirationDate = new Date(truck.insurance_expiration);
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
                    <button
                      className="text-blue-500 hover:underline"
                      onClick={handleOpenInspectionHistory}
                    >
                      History
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isEditTruckOpen && (
        <EditTruck truck={selectedTruck} onClose={handleCloseEditTruck} />
      )}
      {isInspectionHistoryOpen && (
        <InspectionHistory onClose={handleCloseInspectionHistory} />
      )}
    </div>
  );
}

export default Trucks;
