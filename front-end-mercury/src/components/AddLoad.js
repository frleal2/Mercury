import React, { useState, useEffect } from 'react';
import { XMarkIcon, CubeIcon, PlusIcon, MagnifyingGlassIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import AddCustomer from './AddCustomer';

const AddLoad = ({ isOpen, onClose }) => {
  const { session, refreshAccessToken } = useSession();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1); // Multi-step form: 1=basics, 2=locations, 3=details & rate
  const [quoteResults, setQuoteResults] = useState([]);
  const [quoteLooking, setQuoteLooking] = useState(false);
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [rateConFile, setRateConFile] = useState(null);
  const pdfInputRef = React.useRef(null);

  const [formData, setFormData] = useState({
    company: '',
    customer: '',
    customer_reference: '',
    bol_number: '',
    // Pickup
    pickup_name: '',
    pickup_address: '',
    pickup_city: '',
    pickup_state: '',
    pickup_zip: '',
    pickup_date: '',
    pickup_notes: '',
    // Delivery
    delivery_name: '',
    delivery_address: '',
    delivery_city: '',
    delivery_state: '',
    delivery_zip: '',
    delivery_date: '',
    delivery_notes: '',
    // Commodity
    commodity: '',
    weight: '',
    pieces: '',
    equipment_type: 'dry_van',
    temperature_requirement: 'none',
    temperature_value: '',
    hazmat: false,
    // Rate
    customer_rate: '',
    carrier_cost: '',
    fuel_surcharge: '',
    accessorial_charges: '',
    estimated_miles: '',
    // Notes
    notes: '',
  });

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      const [companiesRes, customersRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/companies/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        }),
        axios.get(`${BASE_URL}/api/customers/`, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` }
        }),
      ]);
      setCompanies(companiesRes.data);
      setCustomers(customersRes.data);

      // Auto-select company if only one
      if (companiesRes.data.length === 1) {
        setFormData(prev => ({ ...prev, company: companiesRes.data[0].id.toString() }));
      }
    } catch (error) {
      console.error('Error fetching form data:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear field error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateStep = (stepNum) => {
    const newErrors = {};
    if (stepNum === 1) {
      if (!formData.company) newErrors.company = 'Company is required';
      if (!formData.customer) newErrors.customer = 'Customer is required';
    }
    if (stepNum === 2) {
      if (!formData.pickup_city) newErrors.pickup_city = 'Pickup city is required';
      if (!formData.pickup_state) newErrors.pickup_state = 'Pickup state is required';
      if (!formData.delivery_city) newErrors.delivery_city = 'Delivery city is required';
      if (!formData.delivery_state) newErrors.delivery_state = 'Delivery state is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 3) {
      handleNext();
      return;
    }
    if (!validateStep(3)) return;

    setLoading(true);
    try {
      const payload = {
        company: parseInt(formData.company),
        customer: parseInt(formData.customer),
        customer_reference: formData.customer_reference,
        bol_number: formData.bol_number,
        pickup_name: formData.pickup_name,
        pickup_address: formData.pickup_address,
        pickup_city: formData.pickup_city,
        pickup_state: formData.pickup_state,
        pickup_zip: formData.pickup_zip,
        pickup_date: formData.pickup_date || null,
        pickup_notes: formData.pickup_notes,
        delivery_name: formData.delivery_name,
        delivery_address: formData.delivery_address,
        delivery_city: formData.delivery_city,
        delivery_state: formData.delivery_state,
        delivery_zip: formData.delivery_zip,
        delivery_date: formData.delivery_date || null,
        delivery_notes: formData.delivery_notes,
        commodity: formData.commodity,
        weight: formData.weight || null,
        pieces: formData.pieces || null,
        equipment_type: formData.equipment_type,
        temperature_requirement: formData.temperature_requirement,
        temperature_value: formData.temperature_value,
        hazmat: formData.hazmat,
        customer_rate: formData.customer_rate || null,
        carrier_cost: formData.carrier_cost || null,
        fuel_surcharge: formData.fuel_surcharge || 0,
        accessorial_charges: formData.accessorial_charges || 0,
        estimated_miles: formData.estimated_miles || null,
        notes: formData.notes,
      };

      const loadRes = await axios.post(`${BASE_URL}/api/loads/`, payload, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });

      // If a rate confirmation PDF was uploaded, save it as a LoadDocument
      if (rateConFile && loadRes.data?.id) {
        try {
          const docPayload = new FormData();
          docPayload.append('file', rateConFile);
          docPayload.append('load', loadRes.data.id);
          docPayload.append('document_type', 'rate_confirmation');
          docPayload.append('description', 'Rate Confirmation (auto-imported)');
          await axios.post(`${BASE_URL}/api/load-documents/`, docPayload, {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Content-Type': 'multipart/form-data',
            },
          });
        } catch (docErr) {
          console.error('Failed to save rate confirmation document:', docErr);
        }
      }

      onClose();
    } catch (error) {
      console.error('Error creating load:', error);
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

  const handleCustomerCreated = (newCustomer) => {
    setCustomers(prev => [...prev, newCustomer]);
    setFormData(prev => ({ ...prev, customer: newCustomer.id.toString() }));
    setIsAddCustomerOpen(false);
  };

  const filteredCustomers = formData.company
    ? customers.filter(c => c.company === parseInt(formData.company))
    : customers;

  const handleQuoteLookup = async () => {
    setQuoteLooking(true);
    setQuoteResults([]);
    try {
      const params = new URLSearchParams();
      if (formData.pickup_city) params.append('origin_city', formData.pickup_city);
      if (formData.pickup_state) params.append('origin_state', formData.pickup_state);
      if (formData.delivery_city) params.append('destination_city', formData.delivery_city);
      if (formData.delivery_state) params.append('destination_state', formData.delivery_state);
      if (formData.equipment_type) params.append('equipment_type', formData.equipment_type);
      if (formData.customer) params.append('customer_id', formData.customer);
      const res = await axios.get(`${BASE_URL}/api/quote-lookup/?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      setQuoteResults(res.data);
    } catch (e) { console.error('Quote lookup failed:', e); }
    finally { setQuoteLooking(false); }
  };

  const applyQuote = (lane) => {
    const fuelAmount = lane.fuel_surcharge_amount || 0;
    setFormData(prev => ({
      ...prev,
      customer_rate: lane.customer_rate || '',
      carrier_cost: lane.carrier_cost || '',
      fuel_surcharge: fuelAmount || '',
      estimated_miles: lane.estimated_miles || prev.estimated_miles,
    }));
    setQuoteResults([]);
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Reset the file input so the same file can be re-selected
    e.target.value = '';

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setPdfError('Please upload a PDF file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPdfError('File size must be under 10 MB.');
      return;
    }

    setPdfParsing(true);
    setPdfError('');
    setRateConFile(file);
    try {
      const formPayload = new FormData();
      formPayload.append('file', file);
      const res = await axios.post(`${BASE_URL}/api/parse-rate-confirmation/`, formPayload, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      const parsed = res.data.parsed_data;
      setFormData(prev => ({
        ...prev,
        customer_reference: parsed.customer_reference || prev.customer_reference,
        bol_number: parsed.bol_number || prev.bol_number,
        pickup_name: parsed.pickup_name || prev.pickup_name,
        pickup_address: parsed.pickup_address || prev.pickup_address,
        pickup_city: parsed.pickup_city || prev.pickup_city,
        pickup_state: parsed.pickup_state || prev.pickup_state,
        pickup_zip: parsed.pickup_zip || prev.pickup_zip,
        pickup_date: parsed.pickup_date || prev.pickup_date,
        pickup_notes: parsed.pickup_notes || prev.pickup_notes,
        delivery_name: parsed.delivery_name || prev.delivery_name,
        delivery_address: parsed.delivery_address || prev.delivery_address,
        delivery_city: parsed.delivery_city || prev.delivery_city,
        delivery_state: parsed.delivery_state || prev.delivery_state,
        delivery_zip: parsed.delivery_zip || prev.delivery_zip,
        delivery_date: parsed.delivery_date || prev.delivery_date,
        delivery_notes: parsed.delivery_notes || prev.delivery_notes,
        commodity: parsed.commodity || prev.commodity,
        weight: parsed.weight || prev.weight,
        pieces: parsed.pieces || prev.pieces,
        equipment_type: parsed.equipment_type || prev.equipment_type,
        temperature_requirement: parsed.temperature_requirement || prev.temperature_requirement,
        temperature_value: parsed.temperature_value || prev.temperature_value,
        hazmat: parsed.hazmat === true ? true : prev.hazmat,
        customer_rate: parsed.customer_rate || prev.customer_rate,
        carrier_cost: parsed.carrier_cost || prev.carrier_cost,
        fuel_surcharge: parsed.fuel_surcharge || prev.fuel_surcharge,
        accessorial_charges: parsed.accessorial_charges || prev.accessorial_charges,
        estimated_miles: parsed.estimated_miles || prev.estimated_miles,
        notes: parsed.notes || prev.notes,
      }));
      setErrors({});
    } catch (error) {
      console.error('PDF parsing error:', error);
      const msg = error.response?.data?.error || 'Failed to parse the Rate Confirmation. Please try again or fill the form manually.';
      setPdfError(msg);
    } finally {
      setPdfParsing(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const errorClass = "text-red-500 text-xs mt-1";

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <CubeIcon className="h-6 w-6 mr-2 text-blue-600" />
            New Load
          </h3>
          <div className="flex items-center space-x-2">
            <input
              type="file"
              ref={pdfInputRef}
              accept=".pdf"
              onChange={handlePdfUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              disabled={pdfParsing}
              className="flex items-center px-3 py-1.5 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition disabled:opacity-50"
            >
              {pdfParsing ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-1.5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Parsing PDF...
                </>
              ) : (
                <>
                  <DocumentArrowUpIcon className="h-4 w-4 mr-1.5" />
                  Import Rate Con
                </>
              )}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* PDF parsing feedback */}
        {pdfError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {pdfError}
          </div>
        )}
        {pdfParsing && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
            Extracting data from Rate Confirmation PDF... This may take a few seconds.
          </div>
        )}

        {/* Step indicator */}
        <div className="flex mb-1 space-x-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
          ))}
        </div>
        <div className="flex mb-4 text-xs text-gray-500">
          <span className="flex-1">Customer & Refs</span>
          <span className="flex-1 text-center">Pickup & Delivery</span>
          <span className="flex-1 text-right">Cargo & Rate</span>
        </div>

                  <form
                    onSubmit={(e) => e.preventDefault()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        if (step < 3) handleNext();
                      }
                    }}
                    className="space-y-6"
                  >

                      {/* Step 1: Customer & References */}
                      {step === 1 && (
                        <div className="space-y-4">
                          <h3 className="text-md font-medium text-gray-900 mb-3">Customer & References</h3>
                          
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

                          <div>
                            <div className="flex items-center justify-between">
                              <label className={labelClass}>Customer *</label>
                              <button
                                type="button"
                                onClick={() => setIsAddCustomerOpen(true)}
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                              >
                                <PlusIcon className="h-3 w-3 mr-1" />
                                New Customer
                              </button>
                            </div>
                            <select name="customer" value={formData.customer} onChange={handleChange} className={inputClass}>
                              <option value="">Select customer...</option>
                              {filteredCustomers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                            {errors.customer && <p className={errorClass}>{errors.customer}</p>}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className={labelClass}>Customer Reference / PO#</label>
                              <input type="text" name="customer_reference" value={formData.customer_reference} onChange={handleChange} className={inputClass} placeholder="PO-12345" />
                            </div>
                            <div>
                              <label className={labelClass}>BOL Number</label>
                              <input type="text" name="bol_number" value={formData.bol_number} onChange={handleChange} className={inputClass} placeholder="BOL-12345" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 2: Pickup & Delivery */}
                      {step === 2 && (
                        <div className="space-y-6">
                          {/* Pickup */}
                          <div>
                            <h3 className="text-md font-medium text-green-700 mb-3 flex items-center">
                              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                              Pickup Details
                            </h3>
                            <div className="space-y-3 pl-5 border-l-2 border-green-200">
                              <div>
                                <label className={labelClass}>Facility Name</label>
                                <input type="text" name="pickup_name" value={formData.pickup_name} onChange={handleChange} className={inputClass} placeholder="Shipper warehouse name" />
                              </div>
                              <div>
                                <label className={labelClass}>Address</label>
                                <input type="text" name="pickup_address" value={formData.pickup_address} onChange={handleChange} className={inputClass} placeholder="123 Main St" />
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className={labelClass}>City *</label>
                                  <input type="text" name="pickup_city" value={formData.pickup_city} onChange={handleChange} className={inputClass} />
                                  {errors.pickup_city && <p className={errorClass}>{errors.pickup_city}</p>}
                                </div>
                                <div>
                                  <label className={labelClass}>State *</label>
                                  <input type="text" name="pickup_state" value={formData.pickup_state} onChange={handleChange} className={inputClass} maxLength="2" placeholder="TX" />
                                  {errors.pickup_state && <p className={errorClass}>{errors.pickup_state}</p>}
                                </div>
                                <div>
                                  <label className={labelClass}>ZIP</label>
                                  <input type="text" name="pickup_zip" value={formData.pickup_zip} onChange={handleChange} className={inputClass} />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className={labelClass}>Pickup Date</label>
                                  <input type="datetime-local" name="pickup_date" value={formData.pickup_date} onChange={handleChange} className={inputClass} />
                                </div>
                              </div>
                              <div>
                                <label className={labelClass}>Pickup Notes</label>
                                <textarea name="pickup_notes" value={formData.pickup_notes} onChange={handleChange} className={inputClass} rows="2" placeholder="Appointment time, dock info, etc." />
                              </div>
                            </div>
                          </div>

                          {/* Delivery */}
                          <div>
                            <h3 className="text-md font-medium text-red-700 mb-3 flex items-center">
                              <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                              Delivery Details
                            </h3>
                            <div className="space-y-3 pl-5 border-l-2 border-red-200">
                              <div>
                                <label className={labelClass}>Facility Name</label>
                                <input type="text" name="delivery_name" value={formData.delivery_name} onChange={handleChange} className={inputClass} placeholder="Consignee warehouse name" />
                              </div>
                              <div>
                                <label className={labelClass}>Address</label>
                                <input type="text" name="delivery_address" value={formData.delivery_address} onChange={handleChange} className={inputClass} placeholder="456 Oak Ave" />
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className={labelClass}>City *</label>
                                  <input type="text" name="delivery_city" value={formData.delivery_city} onChange={handleChange} className={inputClass} />
                                  {errors.delivery_city && <p className={errorClass}>{errors.delivery_city}</p>}
                                </div>
                                <div>
                                  <label className={labelClass}>State *</label>
                                  <input type="text" name="delivery_state" value={formData.delivery_state} onChange={handleChange} className={inputClass} maxLength="2" placeholder="CA" />
                                  {errors.delivery_state && <p className={errorClass}>{errors.delivery_state}</p>}
                                </div>
                                <div>
                                  <label className={labelClass}>ZIP</label>
                                  <input type="text" name="delivery_zip" value={formData.delivery_zip} onChange={handleChange} className={inputClass} />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className={labelClass}>Delivery Date</label>
                                  <input type="datetime-local" name="delivery_date" value={formData.delivery_date} onChange={handleChange} className={inputClass} />
                                </div>
                              </div>
                              <div>
                                <label className={labelClass}>Delivery Notes</label>
                                <textarea name="delivery_notes" value={formData.delivery_notes} onChange={handleChange} className={inputClass} rows="2" placeholder="Appointment time, dock info, etc." />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 3: Cargo & Rate */}
                      {step === 3 && (
                        <div className="space-y-6">
                          {/* Commodity */}
                          <div>
                            <h3 className="text-md font-medium text-gray-900 mb-3">Commodity Details</h3>
                            <div className="space-y-3">
                              <div>
                                <label className={labelClass}>Commodity Description</label>
                                <input type="text" name="commodity" value={formData.commodity} onChange={handleChange} className={inputClass} placeholder="e.g. Electronics, Produce, Building Materials" />
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className={labelClass}>Weight (lbs)</label>
                                  <input type="number" name="weight" value={formData.weight} onChange={handleChange} className={inputClass} step="0.01" />
                                </div>
                                <div>
                                  <label className={labelClass}>Pieces / Pallets</label>
                                  <input type="number" name="pieces" value={formData.pieces} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                  <label className={labelClass}>Est. Miles</label>
                                  <input type="number" name="estimated_miles" value={formData.estimated_miles} onChange={handleChange} className={inputClass} />
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className={labelClass}>Equipment Type</label>
                                  <select name="equipment_type" value={formData.equipment_type} onChange={handleChange} className={inputClass}>
                                    <option value="dry_van">Dry Van</option>
                                    <option value="reefer">Reefer</option>
                                    <option value="flatbed">Flatbed</option>
                                    <option value="step_deck">Step Deck</option>
                                    <option value="lowboy">Lowboy</option>
                                    <option value="tanker">Tanker</option>
                                    <option value="power_only">Power Only</option>
                                    <option value="box_truck">Box Truck</option>
                                    <option value="hotshot">Hotshot</option>
                                    <option value="other">Other</option>
                                  </select>
                                </div>
                                <div>
                                  <label className={labelClass}>Temperature</label>
                                  <select name="temperature_requirement" value={formData.temperature_requirement} onChange={handleChange} className={inputClass}>
                                    <option value="none">None (Dry)</option>
                                    <option value="frozen">Frozen</option>
                                    <option value="cold">Cold</option>
                                    <option value="cool">Cool</option>
                                    <option value="custom">Custom</option>
                                  </select>
                                </div>
                                {formData.temperature_requirement === 'custom' && (
                                  <div>
                                    <label className={labelClass}>Temp Value</label>
                                    <input type="text" name="temperature_value" value={formData.temperature_value} onChange={handleChange} className={inputClass} placeholder="e.g. 35°F" />
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center">
                                <input type="checkbox" name="hazmat" checked={formData.hazmat} onChange={handleChange} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
                                <label className="ml-2 text-sm text-gray-700">Hazmat load</label>
                              </div>
                            </div>
                          </div>

                          {/* Rate */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-md font-medium text-gray-900">Rate & Billing</h3>
                              <button
                                type="button"
                                onClick={handleQuoteLookup}
                                disabled={quoteLooking}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                              >
                                <MagnifyingGlassIcon className="h-3.5 w-3.5" />
                                {quoteLooking ? 'Searching...' : 'Get Quote'}
                              </button>
                            </div>

                            {/* Quote Results */}
                            {quoteResults.length > 0 && (
                              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs font-medium text-blue-800 mb-2">
                                  {quoteResults.length} matching rate{quoteResults.length > 1 ? 's' : ''} found — click to apply
                                </p>
                                <div className="space-y-1.5">
                                  {quoteResults.map(lane => (
                                    <button
                                      key={lane.id}
                                      type="button"
                                      onClick={() => applyQuote(lane)}
                                      className="w-full text-left p-2 bg-white rounded border border-blue-100 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                    >
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-medium text-gray-900">{lane.lane_display}</span>
                                        <span className="font-bold text-green-700">${parseFloat(lane.customer_rate).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                                      </div>
                                      <div className="flex items-center justify-between text-xs text-gray-500 mt-0.5">
                                        <span>{lane.equipment_type_display} · {lane.rate_type_display}{lane.customer_name ? ` · ${lane.customer_name}` : ' · Default'}</span>
                                        {lane.estimated_margin && <span className="text-green-600">{lane.estimated_margin}% margin</span>}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {quoteResults.length === 0 && quoteLooking === false && formData.customer_rate === '' && (
                              <p className="text-xs text-gray-400 mb-2">Tip: Click "Get Quote" to auto-fill from your rate lanes.</p>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={labelClass}>Customer Rate ($)</label>
                                <input type="number" name="customer_rate" value={formData.customer_rate} onChange={handleChange} className={inputClass} step="0.01" placeholder="0.00" />
                              </div>
                              <div>
                                <label className={labelClass}>Carrier Cost ($)</label>
                                <input type="number" name="carrier_cost" value={formData.carrier_cost} onChange={handleChange} className={inputClass} step="0.01" placeholder="0.00" />
                              </div>
                              <div>
                                <label className={labelClass}>Fuel Surcharge ($)</label>
                                <input type="number" name="fuel_surcharge" value={formData.fuel_surcharge} onChange={handleChange} className={inputClass} step="0.01" placeholder="0.00" />
                              </div>
                              <div>
                                <label className={labelClass}>Accessorial Charges ($)</label>
                                <input type="number" name="accessorial_charges" value={formData.accessorial_charges} onChange={handleChange} className={inputClass} step="0.01" placeholder="0.00" />
                              </div>
                            </div>
                            {/* Margin preview */}
                            {formData.customer_rate && formData.carrier_cost && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Estimated Profit:</span>
                                  <span className={`font-medium ${(parseFloat(formData.customer_rate) - parseFloat(formData.carrier_cost)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ${(parseFloat(formData.customer_rate) - parseFloat(formData.carrier_cost) + (parseFloat(formData.fuel_surcharge) || 0) + (parseFloat(formData.accessorial_charges) || 0)).toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                  <span className="text-gray-600">Margin:</span>
                                  <span className="font-medium text-gray-900">
                                    {((parseFloat(formData.customer_rate) + (parseFloat(formData.fuel_surcharge) || 0) + (parseFloat(formData.accessorial_charges) || 0)) > 0
                                      ? (((parseFloat(formData.customer_rate) + (parseFloat(formData.fuel_surcharge) || 0) + (parseFloat(formData.accessorial_charges) || 0) - parseFloat(formData.carrier_cost)) / (parseFloat(formData.customer_rate) + (parseFloat(formData.fuel_surcharge) || 0) + (parseFloat(formData.accessorial_charges) || 0))) * 100).toFixed(1)
                                      : 0)}%
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Notes */}
                          <div>
                            <label className={labelClass}>Notes</label>
                            <textarea name="notes" value={formData.notes} onChange={handleChange} className={inputClass} rows="3" placeholder="Any additional notes about this load..." />
                          </div>
                        </div>
                      )}
                    {/* Footer */}
                    <div className="flex justify-between pt-4">
                      <div>
                        {step > 1 && (
                          <button type="button" onClick={handleBack} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Back
                          </button>
                        )}
                      </div>
                      <div className="flex space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                          Cancel
                        </button>
                        {step < 3 ? (
                          <button type="button" onClick={handleNext} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Next
                          </button>
                        ) : (
                          <button type="button" onClick={handleSubmit} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading ? 'Creating...' : 'Create Load'}
                          </button>
                        )}
                      </div>
                    </div>
                  </form>
      </div>
    </div>

      {/* Add Customer Modal */}
      {isAddCustomerOpen && (
        <AddCustomer
          isOpen={isAddCustomerOpen}
          onClose={() => setIsAddCustomerOpen(false)}
          onCustomerCreated={handleCustomerCreated}
          defaultCompany={formData.company}
        />
      )}
    </>
  );
};

export default AddLoad;
