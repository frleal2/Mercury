import React, { useState } from 'react';
import axios from 'axios';
import BASE_URL from '../config';
import { useSession } from '../providers/SessionProvider'; // Import the session provider

function AddDriverTestResults({ driverId, onClose }) {
  const { session, refreshAccessToken } = useSession(); // Use session to retrieve and refresh the token
  const [formData, setFormData] = useState({
    test_type: '',
    test_date: '',
    test_result: '',
    random_test_required_this_year: false,
    test_completion_date: '',
    next_scheduled_test_date: '',
    follow_up_test_required: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    

    try {
      const response = await axios.post(
        `${BASE_URL}/api/driver-tests/`,
        { ...formData, driver: driverId }, // Include the driver ID
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`, // Use session token for authorization
          },
        }
      );
      console.log('POST response:', response.data); // Log the response message
      if (response.status === 201) {
        alert('Test results added successfully!');
        onClose();
      } else {
        alert('Failed to add test results.');
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.warn('Token expired, attempting to refresh...');
        const newAccessToken = await refreshAccessToken(); // Refresh the token
        if (newAccessToken) {
          try {
            const retryResponse = await axios.post(
              `${BASE_URL}/api/driver-tests/`,
              { ...formData, driver: driverId },
              {
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${newAccessToken}`, // Use the refreshed token
                },
              }
            );
            console.log('Retry POST response:', retryResponse.data);
            if (retryResponse.status === 201) {
              alert('Test results added successfully!');
              onClose();
            } else {
              alert('Failed to add test results.');
            }
          } catch (retryError) {
            console.error('Error retrying test result submission:', retryError.response);
            alert(retryError.response?.data?.detail || 'An error occurred.');
          }
        } else {
          alert('Failed to refresh access token.');
        }
      } else {
        console.error('Error adding test results:', error.response); // Log the error details
        alert(error.response?.data?.detail || 'An error occurred.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Add Test Results</h2>
        <form onSubmit={handleSubmit}>
          {/* Test Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Test Type</label>
            <select
              name="test_type"
              value={formData.test_type}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
              required
            >
              <option value="">Select Test Type</option>
              <option value="Pre-employment">Pre-employment</option>
              <option value="Random">Random</option>
              <option value="Post-Accident">Post-Accident</option>
              <option value="Reasonable suspicion">Reasonable suspicion</option>
              <option value="Return-to-duty">Return-to-duty</option>
              <option value="Follow-up">Follow-up</option>
            </select>
          </div>
          {/* Test Date */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Test Date</label>
            <input
              type="date"
              name="test_date"
              value={formData.test_date}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
              required
            />
          </div>
          {/* Test Result */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Test Result</label>
            <select
              name="test_result"
              value={formData.test_result}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
              required
            >
              <option value="">Select Result</option>
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
          {/* Random Test Required This Year */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Random Test Required This Year</label>
            <input
              type="checkbox"
              name="random_test_required_this_year"
              checked={formData.random_test_required_this_year}
              onChange={handleChange}
              className="mr-2"
            />
          </div>
          {/* Test Completion Date */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Test Completion Date</label>
            <input
              type="date"
              name="test_completion_date"
              value={formData.test_completion_date}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
            />
          </div>
          {/* Next Scheduled Test Date */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Next Scheduled Test Date</label>
            <input
              type="date"
              name="next_scheduled_test_date"
              value={formData.next_scheduled_test_date}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
            />
          </div>
          {/* Follow-Up Test Required */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Follow-Up Test Required</label>
            <input
              type="checkbox"
              name="follow_up_test_required"
              checked={formData.follow_up_test_required}
              onChange={handleChange}
              className="mr-2"
            />
          </div>
          {/* Buttons */}
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
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddDriverTestResults;
