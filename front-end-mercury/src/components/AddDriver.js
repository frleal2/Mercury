import React, { useState, useEffect } from 'react';
import { useSession } from '../providers/SessionProvider';
import axios from 'axios';
import BASE_URL from '../config';

function AddDriver({ onClose }) {
  const { session } = useSession();
  const [companies, setCompanies] = useState([]); // State for companies
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    company: '', // Should hold a valid company ID
    employee_verification: false,
    state: '',
    cdl_number: '',
    cdl_expiration_date: '',
    physical_date: '',
    annual_vmr_date: '',
    dob: '',
    ssn: '',
    hire_date: '',
    phone: '',
  });

  useEffect(() => {
    // Fetch companies from the backend
    const fetchCompanies = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/companies/`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
          },
        });
        setCompanies(response.data);
      } catch (error) {
        console.error('Error fetching companies:', error);
        alert('Failed to load companies.');
      }
    };
    fetchCompanies();
  }, [session]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form Data:', formData);

    try {
      const response = await axios.post(
        'http://localhost:8000/api/drivers/', // Updated endpoint
        formData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.accessToken}`,
          },
        }
      );
      if (response.status === 201) {
        alert('Driver added successfully!');
        onClose();
      } else {
        alert('Failed to add driver.');
      }
    } catch (error) {
      console.error('Error response:', error.response);
      alert(error.response?.data?.detail || 'An error occurred.');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Add Driver</h2>
        <form onSubmit={handleSubmit}>
          {/* First Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">First Name</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
              required
            />
          </div>
          {/* Last Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Last Name</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
              required
            />
          </div>
          {/* Company */}
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
          {/* Employee Verification */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Employee Verification</label>
            <input
              type="checkbox"
              name="employee_verification"
              checked={formData.employee_verification}
              onChange={handleChange}
              className="mr-2"
            />
          </div>
          {/* State */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">State</label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
              maxLength="2"
              required
            />
          </div>
          {/* CDL Number */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">CDL Number</label>
            <input
              type="text"
              name="cdl_number"
              value={formData.cdl_number}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
            />
          </div>
          {/* CDL Expiration Date */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">CDL Expiration Date</label>
            <input
              type="date"
              name="cdl_expiration_date"
              value={formData.cdl_expiration_date}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
            />
          </div>
          {/* Physical Date */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Physical Date</label>
            <input
              type="date"
              name="physical_date"
              value={formData.physical_date}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
            />
          </div>
          {/* Annual VMR Date */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Annual VMR Date</label>
            <input
              type="date"
              name="annual_vmr_date"
              value={formData.annual_vmr_date}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
            />
          </div>
          {/* Date of Birth */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Date of Birth</label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
            />
          </div>
          {/* SSN */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">SSN</label>
            <input
              type="text"
              name="ssn"
              value={formData.ssn}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
            />
          </div>
          {/* Hire Date */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Hire Date</label>
            <input
              type="date"
              name="hire_date"
              value={formData.hire_date}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
            />
          </div>
          {/* Phone */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
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

export default AddDriver;
