import React, { useState, useEffect } from 'react';
import AddDriver from '../components/AddDriver';
import { useSession } from '../providers/SessionProvider'; // Import useSession
import axios from 'axios';

function Drivers() {
  const { session } = useSession(); // Access session
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleAddDriverClick = () => {
    setIsAddDriverOpen(true);
  };

  const handleCloseAddDriver = () => {
    setIsAddDriverOpen(false);
    fetchDrivers(); // Refresh the drivers list after adding a driver
  };

  const fetchDrivers = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/drivers/', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`, // Add Authorization header
        },
      });
      setDrivers(response.data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      alert('Failed to fetch drivers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Drivers</h1>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={handleAddDriverClick}
        >
          + Add Drivers
        </button>
      </div>
      {isAddDriverOpen && <AddDriver onClose={handleCloseAddDriver} />}
      {loading ? (
        <p>Loading drivers...</p>
      ) : (
        <table className="table-auto w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2">First Name</th>
              <th className="border border-gray-300 px-4 py-2">Last Name</th>
              <th className="border border-gray-300 px-4 py-2">Company</th>
              <th className="border border-gray-300 px-4 py-2">State</th>
              <th className="border border-gray-300 px-4 py-2">Phone</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2">{driver.first_name}</td>
                <td className="border border-gray-300 px-4 py-2">{driver.last_name}</td>
                <td className="border border-gray-300 px-4 py-2">{driver.company}</td>
                <td className="border border-gray-300 px-4 py-2">{driver.state}</td>
                <td className="border border-gray-300 px-4 py-2">{driver.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Drivers;
