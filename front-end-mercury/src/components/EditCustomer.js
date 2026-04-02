import React, { useState, useEffect } from 'react';
import { XMarkIcon, BuildingOfficeIcon, PencilIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

const EditCustomer = ({ customerId, isOpen, onClose }) => {
  const { session, refreshAccessToken } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [customer, setCustomer] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    zip_code: '',
    billing_email: '',
    payment_terms: 'net_30',
    credit_limit: '',
    notes: '',
    active: true,
  });

  useEffect(() => {
    if (customerId && isOpen) {
      fetchCustomer();
    }
  }, [customerId, isOpen]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/customers/${customerId}/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      const data = response.data;
      setCustomer(data);
      setFormData({
        name: data.name || '',
        contact_name: data.contact_name || '',
        email: data.email || '',
        phone: data.phone || '',
        address_line_1: data.address_line_1 || '',
        address_line_2: data.address_line_2 || '',
        city: data.city || '',
        state: data.state || '',
        zip_code: data.zip_code || '',
        billing_email: data.billing_email || '',
        payment_terms: data.payment_terms || 'net_30',
        credit_limit: data.credit_limit || '',
        notes: data.notes || '',
        active: data.active,
      });
    } catch (error) {
      console.error('Error fetching customer:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSave = async () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Customer name is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        credit_limit: formData.credit_limit || null,
        company: customer.company,
      };

      await axios.patch(`${BASE_URL}/api/customers/${customerId}/`, payload, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });

      setEditing(false);
      fetchCustomer();
    } catch (error) {
      console.error('Error updating customer:', error);
      if (error.response?.data) {
        const serverErrors = {};
        Object.entries(error.response.data).forEach(([key, value]) => {
          serverErrors[key] = Array.isArray(value) ? value[0] : value;
        });
        setErrors(serverErrors);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      await axios.patch(`${BASE_URL}/api/customers/${customerId}/`, {
        active: !customer.active,
        company: customer.company,
      }, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      fetchCustomer();
    } catch (error) {
      console.error('Error toggling customer status:', error);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const errorClass = "text-red-500 text-xs mt-1";
  const valueClass = "mt-1 text-sm text-gray-900";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <BuildingOfficeIcon className="h-6 w-6 mr-2 text-blue-600" />
            {loading ? 'Loading...' : customer?.name || 'Customer Details'}
          </h3>
          <div className="flex items-center space-x-2">
            {!loading && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
                title="Edit"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

                {loading ? (
                  <div className="flex justify-center items-center py-16">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-3 text-gray-600">Loading customer...</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {/* Status Badge */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            customer?.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {customer?.active ? 'Active' : 'Inactive'}
                        </span>
                        {customer?.company_name && (
                          <span className="text-sm text-gray-500">Company: {customer.company_name}</span>
                        )}
                      </div>

                      {/* Customer Info */}
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-md font-medium text-gray-900 mb-3">Customer Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>Customer Name *</label>
                            {editing ? (
                              <>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} />
                                {errors.name && <p className={errorClass}>{errors.name}</p>}
                              </>
                            ) : (
                              <p className={valueClass}>{customer?.name || '—'}</p>
                            )}
                          </div>
                          <div>
                            <label className={labelClass}>Contact Person</label>
                            {editing ? (
                              <input type="text" name="contact_name" value={formData.contact_name} onChange={handleChange} className={inputClass} />
                            ) : (
                              <p className={valueClass}>{customer?.contact_name || '—'}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <label className={labelClass}>Email</label>
                            {editing ? (
                              <>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} />
                                {errors.email && <p className={errorClass}>{errors.email}</p>}
                              </>
                            ) : (
                              <p className={valueClass}>{customer?.email || '—'}</p>
                            )}
                          </div>
                          <div>
                            <label className={labelClass}>Phone</label>
                            {editing ? (
                              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className={inputClass} />
                            ) : (
                              <p className={valueClass}>{customer?.phone || '—'}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Address */}
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-md font-medium text-gray-900 mb-3">Address</h4>
                        {editing ? (
                          <>
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
                          </>
                        ) : (
                          <div className={valueClass}>
                            {customer?.address_line_1 ? (
                              <>
                                <p>{customer.address_line_1}</p>
                                {customer.address_line_2 && <p>{customer.address_line_2}</p>}
                                <p>
                                  {[customer.city, customer.state].filter(Boolean).join(', ')}
                                  {customer.zip_code ? ` ${customer.zip_code}` : ''}
                                </p>
                              </>
                            ) : (
                              <p className="text-gray-400">No address on file</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Billing */}
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-md font-medium text-gray-900 mb-3">Billing</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className={labelClass}>Billing Email</label>
                            {editing ? (
                              <input type="email" name="billing_email" value={formData.billing_email} onChange={handleChange} className={inputClass} />
                            ) : (
                              <p className={valueClass}>{customer?.billing_email || '—'}</p>
                            )}
                          </div>
                          <div>
                            <label className={labelClass}>Payment Terms</label>
                            {editing ? (
                              <select name="payment_terms" value={formData.payment_terms} onChange={handleChange} className={inputClass}>
                                <option value="due_on_receipt">Due on Receipt</option>
                                <option value="net_15">Net 15</option>
                                <option value="net_30">Net 30</option>
                                <option value="net_45">Net 45</option>
                                <option value="net_60">Net 60</option>
                                <option value="net_90">Net 90</option>
                                <option value="prepaid">Prepaid</option>
                              </select>
                            ) : (
                              <p className={valueClass}>{customer?.payment_terms_display || '—'}</p>
                            )}
                          </div>
                          <div>
                            <label className={labelClass}>Credit Limit</label>
                            {editing ? (
                              <input type="number" name="credit_limit" value={formData.credit_limit} onChange={handleChange} className={inputClass} step="0.01" />
                            ) : (
                              <p className={valueClass}>
                                {customer?.credit_limit
                                  ? `$${parseFloat(customer.credit_limit).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                  : '—'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-md font-medium text-gray-900 mb-3">Notes</h4>
                        {editing ? (
                          <textarea name="notes" value={formData.notes} onChange={handleChange} className={inputClass} rows="3" />
                        ) : (
                          <p className={`${valueClass} ${!customer?.notes ? 'text-gray-400' : ''}`}>
                            {customer?.notes || 'No notes'}
                          </p>
                        )}
                      </div>

                      {/* Metadata */}
                      {customer?.created_at && (
                        <div className="border-t border-gray-200 pt-4">
                          <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
                            <div>Created: {new Date(customer.created_at).toLocaleDateString()}</div>
                            <div>Updated: {new Date(customer.updated_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between pt-4">
                      <button
                        type="button"
                        onClick={handleToggleActive}
                        className={`px-4 py-2 text-sm font-medium rounded-md border ${
                          customer?.active
                            ? 'text-red-700 bg-white border-red-300 hover:bg-red-50'
                            : 'text-green-700 bg-white border-green-300 hover:bg-green-50'
                        }`}
                      >
                        {customer?.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                      <div className="flex space-x-3">
                        {editing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => { setEditing(false); fetchCustomer(); }}
                              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleSave}
                              disabled={saving}
                              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
      </div>
    </div>
  );
};

export default EditCustomer;
