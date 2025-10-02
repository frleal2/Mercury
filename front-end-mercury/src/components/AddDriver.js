import React, { useState, useEffect } from 'react';
import { useSession } from '../providers/SessionProvider';
import axios from 'axios';
import BASE_URL from '../config';
import AddDriverTestResults from './AddDriverTestResults'; // Import the new component

function AddDriver({ onClose }) {
  const { session } = useSession();
  const [companies, setCompanies] = useState([]);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    company: '', // Should hold a valid company ID
    state: '',
    cdl_number: '',
    cdl_expiration_date: '',
    physical_date: '',
    dob: '',
    ssn: '',
    hire_date: '',
    phone: '',
    test_type: '', // New field for test type
    test_date: '', // New field for test date
    test_result: '', // New field for test result
    random_test_required_this_year: false, // New field for random test requirement
    test_completion_date: '', // New field for test completion date
    next_scheduled_test_date: '', // New field for next scheduled test date
    follow_up_test_required: false, // New field for follow-up test requirement
  });
  const [driverId, setDriverId] = useState(null); // State to store the added driver's ID

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
        `${BASE_URL}/api/drivers/`, // Updated endpoint
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
        setDriverId(response.data.id); // Store the added driver's ID
      } else {
        alert('Failed to add driver.');
      }
    } catch (error) {
      console.error('Error response:', error.response);
      console.error('Validation errors:', error.response?.data); // Log validation errors
      alert(error.response?.data?.detail || 'An error occurred.');
    }
  };

  if (driverId) {
    return <AddDriverTestResults driverId={driverId} onClose={onClose} />;
  }

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
          {/* State */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">State</label>
            <select
              name="state"
              value={formData.state}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded"
              required
            >
              <option value="">Select a state</option>
              <option value="AL">Alabama</option>
              <option value="AK">Alaska</option>
              <option value="AZ">Arizona</option>
              <option value="AR">Arkansas</option>
              <option value="CA">California</option>
              <option value="CO">Colorado</option>
              <option value="CT">Connecticut</option>
              <option value="DE">Delaware</option>
              <option value="FL">Florida</option>
              <option value="GA">Georgia</option>
              <option value="HI">Hawaii</option>
              <option value="ID">Idaho</option>
              <option value="IL">Illinois</option>
              <option value="IN">Indiana</option>
              <option value="IA">Iowa</option>
              <option value="KS">Kansas</option>
              <option value="KY">Kentucky</option>
              <option value="LA">Louisiana</option>
              <option value="ME">Maine</option>
              <option value="MD">Maryland</option>
              <option value="MA">Massachusetts</option>
              <option value="MI">Michigan</option>
              <option value="MN">Minnesota</option>
              <option value="MS">Mississippi</option>
              <option value="MO">Missouri</option>
              <option value="MT">Montana</option>
              <option value="NE">Nebraska</option>
              <option value="NV">Nevada</option>
              <option value="NH">New Hampshire</option>
              <option value="NJ">New Jersey</option>
              <option value="NM">New Mexico</option>
              <option value="NY">New York</option>
              <option value="NC">North Carolina</option>
              <option value="ND">North Dakota</option>
              <option value="OH">Ohio</option>
              <option value="OK">Oklahoma</option>
              <option value="OR">Oregon</option>
              <option value="PA">Pennsylvania</option>
              <option value="RI">Rhode Island</option>
              <option value="SC">South Carolina</option>
              <option value="SD">South Dakota</option>
              <option value="TN">Tennessee</option>
              <option value="TX">Texas</option>
              <option value="UT">Utah</option>
              <option value="VT">Vermont</option>
              <option value="VA">Virginia</option>
              <option value="WA">Washington</option>
              <option value="WV">West Virginia</option>
              <option value="WI">Wisconsin</option>
              <option value="WY">Wyoming</option>
            </select>
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
            <label className="block text-sm font-medium mb-1">Medical Examination Expiration Date</label>
            <input
              type="date"
              name="physical_date"
              value={formData.physical_date}
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
