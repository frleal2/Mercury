import React, { useState, useEffect } from 'react';
import { useSession } from '../providers/SessionProvider';
import axios from 'axios';
import BASE_URL from '../config';
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';

function InviteUser({ onClose }) {
  const { session } = useSession();
  const [companies, setCompanies] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'user', // Default to user role
    company_ids: [],
    driver_id: '', // For linking to existing driver
    create_new_driver: false, // Option 3: Create new driver
    driver_data: {
      phone: '',
      company_id: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      license_number: '',
      license_state: '',
      date_hired: '',
      license_expiry: '',
      medical_cert_expiry: ''
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showDriverSelect, setShowDriverSelect] = useState(false);
  const [showDriverCreation, setShowDriverCreation] = useState(false);
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
    // Handle driver role selection
    if (formData.role === 'driver' && selectedCompanies.length > 0) {
      fetchDrivers();
      setShowDriverSelect(true);
    } else {
      setShowDriverSelect(false);
      setShowDriverCreation(false);
      setFormData(prev => ({ 
        ...prev, 
        driver_id: '', 
        create_new_driver: false,
        driver_data: { ...prev.driver_data, company_id: '' }
      }));
    }
  }, [formData.role, selectedCompanies]);

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

  const fetchDrivers = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/drivers/`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });
      // Filter drivers who don't have user accounts and belong to selected companies
      const availableDrivers = response.data.filter(driver => 
        !driver.has_user_account && 
        selectedCompanies.includes(driver.company)
      );
      setDrivers(availableDrivers);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setErrors({ general: 'Failed to load drivers' });
    }
  };

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

  const handleDriverCreationToggle = (createNew) => {
    setFormData(prev => ({
      ...prev,
      create_new_driver: createNew,
      driver_id: createNew ? '' : prev.driver_id,
      driver_data: createNew ? {
        ...prev.driver_data,
        company_id: selectedCompanies[0] || ''
      } : prev.driver_data
    }));
    setShowDriverCreation(createNew);
  };

  const handleDriverDataChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      driver_data: {
        ...prev.driver_data,
        [name]: value
      }
    }));
    
    // Clear specific error
    if (errors[`driver_data.${name}`]) {
      setErrors(prev => ({
        ...prev,
        [`driver_data.${name}`]: ''
      }));
    }
  };

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
    
    // Driver-specific validation
    if (formData.role === 'driver') {
      if (!formData.driver_id && !formData.create_new_driver) {
        newErrors.driver_option = 'Please select an existing driver or choose to create a new one';
      }
      
      if (formData.create_new_driver) {
        if (!formData.driver_data.phone) {
          newErrors['driver_data.phone'] = 'Phone number is required for new drivers';
        }
        if (!formData.driver_data.company_id) {
          newErrors['driver_data.company_id'] = 'Company is required for new drivers';
        }
      }
    }
    
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
      
      // Add driver options if driver role
      if (formData.role === 'driver') {
        if (formData.driver_id) {
          // Link to existing driver
          payload.driver_id = parseInt(formData.driver_id);
        } else if (formData.create_new_driver) {
          // Create new driver (Option 3)
          payload.create_new_driver = true;
          payload.driver_data = {
            ...formData.driver_data,
            company_id: parseInt(formData.driver_data.company_id)
          };
        }
      }
      
      const response = await axios.post(`${BASE_URL}/api/invite-user/`, payload, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('User invited successfully:', response.data);
      
      // Show success message
      let message = `Invitation sent successfully to ${formData.email}!\nRole: ${formData.role}`;
      if (formData.role === 'driver' && formData.create_new_driver) {
        message += '\nA new driver record will be created when they accept the invitation.';
      } else if (formData.role === 'driver' && formData.driver_id) {
        const linkedDriver = drivers.find(d => d.id == formData.driver_id);
        if (linkedDriver) {
          message += `\nWill be linked to driver: ${linkedDriver.first_name} ${linkedDriver.last_name}`;
        }
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

          {/* Driver Account Options (only for driver role) */}
          {showDriverSelect && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver Account Setup *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="driver_option"
                      checked={formData.driver_id !== '' && !formData.create_new_driver}
                      onChange={() => handleDriverCreationToggle(false)}
                      className="mr-2"
                    />
                    <span className="text-sm">Link to existing driver</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="driver_option"
                      checked={formData.create_new_driver}
                      onChange={() => handleDriverCreationToggle(true)}
                      className="mr-2"
                    />
                    <span className="text-sm">Create new driver account</span>
                  </label>
                </div>
                {errors.driver_option && <p className="mt-1 text-sm text-red-600">{errors.driver_option}</p>}
              </div>

              {/* Existing Driver Selection */}
              {!formData.create_new_driver && (
                <div>
                  <label htmlFor="driver_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Existing Driver
                  </label>
                  <select
                    id="driver_id"
                    name="driver_id"
                    value={formData.driver_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Choose a driver...</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.first_name} {driver.last_name} - {companies.find(c => c.id === driver.company)?.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    Only drivers without user accounts are shown
                  </p>
                </div>
              )}

              {/* New Driver Creation Form */}
              {formData.create_new_driver && (
                <div className="bg-gray-50 p-4 rounded-md space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Driver Details</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="driver_phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        id="driver_phone"
                        name="phone"
                        value={formData.driver_data.phone}
                        onChange={handleDriverDataChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          errors['driver_data.phone'] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="(555) 123-4567"
                        required
                      />
                      {errors['driver_data.phone'] && <p className="mt-1 text-sm text-red-600">{errors['driver_data.phone']}</p>}
                    </div>
                    
                    <div>
                      <label htmlFor="driver_company" className="block text-sm font-medium text-gray-700 mb-1">
                        Primary Company *
                      </label>
                      <select
                        id="driver_company"
                        name="company_id"
                        value={formData.driver_data.company_id}
                        onChange={handleDriverDataChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          errors['driver_data.company_id'] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      >
                        <option value="">Select company...</option>
                        {companies.filter(c => formData.company_ids.includes(c.id)).map(company => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                      {errors['driver_data.company_id'] && <p className="mt-1 text-sm text-red-600">{errors['driver_data.company_id']}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="driver_license_number" className="block text-sm font-medium text-gray-700 mb-1">
                        License Number
                      </label>
                      <input
                        type="text"
                        id="driver_license_number"
                        name="license_number"
                        value={formData.driver_data.license_number}
                        onChange={handleDriverDataChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Optional"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="driver_license_state" className="block text-sm font-medium text-gray-700 mb-1">
                        License State
                      </label>
                      <input
                        type="text"
                        id="driver_license_state"
                        name="license_state"
                        value={formData.driver_data.license_state}
                        onChange={handleDriverDataChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="driver_address" className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      id="driver_address"
                      name="address"
                      value={formData.driver_data.address}
                      onChange={handleDriverDataChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Optional"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="driver_city" className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        id="driver_city"
                        name="city"
                        value={formData.driver_data.city}
                        onChange={handleDriverDataChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Optional"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="driver_state" className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        id="driver_state"
                        name="state"
                        value={formData.driver_data.state}
                        onChange={handleDriverDataChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Optional"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="driver_zip" className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        id="driver_zip"
                        name="zip_code"
                        value={formData.driver_data.zip_code}
                        onChange={handleDriverDataChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    Additional driver information can be added later from the Drivers page.
                  </p>
                </div>
              )}
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