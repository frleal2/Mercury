import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, TruckIcon, PencilIcon } from '@heroicons/react/24/outline';
import CarrierSafety from './CarrierSafety';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

const EditCarrier = ({ carrierId, isOpen, onClose }) => {
  const { session, refreshAccessToken } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [carrier, setCarrier] = useState(null);

  const [formData, setFormData] = useState({
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
    status: 'active',
    notes: '',
  });

  useEffect(() => {
    if (carrierId && isOpen) {
      fetchCarrier();
    }
  }, [carrierId, isOpen]);

  const fetchCarrier = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/carriers/${carrierId}/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      const data = response.data;
      setCarrier(data);
      setFormData({
        name: data.name || '',
        mc_number: data.mc_number || '',
        dot_number: data.dot_number || '',
        contact_name: data.contact_name || '',
        email: data.email || '',
        phone: data.phone || '',
        address_line_1: data.address_line_1 || '',
        address_line_2: data.address_line_2 || '',
        city: data.city || '',
        state: data.state || '',
        zip_code: data.zip_code || '',
        insurance_provider: data.insurance_provider || '',
        insurance_policy_number: data.insurance_policy_number || '',
        insurance_expiration: data.insurance_expiration || '',
        cargo_insurance_limit: data.cargo_insurance_limit || '',
        liability_insurance_limit: data.liability_insurance_limit || '',
        equipment_types: data.equipment_types || '',
        service_area: data.service_area || '',
        hazmat_certified: data.hazmat_certified || false,
        payment_terms: data.payment_terms || 'net_30',
        factoring_company: data.factoring_company || '',
        safety_rating: data.safety_rating || 'not_rated',
        status: data.status || 'active',
        notes: data.notes || '',
      });
    } catch (error) {
      console.error('Error fetching carrier:', error);
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
    if (!formData.name) newErrors.name = 'Carrier name is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        cargo_insurance_limit: formData.cargo_insurance_limit || null,
        liability_insurance_limit: formData.liability_insurance_limit || null,
        insurance_expiration: formData.insurance_expiration || null,
        company: carrier.company,
      };

      await axios.patch(`${BASE_URL}/api/carriers/${carrierId}/`, payload, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });

      setEditing(false);
      fetchCarrier();
    } catch (error) {
      console.error('Error updating carrier:', error);
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

  const handleStatusChange = async (newStatus) => {
    try {
      await axios.patch(`${BASE_URL}/api/carriers/${carrierId}/`, {
        status: newStatus,
        company: carrier.company,
      }, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      fetchCarrier();
    } catch (error) {
      console.error('Error updating carrier status:', error);
    }
  };

  const inputClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm";
  const labelClass = "block text-sm font-medium text-gray-700";
  const errorClass = "mt-1 text-sm text-red-600";
  const valueClass = "mt-1 text-sm text-gray-900";

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    blacklisted: 'bg-red-100 text-red-800',
  };

  const isInsuranceExpired = carrier?.insurance_expiration && new Date(carrier.insurance_expiration) < new Date();

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                <div className="bg-indigo-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <TruckIcon className="h-6 w-6 text-white mr-2" />
                      <Dialog.Title className="text-lg font-semibold text-white">
                        {loading ? 'Loading...' : carrier?.name || 'Carrier Details'}
                      </Dialog.Title>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!loading && !editing && (
                        <button
                          onClick={() => setEditing(true)}
                          className="text-white hover:text-gray-200 p-1 rounded"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button onClick={onClose} className="text-white hover:text-gray-200">
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center items-center py-16">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="ml-3 text-gray-600">Loading carrier...</p>
                  </div>
                ) : (
                  <>
                    <div className="px-6 py-4 max-h-[65vh] overflow-y-auto space-y-4">
                      {/* Status & MC/DOT */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[carrier?.status] || 'bg-gray-100 text-gray-800'}`}>
                            {carrier?.status_display}
                          </span>
                          {carrier?.hazmat_certified && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              HAZMAT
                            </span>
                          )}
                        </div>
                        {carrier?.company_name && (
                          <span className="text-sm text-gray-500">Company: {carrier.company_name}</span>
                        )}
                      </div>

                      {/* Carrier Info */}
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-md font-medium text-gray-900 mb-3">Carrier Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>Carrier Name *</label>
                            {editing ? (
                              <>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} />
                                {errors.name && <p className={errorClass}>{errors.name}</p>}
                              </>
                            ) : (
                              <p className={valueClass}>{carrier?.name || '—'}</p>
                            )}
                          </div>
                          <div>
                            <label className={labelClass}>Contact Person</label>
                            {editing ? (
                              <input type="text" name="contact_name" value={formData.contact_name} onChange={handleChange} className={inputClass} />
                            ) : (
                              <p className={valueClass}>{carrier?.contact_name || '—'}</p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <label className={labelClass}>MC Number</label>
                            {editing ? (
                              <input type="text" name="mc_number" value={formData.mc_number} onChange={handleChange} className={inputClass} />
                            ) : (
                              <p className={valueClass}>{carrier?.mc_number || '—'}</p>
                            )}
                          </div>
                          <div>
                            <label className={labelClass}>DOT Number</label>
                            {editing ? (
                              <input type="text" name="dot_number" value={formData.dot_number} onChange={handleChange} className={inputClass} />
                            ) : (
                              <p className={valueClass}>{carrier?.dot_number || '—'}</p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <label className={labelClass}>Email</label>
                            {editing ? (
                              <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} />
                            ) : (
                              <p className={valueClass}>{carrier?.email || '—'}</p>
                            )}
                          </div>
                          <div>
                            <label className={labelClass}>Phone</label>
                            {editing ? (
                              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className={inputClass} />
                            ) : (
                              <p className={valueClass}>{carrier?.phone || '—'}</p>
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
                            {carrier?.address_line_1 ? (
                              <>
                                <p>{carrier.address_line_1}</p>
                                {carrier.address_line_2 && <p>{carrier.address_line_2}</p>}
                                <p>
                                  {[carrier.city, carrier.state].filter(Boolean).join(', ')}
                                  {carrier.zip_code ? ` ${carrier.zip_code}` : ''}
                                </p>
                              </>
                            ) : (
                              <p className="text-gray-400">No address on file</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Insurance */}
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-md font-medium text-gray-900 mb-3">Insurance</h4>
                        {editing ? (
                          <>
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
                          </>
                        ) : (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className={labelClass}>Provider</label>
                              <p className={valueClass}>{carrier?.insurance_provider || '—'}</p>
                            </div>
                            <div>
                              <label className={labelClass}>Policy #</label>
                              <p className={valueClass}>{carrier?.insurance_policy_number || '—'}</p>
                            </div>
                            <div>
                              <label className={labelClass}>Expiration</label>
                              <p className={`${valueClass} ${isInsuranceExpired ? 'text-red-600 font-medium' : ''}`}>
                                {carrier?.insurance_expiration
                                  ? `${new Date(carrier.insurance_expiration).toLocaleDateString()}${isInsuranceExpired ? ' (EXPIRED)' : ''}`
                                  : '—'}
                              </p>
                            </div>
                            <div>
                              <label className={labelClass}>Cargo / Liability Limits</label>
                              <p className={valueClass}>
                                {carrier?.cargo_insurance_limit
                                  ? `$${parseFloat(carrier.cargo_insurance_limit).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
                                  : '—'}
                                {' / '}
                                {carrier?.liability_insurance_limit
                                  ? `$${parseFloat(carrier.liability_insurance_limit).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
                                  : '—'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Capabilities */}
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-md font-medium text-gray-900 mb-3">Capabilities</h4>
                        {editing ? (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className={labelClass}>Equipment Types</label>
                                <input type="text" name="equipment_types" value={formData.equipment_types} onChange={handleChange} className={inputClass} />
                              </div>
                              <div>
                                <label className={labelClass}>Service Area</label>
                                <input type="text" name="service_area" value={formData.service_area} onChange={handleChange} className={inputClass} />
                              </div>
                            </div>
                            <div className="mt-3">
                              <label className="flex items-center space-x-2">
                                <input type="checkbox" name="hazmat_certified" checked={formData.hazmat_certified} onChange={handleChange} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                <span className={labelClass}>Hazmat Certified</span>
                              </label>
                            </div>
                          </>
                        ) : (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className={labelClass}>Equipment Types</label>
                              <p className={valueClass}>{carrier?.equipment_types || '—'}</p>
                            </div>
                            <div>
                              <label className={labelClass}>Service Area</label>
                              <p className={valueClass}>{carrier?.service_area || '—'}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Payment & Rating */}
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-md font-medium text-gray-900 mb-3">Payment & Rating</h4>
                        {editing ? (
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
                        ) : (
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className={labelClass}>Payment Terms</label>
                              <p className={valueClass}>{carrier?.payment_terms_display || '—'}</p>
                            </div>
                            <div>
                              <label className={labelClass}>Safety Rating</label>
                              <p className={valueClass}>{carrier?.safety_rating_display || '—'}</p>
                            </div>
                            <div>
                              <label className={labelClass}>Factoring Company</label>
                              <p className={valueClass}>{carrier?.factoring_company || '—'}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Status (edit mode) */}
                      {editing && (
                        <div className="border-t border-gray-200 pt-4">
                          <h4 className="text-md font-medium text-gray-900 mb-3">Status</h4>
                          <select name="status" value={formData.status} onChange={handleChange} className={inputClass}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="pending">Pending Approval</option>
                            <option value="blacklisted">Blacklisted</option>
                          </select>
                        </div>
                      )}

                      {/* Notes */}
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-md font-medium text-gray-900 mb-3">Notes</h4>
                        {editing ? (
                          <textarea name="notes" value={formData.notes} onChange={handleChange} className={inputClass} rows="3" />
                        ) : (
                          <p className={`${valueClass} ${!carrier?.notes ? 'text-gray-400' : ''}`}>
                            {carrier?.notes || 'No notes'}
                          </p>
                        )}
                      </div>

                      {/* FMCSA Safety Data */}
                      {carrier?.dot_number && (
                        <div className="border-t border-gray-200 pt-4">
                          <CarrierSafety carrierId={carrierId} />
                        </div>
                      )}

                      {/* Metadata */}
                      {carrier?.created_at && (
                        <div className="border-t border-gray-200 pt-4">
                          <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
                            <div>Created: {new Date(carrier.created_at).toLocaleDateString()}</div>
                            <div>Updated: {new Date(carrier.updated_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-6 py-4 flex justify-between">
                      <div className="flex space-x-2">
                        {carrier?.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange('inactive')}
                            className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50"
                          >
                            Deactivate
                          </button>
                        )}
                        {carrier?.status === 'inactive' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange('active')}
                            className="px-4 py-2 text-sm font-medium text-green-700 bg-white border border-green-300 rounded-md hover:bg-green-50"
                          >
                            Reactivate
                          </button>
                        )}
                        {carrier?.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange('active')}
                            className="px-4 py-2 text-sm font-medium text-green-700 bg-white border border-green-300 rounded-md hover:bg-green-50"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                      <div className="flex space-x-3">
                        {editing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => { setEditing(false); fetchCarrier(); }}
                              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleSave}
                              disabled={saving}
                              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default EditCarrier;
