import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import { XMarkIcon, MapPinIcon } from '@heroicons/react/24/outline';

const EQUIPMENT_TYPES = [
  { value: 'dry_van', label: 'Dry Van' }, { value: 'reefer', label: 'Reefer' },
  { value: 'flatbed', label: 'Flatbed' }, { value: 'step_deck', label: 'Step Deck' },
  { value: 'lowboy', label: 'Lowboy' }, { value: 'tanker', label: 'Tanker' },
  { value: 'power_only', label: 'Power Only' }, { value: 'box_truck', label: 'Box Truck' },
  { value: 'hotshot', label: 'Hotshot' }, { value: 'other', label: 'Other' },
];

function AddRateLane({ isOpen, onClose }) {
  const { session } = useSession();
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    origin_city: '', origin_state: '', destination_city: '', destination_state: '',
    equipment_type: 'dry_van', rate_type: 'flat', customer_rate: '', carrier_cost: '',
    estimated_miles: '', fuel_surcharge_pct: '0', effective_date: '', expiration_date: '',
    customer: '', active: true, notes: '',
  });

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/customers/?active=true`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` },
        });
        setCustomers(res.data.filter(c => c.active));
      } catch (e) { console.error('Error fetching customers:', e); }
    };
    if (isOpen) fetchCustomers();
  }, [isOpen, session.accessToken]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...formData };
      if (!payload.customer) delete payload.customer;
      if (!payload.expiration_date) delete payload.expiration_date;
      if (!payload.estimated_miles) delete payload.estimated_miles;
      if (!payload.carrier_cost) delete payload.carrier_cost;
      await axios.post(`${BASE_URL}/api/rate-lanes/`, payload, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      onClose();
    } catch (e) {
      setError(e.response?.data ? JSON.stringify(e.response.data) : 'Failed to create rate lane');
    }
  };

  // Margin calculation
  const customerRate = parseFloat(formData.customer_rate) || 0;
  const carrierCost = parseFloat(formData.carrier_cost) || 0;
  const fuelPct = parseFloat(formData.fuel_surcharge_pct) || 0;
  const fuelAmount = customerRate * fuelPct / 100;
  const totalCharge = customerRate + fuelAmount;
  const profit = carrierCost ? totalCharge - carrierCost : null;
  const margin = totalCharge > 0 && carrierCost ? ((totalCharge - carrierCost) / totalCharge * 100).toFixed(1) : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <MapPinIcon className="h-6 w-6 mr-2 text-blue-600" />
            Add Rate Lane
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></button>
        </div>

                {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Lane */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Lane</h3>
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Origin City</label>
                        <input type="text" name="origin_city" value={formData.origin_city} onChange={handleChange} required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Dallas" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Origin State</label>
                        <input type="text" name="origin_state" value={formData.origin_state} onChange={handleChange} required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="TX" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Dest City</label>
                        <input type="text" name="destination_city" value={formData.destination_city} onChange={handleChange} required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Atlanta" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Dest State</label>
                        <input type="text" name="destination_state" value={formData.destination_state} onChange={handleChange} required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="GA" />
                      </div>
                    </div>
                  </div>

                  {/* Equipment & Customer */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Equipment Type</label>
                      <select name="equipment_type" value={formData.equipment_type} onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        {EQUIPMENT_TYPES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Rate Type</label>
                      <select name="rate_type" value={formData.rate_type} onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="flat">Flat Rate</option>
                        <option value="per_mile">Per Mile</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Customer (optional)</label>
                      <select name="customer" value={formData.customer} onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">Default (all customers)</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Pricing</h3>
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Customer Rate ($)</label>
                        <input type="number" step="0.01" name="customer_rate" value={formData.customer_rate} onChange={handleChange} required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="2500.00" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Carrier Cost ($)</label>
                        <input type="number" step="0.01" name="carrier_cost" value={formData.carrier_cost} onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="2000.00" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Fuel Surcharge %</label>
                        <input type="number" step="0.01" name="fuel_surcharge_pct" value={formData.fuel_surcharge_pct} onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Est. Miles</label>
                        <input type="number" name="estimated_miles" value={formData.estimated_miles} onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="800" />
                      </div>
                    </div>
                    {/* Margin preview */}
                    {customerRate > 0 && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          Total Charge: <span className="font-medium text-gray-900">${totalCharge.toFixed(2)}</span>
                          {fuelAmount > 0 && <span className="text-gray-400"> (incl. ${fuelAmount.toFixed(2)} FSC)</span>}
                        </span>
                        {profit !== null && (
                          <span>
                            Profit: <span className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>${profit.toFixed(2)}</span>
                            <span className={`ml-2 font-medium ${parseFloat(margin) >= 15 ? 'text-green-600' : 'text-yellow-600'}`}>({margin}%)</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Validity */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Effective Date</label>
                      <input type="date" name="effective_date" value={formData.effective_date} onChange={handleChange} required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Expiration Date</label>
                      <input type="date" name="expiration_date" value={formData.expiration_date} onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="active" checked={formData.active} onChange={handleChange}
                          className="rounded border-gray-300" />
                        Active
                      </label>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Notes</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Optional notes..." />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      Cancel
                    </button>
                    <button type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      Create Rate Lane
                    </button>
                  </div>
                </form>
      </div>
    </div>
  );
}

export default AddRateLane;
