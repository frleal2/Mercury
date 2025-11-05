import React, { useState, useEffect } from 'react';
import AddTrailer from '../components/AddTrailer';
import EditTrailer from '../components/EditTrailer';
import { useSession } from '../providers/SessionProvider';
import axios from 'axios';
import BASE_URL from '../config';
import {
  TruckIcon,
  IdentificationIcon,
  PencilIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

function Trailers() {
  const { session, refreshAccessToken } = useSession();
  const [isAddTrailerOpen, setIsAddTrailerOpen] = useState(false);
  const [isEditTrailerOpen, setIsEditTrailerOpen] = useState(false);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const [trailers, setTrailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');

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
    const matchesFilter = filter === 'all' || 
                         (filter === 'active' && trailer.active) || 
                         (filter === 'inactive' && !trailer.active);
    
    const matchesSearch = searchTerm === '' || 
      trailer.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (trailer.model && trailer.model.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  const getTitle = () => {
    if (filter === 'active') return 'Active Trailers';
    if (filter === 'inactive') return 'Inactive Trailers';
    return 'All Trailers';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{getTitle()}</h1>
        <p className="text-gray-600">Manage trailer fleet and assignments</p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by license plate or model..."
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
            <option value="active">Active Trailers</option>
            <option value="inactive">Inactive Trailers</option>
            <option value="all">All Trailers</option>
          </select>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            onClick={handleAddTrailerClick}
          >
            <TruckIcon className="h-5 w-5" />
            <span>Add Trailer</span>
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
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading trailers...</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {filteredTrailers.length} Trailer{filteredTrailers.length !== 1 ? 's' : ''}
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trailer Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Truck
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTrailers.map((trailer) => (
                  <tr key={trailer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            trailer.active ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <TruckIcon className={`h-6 w-6 ${
                              trailer.active ? 'text-blue-600' : 'text-gray-400'
                            }`} />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {trailer.license_plate}
                          </div>
                          <div className="text-sm text-gray-500">
                            {trailer.model || 'Model not specified'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                        {trailer.company_name || 'Unassigned'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {trailer.truck_license_plate ? (
                        <div className="flex items-center">
                          <TruckIcon className="h-4 w-4 text-gray-400 mr-2" />
                          {trailer.truck_license_plate}
                        </div>
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        trailer.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {trailer.active ? (
                          <>
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircleIcon className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditTrailerClick(trailer)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Edit Trailer"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredTrailers.length === 0 && (
              <div className="text-center py-8">
                <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No trailers found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding a new trailer.'}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <button
                      onClick={handleAddTrailerClick}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <TruckIcon className="h-5 w-5 mr-2" />
                      Add Trailer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isEditTrailerOpen && (
        <EditTrailer trailer={selectedTrailer} onClose={handleCloseEditTrailer} />
      )}
    </div>
  );
}

export default Trailers;
