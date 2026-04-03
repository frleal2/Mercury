import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import { XMarkIcon, IdentificationIcon, DocumentIcon, ArrowDownTrayIcon, TrashIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

function EditDriver({ driver, onClose, onDriverUpdated }) {
  const { session, refreshAccessToken } = useSession();
  const [companies, setCompanies] = useState([]);
  const [formData, setFormData] = useState({
    first_name: driver.first_name || '',
    last_name: driver.last_name || '',
    company: driver.company || '',
    state: driver.state || '',
    cdl_number: driver.cdl_number || '',
    cdl_expiration_date: driver.cdl_expiration_date || '',
    physical_date: driver.physical_date || '',
    annual_vmr_date: driver.annual_vmr_date || '',
    dob: driver.dob || '',
    ssn: driver.ssn || '',
    hire_date: driver.hire_date || '',
    phone: driver.phone || '',
    active: driver.active !== undefined ? driver.active : true,
    employee_verification: driver.employee_verification || false,
    random_test_required_this_year: driver.random_test_required_this_year !== undefined ? driver.random_test_required_this_year : true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Document management state
  const [documents, setDocuments] = useState(driver.documents || []);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docUploadType, setDocUploadType] = useState('cdl_license');

  const DOCUMENT_TYPES = [
    { value: 'cdl_license', label: 'CDL License' },
    { value: 'medical_certificate', label: 'Medical Certificate' },
    { value: 'mvr_report', label: 'Motor Vehicle Record' },
    { value: 'employment_verification', label: 'Employment Verification' },
    { value: 'drug_test_results', label: 'Drug Test Results' },
    { value: 'background_check', label: 'Background Check' },
    { value: 'training_certificate', label: 'Training Certificate' },
    { value: 'other', label: 'Other Document' },
  ];

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/driver-documents/?driver_id=${driver.id}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      setDocuments(res.data);
    } catch (err) {
      console.error('Error fetching driver documents:', err);
    }
  }, [driver.id, session.accessToken]);

  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('driver_id', driver.id);
    formData.append('document_type', docUploadType);

    try {
      await axios.post(`${BASE_URL}/api/upload/driver-document/`, formData, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      fetchDocuments();
    } catch (err) {
      console.error('Error uploading document:', err);
      alert('Failed to upload document.');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleDocDownload = async (doc) => {
    try {
      const res = await axios.get(
        `${BASE_URL}/api/documents/driver/${doc.id}/download/`,
        { headers: { Authorization: `Bearer ${session.accessToken}` } }
      );
      window.open(res.data.download_url, '_blank');
    } catch (err) {
      console.error('Error downloading document:', err);
      alert('Failed to download document.');
    }
  };

  const handleDocDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.document_type_display || doc.file_name}"?`)) return;
    try {
      await axios.delete(`${BASE_URL}/api/driver-documents/${doc.id}/`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      fetchDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document.');
    }
  };

  // US States for dropdown
  const US_STATES = [
    { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
  ];

  useEffect(() => {
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
      }
    };
    fetchCompanies();
    fetchDocuments();
  }, [session, fetchDocuments]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue,
    }));
    
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.company) newErrors.company = 'Company is required';
    if (!formData.state) newErrors.state = 'State is required';
    if (formData.cdl_expiration_date && new Date(formData.cdl_expiration_date) < new Date()) {
      newErrors.cdl_expiration_date = 'CDL expiration date cannot be in the past';
    }
    if (formData.hire_date && new Date(formData.hire_date) > new Date()) {
      newErrors.hire_date = 'Hire date cannot be in the future';
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
    try {
      await axios.put(`${BASE_URL}/api/drivers/${driver.id}/`, formData, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
      });

      onDriverUpdated();
      onClose();
    } catch (error) {
      if (error.response && error.response.status === 401) {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          try {
            await axios.put(`${BASE_URL}/api/drivers/${driver.id}/`, formData, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${newAccessToken}`,
              },
            });
            onDriverUpdated();
            onClose();
          } catch (retryError) {
            console.error('Error retrying update driver:', retryError);
            if (retryError.response?.data) {
              setErrors(retryError.response.data);
            } else {
              alert('Failed to update driver after refreshing token.');
            }
          }
        } else {
          alert('Failed to refresh access token.');
        }
      } else {
        console.error('Error updating driver:', error);
        if (error.response?.data) {
          setErrors(error.response.data);
        } else {
          alert('Failed to update driver. Please try again.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <IdentificationIcon className="h-6 w-6 mr-2 text-blue-600" />
            Edit Driver - {driver.first_name} {driver.last_name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Personal Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter first name"
                />
                {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter last name"
                />
                {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(555) 123-4567"
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SSN</label>
                <input
                  type="text"
                  name="ssn"
                  value={formData.ssn}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="XXX-XX-XXXX"
                />
                {errors.ssn && <p className="text-red-500 text-xs mt-1">{errors.ssn}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a state</option>
                  {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
                {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Employment Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
                <select
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                {errors.company && <p className="text-red-500 text-xs mt-1">{errors.company}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                <input
                  type="date"
                  name="hire_date"
                  value={formData.hire_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.hire_date && <p className="text-red-500 text-xs mt-1">{errors.hire_date}</p>}
              </div>
            </div>
          </div>

          {/* CDL Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">CDL & Certification Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CDL Number</label>
                <input
                  type="text"
                  name="cdl_number"
                  value={formData.cdl_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter CDL number"
                />
                {errors.cdl_number && <p className="text-red-500 text-xs mt-1">{errors.cdl_number}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CDL Expiration Date</label>
                <input
                  type="date"
                  name="cdl_expiration_date"
                  value={formData.cdl_expiration_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.cdl_expiration_date && <p className="text-red-500 text-xs mt-1">{errors.cdl_expiration_date}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medical Examination Expiration Date</label>
                <input
                  type="date"
                  name="physical_date"
                  value={formData.physical_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.physical_date && <p className="text-red-500 text-xs mt-1">{errors.physical_date}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Annual VMR Date</label>
                <input
                  type="date"
                  name="annual_vmr_date"
                  value={formData.annual_vmr_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.annual_vmr_date && <p className="text-red-500 text-xs mt-1">{errors.annual_vmr_date}</p>}
              </div>
            </div>
          </div>

          {/* Status Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Status</h4>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Driver is active</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="employee_verification"
                  checked={formData.employee_verification}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Employee verification completed</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="random_test_required_this_year"
                  checked={formData.random_test_required_this_year}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Random test required this year</span>
              </label>
            </div>
          </div>

          {/* Documents */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Documents</h4>

            {/* Document List */}
            {documents.length > 0 ? (
              <div className="space-y-2 mb-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100">
                    <div className="flex items-center space-x-3 min-w-0">
                      <DocumentIcon className="h-6 w-6 text-blue-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {doc.document_type_display || doc.document_type}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {doc.file_name}
                          {doc.expiration_date && ` · Expires ${doc.expiration_date}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => handleDocDownload(doc)}
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                        title="Download"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDocDelete(doc)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 mb-4 border-2 border-dashed border-gray-300 rounded-lg">
                <DocumentIcon className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-1 text-sm text-gray-500">No documents uploaded</p>
              </div>
            )}

            {/* Upload */}
            <div className="flex items-center gap-2">
              <select
                value={docUploadType}
                onChange={(e) => setDocUploadType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt.value} value={dt.value}>{dt.label}</option>
                ))}
              </select>
              <label className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium cursor-pointer ${uploadingDoc ? 'opacity-50 cursor-not-allowed' : 'text-gray-700 bg-white hover:bg-gray-50'}`}>
                <ArrowUpTrayIcon className="h-4 w-4 mr-1.5" />
                {uploadingDoc ? 'Uploading...' : 'Upload'}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx"
                  onChange={handleDocUpload}
                  disabled={uploadingDoc}
                />
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {submitting ? 'Updating Driver...' : 'Update Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditDriver;
