import React, { useState, useEffect } from 'react';
import { XMarkIcon, TruckIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

const AddCarrier = ({ isOpen, onClose, onCarrierCreated }) => {
  const { session, refreshAccessToken } = useSession();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    company: '',
    name: '',
    mc_number: '',
    dot_number: '',
    contact_name: '',
    email: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    zip_code: '',
    insurance_provider: '',
    insurance_policy_number: '',
    insurance_expiration: '',
    cargo_insurance_limit: '',
    liability_insurance_limit: '',
    equipment_types: '',
    service_area: '',
    hazmat_certified: false,
    payment_terms: 'net_30',
    factoring_company: '',
    safety_rating: 'not_rated',
    notes: '',
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/companies/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });
      setCompanies(response.data);
    } catch (error) {
      console.error('Error fetching companies:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.company) newErrors.company = 'Company is required';
    if (!formData.name) newErrors.name = 'Carrier name is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        company: parseInt(formData.company),
        cargo_insurance_limit: formData.cargo_insurance_limit || null,
        liability_insurance_limit: formData.liability_insurance_limit || null,
        insurance_expiration: formData.insurance_expiration || null,
      };

      await axios.post(`${BASE_URL}/api/carriers/`, payload, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });

      if (onCarrierCreated) {
        onCarrierCreated();
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error creating carrier:', error);
      if (error.response?.data) {
        const serverErrors = {};
        Object.entries(error.response.data).forEach(([key, value]) => {
          serverErrors[key] = Array.isArray(value) ? value[0] : value;
        });
        setErrors(serverErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const errorClass = "text-red-500 text-xs mt-1";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <TruckIcon className="h-6 w-6 mr-2 text-blue-600" />
            New Carrier
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    <div>
                      <label className={labelClass}>Company *</label>
                      <select name="company" value={formData.company} onChange={handleChange} className={inputClass}>
                        <option value="">Select company...</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      {errors.company && <p className={errorClass}>{errors.company}</p>}
                    </div>

                    {/* Carrier Info */}
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-md font-medium text-gray-900 mb-3">Carrier Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Carrier Name *</label>
                          <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} />
                          {errors.name && <p className={errorClass}>{errors.name}</p>}
                        </div>
                        <div>
                          <label className={labelClass}>Contact Person</label>
                          <input type="text" name="contact_name" value={formData.contact_name} onChange={handleChange} className={inputClass} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <label className={labelClass}>MC Number</label>
                          <input type="text" name="mc_number" value={formData.mc_number} onChange={handleChange} className={inputClass} placeholder="MC-XXXXXX" />
                        </div>
                        <div>
                          <label className={labelClass}>DOT Number</label>
                          <input type="text" name="dot_number" value={formData.dot_number} onChange={handleChange} className={inputClass} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <label className={labelClass}>Email</label>
                          <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} />
                          {errors.email && <p className={errorClass}>{errors.email}</p>}
                        </div>
                        <div>
                          <label className={labelClass}>Phone</label>
                          <input type="text" name="phone" value={formData.phone} onChange={handleChange} className={inputClass} />
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-md font-medium text-gray-900 mb-3">Address</h4>
                      <div>
                        <label className={labelClass}>Address Line 1</label>
                        <input type="text" name="address_line_1" value={formData.address_line_1} onChange={handleChange} className={inputClass} />
                      </div>
                      <div className="mt-3">
                        <label className={labelClass}>Address Line 2</label>
                        <input type="text" name="address_line_2" value={formData.address_line_2} onChange={handleChange} className={inputClass} />
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-3">
                        <div>
                          <label className={labelClass}>City</label>
                          <input type="text" name="city" value={formData.city} onChange={handleChange} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>State</label>
                          <input type="text" name="state" value={formData.state} onChange={handleChange} className={inputClass} maxLength="2" />
                        </div>
                        <div>
                          <label className={labelClass}>ZIP</label>
                          <input type="text" name="zip_code" value={formData.zip_code} onChange={handleChange} className={inputClass} />
                        </div>
                      </div>
                    </div>

                    {/* Insurance */}
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-md font-medium text-gray-900 mb-3">Insurance</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Insurance Provider</label>
                          <input type="text" name="insurance_provider" value={formData.insurance_provider} onChange={handleChange} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Policy Number</label>
                          <input type="text" name="insurance_policy_number" value={formData.insurance_policy_number} onChange={handleChange} className={inputClass} />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <div>
                          <label className={labelClass}>Expiration Date</label>
                          <input type="date" name="insurance_expiration" value={formData.insurance_expiration} onChange={handleChange} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Cargo Limit ($)</label>
                          <input type="number" name="cargo_insurance_limit" value={formData.cargo_insurance_limit} onChange={handleChange} className={inputClass} step="0.01" />
                        </div>
                        <div>
                          <label className={labelClass}>Liability Limit ($)</label>
                          <input type="number" name="liability_insurance_limit" value={formData.liability_insurance_limit} onChange={handleChange} className={inputClass} step="0.01" />
                        </div>
                      </div>
                    </div>

                    {/* Capabilities */}
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-md font-medium text-gray-900 mb-3">Capabilities</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Equipment Types</label>
                          <input type="text" name="equipment_types" value={formData.equipment_types} onChange={handleChange} className={inputClass} placeholder="dry_van, reefer, flatbed..." />
                        </div>
                        <div>
                          <label className={labelClass}>Service Area</label>
                          <input type="text" name="service_area" value={formData.service_area} onChange={handleChange} className={inputClass} placeholder="Southeast US, Nationwide..." />
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="flex items-center space-x-2">
                          <input type="checkbox" name="hazmat_certified" checked={formData.hazmat_certified} onChange={handleChange} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                          <span className={labelClass}>Hazmat Certified</span>
                        </label>
                      </div>
                    </div>

                    {/* Payment & Rating */}
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-md font-medium text-gray-900 mb-3">Payment & Rating</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className={labelClass}>Payment Terms</label>
                          <select name="payment_terms" value={formData.payment_terms} onChange={handleChange} className={inputClass}>
                            <option value="net_15">Net 15</option>
                            <option value="net_30">Net 30</option>
                            <option value="net_45">Net 45</option>
                            <option value="net_60">Net 60</option>
                            <option value="quick_pay">Quick Pay</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Safety Rating</label>
                          <select name="safety_rating" value={formData.safety_rating} onChange={handleChange} className={inputClass}>
                            <option value="not_rated">Not Rated</option>
                            <option value="satisfactory">Satisfactory</option>
                            <option value="conditional">Conditional</option>
                            <option value="unsatisfactory">Unsatisfactory</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Factoring Company</label>
                          <input type="text" name="factoring_company" value={formData.factoring_company} onChange={handleChange} className={inputClass} />
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="border-t border-gray-200 pt-4">
                      <label className={labelClass}>Notes</label>
                      <textarea name="notes" value={formData.notes} onChange={handleChange} className={inputClass} rows="3" />
                    </div>

          <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creating...' : 'Create Carrier'}
                    </button>
                  </div>
                </form>
      </div>
    </div>
  );
};

export default AddCarrier;
