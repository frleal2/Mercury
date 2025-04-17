import React, { useState, useEffect } from 'react';
import AddTrailer from '../components/AddTrailer';
import EditTrailer from '../components/EditTrailer';
import { useSession } from '../providers/SessionProvider';
import axios from 'axios';
import BASE_URL from '../config';

function Trailers() {
  const { session, refreshAccessToken } = useSession();
  const [isAddTrailerOpen, setIsAddTrailerOpen] = useState(false);
  const [isEditTrailerOpen, setIsEditTrailerOpen] = useState(false);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const [trailers, setTrailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  const handleAddTrailerClick = () => {
    setIsAddTrailerOpen(true);
  };

  const handleCloseAddTrailer = () => {
    setIsAddTrailerOpen(false);
    fetchTrailers();
  };

  const handleEditTrailerClick = (trailer) => {
    setSelectedTrailer(trailer);
    setIsEditTrailerOpen(true);
  };

  const handleCloseEditTrailer = () => {
    setIsEditTrailerOpen(false);
    setSelectedTrailer(null);
    fetchTrailers();
  };

  const fetchTrailers = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/trailers/`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });
      setTrailers(response.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          return fetchTrailers();
        }
      }
      console.error('Error fetching trailers:', error);
      alert('Failed to fetch trailers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrailers();
  }, []);

  const filteredTrailers = trailers.filter((trailer) => {
    if (filter === 'active') return trailer.active;
    if (filter === 'inactive') return !trailer.active;
    return true;
  });

  const getTitle = () => {
    if (filter === 'active') return 'Active Trailers';
    if (filter === 'inactive') return 'Inactive Trailers';
    return 'All Trailers';
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
            onClick={handleAddTrailerClick}
          >
            + Add Trailer
          </button>
        </div>
      </div>
      {isAddTrailerOpen && (
        <AddTrailer
          onClose={handleCloseAddTrailer}
          onTrailerAdded={fetchTrailers}
        />
      )}
      {loading ? (
        <p>Loading trailers...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">License Plate</th>
                <th className="border border-gray-300 px-4 py-2">Model</th>
                <th className="border border-gray-300 px-4 py-2">Company</th>
                <th className="border border-gray-300 px-4 py-2">Truck</th>
                <th className="border border-gray-300 px-4 py-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrailers.map((trailer) => (
                <tr key={trailer.id} className="hover:bg-gray-50">
                  <td
                    className={`border border-gray-300 px-4 py-2 cursor-pointer hover:underline ${
                      trailer.active ? 'text-blue-500' : 'text-red-500'
                    }`}
                    onClick={() => handleEditTrailerClick(trailer)}
                  >
                    {trailer.license_plate}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">{trailer.model}</td>
                  <td className="border border-gray-300 px-4 py-2">{trailer.company_name}</td>
                  <td className="border border-gray-300 px-4 py-2">{trailer.truck_license_plate || 'N/A'}</td>
                  <td className="border border-gray-300 px-4 py-2">{trailer.active ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isEditTrailerOpen && (
        <EditTrailer trailer={selectedTrailer} onClose={handleCloseEditTrailer} />
      )}
    </div>
  );
}

export default Trailers;
