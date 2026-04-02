import React, { useState, useEffect } from 'react';
import { XMarkIcon, DocumentTextIcon, CubeIcon, CheckIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

const CreateInvoice = ({ isOpen, onClose }) => {
  const { session, refreshAccessToken } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [availableLoads, setAvailableLoads] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedLoadIds, setSelectedLoadIds] = useState([]);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    tax_rate: '0',
    notes: '',
    internal_notes: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Auto-calculate due date when customer or issue date changes
  useEffect(() => {
    if (selectedCustomerId && formData.issue_date) {
      const customer = customers.find(c => c.id === parseInt(selectedCustomerId));
      if (customer) {
        const issueDate = new Date(formData.issue_date);
        let daysToAdd = 30;
        switch (customer.payment_terms) {
          case 'net_15': daysToAdd = 15; break;
          case 'net_30': daysToAdd = 30; break;
          case 'net_45': daysToAdd = 45; break;
          case 'net_60': daysToAdd = 60; break;
          case 'net_90': daysToAdd = 90; break;
          case 'due_on_receipt': daysToAdd = 0; break;
          case 'prepaid': daysToAdd = 0; break;
          default: daysToAdd = 30;
        }
        issueDate.setDate(issueDate.getDate() + daysToAdd);
        setFormData(prev => ({
          ...prev,
          due_date: issueDate.toISOString().split('T')[0],
        }));
      }
    }
  }, [selectedCustomerId, formData.issue_date, customers]);

  // Fetch delivered loads when customer changes
  useEffect(() => {
    if (selectedCustomerId) {
      fetchAvailableLoads(selectedCustomerId);
    } else {
      setAvailableLoads([]);
      setSelectedLoadIds([]);
    }
  }, [selectedCustomerId]);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/customers/?active=true`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      if (error.response?.status === 401) await refreshAccessToken();
    }
  };

  const fetchAvailableLoads = async (customerId) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/loads/?customer_id=${customerId}&status=delivered`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      setAvailableLoads(response.data);
    } catch (error) {
      console.error('Error fetching loads:', error);
    }
  };

  const toggleLoad = (loadId) => {
    setSelectedLoadIds(prev =>
      prev.includes(loadId) ? prev.filter(id => id !== loadId) : [...prev, loadId]
    );
  };

  const selectAllLoads = () => {
    if (selectedLoadIds.length === availableLoads.length) {
      setSelectedLoadIds([]);
    } else {
      setSelectedLoadIds(availableLoads.map(l => l.id));
    }
  };

  const selectedLoads = availableLoads.filter(l => selectedLoadIds.includes(l.id));
  const subtotal = selectedLoads.reduce((sum, l) => sum + (parseFloat(l.total_revenue) || 0), 0);
  const taxAmount = subtotal * (parseFloat(formData.tax_rate) || 0) / 100;
  const totalAmount = subtotal + taxAmount;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const newErrors = {};
    if (!selectedCustomerId) newErrors.customer = 'Select a customer';
    if (selectedLoadIds.length === 0) newErrors.loads = 'Select at least one load';
    if (!formData.issue_date) newErrors.issue_date = 'Issue date is required';
    if (!formData.due_date) newErrors.due_date = 'Due date is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/api/invoices/`, {
        customer: parseInt(selectedCustomerId),
        issue_date: formData.issue_date,
        due_date: formData.due_date,
        tax_rate: parseFloat(formData.tax_rate) || 0,
        notes: formData.notes,
        internal_notes: formData.internal_notes,
        load_ids: selectedLoadIds,
      }, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });

      onClose();
    } catch (error) {
      console.error('Error creating invoice:', error);
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

  const selectedCustomer = customers.find(c => c.id === parseInt(selectedCustomerId));

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const errorClass = "text-red-500 text-xs mt-1";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <DocumentTextIcon className="h-6 w-6 mr-2 text-blue-600" />
            Create Invoice — Step {step} of 3
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex mb-1 space-x-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="space-y-6">
                  {/* Step 1: Select Customer */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">Select Customer</h3>

                      <div>
                        <label className={labelClass}>Customer *</label>
                        <select
                          value={selectedCustomerId}
                          onChange={(e) => { setSelectedCustomerId(e.target.value); setErrors({}); }}
                          className={inputClass}
                        >
                          <option value="">Choose a customer...</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        {errors.customer && <p className={errorClass}>{errors.customer}</p>}
                      </div>

                      {selectedCustomer && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Customer Details</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span className="text-gray-500">Contact:</span> {selectedCustomer.contact_name || '—'}</div>
                            <div><span className="text-gray-500">Email:</span> {selectedCustomer.email || '—'}</div>
                            <div><span className="text-gray-500">Billing Email:</span> {selectedCustomer.billing_email || selectedCustomer.email || '—'}</div>
                            <div><span className="text-gray-500">Payment Terms:</span> {selectedCustomer.payment_terms_display}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Select Loads */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">Select Delivered Loads</h3>
                        {availableLoads.length > 0 && (
                          <button
                            onClick={selectAllLoads}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            {selectedLoadIds.length === availableLoads.length ? 'Deselect All' : 'Select All'}
                          </button>
                        )}
                      </div>
                      {errors.loads && <p className={errorClass}>{errors.loads}</p>}

                      {availableLoads.length === 0 ? (
                        <div className="text-center py-8">
                          <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">No delivered loads available for this customer.</p>
                          <p className="text-xs text-gray-400 mt-1">Loads must be in "Delivered" status to be invoiced.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {availableLoads.map(load => (
                            <div
                              key={load.id}
                              onClick={() => toggleLoad(load.id)}
                              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedLoadIds.includes(load.id)
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center">
                                <div className={`h-5 w-5 rounded border flex items-center justify-center mr-3 ${
                                  selectedLoadIds.includes(load.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                                }`}>
                                  {selectedLoadIds.includes(load.id) && <CheckIcon className="h-3 w-3 text-white" />}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{load.load_number}</div>
                                  <div className="text-xs text-gray-500">
                                    {load.pickup_location_display} → {load.delivery_location_display}
                                    {load.pickup_date && ` · ${new Date(load.pickup_date).toLocaleDateString()}`}
                                  </div>
                                  {load.customer_reference && (
                                    <div className="text-xs text-gray-400">Ref: {load.customer_reference}</div>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm font-medium text-gray-900">
                                ${parseFloat(load.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedLoadIds.length > 0 && (
                        <div className="bg-blue-50 rounded-lg p-3 text-right">
                          <span className="text-sm text-gray-600">Subtotal ({selectedLoadIds.length} load{selectedLoadIds.length !== 1 ? 's' : ''}): </span>
                          <span className="text-lg font-semibold text-gray-900">
                            ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 3: Invoice Details */}
                  {step === 3 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">Invoice Details</h3>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Issue Date *</label>
                          <input type="date" name="issue_date" value={formData.issue_date} onChange={handleChange} className={inputClass} />
                          {errors.issue_date && <p className={errorClass}>{errors.issue_date}</p>}
                        </div>
                        <div>
                          <label className={labelClass}>Due Date *</label>
                          <input type="date" name="due_date" value={formData.due_date} onChange={handleChange} className={inputClass} />
                          {errors.due_date && <p className={errorClass}>{errors.due_date}</p>}
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Tax Rate (%)</label>
                        <input type="number" name="tax_rate" value={formData.tax_rate} onChange={handleChange} className={inputClass} step="0.01" min="0" max="100" />
                      </div>

                      {/* Financial Summary */}
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Invoice Summary</h4>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Loads ({selectedLoadIds.length})</span>
                          <span className="text-gray-900">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {parseFloat(formData.tax_rate) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Tax ({formData.tax_rate}%)</span>
                            <span className="text-gray-900">${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-base font-semibold border-t border-gray-200 pt-2 mt-2">
                          <span>Total</span>
                          <span>${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Invoice Notes (visible to customer)</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange} className={inputClass} rows="2" placeholder="Thank you for your business..." />
                      </div>
                      <div>
                        <label className={labelClass}>Internal Notes</label>
                        <textarea name="internal_notes" value={formData.internal_notes} onChange={handleChange} className={inputClass} rows="2" placeholder="Internal notes..." />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer with navigation */}
                <div className="flex justify-between pt-4">
                  <div>
                    {step > 1 && (
                      <button
                        type="button"
                        onClick={() => setStep(step - 1)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Back
                      </button>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    {step < 3 ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (step === 1 && !selectedCustomerId) {
                            setErrors({ customer: 'Select a customer' });
                            return;
                          }
                          if (step === 2 && selectedLoadIds.length === 0) {
                            setErrors({ loads: 'Select at least one load' });
                            return;
                          }
                          setErrors({});
                          setStep(step + 1);
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Creating...' : 'Create Invoice'}
                      </button>
                    )}
                  </div>
                </div>
      </div>
    </div>
  );
};

export default CreateInvoice;
