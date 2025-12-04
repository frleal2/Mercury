import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import { 
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

function RepairCertificationModal({ isOpen, onClose, inspection, onRepairCompleted }) {
  const { session, refreshAccessToken } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [defects, setDefects] = useState([{
    defect_type: 'other',
    defect_description: '',
    operation_impact: 'prohibited',
    affects_safety: true,
    repair_required: true,
    repair_completed: false,
    repair_description: '',
    repair_unnecessary_reason: ''
  }]);

  const defectTypes = [
    { value: 'service_brakes', label: 'Service Brakes (CFR 396.11(a)(1)(i))' },
    { value: 'parking_brake', label: 'Parking Brake (CFR 396.11(a)(1)(ii))' },
    { value: 'steering_mechanism', label: 'Steering Mechanism (CFR 396.11(a)(1)(iii))' },
    { value: 'lighting_devices', label: 'Lighting Devices & Reflectors (CFR 396.11(a)(1)(iv))' },
    { value: 'tires', label: 'Tires (CFR 396.11(a)(1)(v))' },
    { value: 'horn', label: 'Horn (CFR 396.11(a)(1)(vi))' },
    { value: 'windshield_wipers', label: 'Windshield Wipers (CFR 396.11(a)(1)(vii))' },
    { value: 'rear_vision_mirrors', label: 'Rear Vision Mirrors (CFR 396.11(a)(1)(viii))' },
    { value: 'coupling_devices', label: 'Coupling Devices (CFR 396.11(a)(1)(ix))' },
    { value: 'wheels_and_rims', label: 'Wheels and Rims (CFR 396.11(a)(1)(x))' },
    { value: 'emergency_equipment', label: 'Emergency Equipment (CFR 396.11(a)(1)(xi))' },
    { value: 'other', label: 'Other Safety-Related Defect' }
  ];

  const operationImpactOptions = [
    { value: 'safe', label: 'Safe to Operate - No impact on safety', color: 'text-green-700' },
    { value: 'conditional', label: 'Conditional Operation - Monitor closely', color: 'text-yellow-700' },
    { value: 'prohibited', label: 'Operation Prohibited - CFR 396.7 violation', color: 'text-red-700' },
    { value: 'out_of_service', label: 'Out of Service - Immediate repair required', color: 'text-red-900' }
  ];

  const addDefect = () => {
    setDefects([...defects, {
      defect_type: 'other',
      defect_description: '',
      operation_impact: 'prohibited',
      affects_safety: true,
      repair_required: true,
      repair_completed: false,
      repair_description: '',
      repair_unnecessary_reason: ''
    }]);
  };

  const removeDefect = (index) => {
    setDefects(defects.filter((_, i) => i !== index));
  };

  const updateDefect = (index, field, value) => {
    const updated = [...defects];
    updated[index] = { ...updated[index], [field]: value };
    setDefects(updated);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      // Validate defects
      for (let defect of defects) {
        if (!defect.defect_description.trim()) {
          setError('All defects must have a description');
          return;
        }
        if (defect.repair_required && defect.repair_completed && !defect.repair_description.trim()) {
          setError('Completed repairs must have a repair description');
          return;
        }
        if (!defect.repair_required && !defect.repair_unnecessary_reason.trim()) {
          setError('If no repair is required, please provide a reason');
          return;
        }
      }

      // Create repair certifications
      const promises = defects.map(defect => 
        axios.post(`${BASE_URL}/api/TripInspectionRepairCertification/`, {
          inspection: inspection.id,
          ...defect
        }, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        })
      );

      await Promise.all(promises);

      // Vehicle status will be updated automatically by the backend based on operation_impact
      // No need to manually update here as the TripInspectionRepairCertification.save() method handles this

      console.log('Repair certifications created successfully');
      onRepairCompleted();
      onClose();
    } catch (error) {
      console.error('Error creating repair certifications:', error);
      setError(error.response?.data?.error || 'Failed to record repair certifications');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  <div className="flex items-center">
                    <WrenchScrewdriverIcon className="h-6 w-6 mr-2 text-orange-600" />
                    <span>Vehicle Defects & Repair Certification</span>
                  </div>
                </Dialog.Title>

                {error && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                      {error}
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">CFR 396.11 Requirement</h4>
                    <p className="text-sm text-blue-800">
                      Document all defects found during inspection. Safety-critical defects must be repaired 
                      before the vehicle can be operated again.
                    </p>
                  </div>

                  {defects.map((defect, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h5 className="font-medium text-gray-900">Defect #{index + 1}</h5>
                        {defects.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDefect(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Defect Type (CFR 396.11) *
                        </label>
                        <select
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={defect.defect_type}
                          onChange={(e) => updateDefect(index, 'defect_type', e.target.value)}
                        >
                          {defectTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Defect Description *
                        </label>
                        <textarea
                          rows={3}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Describe the defect found..."
                          value={defect.defect_description}
                          onChange={(e) => updateDefect(index, 'defect_description', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Operation Impact (CFR 396.7) *
                        </label>
                        <div className="space-y-2">
                          {operationImpactOptions.map((option) => (
                            <label key={option.value} className="flex items-center">
                              <input
                                type="radio"
                                name={`operation_impact_${index}`}
                                checked={defect.operation_impact === option.value}
                                onChange={() => updateDefect(index, 'operation_impact', option.value)}
                                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              />
                              <span className={`ml-2 text-sm font-medium ${option.color}`}>
                                {option.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Does this affect vehicle safety?
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`safety_${index}`}
                              checked={defect.affects_safety === true}
                              onChange={() => updateDefect(index, 'affects_safety', true)}
                              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-red-700 font-medium">
                              YES - Safety Critical (Vehicle cannot operate)
                            </span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`safety_${index}`}
                              checked={defect.affects_safety === false}
                              onChange={() => updateDefect(index, 'affects_safety', false)}
                              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-yellow-700">
                              NO - Minor issue (Vehicle can operate with monitoring)
                            </span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Is repair required?
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`repair_${index}`}
                              checked={defect.repair_required === true}
                              onChange={() => updateDefect(index, 'repair_required', true)}
                              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm">YES - Repair required</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`repair_${index}`}
                              checked={defect.repair_required === false}
                              onChange={() => updateDefect(index, 'repair_required', false)}
                              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm">NO - No repair needed</span>
                          </label>
                        </div>
                      </div>

                      {defect.repair_required ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Has repair been completed?
                            </label>
                            <div className="space-y-2">
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name={`completed_${index}`}
                                  checked={defect.repair_completed === true}
                                  onChange={() => updateDefect(index, 'repair_completed', true)}
                                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-green-700">YES - Repair completed</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name={`completed_${index}`}
                                  checked={defect.repair_completed === false}
                                  onChange={() => updateDefect(index, 'repair_completed', false)}
                                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-orange-700">NO - Repair pending</span>
                              </label>
                            </div>
                          </div>

                          {defect.repair_completed && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Repair Description *
                              </label>
                              <textarea
                                rows={2}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Describe the repair that was performed..."
                                value={defect.repair_description}
                                onChange={(e) => updateDefect(index, 'repair_description', e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Why is no repair required? *
                          </label>
                          <textarea
                            rows={2}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Explain why this defect doesn't require repair..."
                            value={defect.repair_unnecessary_reason}
                            onChange={(e) => updateDefect(index, 'repair_unnecessary_reason', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addDefect}
                    className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    + Add Another Defect
                  </button>
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4 mr-2 inline" />
                        Record Defects & Status
                      </>
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default RepairCertificationModal;