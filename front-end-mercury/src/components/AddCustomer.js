import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, UserIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

const AddCustomer = ({ isOpen, onClose, onCustomerCreated, defaultCompany }) => {
  const { session, refreshAccessToken } = useSession();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    company: defaultCompany || '',
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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    if (!formData.company) newErrors.company = 'Company is required';
    if (!formData.name) newErrors.name = 'Customer name is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        company: parseInt(formData.company),
        credit_limit: formData.credit_limit || null,
      };

      const response = await axios.post(`${BASE_URL}/api/customers/`, payload, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });

      if (onCustomerCreated) {
        onCustomerCreated(response.data);
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error creating customer:', error);
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

  const inputClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm";
  const labelClass = "block text-sm font-medium text-gray-700";
  const errorClass = "mt-1 text-sm text-red-600";

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300" enterFrom="opacity-0 translate-y-4" enterTo="opacity-100 translate-y-0"
              leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-4"
            >
              <Dialog.Panel className="relative w-full max-w-2xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="bg-blue-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <UserIcon className="h-6 w-6 text-white mr-2" />
                      <Dialog.Title className="text-lg font-semibold text-white">
                        New Customer
                      </Dialog.Title>
                    </div>
                    <button onClick={onClose} className="text-white hover:text-gray-200">
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-4">
                    
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

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Customer Name *</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} placeholder="ABC Shipping Inc." />
                        {errors.name && <p className={errorClass}>{errors.name}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Contact Person</label>
                        <input type="text" name="contact_name" value={formData.contact_name} onChange={handleChange} className={inputClass} placeholder="John Smith" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} placeholder="contact@example.com" />
                        {errors.email && <p className={errorClass}>{errors.email}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Phone</label>
                        <input type="text" name="phone" value={formData.phone} onChange={handleChange} className={inputClass} placeholder="(555) 123-4567" />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Address Line 1</label>
                      <input type="text" name="address_line_1" value={formData.address_line_1} onChange={handleChange} className={inputClass} placeholder="123 Main St" />
                    </div>
                    <div>
                      <label className={labelClass}>Address Line 2</label>
                      <input type="text" name="address_line_2" value={formData.address_line_2} onChange={handleChange} className={inputClass} placeholder="Suite 100" />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass}>City</label>
                        <input type="text" name="city" value={formData.city} onChange={handleChange} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>State</label>
                        <input type="text" name="state" value={formData.state} onChange={handleChange} className={inputClass} maxLength="2" placeholder="TX" />
                      </div>
                      <div>
                        <label className={labelClass}>ZIP</label>
                        <input type="text" name="zip_code" value={formData.zip_code} onChange={handleChange} className={inputClass} />
                      </div>
                    </div>

                    <h4 className="text-md font-medium text-gray-900 pt-2">Billing</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass}>Billing Email</label>
                        <input type="email" name="billing_email" value={formData.billing_email} onChange={handleChange} className={inputClass} placeholder="billing@example.com" />
                      </div>
                      <div>
                        <label className={labelClass}>Payment Terms</label>
                        <select name="payment_terms" value={formData.payment_terms} onChange={handleChange} className={inputClass}>
                          <option value="due_on_receipt">Due on Receipt</option>
                          <option value="net_15">Net 15</option>
                          <option value="net_30">Net 30</option>
                          <option value="net_45">Net 45</option>
                          <option value="net_60">Net 60</option>
                          <option value="net_90">Net 90</option>
                          <option value="prepaid">Prepaid</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Credit Limit ($)</label>
                        <input type="number" name="credit_limit" value={formData.credit_limit} onChange={handleChange} className={inputClass} step="0.01" placeholder="0.00" />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Notes</label>
                      <textarea name="notes" value={formData.notes} onChange={handleChange} className={inputClass} rows="2" placeholder="Any notes about this customer..." />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                      Cancel
                    </button>
                    <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50">
                      {loading ? 'Creating...' : 'Create Customer'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default AddCustomer;
