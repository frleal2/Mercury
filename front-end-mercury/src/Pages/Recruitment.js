import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

const Recruitment = () => {
  const { session, refreshAccessToken } = useSession();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/applications/`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      setApplications(response.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          return fetchApplications();
        }
      }
      console.error('Error fetching applications:', error);
      alert('Failed to fetch applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Recruitment</h1>
      {loading ? (
        <p>Loading applications...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">Name</th>
                <th className="border border-gray-300 px-4 py-2">last_name</th>
                <th className="border border-gray-300 px-4 py-2">Email</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2">{application.first_name}</td>
                  <td className="border border-gray-300 px-4 py-2">{application.last_name}</td>
                  <td className="border border-gray-300 px-4 py-2">{application.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Recruitment;
