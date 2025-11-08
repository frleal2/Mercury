import React, { useState } from 'react';
import axios from 'axios';
import BASE_URL from '../config';
import { useSession } from '../providers/SessionProvider';
import { XMarkIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <DocumentTextIcon className="h-6 w-6 mr-2 text-blue-600" />
            Add Test Results
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Test Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Test Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Type *</label>
                <select
                  name="test_type"
                  value={formData.test_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Date *</label>
                <input
                  type="date"
                  name="test_date"
                  value={formData.test_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Result *</label>
                <select
                  name="test_result"
                  value={formData.test_result}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
              <option value="">Select Result</option>
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
              <option value="Pending">Pending</option>
            </select>
              </div>
            </div>
          </div>

          {/* Test Details */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Test Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Completion Date</label>
                <input
                  type="date"
                  name="test_completion_date"
                  value={formData.test_completion_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Scheduled Test Date</label>
                <input
                  type="date"
                  name="next_scheduled_test_date"
                  value={formData.next_scheduled_test_date}
                  onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Requirements</h4>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="random_test_required_this_year"
                  checked={formData.random_test_required_this_year}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">Random Test Required This Year</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="follow_up_test_required"
                  checked={formData.follow_up_test_required}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">Follow-Up Test Required</label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Test Result
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddDriverTestResults;
