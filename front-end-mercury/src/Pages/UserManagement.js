import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import InviteUser from '../components/InviteUser';
import BASE_URL from '../config';
import { PencilIcon, TrashIcon, XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';

function UserManagement() {
    const { session, refreshAccessToken } = useSession();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [tenantInfo, setTenantInfo] = useState(null);
    const [message, setMessage] = useState(null);
    const [refreshUsers, setRefreshUsers] = useState(0);

    // Fetch users on component mount and when refreshUsers changes
    useEffect(() => {
        fetchUsers();
    }, [refreshUsers]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${BASE_URL}/api/tenant-users/`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`
                }
            });
            
            setUsers(response.data.users || []);
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

    const handleInviteUser = () => {
        setIsInviteModalOpen(true);
    };

    const handleCloseInvite = () => {
        setIsInviteModalOpen(false);
        // Refresh users list after invitation
        setRefreshUsers(prev => prev + 1);
    };

    const clearMessage = () => {
        setMessage(null);
    };

    // Check if user can invite others
    const canInviteUsers = () => {
        const userRole = session?.userInfo?.role;
        return userRole === 'admin' || userRole === 'user';
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
                <p className="text-gray-600">Manage users and their company access within {tenantInfo?.name || 'your organization'}.</p>
            </div>

                {message && (
                    <div className={`mb-4 p-4 rounded-md ${
                        message.type === 'success' 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                        <div className="flex justify-between items-center">
                            <span>{message.text}</span>
                            <button 
                                onClick={clearMessage}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Header with Add User button */}
                <div className="mb-6 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                        Role-based user management for {tenantInfo?.name || 'your organization'}
                    </div>
                    {canInviteUsers() && (
                        <button
                            onClick={handleInviteUser}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                        >
                            <UserPlusIcon className="w-4 h-4" />
                            <span>Invite User</span>
                        </button>
                    )}
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {users.length === 0 ? (
                        <div className="text-center py-12">
                            <UserPlusIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No Users Found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {canInviteUsers() 
                                    ? 'Start by inviting users to your organization. Users will receive an email invitation to create their account.'
                                    : 'You do not have permission to manage users.'
                                }
                            </p>
                            {canInviteUsers() && (
                                <div className="mt-6">
                                    <button
                                        onClick={handleInviteUser}
                                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        <UserPlusIcon className="-ml-1 mr-2 h-5 w-5" />
                                        Invite User
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Companies
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date Joined
                                    </th>
                                    <th className="relative px-6 py-3">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                                        <span className="text-sm font-medium text-gray-700">
                                                            {user.first_name?.charAt(0) || user.email?.charAt(0)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.first_name} {user.last_name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                user.role === 'admin' 
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : user.role === 'user'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-green-100 text-green-800'
                                            }`}>
                                                {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {user.companies?.map(company => company.name).join(', ') || 'None'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                user.is_active 
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(user.date_joined).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {canInviteUsers() && (
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                        title="Edit User"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        className="text-red-600 hover:text-red-900"
                                                        title="Delete User"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

            {/* Role-based invitation modal */}
            {isInviteModalOpen && (
                <InviteUser onClose={handleCloseInvite} />
            )}
        </div>
    );
}

export default UserManagement;