import React, { useState, useEffect } from 'react';
import { useSession } from '../providers/SessionProvider';
import axios from 'axios';

function EditTrailer({ trailer, onClose }) {
  const { session, refreshAccessToken } = useSession();
  const [companies, setCompanies] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [formData, setFormData] = useState({ ...trailer });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companiesResponse, trucksResponse] = await Promise.all([
          axios.get('http://localhost:8000/api/companies/', {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          }),
          axios.get('http://localhost:8000/api/trucks/', {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          }),
        ]);
        setCompanies(companiesResponse.data);
        setTrucks(trucksResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load data.');
      }
    };
    fetchData();
  }, [session]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `http://localhost:8000/api/trailers/${trailer.id}/`,
        formData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      );
      alert('Trailer updated successfully!');
      onClose();
    } catch (error) {
      if (error.response && error.response.status === 401) {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          try {
            await axios.put(
              `http://localhost:8000/api/trailers/${trailer.id}/`,
              formData,
              {
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${newAccessToken}`,
                },
              }
            );
            alert('Trailer updated successfully!');
            onClose();
          } catch (retryError) {
            console.error('Error retrying update trailer:', retryError);
            alert('Failed to update trailer after refreshing token.');
          }
        } else {
          alert('Failed to refresh access token.');
        }
      } else {
        console.error('Error updating trailer:', error);
        alert('Failed to update trailer.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Edit Trailer</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">License Plate</label>
            <input
              type="text"
              name="license_plate"
              value={formData.license_plate}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Model</label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Company</label>
            <select
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
              required
            >
              <option value="">Select a company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Truck</label>
            <select
              name="truck"
              value={formData.truck}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
            >
              <option value="">Select a truck</option>
              {trucks.map((truck) => (
                <option key={truck.id} value={truck.id}>
                  {truck.license_plate}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Active</label>
            <select
              name="active"
              value={formData.active}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
            >
              <option value={true}>Yes</option>
              <option value={false}>No</option>
            </select>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-500 text-white px-4 py-2 rounded mr-2 hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditTrailer;
