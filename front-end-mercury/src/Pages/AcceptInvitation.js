import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import BASE_URL from '../config';

const AcceptInvitation = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    
    // US States for dropdown
    const US_STATES = [
        { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
        { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
        { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
        { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
        { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
        { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
        { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
        { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
        { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
        { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
        { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
        { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
        { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
        { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
        { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
        { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
        { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
    ];
    
    const [invitationData, setInvitationData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        username: '',
        first_name: '',
        last_name: '',
        password: '',
        confirmPassword: '',
        // Driver-specific fields
        dob: '',
        ssn: '',
        state: '',
        cdl_number: '',
        cdl_expiration_date: '',
        physical_date: '',
        annual_vmr_date: '',
        phone: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        validateInvitation();
    }, [token]);

    const validateInvitation = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/api/validate-invitation/${token}/`);
            setInvitationData(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Invitation validation error:', error);
            setError(error.response?.data?.error || 'Invalid or expired invitation');
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate form
        if (!formData.username || !formData.first_name || !formData.last_name || !formData.password || !formData.confirmPassword) {
            setError('All basic fields are required');
            return;
        }

        // Driver-specific validation
        if (invitationData?.role === 'driver') {
            if (!formData.dob || !formData.ssn || !formData.state || !formData.cdl_number || 
                !formData.cdl_expiration_date || !formData.physical_date || !formData.annual_vmr_date || !formData.phone) {
                setError('All driver information fields are required');
                return;
            }

            // Validate date formats and logic
            const today = new Date();
            const dobDate = new Date(formData.dob);
            const cdlExpDate = new Date(formData.cdl_expiration_date);
            const physicalDate = new Date(formData.physical_date);
            const vmrDate = new Date(formData.annual_vmr_date);

            if (dobDate >= today) {
                setError('Date of birth must be in the past');
                return;
            }

            if (cdlExpDate <= today) {
                setError('CDL expiration date must be in the future');
                return;
            }

            if (physicalDate <= today) {
                setError('Medical certificate expiration date must be in the future');
                return;
            }

            if (vmrDate <= today) {
                setError('Annual VMR date must be in the future');
                return;
            }

            // Validate phone format
            const phoneRegex = /^[\d\s\-\(\)\.]+$/;
            if (!phoneRegex.test(formData.phone)) {
                setError('Please enter a valid phone number');
                return;
            }

            // Validate SSN format (XXX-XX-XXXX or XXXXXXXXX)
            const ssnRegex = /^(\d{3}-?\d{2}-?\d{4})$/;
            if (!ssnRegex.test(formData.ssn)) {
                setError('Please enter a valid SSN format (XXX-XX-XXXX)');
                return;
            }
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (formData.username.length < 3) {
            setError('Username must be at least 3 characters long');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            setError('Username can only contain letters, numbers, and underscores');
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                username: formData.username,
                first_name: formData.first_name,
                last_name: formData.last_name,
                password: formData.password
            };

            // Add driver-specific data if role is driver
            if (invitationData?.role === 'driver') {
                payload.driver_data = {
                    dob: formData.dob,
                    ssn: formData.ssn,
                    state: formData.state,
                    cdl_number: formData.cdl_number,
                    cdl_expiration_date: formData.cdl_expiration_date,
                    physical_date: formData.physical_date,
                    annual_vmr_date: formData.annual_vmr_date,
                    phone: formData.phone
                };
            }

            const response = await axios.post(`${BASE_URL}/api/accept-invitation/${token}/`, payload);

            // Redirect to login page with success message
            navigate('/login', { 
                state: { 
                    message: 'Account created successfully! Please log in with your credentials.',
                    username: formData.username
                }
            });

        } catch (error) {
            console.error('Account creation error:', error);
            setError(error.response?.data?.error || 'Failed to create account. Please try again.');
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Validating invitation...</p>
                </div>
            </div>
        );
    }

    if (error && !invitationData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.84-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h3 className="mt-4 text-lg font-medium text-gray-900">Invalid Invitation</h3>
                        <p className="mt-2 text-sm text-gray-500">{error}</p>
                        <div className="mt-6">
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Go to Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-gray-900">Welcome to Fleetly</h2>
                        <p className="mt-2 text-sm text-gray-600">
                            You've been invited to join <strong>{invitationData?.tenant_name}</strong>
                        </p>
                        <p className="text-sm text-gray-500">
                            Company: <strong>{invitationData?.company_name}</strong>
                        </p>
                        <p className="text-sm text-gray-500">
                            Role: <strong>{invitationData?.role_display}</strong>
                        </p>
                        <p className="text-sm text-gray-500">
                            Email: <strong>{invitationData?.email}</strong>
                        </p>
                    </div>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                                Username
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                value={formData.username}
                                onChange={handleInputChange}
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Choose a unique username"
                            />
                        </div>

                        <div>
                            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                                First Name
                            </label>
                            <input
                                id="first_name"
                                name="first_name"
                                type="text"
                                required
                                value={formData.first_name}
                                onChange={handleInputChange}
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Enter your first name"
                            />
                        </div>

                        <div>
                            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                                Last Name
                            </label>
                            <input
                                id="last_name"
                                name="last_name"
                                type="text"
                                required
                                value={formData.last_name}
                                onChange={handleInputChange}
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Enter your last name"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={formData.password}
                                onChange={handleInputChange}
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Create a password (min. 8 characters)"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Confirm your password"
                            />
                        </div>

                        {/* Driver-specific fields */}
                        {invitationData?.role === 'driver' && (
                            <>
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">Driver Information</h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Please provide your driver information to complete your profile setup. 
                                        This information is required for DOT compliance and fleet management.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="dob" className="block text-sm font-medium text-gray-700">
                                                Date of Birth *
                                            </label>
                                            <input
                                                id="dob"
                                                name="dob"
                                                type="date"
                                                required
                                                value={formData.dob}
                                                onChange={handleInputChange}
                                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="ssn" className="block text-sm font-medium text-gray-700">
                                                Social Security Number *
                                            </label>
                                            <input
                                                id="ssn"
                                                name="ssn"
                                                type="text"
                                                required
                                                value={formData.ssn}
                                                onChange={handleInputChange}
                                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                                placeholder="XXX-XX-XXXX"
                                                maxLength="11"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                                Phone Number *
                                            </label>
                                            <input
                                                id="phone"
                                                name="phone"
                                                type="tel"
                                                required
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                                placeholder="(555) 123-4567"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                                                State *
                                            </label>
                                            <select
                                                id="state"
                                                name="state"
                                                required
                                                value={formData.state}
                                                onChange={handleInputChange}
                                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                            >
                                                <option value="">Select State</option>
                                                {US_STATES.map((state) => (
                                                    <option key={state.code} value={state.name}>
                                                        {state.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="cdl_number" className="block text-sm font-medium text-gray-700">
                                                CDL Number *
                                            </label>
                                            <input
                                                id="cdl_number"
                                                name="cdl_number"
                                                type="text"
                                                required
                                                value={formData.cdl_number}
                                                onChange={handleInputChange}
                                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                                placeholder="Enter CDL number"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="cdl_expiration_date" className="block text-sm font-medium text-gray-700">
                                                CDL Expiration Date *
                                            </label>
                                            <input
                                                id="cdl_expiration_date"
                                                name="cdl_expiration_date"
                                                type="date"
                                                required
                                                value={formData.cdl_expiration_date}
                                                onChange={handleInputChange}
                                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="physical_date" className="block text-sm font-medium text-gray-700">
                                                Medical Certificate Expiration *
                                            </label>
                                            <input
                                                id="physical_date"
                                                name="physical_date"
                                                type="date"
                                                required
                                                value={formData.physical_date}
                                                onChange={handleInputChange}
                                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="annual_vmr_date" className="block text-sm font-medium text-gray-700">
                                                Annual VMR Date *
                                            </label>
                                            <input
                                                id="annual_vmr_date"
                                                name="annual_vmr_date"
                                                type="date"
                                                required
                                                value={formData.annual_vmr_date}
                                                onChange={handleInputChange}
                                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {error && (
                        <div className="rounded-md bg-red-50 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                                    <div className="mt-2 text-sm text-red-700">
                                        <p>{error}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                                submitting 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                            }`}
                        >
                            {submitting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating Account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </div>

                    <div className="text-center">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="font-medium text-blue-600 hover:text-blue-500"
                            >
                                Sign in here
                            </button>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AcceptInvitation;