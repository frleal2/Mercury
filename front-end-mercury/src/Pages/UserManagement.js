import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import Header from '../components/Header';
import BASE_URL from '../config';
import { PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

function UserManagement() {
    const { session, refreshAccessToken } = useSession();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [tenantInfo, setTenantInfo] = useState(null);
    const [inviteForm, setInviteForm] = useState({
        email: '',
        first_name: '',
        last_name: '',
        company_ids: []
    });
    const [editForm, setEditForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        company_ids: []
    });
    const [message, setMessage] = useState(null);

    // Fetch users and companies on component mount
    useEffect(() => {
        fetchUsers();
        fetchCompanies();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${BASE_URL}/api/tenant-users/`, {
                headers: { 'Authorization': `Bearer ${session.accessToken}` }
            });
            setUsers(response.data.users);
            setTenantInfo(response.data.tenant);
        } catch (error) {
            console.error('Error fetching users:', error);
            if (error.response?.status === 401) {
                await refreshAccessToken();
            } else {
                setMessage({ type: 'error', text: 'Failed to load users' });
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanies = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/api/companies/`, {
                headers: { 'Authorization': `Bearer ${session.accessToken}` }
            });
            setCompanies(response.data);
        } catch (error) {
            console.error('Error fetching companies:', error);
        }
    };

    const handleInviteUser = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`${BASE_URL}/api/invite-user/`, inviteForm, {
                headers: { 'Authorization': `Bearer ${session.accessToken}` }
            });
            setMessage({ type: 'success', text: 'User invited successfully!' });
            setIsInviteModalOpen(false);
            setInviteForm({ email: '', first_name: '', last_name: '', company_ids: [] });
            fetchUsers(); // Refresh user list
        } catch (error) {
            console.error('Error inviting user:', error);
            setMessage({ 
                type: 'error', 
                text: error.response?.data?.error || 'Failed to invite user' 
            });
        }
    };

    const handleCompanyChange = (companyId, isChecked) => {
        setInviteForm(prev => ({
            ...prev,
            company_ids: isChecked 
                ? [...prev.company_ids, companyId]
                : prev.company_ids.filter(id => id !== companyId)
        }));
    };

    const handleEditCompanyChange = (companyId, isChecked) => {
        setEditForm(prev => ({
            ...prev,
            company_ids: isChecked 
                ? [...prev.company_ids, companyId]
                : prev.company_ids.filter(id => id !== companyId)
        }));
    };

    const handleEditUser = (user) => {
        setEditingUser(user);
        setEditForm({
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            company_ids: user.companies.map(company => company.id)
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.put(`${BASE_URL}/api/users/${editingUser.id}/`, editForm, {
                headers: { 'Authorization': `Bearer ${session.accessToken}` }
            });
            setMessage({ type: 'success', text: 'User updated successfully!' });
            setIsEditModalOpen(false);
            setEditingUser(null);
            setEditForm({ first_name: '', last_name: '', email: '', company_ids: [] });
            fetchUsers(); // Refresh user list
        } catch (error) {
            console.error('Error updating user:', error);
            setMessage({ 
                type: 'error', 
                text: error.response?.data?.error || 'Failed to update user' 
            });
        }
    };

    const handleRemoveUser = async (userId) => {
        if (window.confirm('Are you sure you want to remove this user?')) {
            try {
                await axios.delete(`${BASE_URL}/api/users/${userId}/`, {
                    headers: { 'Authorization': `Bearer ${session.accessToken}` }
                });
                setMessage({ type: 'success', text: 'User removed successfully!' });
                fetchUsers(); // Refresh user list
            } catch (error) {
                console.error('Error removing user:', error);
                setMessage({ 
                    type: 'error', 
                    text: error.response?.data?.error || 'Failed to remove user' 
                });
            }
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-lg">Loading users...</div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">User Management</h1>
                <p className="text-gray-600">Manage users and their company access within your organization.</p>
            </div>

            {message && (
                <div className={`mb-4 p-4 rounded-md ${
                    message.type === 'success' 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                    {message.text}
                </div>
            )}

            {/* Header with Add User button */}
            <div className="mb-6 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                    {users.length} user{users.length !== 1 ? 's' : ''} in your organization
                </div>
                <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                    Invite User
                </button>
            </div>

            {/* Users Table */}
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Companies
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">
                                            {user.first_name} {user.last_name}
                                        </div>
                                        <div className="text-sm text-gray-500">{user.email}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {user.companies.map((company) => (
                                            <span
                                                key={company.id}
                                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                            >
                                                {company.name}
                                            </span>
                                        ))}
                                        {user.companies.length === 0 && (
                                            <span className="text-sm text-gray-400">No companies assigned</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        user.is_company_admin 
                                            ? 'bg-purple-100 text-purple-800' 
                                            : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {user.is_company_admin ? 'Admin' : 'User'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        user.is_active 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {user.is_active ? 'Active' : 'Pending'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex space-x-2">
                                        <button 
                                            onClick={() => handleEditUser(user)}
                                            className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-full transition-colors"
                                            title="Edit User"
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleRemoveUser(user.id)}
                                            className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-full transition-colors"
                                            title="Remove User"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Invite User Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Invite New User</h3>
                            <form onSubmit={handleInviteUser}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={inviteForm.email}
                                        onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="mb-4 grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={inviteForm.first_name}
                                            onChange={(e) => setInviteForm({...inviteForm, first_name: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={inviteForm.last_name}
                                            onChange={(e) => setInviteForm({...inviteForm, last_name: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Assign to Companies
                                    </label>
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                        {companies.map((company) => (
                                            <label key={company.id} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={inviteForm.company_ids.includes(company.id)}
                                                    onChange={(e) => handleCompanyChange(company.id, e.target.checked)}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm">{company.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsInviteModalOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                    >
                                        Send Invite
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {isEditModalOpen && editingUser && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Edit User</h3>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateUser}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.first_name}
                                        onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.last_name}
                                        onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    User Information
                                </label>
                                <div className="bg-gray-50 p-3 rounded-md space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Tenant:</span>
                                        <span className="text-sm font-medium">{tenantInfo?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Username:</span>
                                        <span className="text-sm font-medium">{editingUser.username}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Role:</span>
                                        <span className="text-sm font-medium">
                                            {editingUser.is_company_admin ? 'Admin' : 'User'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Status:</span>
                                        <span className={`text-sm font-medium ${
                                            editingUser.is_active ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {editingUser.is_active ? 'Active' : 'Pending'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Assign to Companies
                                </label>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {companies.map((company) => (
                                        <label key={company.id} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={editForm.company_ids.includes(company.id)}
                                                onChange={(e) => handleEditCompanyChange(company.id, e.target.checked)}
                                                className="mr-2"
                                            />
                                            <span className="text-sm">{company.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                >
                                    Update User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;