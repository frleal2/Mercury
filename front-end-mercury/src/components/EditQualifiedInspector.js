import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import { 
  XMarkIcon,
  PencilIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

function EditQualifiedInspector({ isOpen, onClose, inspector, onInspectorUpdated }) {
  const { session, refreshAccessToken } = useSession();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    certification_number: '',
    certification_date: '',
    certification_expiry_date: '',
    issuing_authority: '',
    qualification_types: [],
    notes: ''
  });
  const [qualificationInput, setQualificationInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const qualificationOptions = [
    'ASE Certified',
    'State Inspector License',
    'DOT Inspector Certified',
    'Commercial Vehicle Inspector',
    'Manufacturer Certified',
    'CVSA Inspector',
    'Other'
  ];

  useEffect(() => {
    if (inspector) {
      setFormData({
        name: inspector.name || '',
        email: inspector.email || '',
        phone: inspector.phone || '',
        certification_number: inspector.certification_number || '',
        certification_date: inspector.certification_date || '',
        certification_expiry_date: inspector.certification_expiry_date || '',
        issuing_authority: inspector.issuing_authority || '',
        qualification_types: inspector.qualification_types || [],
        notes: inspector.notes || ''
      });
    }
  }, [inspector]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        certification_date: formData.certification_date || null,
        certification_expiry_date: formData.certification_expiry_date || null
      };

      await axios.patch(`${BASE_URL}/api/qualified-inspectors/${inspector.id}/`, submitData, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });

      onInspectorUpdated();
    } catch (error) {
      console.error('Error updating qualified inspector:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
      setError(error.response?.data?.error || 'Failed to update qualified inspector');
    } finally {
      setLoading(false);
    }
  };

  const addQualification = () => {
    if (qualificationInput.trim() && !formData.qualification_types.includes(qualificationInput.trim())) {
      setFormData(prev => ({
        ...prev,
        qualification_types: [...prev.qualification_types, qualificationInput.trim()]
      }));
      setQualificationInput('');
    }
  };

  const removeQualification = (qualification) => {
    setFormData(prev => ({
      ...prev,
      qualification_types: prev.qualification_types.filter(q => q !== qualification)
    }));
  };

  const handleQualificationSelect = (qualification) => {
    if (!formData.qualification_types.includes(qualification)) {
      setFormData(prev => ({
        ...prev,
        qualification_types: [...prev.qualification_types, qualification]
      }));
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex items-center justify-between mb-6">
                  <span className="flex items-center">
                    <PencilIcon className="h-6 w-6 mr-2" />
                    Edit Qualified Inspector
                  </span>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Inspector Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="certification_number" className="block text-sm font-medium text-gray-700 mb-1">
                        Certification Number *
                      </label>
                      <input
                        type="text"
                        id="certification_number"
                        value={formData.certification_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, certification_number: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Certification Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="certification_date" className="block text-sm font-medium text-gray-700 mb-1">
                        Certification Date *
                      </label>
                      <input
                        type="date"
                        id="certification_date"
                        value={formData.certification_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, certification_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="certification_expiry_date" className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date (Optional)
                      </label>
                      <input
                        type="date"
                        id="certification_expiry_date"
                        value={formData.certification_expiry_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, certification_expiry_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="issuing_authority" className="block text-sm font-medium text-gray-700 mb-1">
                      Issuing Authority *
                    </label>
                    <input
                      type="text"
                      id="issuing_authority"
                      value={formData.issuing_authority}
                      onChange={(e) => setFormData(prev => ({ ...prev, issuing_authority: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., State DOT, ASE, CVSA, etc."
                      required
                    />
                  </div>

                  {/* Qualifications */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Qualification Types
                    </label>
                    
                    {/* Quick Select Options */}
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-2">Quick select:</p>
                      <div className="flex flex-wrap gap-2">
                        {qualificationOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleQualificationSelect(option)}
                            className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={formData.qualification_types.includes(option)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Input */}
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={qualificationInput}
                        onChange={(e) => setQualificationInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addQualification())}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add custom qualification..."
                      />
                      <button
                        type="button"
                        onClick={addQualification}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Add
                      </button>
                    </div>

                    {/* Selected Qualifications */}
                    {formData.qualification_types.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">Selected qualifications:</p>
                        <div className="flex flex-wrap gap-2">
                          {formData.qualification_types.map((qualification, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              <ShieldCheckIcon className="h-3 w-3 mr-1" />
                              {qualification}
                              <button
                                type="button"
                                onClick={() => removeQualification(qualification)}
                                className="ml-1 hover:text-blue-900"
                              >
                                <XCircleIcon className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes
                    </label>
                    <textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Additional information about inspector qualifications, specializations, etc..."
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      disabled={loading}
                    >
                      {loading ? 'Updating...' : 'Update Inspector'}
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
}

export default EditQualifiedInspector;