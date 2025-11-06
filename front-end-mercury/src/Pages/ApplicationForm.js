import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import BASE_URL from '../config';
import FileUploadField from '../components/FileUploadField';

// Create a public axios instance without auth interceptors
const publicAxios = axios.create();

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

const ApplicationForm = () => {
    const [searchParams] = useSearchParams();
    const [formData, setFormData] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        address: '',
        zip_code: '',
        state: '',
        cdla_experience: false,
        drivers_license: null,
        medical_certificate: null,
        company: null, // Will be auto-populated from URL
    });
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);
    const [fileErrors, setFileErrors] = useState({});
    const [companyInfo, setCompanyInfo] = useState(null);
    const [tenantInfo, setTenantInfo] = useState(null);
    const [loadingCompany, setLoadingCompany] = useState(false);

    // Function to extract tenant domain from hostname
    const extractTenantDomain = () => {
        // For now, always use URL parameter since we're on shared hosting
        // Later when you have custom subdomains like "secoya.fleetly.com", 
        // you can update this logic to extract from hostname
        return searchParams.get('tenant') || null;
    };

    // Function to extract company slug from URL parameters
    const extractCompanySlug = () => {
        // Check for company slug in URL params (e.g., ?company=east-coast)
        return searchParams.get('company') || null;
    };

    // Run company resolution when component mounts or URL params change
    useEffect(() => {
        const resolveCompany = async () => {
            const tenantDomain = extractTenantDomain();
            const companySlug = extractCompanySlug();

            if (!tenantDomain) {
                console.log('No tenant domain found in URL');
                return;
            }

            setLoadingCompany(true);
            try {
                let url = `${BASE_URL}/api/resolve/${tenantDomain}/`;
                if (companySlug) {
                    url += `${companySlug}/`;
                }

                console.log('Resolving company from URL:', url);
                const response = await publicAxios.get(url);
                
                if (response.data.tenant) {
                    setTenantInfo(response.data.tenant);
                }
                
                if (response.data.company) {
                    setCompanyInfo(response.data.company);
                    // Auto-populate the company field
                    setFormData(prev => ({
                        ...prev,
                        company: response.data.company.id
                    }));
                    setMessage({ 
                        type: 'success', 
                        text: `Applying to ${response.data.company.name}` 
                    });
                } else if (response.data.companies && response.data.companies.length === 1) {
                    // If only one company for this tenant, auto-select it
                    const company = response.data.companies[0];
                    setCompanyInfo(company);
                    setFormData(prev => ({
                        ...prev,
                        company: company.id
                    }));
                    setMessage({ 
                        type: 'success', 
                        text: `Applying to ${company.name}` 
                    });
                }
            } catch (error) {
                console.error('Error resolving company from URL:', error);
                if (error.response?.status === 404) {
                    setMessage({ 
                        type: 'error', 
                        text: 'Company not found. Please check the URL.' 
                    });
                }
            } finally {
                setLoadingCompany(false);
            }
        };

        resolveCompany();
    }, [searchParams]); // Only depend on searchParams

    const handleChange = (e) => {
        const { name, type, value, checked } = e.target;
        if (name === 'cdla_experience') {
            setFormData({ ...formData, cdla_experience: value === 'yes' });
            return;
        }
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleFileSelect = (fieldName, file) => {
        setFormData({
            ...formData,
            [fieldName]: file
        });
        
        // Clear any existing error for this field
        if (fileErrors[fieldName]) {
            setFileErrors({
                ...fileErrors,
                [fieldName]: null
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage(null);
        setFileErrors({});
        
        try {
            // For file uploads, we need to use FormData
            const hasFiles = formData.drivers_license || formData.medical_certificate;
            
            if (hasFiles) {
                // Use FormData for file upload
                const formDataToSend = new FormData();
                
                // Add all form fields except files first
                Object.keys(formData).forEach(key => {
                    if (key !== 'drivers_license' && key !== 'medical_certificate') {
                        formDataToSend.append(key, formData[key]);
                    }
                });
                
                // Add files only if they exist
                if (formData.drivers_license) {
                    formDataToSend.append('drivers_license', formData.drivers_license);
                }
                if (formData.medical_certificate) {
                    formDataToSend.append('medical_certificate', formData.medical_certificate);
                }
                
                console.log('Sending FormData with files');
                const response = await publicAxios.post(`${BASE_URL}/api/applications/`, formDataToSend);
                console.log('Submission response:', response);
            } else {
                // No files, send as regular JSON
                const dataToSend = { ...formData };
                delete dataToSend.drivers_license;
                delete dataToSend.medical_certificate;
                
                console.log('Sending data without files:', dataToSend);
                const response = await publicAxios.post(`${BASE_URL}/api/applications/`, dataToSend);
                console.log('Submission response:', response);
            }
            setMessage({ type: 'success', text: 'Application submitted successfully.' });
            setFormData({ 
                first_name: '', 
                middle_name: '', 
                last_name: '', 
                email: '', 
                phone_number: '',
                address: '',
                zip_code: '',
                state: '',
                cdla_experience: false,
                drivers_license: null,
                medical_certificate: null,
                company: formData.company, // Keep the company selected
            });
        } catch (error) {
            console.error('Submission error:', error);
            setMessage({ type: 'error', text: 'Failed to submit application. Please try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="app-page">
            <style>{`
                .app-page { min-height: 100vh; background: linear-gradient(135deg, #f6f9ff 0%, #eef3ff 100%); display:flex; align-items:center; justify-content:center; padding:40px; }
                .app-card { width:100%; max-width:760px; background:#ffffff; border-radius:16px; box-shadow: 0 10px 30px rgba(2,6,23,0.08); padding:32px; }
                .app-title { margin:0 0 6px; text-align:center; font-size:28px; color:#0f172a; font-weight:700; letter-spacing:-0.02em; }
                .app-subtitle { margin:0 0 20px; text-align:center; color:#64748b; }
                .app-form { display:grid; grid-template-columns: repeat(12, 1fr); gap:16px; }
                .app-field { display:flex; flex-direction:column; gap:6px; }
                .app-field label { font-size:14px; font-weight:600; color:#0f172a; }
                .app-field input:not([type="checkbox"]) { width:100%; padding:12px 14px; border-radius:10px; border:1px solid #e2e8f0; background:#f8fafc; color:#0f172a; transition: all .15s ease; }
                .app-field input::placeholder { color:#94a3b8; }
                .app-field input:not([type="checkbox"]):focus { outline:none; background:#ffffff; border-color:#2563eb; box-shadow: 0 0 0 4px rgba(37,99,235,.15); }
                .app-field select { width:100%; padding:12px 14px; border-radius:10px; border:1px solid #e2e8f0; background:#f8fafc; color:#0f172a; transition: all .15s ease; }
                .app-field select:focus { outline:none; background:#ffffff; border-color:#2563eb; box-shadow: 0 0 0 4px rgba(37,99,235,.15); }
                .app-actions { grid-column: 1 / -1; display:flex; justify-content:flex-end; margin-top:8px; }
                .app-btn { padding:12px 18px; background:#2563eb; color:#fff; border:none; border-radius:10px; font-weight:600; cursor:pointer; transition: transform .1s ease, background .15s ease, box-shadow .15s ease; box-shadow: 0 6px 16px rgba(37,99,235,.25); }
                .app-btn:hover { background:#1d4ed8; transform: translateY(-1px); box-shadow: 0 8px 18px rgba(29,78,216,.25); }
                .app-btn:active { transform: translateY(0); }
                .app-btn:disabled { opacity:.7; cursor:not-allowed; }
                .app-alert { grid-column:1 / -1; border-radius:12px; padding:12px 16px; border:1px solid transparent; margin-bottom:24px; }
                .app-alert.success { background:#ecfdf5; color:#065f46; border-color:#10b981; }
                .app-alert.error { background:#fef2f2; color:#991b1b; border-color:#ef4444; }
                .app-alert.info { background:#eff6ff; color:#1e40af; border-color:#3b82f6; }
                .app-col-12 { grid-column: 1 / -1; }
                .app-col-4 { grid-column: span 12; }
                @media (min-width: 768px) {
                    .app-col-4 { grid-column: span 4; }
                }
            `}</style>

            <div className="app-card">
                <h2 className="app-title">Driver Application</h2>
                <p className="app-subtitle">Please provide your details to get started.</p>

                {loadingCompany && (
                    <div className="app-alert info">
                        Loading company information...
                    </div>
                )}

                {message && (
                    <div className={`app-alert ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="app-form">
                    <div className="app-field app-col-4">
                        <label htmlFor="first_name">First Name</label>
                        <input
                            id="first_name"
                            type="text"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            required
                            placeholder="John"
                        />
                    </div>
                    <div className="app-field app-col-4">
                        <label htmlFor="middle_name">Middle Name</label>
                        <input
                            id="middle_name"
                            type="text"
                            name="middle_name"
                            value={formData.middle_name}
                            onChange={handleChange}
                            placeholder="A."
                        />
                    </div>
                    <div className="app-field app-col-4">
                        <label htmlFor="last_name">Last Name</label>
                        <input
                            id="last_name"
                            type="text"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            required
                            placeholder="Doe"
                        />
                    </div>
                    <div className="app-field app-col-12">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="john.doe@example.com"
                        />
                    </div>
                    <div className="app-field app-col-12">
                        <label htmlFor="phone_number">Phone Number</label>
                        <input
                            id="phone_number"
                            type="tel"
                            name="phone_number"
                            value={formData.phone_number}
                            onChange={handleChange}
                            required
                            placeholder="+1 555 123 4567"
                        />
                    </div>

                    <div className="app-field app-col-12">
                        <label htmlFor="address">Address</label>
                        <input
                            id="address"
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            required
                            placeholder="123 Main St, Apt 4B"
                        />
                    </div>
                    <div className="app-field app-col-4">
                        <label htmlFor="zip_code">Zip Code</label>
                        <input
                            id="zip_code"
                            type="text"
                            name="zip_code"
                            value={formData.zip_code}
                            onChange={handleChange}
                            required
                            placeholder="12345"
                        />
                    </div>
                    <div className="app-field app-col-4">
                        <label htmlFor="state">State</label>
                        <select
                            id="state"
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            required
                        >
                            <option value="" disabled>Select a state</option>
                            {US_STATES.map(s => (
                                <option key={s.value} value={s.label}>{s.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="app-field app-col-12">
                        <label htmlFor="cdla_experience">Verifiable CDL-A Experience</label>
                        <select
                            id="cdla_experience"
                            name="cdla_experience"
                            value={formData.cdla_experience ? 'yes' : 'no'}
                            onChange={handleChange}
                            required
                        >
                            <option value="yes">Yes, I have verifiable CDL-A experience</option>
                            <option value="no">No, I do not</option>
                        </select>
                    </div>

                    <div className="app-field app-col-12" style={{ marginTop: '20px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>
                            Required Documents
                        </h3>
                        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
                            Please upload clear photos or scans of the following documents:
                        </p>
                    </div>

                    <div className="app-field app-col-12">
                        <FileUploadField
                            label="Driver's License *"
                            name="drivers_license"
                            accept={{
                                'image/*': ['.png', '.jpg', '.jpeg'],
                                'application/pdf': ['.pdf']
                            }}
                            maxSize={5 * 1024 * 1024} // 5MB
                            onFileSelect={handleFileSelect}
                            currentFile={formData.drivers_license}
                            error={fileErrors.drivers_license}
                        />
                    </div>

                    <div className="app-field app-col-12">
                        <FileUploadField
                            label="Medical Certificate / DOT Physical *"
                            name="medical_certificate"
                            accept={{
                                'image/*': ['.png', '.jpg', '.jpeg'],
                                'application/pdf': ['.pdf']
                            }}
                            maxSize={5 * 1024 * 1024} // 5MB
                            onFileSelect={handleFileSelect}
                            currentFile={formData.medical_certificate}
                            error={fileErrors.medical_certificate}
                        />
                    </div>

                    <div className="app-actions">
                        <button type="submit" className="app-btn" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Application'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ApplicationForm;
