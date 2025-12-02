import React, { useState, useEffect } from 'react';
import { useSession } from '../providers/SessionProvider';
import axios from 'axios';
import BASE_URL from '../config';
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';

function InviteUser({ onClose }) {
  const { session } = useSession();
  const [companies, setCompanies] = useState([]);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'user', // Default to user role
    company_ids: []
    // Driver profiles are automatically created - no additional data needed
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showDriverSelect, setShowDriverSelect] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState([]);

  // Role options based on current user's role
  const getRoleOptions = () => {
    const userRole = session?.userInfo?.role;
    
    if (userRole === 'admin') {
      return [
        { value: 'admin', label: 'Administrator - Full tenant management access' },
        { value: 'user', label: 'User - Company management access' },
        { value: 'driver', label: 'Driver - Inspection and trip access only' }
      ];
    } else if (userRole === 'user') {
      return [
        { value: 'driver', label: 'Driver - Inspection and trip access only' }
      ];
    }
    
    return []; // Drivers cannot create accounts
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    // Show driver auto-creation message for driver role
    if (formData.role === 'driver') {
      setShowDriverSelect(true);
    } else {
      setShowDriverSelect(false);
    }
  }, [formData.role]);

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
      setErrors({ general: 'Failed to load companies' });
    }
  };

  // Driver auto-creation - no need to fetch existing drivers

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleCompanyChange = (e) => {
    const { value, checked } = e.target;
    const companyId = parseInt(value);
    
    let newCompanyIds;
    if (checked) {
      newCompanyIds = [...formData.company_ids, companyId];
    } else {
      newCompanyIds = formData.company_ids.filter(id => id !== companyId);
    }
    
    setFormData(prev => ({ ...prev, company_ids: newCompanyIds }));
    setSelectedCompanies(newCompanyIds);
    
    // Set default company for new driver creation
    if (formData.create_new_driver && newCompanyIds.length > 0 && !formData.driver_data.company_id) {
      setFormData(prev => ({
        ...prev,
        driver_data: { ...prev.driver_data, company_id: newCompanyIds[0] }
      }));
    }
    
    // Clear company error
    if (errors.company_ids) {
      setErrors(prev => ({ ...prev, company_ids: '' }));
    }
  };

  // Driver profiles are auto-created - no manual toggle/data collection needed

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.first_name) newErrors.first_name = 'First name is required';
    if (!formData.last_name) newErrors.last_name = 'Last name is required';
    if (!formData.role) newErrors.role = 'Role is required';
    if (formData.company_ids.length === 0) newErrors.company_ids = 'At least one company must be selected';
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Driver profiles are automatically created - no validation needed
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    setErrors({});
    
    try {
      const payload = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
        company_ids: formData.company_ids,
      };
      
      // Driver profiles are automatically created for driver role - no additional data needed
      
      const response = await axios.post(`${BASE_URL}/api/invite-user/`, payload, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('User invited successfully:', response.data);
      
      // Show success message
      let message = `Invitation sent successfully to ${formData.email}!\nRole: ${formData.role}`;
      if (formData.role === 'driver') {
        message += '\nA driver profile will be automatically created when they accept the invitation.';
      }
      message += '\n\nThey will receive an email with instructions to create their account.';
      alert(message);
      
      // Close modal and refresh parent component
      onClose();
      
    } catch (error) {
      console.error('Error inviting user:', error);
      
      if (error.response?.data?.error) {
        setErrors({ general: error.response.data.error });
      } else {
        setErrors({ general: 'Failed to send invitation. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const roleOptions = getRoleOptions();
  
  // If user doesn't have permission to invite anyone, show message
  if (roleOptions.length === 0) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
        <div className="relative p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <UserPlusIcon className="w-5 h-5 mr-2" />
              Invite User
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          <div className="text-center py-8">
            <p className="text-gray-600">You do not have permission to invite users.</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
      <div className="relative p-5 border w-full max-w-md shadow-lg rounded-md bg-white mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <UserPlusIcon className="w-5 h-5 mr-2" />
            Invite User
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {errors.general && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="user@company.com"
              required
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          {/* First Name Field */}
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                errors.first_name ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.first_name && <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>}
          </div>

          {/* Last Name Field */}
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                errors.last_name ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.last_name && <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>}
          </div>

          {/* Role Selection */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                errors.role ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Select a role...</option>
              {roleOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
          </div>

          {/* Company Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Companies * (Select all that apply)
            </label>
            <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
              {companies.map(company => (
                <label key={company.id} className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    value={company.id}
                    checked={formData.company_ids.includes(company.id)}
                    onChange={handleCompanyChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{company.name}</span>
                </label>
              ))}
            </div>
            {errors.company_ids && <p className="mt-1 text-sm text-red-600">{errors.company_ids}</p>}
          </div>

          {/* Driver Profile Auto-Creation Message */}
          {showDriverSelect && (
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Automatic Driver Profile Creation
                  </h3>
                  <p className="mt-1 text-sm text-blue-700">
                    A driver profile will be automatically created when this user accepts their invitation. 
                    The profile will include their name and company assignment. You can edit additional details 
                    (CDL number, phone, etc.) from the Drivers page after they accept.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? 'Sending Invitation...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InviteUser;