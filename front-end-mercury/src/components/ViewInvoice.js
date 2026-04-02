import React, { useState, useEffect } from 'react';
import { XMarkIcon, DocumentTextIcon, CurrencyDollarIcon, CubeIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

const ViewInvoice = ({ invoiceId, isOpen, onClose }) => {
  const { session, refreshAccessToken } = useSession();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'check',
    reference_number: '',
    notes: '',
  });

  useEffect(() => {
    if (invoiceId && isOpen) {
      fetchInvoice();
    }
  }, [invoiceId, isOpen]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/invoices/${invoiceId}/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      setInvoice(response.data);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      if (error.response?.status === 401) await refreshAccessToken();
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await axios.patch(`${BASE_URL}/api/invoices/${invoiceId}/`, {
        status: newStatus,
        customer: invoice.customer,
      }, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      fetchInvoice();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) return;

    setPaymentLoading(true);
    try {
      await axios.post(`${BASE_URL}/api/invoice-payments/`, {
        invoice: invoiceId,
        amount: parseFloat(paymentData.amount),
        payment_date: paymentData.payment_date,
        payment_method: paymentData.payment_method,
        reference_number: paymentData.reference_number,
        notes: paymentData.notes,
      }, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });

      setShowPaymentForm(false);
      setPaymentData({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'check',
        reference_number: '',
        notes: '',
      });
      fetchInvoice();
    } catch (error) {
      console.error('Error recording payment:', error);
    } finally {
      setPaymentLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'void': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusActions = () => {
    if (!invoice) return [];
    switch (invoice.status) {
      case 'draft': return [{ label: 'Mark as Sent', status: 'sent', color: 'blue' }];
      case 'sent': return [{ label: 'Void Invoice', status: 'void', color: 'red' }];
      case 'partial': return [{ label: 'Void Invoice', status: 'void', color: 'red' }];
      default: return [];
    }
  };

  const isOverdue = invoice && ['sent', 'partial'].includes(invoice.status) && new Date(invoice.due_date) < new Date();

  const inputClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm";
  const labelClass = "block text-sm font-medium text-gray-700";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50" onClick={onClose}></div>
      <div className="relative top-10 mx-auto p-5 border w-11/12 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-2" />
            {loading ? 'Loading...' : invoice?.invoice_number || 'Invoice'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

                {loading ? (
                  <div className="flex justify-center items-center py-16">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-3 text-gray-600">Loading invoice...</p>
                  </div>
                ) : invoice ? (
                  <>
                    <div className="space-y-5">
                      {/* Status & Customer row */}
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(isOverdue ? 'overdue' : invoice.status)}`}>
                            {isOverdue ? 'Overdue' : invoice.status_display}
                          </span>
                          <p className="text-lg font-medium text-gray-900 mt-2">{invoice.customer_name}</p>
                          {invoice.customer_email && (
                            <p className="text-sm text-gray-500">{invoice.customer_email}</p>
                          )}
                          {invoice.customer_payment_terms && (
                            <p className="text-xs text-gray-400">Terms: {invoice.customer_payment_terms}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Issue Date</p>
                          <p className="text-sm font-medium">{new Date(invoice.issue_date).toLocaleDateString()}</p>
                          <p className="text-sm text-gray-500 mt-1">Due Date</p>
                          <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                            {new Date(invoice.due_date).toLocaleDateString()}
                            {isOverdue && ' (Overdue)'}
                          </p>
                        </div>
                      </div>

                      {/* Financial Summary */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-4 gap-4 text-center">
                          <div>
                            <p className="text-xs text-gray-500">Subtotal</p>
                            <p className="text-lg font-semibold">${parseFloat(invoice.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Tax</p>
                            <p className="text-lg font-semibold">${parseFloat(invoice.tax_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Total</p>
                            <p className="text-lg font-semibold">${parseFloat(invoice.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Balance Due</p>
                            <p className={`text-lg font-semibold ${parseFloat(invoice.balance_due) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              ${parseFloat(invoice.balance_due).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Linked Loads */}
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-md font-medium text-gray-900 mb-3">
                          Loads ({invoice.load_summaries?.length || 0})
                        </h4>
                        {invoice.load_summaries && invoice.load_summaries.length > 0 ? (
                          <div className="space-y-2">
                            {invoice.load_summaries.map(load => (
                              <div key={load.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center">
                                  <CubeIcon className="h-5 w-5 text-blue-500 mr-3" />
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{load.load_number}</div>
                                    <div className="text-xs text-gray-500">
                                      {load.pickup_location} → {load.delivery_location}
                                    </div>
                                    {load.customer_reference && (
                                      <div className="text-xs text-gray-400">Ref: {load.customer_reference}</div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-sm font-medium text-gray-900">
                                  ${parseFloat(load.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">No loads linked</p>
                        )}
                      </div>

                      {/* Payments */}
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-md font-medium text-gray-900">Payments</h4>
                          {['sent', 'partial', 'overdue'].includes(invoice.status) && parseFloat(invoice.balance_due) > 0 && !showPaymentForm && (
                            <button
                              onClick={() => {
                                setPaymentData(prev => ({ ...prev, amount: invoice.balance_due }));
                                setShowPaymentForm(true);
                              }}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                            >
                              <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                              Record Payment
                            </button>
                          )}
                        </div>

                        {/* Payment form */}
                        {showPaymentForm && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3 space-y-3">
                            <h5 className="text-sm font-medium text-green-800">Record Payment</h5>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={labelClass}>Amount *</label>
                                <input
                                  type="number"
                                  value={paymentData.amount}
                                  onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                                  className={inputClass}
                                  step="0.01"
                                  min="0.01"
                                />
                              </div>
                              <div>
                                <label className={labelClass}>Payment Date *</label>
                                <input
                                  type="date"
                                  value={paymentData.payment_date}
                                  onChange={(e) => setPaymentData(prev => ({ ...prev, payment_date: e.target.value }))}
                                  className={inputClass}
                                />
                              </div>
                              <div>
                                <label className={labelClass}>Method</label>
                                <select
                                  value={paymentData.payment_method}
                                  onChange={(e) => setPaymentData(prev => ({ ...prev, payment_method: e.target.value }))}
                                  className={inputClass}
                                >
                                  <option value="check">Check</option>
                                  <option value="ach">ACH / Wire Transfer</option>
                                  <option value="credit_card">Credit Card</option>
                                  <option value="cash">Cash</option>
                                  <option value="other">Other</option>
                                </select>
                              </div>
                              <div>
                                <label className={labelClass}>Reference #</label>
                                <input
                                  type="text"
                                  value={paymentData.reference_number}
                                  onChange={(e) => setPaymentData(prev => ({ ...prev, reference_number: e.target.value }))}
                                  className={inputClass}
                                  placeholder="Check #, transaction ID..."
                                />
                              </div>
                            </div>
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => setShowPaymentForm(false)}
                                className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleRecordPayment}
                                disabled={paymentLoading}
                                className="px-3 py-1.5 text-sm text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
                              >
                                {paymentLoading ? 'Saving...' : 'Record Payment'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Payment history */}
                        {invoice.payments && invoice.payments.length > 0 ? (
                          <div className="space-y-2">
                            {invoice.payments.map((payment, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    ${parseFloat(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {payment.payment_method_display} · {new Date(payment.payment_date).toLocaleDateString()}
                                    {payment.reference_number && ` · Ref: ${payment.reference_number}`}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-400">
                                  {payment.created_by_name}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">No payments recorded</p>
                        )}
                      </div>

                      {/* Notes */}
                      {(invoice.notes || invoice.internal_notes) && (
                        <div className="border-t border-gray-200 pt-4">
                          {invoice.notes && (
                            <div className="mb-3">
                              <h4 className="text-sm font-medium text-gray-700">Notes</h4>
                              <p className="text-sm text-gray-600 mt-1">{invoice.notes}</p>
                            </div>
                          )}
                          {invoice.internal_notes && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700">Internal Notes</h4>
                              <p className="text-sm text-gray-500 mt-1 italic">{invoice.internal_notes}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="border-t border-gray-200 pt-4">
                        <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
                          <div>Created: {new Date(invoice.created_at).toLocaleDateString()} by {invoice.created_by_name || '—'}</div>
                          <div>Updated: {new Date(invoice.updated_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between pt-4">
                      <div className="flex space-x-2">
                        {getStatusActions().map(action => (
                          <button
                            key={action.status}
                            onClick={() => handleStatusChange(action.status)}
                            className={`px-4 py-2 text-sm font-medium rounded-md border ${
                              action.color === 'red'
                                ? 'text-red-700 bg-white border-red-300 hover:bg-red-50'
                                : 'text-blue-700 bg-white border-blue-300 hover:bg-blue-50'
                            }`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Close
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Invoice not found</p>
                  </div>
                )}
      </div>
    </div>
  );
};

export default ViewInvoice;
