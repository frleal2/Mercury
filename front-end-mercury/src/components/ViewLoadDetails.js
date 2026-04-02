import React, { useState, useEffect } from 'react';
import { XMarkIcon, CubeIcon, PencilIcon, CheckIcon, DocumentTextIcon, MapPinIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import DocumentManager from './DocumentManager';
import LoadTracking from './LoadTracking';
import DispatchLoadModal from './DispatchLoadModal';

const ViewLoadDetails = ({ loadId, isOpen, onClose }) => {
  const { session, refreshAccessToken } = useSession();
  const [load, setLoad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [carriers, setCarriers] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);

  useEffect(() => {
    if (loadId) fetchLoad();
    fetchCarriers();
  }, [loadId]);

  const fetchCarriers = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/carriers/?status=active`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });
      setCarriers(response.data);
    } catch (error) {
      console.error('Error fetching carriers:', error);
    }
  };

  const fetchLoad = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/loads/${loadId}/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });
      setLoad(response.data);
      setEditData(response.data);
    } catch (error) {
      console.error('Error fetching load:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = async (newStatus) => {
    // Intercept dispatch: open DispatchLoadModal instead of direct status change
    if (newStatus === 'dispatched') {
      setIsDispatchModalOpen(true);
      return;
    }
    try {
      setSaving(true);
      await axios.patch(`${BASE_URL}/api/loads/${loadId}/`, { status: newStatus }, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });
      setLoad(prev => ({ ...prev, status: newStatus }));
      fetchLoad();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadDispatched = (updatedLoad) => {
    setLoad(updatedLoad);
    setIsDispatchModalOpen(false);
    fetchLoad();
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        customer_reference: editData.customer_reference,
        bol_number: editData.bol_number,
        commodity: editData.commodity,
        weight: editData.weight || null,
        pieces: editData.pieces || null,
        customer_rate: editData.customer_rate || null,
        carrier_cost: editData.carrier_cost || null,
        fuel_surcharge: editData.fuel_surcharge || 0,
        accessorial_charges: editData.accessorial_charges || 0,
        estimated_miles: editData.estimated_miles || null,
        carrier: editData.carrier || null,
        notes: editData.notes,
      };
      await axios.patch(`${BASE_URL}/api/loads/${loadId}/`, payload, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });
      setIsEditing(false);
      fetchLoad();
    } catch (error) {
      console.error('Error saving load:', error);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'quoted': return 'bg-purple-100 text-purple-800';
      case 'booked': return 'bg-blue-100 text-blue-800';
      case 'dispatched': return 'bg-indigo-100 text-indigo-800';
      case 'in_transit': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'invoiced': return 'bg-teal-100 text-teal-800';
      case 'paid': return 'bg-emerald-100 text-emerald-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Status workflow transitions
  const getNextStatuses = (current) => {
    const transitions = {
      'quoted': ['booked', 'cancelled'],
      'booked': ['dispatched', 'cancelled'],
      'dispatched': ['in_transit', 'cancelled'],
      'in_transit': ['delivered'],
      'delivered': ['invoiced'],
      'invoiced': ['paid'],
      'paid': [],
      'cancelled': [],
    };
    return transitions[current] || [];
  };

  const statusLabels = {
    'quoted': 'Quoted',
    'booked': 'Booked',
    'dispatched': 'Dispatched',
    'in_transit': 'In Transit',
    'delivered': 'Delivered',
    'invoiced': 'Invoiced',
    'paid': 'Paid',
    'cancelled': 'Cancelled',
  };

  const sectionHeader = "text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2";
  const detailLabel = "text-xs text-gray-500";
  const detailValue = "text-sm text-gray-900";

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50" onClick={onClose}></div>
      <div className="relative top-10 mx-auto p-5 border w-11/12 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-3 text-gray-600">Loading load details...</p>
                  </div>
                ) : load ? (
                  <>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <CubeIcon className="h-6 w-6 text-blue-600 mr-2" />
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {load.load_number}
                          </h3>
                          <p className="text-sm text-gray-500">{load.customer_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(load.status)}`}>
                          {load.status_display}
                        </span>
                        {!isEditing && (
                          <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-gray-600 p-1">
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        )}
                        {isEditing && (
                          <button onClick={handleSave} disabled={saving} className="text-blue-600 hover:text-blue-800 p-1">
                            <CheckIcon className="h-5 w-5" />
                          </button>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                          <XMarkIcon className="h-6 w-6" />
                        </button>
                      </div>
                    </div>

                    <div className="px-0 py-4">
                      {/* Tabs */}
                      <div className="flex border-b border-gray-200 mb-4">
                        <button
                          onClick={() => setActiveTab('details')}
                          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Details
                        </button>
                        <button
                          onClick={() => setActiveTab('documents')}
                          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1 ${
                            activeTab === 'documents' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <DocumentTextIcon className="h-4 w-4" />
                          Documents
                        </button>
                        <button
                          onClick={() => setActiveTab('tracking')}
                          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1 ${
                            activeTab === 'tracking' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <MapPinIcon className="h-4 w-4" />
                          Tracking
                        </button>
                      </div>

                      {activeTab === 'details' && (<>
                      {/* Status Actions */}
                      {getNextStatuses(load.status).length > 0 && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600 mb-2">Update Status:</p>
                          <div className="flex flex-wrap gap-2">
                            {getNextStatuses(load.status).map(nextStatus => (
                              <button
                                key={nextStatus}
                                onClick={() => handleStatusChange(nextStatus)}
                                disabled={saving}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                  nextStatus === 'cancelled'
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                } disabled:opacity-50`}
                              >
                                Mark as {statusLabels[nextStatus]}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status Timeline */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between">
                          {['quoted', 'booked', 'dispatched', 'in_transit', 'delivered', 'invoiced', 'paid'].map((s, i) => {
                            const statusOrder = ['quoted', 'booked', 'dispatched', 'in_transit', 'delivered', 'invoiced', 'paid'];
                            const currentIndex = statusOrder.indexOf(load.status);
                            const isActive = i <= currentIndex && load.status !== 'cancelled';
                            return (
                              <React.Fragment key={s}>
                                <div className={`flex flex-col items-center ${isActive ? 'text-blue-600' : 'text-gray-300'}`}>
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                    {i + 1}
                                  </div>
                                  <span className="text-[10px] mt-1">{statusLabels[s]}</span>
                                </div>
                                {i < 6 && (
                                  <div className={`flex-1 h-0.5 mx-1 ${i < currentIndex && load.status !== 'cancelled' ? 'bg-blue-600' : 'bg-gray-200'}`} />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-6">
                          {/* References */}
                          <div>
                            <h4 className={sectionHeader}>References</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className={detailLabel}>Customer Reference</p>
                                {isEditing ? (
                                  <input type="text" name="customer_reference" value={editData.customer_reference || ''} onChange={handleEditChange} className="w-full text-sm border-gray-300 rounded-md" />
                                ) : (
                                  <p className={detailValue}>{load.customer_reference || '—'}</p>
                                )}
                              </div>
                              <div>
                                <p className={detailLabel}>BOL Number</p>
                                {isEditing ? (
                                  <input type="text" name="bol_number" value={editData.bol_number || ''} onChange={handleEditChange} className="w-full text-sm border-gray-300 rounded-md" />
                                ) : (
                                  <p className={detailValue}>{load.bol_number || '—'}</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Pickup */}
                          <div>
                            <h4 className={sectionHeader}>
                              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                              Pickup
                            </h4>
                            <div className="space-y-1">
                              {load.pickup_name && <p className="text-sm font-medium text-gray-900">{load.pickup_name}</p>}
                              {load.pickup_address && <p className={detailValue}>{load.pickup_address}</p>}
                              <p className={detailValue}>
                                {[load.pickup_city, load.pickup_state].filter(Boolean).join(', ')}
                                {load.pickup_zip ? ` ${load.pickup_zip}` : ''}
                              </p>
                              {load.pickup_date && (
                                <p className="text-sm text-blue-600">{new Date(load.pickup_date).toLocaleString()}</p>
                              )}
                              {load.pickup_notes && <p className="text-xs text-gray-500 mt-1">{load.pickup_notes}</p>}
                            </div>
                          </div>

                          {/* Delivery */}
                          <div>
                            <h4 className={sectionHeader}>
                              <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                              Delivery
                            </h4>
                            <div className="space-y-1">
                              {load.delivery_name && <p className="text-sm font-medium text-gray-900">{load.delivery_name}</p>}
                              {load.delivery_address && <p className={detailValue}>{load.delivery_address}</p>}
                              <p className={detailValue}>
                                {[load.delivery_city, load.delivery_state].filter(Boolean).join(', ')}
                                {load.delivery_zip ? ` ${load.delivery_zip}` : ''}
                              </p>
                              {load.delivery_date && (
                                <p className="text-sm text-blue-600">{new Date(load.delivery_date).toLocaleString()}</p>
                              )}
                              {load.delivery_notes && <p className="text-xs text-gray-500 mt-1">{load.delivery_notes}</p>}
                            </div>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                          {/* Commodity */}
                          <div>
                            <h4 className={sectionHeader}>Commodity</h4>
                            <div className="space-y-2">
                              <div>
                                <p className={detailLabel}>Description</p>
                                {isEditing ? (
                                  <input type="text" name="commodity" value={editData.commodity || ''} onChange={handleEditChange} className="w-full text-sm border-gray-300 rounded-md" />
                                ) : (
                                  <p className={detailValue}>{load.commodity || '—'}</p>
                                )}
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <p className={detailLabel}>Weight</p>
                                  <p className={detailValue}>{load.weight ? `${parseFloat(load.weight).toLocaleString()} lbs` : '—'}</p>
                                </div>
                                <div>
                                  <p className={detailLabel}>Pieces</p>
                                  <p className={detailValue}>{load.pieces || '—'}</p>
                                </div>
                                <div>
                                  <p className={detailLabel}>Est. Miles</p>
                                  <p className={detailValue}>{load.estimated_miles ? load.estimated_miles.toLocaleString() : '—'}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className={detailLabel}>Equipment</p>
                                  <p className={detailValue}>{load.equipment_type_display}</p>
                                </div>
                                <div>
                                  <p className={detailLabel}>Temperature</p>
                                  <p className={detailValue}>
                                    {load.temperature_requirement === 'none' ? 'Dry' : load.temperature_value || load.temperature_requirement}
                                  </p>
                                </div>
                              </div>
                              {load.hazmat && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  HAZMAT
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Financials */}
                          <div>
                            <h4 className={sectionHeader}>Carrier Assignment</h4>
                            <div className="bg-indigo-50 rounded-lg p-3">
                              {isEditing ? (
                                <select
                                  name="carrier"
                                  value={editData.carrier || ''}
                                  onChange={handleEditChange}
                                  className="w-full text-sm border-gray-300 rounded-md"
                                >
                                  <option value="">No carrier assigned</option>
                                  {carriers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}{c.mc_number ? ` (${c.mc_number})` : ''}</option>
                                  ))}
                                </select>
                              ) : (
                                <p className="text-sm text-gray-900">
                                  {load.carrier_name || <span className="text-gray-400">No carrier assigned</span>}
                                </p>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className={sectionHeader}>Financials</h4>
                            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                              <div className="flex justify-between">
                                <span className={detailLabel}>Customer Rate</span>
                                {isEditing ? (
                                  <input type="number" name="customer_rate" value={editData.customer_rate || ''} onChange={handleEditChange} className="w-24 text-sm text-right border-gray-300 rounded-md" step="0.01" />
                                ) : (
                                  <span className={detailValue}>{load.customer_rate ? `$${parseFloat(load.customer_rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</span>
                                )}
                              </div>
                              <div className="flex justify-between">
                                <span className={detailLabel}>Carrier Cost</span>
                                {isEditing ? (
                                  <input type="number" name="carrier_cost" value={editData.carrier_cost || ''} onChange={handleEditChange} className="w-24 text-sm text-right border-gray-300 rounded-md" step="0.01" />
                                ) : (
                                  <span className={detailValue}>{load.carrier_cost ? `$${parseFloat(load.carrier_cost).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</span>
                                )}
                              </div>
                              <div className="flex justify-between">
                                <span className={detailLabel}>Fuel Surcharge</span>
                                {isEditing ? (
                                  <input type="number" name="fuel_surcharge" value={editData.fuel_surcharge || ''} onChange={handleEditChange} className="w-24 text-sm text-right border-gray-300 rounded-md" step="0.01" />
                                ) : (
                                  <span className={detailValue}>{load.fuel_surcharge ? `$${parseFloat(load.fuel_surcharge).toFixed(2)}` : '$0.00'}</span>
                                )}
                              </div>
                              <div className="flex justify-between">
                                <span className={detailLabel}>Accessorials</span>
                                {isEditing ? (
                                  <input type="number" name="accessorial_charges" value={editData.accessorial_charges || ''} onChange={handleEditChange} className="w-24 text-sm text-right border-gray-300 rounded-md" step="0.01" />
                                ) : (
                                  <span className={detailValue}>{load.accessorial_charges ? `$${parseFloat(load.accessorial_charges).toFixed(2)}` : '$0.00'}</span>
                                )}
                              </div>
                              <div className="border-t border-gray-200 pt-2 flex justify-between">
                                <span className="text-sm font-medium text-gray-700">Total Revenue</span>
                                <span className="text-sm font-bold text-gray-900">
                                  {load.total_revenue ? `$${parseFloat(load.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                                </span>
                              </div>
                              {load.profit !== null && load.profit !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-sm font-medium text-gray-700">Profit</span>
                                  <span className={`text-sm font-bold ${parseFloat(load.profit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ${parseFloat(load.profit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    {load.margin_percent && ` (${load.margin_percent}%)`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Trip Link */}
                          {load.trip_number && (
                            <div>
                              <h4 className={sectionHeader}>Linked Trip</h4>
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1.5">
                                <div className="flex justify-between">
                                  <span className={detailLabel}>Trip Number</span>
                                  <span className="text-sm font-semibold text-blue-700">{load.trip_number}</span>
                                </div>
                                {load.trip_status && (
                                  <div className="flex justify-between">
                                    <span className={detailLabel}>Trip Status</span>
                                    <span className={detailValue}>{load.trip_status}</span>
                                  </div>
                                )}
                                {load.trip_driver_name && (
                                  <div className="flex justify-between">
                                    <span className={detailLabel}>Driver</span>
                                    <span className={detailValue}>{load.trip_driver_name}</span>
                                  </div>
                                )}
                                <p className="text-xs text-blue-600 mt-1">
                                  Trip status syncs automatically with load status.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          <div>
                            <h4 className={sectionHeader}>Notes</h4>
                            {isEditing ? (
                              <textarea name="notes" value={editData.notes || ''} onChange={handleEditChange} className="w-full text-sm border-gray-300 rounded-md" rows="3" />
                            ) : (
                              <p className={`${detailValue} whitespace-pre-wrap`}>{load.notes || 'No notes'}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Audit Info */}
                      <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between text-xs text-gray-400">
                        <span>Created: {new Date(load.created_at).toLocaleString()} {load.created_by_name ? `by ${load.created_by_name}` : ''}</span>
                        <span>Updated: {new Date(load.updated_at).toLocaleString()}</span>
                      </div>
                      </>)}

                      {activeTab === 'documents' && (
                        <DocumentManager
                          entityType="load"
                          entityId={loadId}
                          documentTypes={['rate_confirmation', 'bol', 'pod', 'carrier_packet', 'lumper_receipt', 'invoice', 'weight_ticket', 'customs', 'receipt', 'photo', 'other']}
                        />
                      )}

                      {activeTab === 'tracking' && (
                        <LoadTracking loadId={loadId} load={load} />
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end pt-4">
                      <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        Close
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-600">Load not found.</p>
                  </div>
                )}
      </div>
    </div>

    {/* Dispatch Modal */}
    {load && (
      <DispatchLoadModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        load={load}
        onDispatched={handleLoadDispatched}
      />
    )}
    </>
  );
};

export default ViewLoadDetails;
