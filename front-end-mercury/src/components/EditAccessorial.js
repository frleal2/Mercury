import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const RATE_UNITS = [
  { value: 'flat', label: 'Flat Fee' }, { value: 'per_hour', label: 'Per Hour' },
  { value: 'per_mile', label: 'Per Mile' }, { value: 'per_unit', label: 'Per Unit' },
  { value: 'percentage', label: 'Percentage of Line Haul' },
];

function EditAccessorial({ accessorialId, isOpen, onClose }) {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '', code: '', default_rate: '', rate_unit: 'flat', description: '', active: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${BASE_URL}/api/accessorial-charges/${accessorialId}/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` },
        });
        const acc = res.data;
        setFormData({
          name: acc.name || '', code: acc.code || '', default_rate: acc.default_rate || '',
          rate_unit: acc.rate_unit || 'flat', description: acc.description || '', active: acc.active,
        });
      } catch (e) { console.error('Error fetching accessorial:', e); }
      finally { setLoading(false); }
    };
    if (isOpen && accessorialId) fetchData();
  }, [isOpen, accessorialId, session.accessToken]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axios.put(`${BASE_URL}/api/accessorial-charges/${accessorialId}/`, formData, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      onClose();
    } catch (e) {
      setError(e.response?.data ? JSON.stringify(e.response.data) : 'Failed to update accessorial charge');
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">Edit Accessorial Charge</Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-5 w-5" /></button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <>
                    {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Name</label>
                          <input type="text" name="name" value={formData.name} onChange={handleChange} required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Code</label>
                          <input type="text" name="code" value={formData.code} onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Default Rate ($)</label>
                          <input type="number" step="0.01" name="default_rate" value={formData.default_rate} onChange={handleChange} required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Rate Unit</label>
                          <select name="rate_unit" value={formData.rate_unit} onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                            {RATE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Description</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="active" checked={formData.active} onChange={handleChange}
                          className="rounded border-gray-300" />
                        Active
                      </label>
                      <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                          Cancel
                        </button>
                        <button type="submit"
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                          Update Accessorial
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default EditAccessorial;
