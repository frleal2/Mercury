import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import { UserIcon, EnvelopeIcon, BuildingOfficeIcon, CheckIcon } from '@heroicons/react/24/outline';

const Settings = () => {
    const { session, refreshAccessToken, refreshUserProfile } = useSession();
    const [userProfile, setUserProfile] = useState(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        username: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [companies, setCompanies] = useState([]);

    useEffect(() => {
        fetchUserProfile();
        fetchUserCompanies();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/api/user/profile/`, {
                headers: { 'Authorization': `Bearer ${session.accessToken}` }
            });
            const user = response.data;
            setUserProfile(user);
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                username: user.username || ''
            });

            setLoading(false);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            if (error.response?.status === 401) {
                await refreshAccessToken();
                fetchUserProfile();
            } else {
                setError('Failed to load profile information');
                setLoading(false);
            }
        }
    };

    const fetchUserCompanies = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/api/companies/`, {
                headers: { 'Authorization': `Bearer ${session.accessToken}` }
            });
            setCompanies(response.data);
        } catch (error) {
            console.error('Error fetching companies:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear messages when user starts typing
        if (error) setError('');
        if (success) setSuccess('');
    };



    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const response = await axios.patch(`${BASE_URL}/api/user/profile/`, formData, {
                headers: { 
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            setSuccess('Profile updated successfully!');
            setUserProfile(response.data);
            
            // Refresh the global user profile so Header updates
            if (refreshUserProfile) {
                refreshUserProfile();
            }
            
            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(''), 3000);
            
        } catch (error) {
            console.error('Error updating profile:', error);
            if (error.response?.status === 401) {
                await refreshAccessToken();
                handleSubmit(e);
            } else if (error.response?.data?.username) {
                setError('Username is already taken. Please choose a different username.');
            } else if (error.response?.data?.email) {
                setError('Email is already in use. Please use a different email address.');
            } else {
                setError(error.response?.data?.error || 'Failed to update profile. Please try again.');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="bg-white shadow rounded-lg mb-6">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            <UserIcon className="h-6 w-6 mr-2 text-blue-600" />
                            Account Settings
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Manage your personal information and account preferences
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Profile Information */}
                    <div className="lg:col-span-2">
                        <div className="bg-white shadow rounded-lg">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
                                <p className="text-sm text-gray-600">Update your personal details</p>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                                {/* Profile Avatar */}
                                <div className="flex flex-col items-center space-y-4 pb-4 border-b border-gray-200">
                                    <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center">
                                        {formData.first_name || formData.last_name ? (
                                            <span className="text-2xl font-medium text-blue-800">
                                                {formData.first_name?.charAt(0) || ''}{formData.last_name?.charAt(0) || ''}
                                            </span>
                                        ) : (
                                            <UserIcon className="w-12 h-12 text-gray-400" />
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500">Your profile avatar is based on your initials</p>
                                </div>

                                {/* Name Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            name="first_name"
                                            value={formData.first_name}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter your first name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            name="last_name"
                                            value={formData.last_name}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter your last name"
                                        />
                                    </div>
                                </div>

                                {/* Username Field */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter your username"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Used for login. Can only contain letters, numbers, and underscores.
                                    </p>
                                </div>

                                {/* Email Field */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter your email address"
                                    />
                                </div>

                                {/* Error/Success Messages */}
                                {error && (
                                    <div className="rounded-md bg-red-50 p-4">
                                        <div className="text-sm text-red-800">{error}</div>
                                    </div>
                                )}

                                {success && (
                                    <div className="rounded-md bg-green-50 p-4">
                                        <div className="text-sm text-green-800 flex items-center">
                                            <CheckIcon className="h-4 w-4 mr-2" />
                                            {success}
                                        </div>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className={`w-full md:w-auto px-6 py-2 text-white font-medium rounded-md transition-colors ${
                                            saving
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                                        }`}
                                    >
                                        {saving ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Saving...
                                            </>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Account Overview Sidebar */}
                    <div className="space-y-6">
                        {/* Account Info */}
                        <div className="bg-white shadow rounded-lg">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">Account Overview</h3>
                            </div>
                            <div className="px-6 py-4 space-y-3">
                                <div className="flex items-center">
                                    <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {userProfile?.first_name} {userProfile?.last_name}
                                        </p>
                                        <p className="text-xs text-gray-500">@{userProfile?.username}</p>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                                    <div>
                                        <p className="text-sm text-gray-900">{userProfile?.email}</p>
                                        <p className="text-xs text-gray-500">Email Address</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Company Access */}
                        {companies.length > 0 && (
                            <div className="bg-white shadow rounded-lg">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                        <BuildingOfficeIcon className="h-5 w-5 mr-2 text-blue-600" />
                                        Company Access
                                    </h3>
                                </div>
                                <div className="px-6 py-4">
                                    <div className="space-y-2">
                                        {companies.map((company) => (
                                            <div key={company.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                <span className="text-sm font-medium text-gray-900">{company.name}</span>
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                    company.active 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {company.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;