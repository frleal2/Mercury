import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import InviteUser from '../components/InviteUser';
import EditUser from '../components/EditUser';
import BASE_URL from '../config';
import { PencilIcon, TrashIcon, XMarkIcon, UserPlusIcon, MapPinIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

function UserManagement() {
    const { session, refreshAccessToken } = useSession();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [tenantInfo, setTenantInfo] = useState(null);
    const [message, setMessage] = useState(null);
    const [refreshUsers, setRefreshUsers] = useState(0);
    const [editingUser, setEditingUser] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

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

    const handleEditUser = (user) => {
        setEditingUser(user);
    };

    const handleCloseEditUser = () => {
        setEditingUser(null);
        // Don't refresh on cancel - only refresh when user is actually updated
    };

    const handleUserUpdated = () => {
        setRefreshUsers(prev => prev + 1);
    };

    const handleDeleteUser = (user) => {
        setShowDeleteConfirm(user);
    };

    const confirmDeleteUser = async (user) => {
        try {
            // TODO: Implement delete user API call
            console.log('Delete user:', user);
            setShowDeleteConfirm(null);
        } catch (error) {
            console.error('Error deleting user:', error);
            setMessage({ type: 'error', text: 'Failed to delete user' });
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(null);
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
                <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
                <p className="text-gray-600">Manage users and their company access within {tenantInfo?.name || 'your organization'}</p>
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

                {/* Search and Actions */}
                <div className="mb-6 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search by name, email, or role..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div className="flex gap-2">
                        {canInviteUsers() && (
                            <button
                                onClick={handleInviteUser}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
                            >
                                <UserPlusIcon className="h-5 w-5" />
                                <span>Invite User</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">
                            {users.length} User{users.length !== 1 ? 's' : ''}
                        </h2>
                    </div>
                    
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
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            User Info
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
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                                            user.is_active ? 'bg-blue-100' : 'bg-gray-100'
                                                        }`}>
                                                            <span className={`text-sm font-medium ${
                                                                user.is_active ? 'text-blue-800' : 'text-gray-500'
                                                            }`}>
                                                                {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
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
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    user.role === 'admin' 
                                                        ? 'bg-purple-100 text-purple-800'
                                                        : user.role === 'user'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-green-100 text-green-800'
                                                }`}>
                                                    {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="flex items-center">
                                                    <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                                                    {user.companies?.map(company => company.name).join(', ') || 'No Companies'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    user.is_active 
                                                        ? 'text-green-600 bg-green-100'
                                                        : 'text-red-600 bg-red-100'
                                                }`}>
                                                    {user.is_active ? (
                                                        <>
                                                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                                                            Active
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircleIcon className="h-3 w-3 mr-1" />
                                                            Inactive
                                                        </>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(user.date_joined).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {canInviteUsers() && (
                                                    <div className="flex justify-end space-x-2">
                                                        <button
                                                            onClick={() => handleEditUser(user)}
                                                            className="text-blue-600 hover:text-blue-800 p-1"
                                                            title="Edit User"
                                                        >
                                                            <PencilIcon className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(user)}
                                                            className="text-red-600 hover:text-red-800 p-1"
                                                            title="Delete User"
                                                        >
                                                            <TrashIcon className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            
                            {users.length === 0 && (
                                <div className="text-center py-8">
                                    <UserPlusIcon className="mx-auto h-12 w-12 text-gray-400" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {canInviteUsers() 
                                            ? 'Get started by inviting users to your organization.'
                                            : 'You do not have permission to manage users.'
                                        }
                                    </p>
                                    {canInviteUsers() && (
                                        <div className="mt-6">
                                            <button
                                                onClick={handleInviteUser}
                                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                            >
                                                <UserPlusIcon className="h-5 w-5 mr-2" />
                                                Invite User
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

            {/* Role-based invitation modal */}
            {isInviteModalOpen && (
                <InviteUser onClose={handleCloseInvite} />
            )}

            {/* Edit user modal */}
            {editingUser && (
                <EditUser 
                    user={editingUser} 
                    onClose={handleCloseEditUser}
                    onUserUpdated={handleUserUpdated}
                />
            )}

            {/* Delete confirmation modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                <TrashIcon className="h-6 w-6 text-red-600" />
                            </div>
                            <div className="mt-3 text-center">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                    Delete User
                                </h3>
                                <div className="mt-2 px-7 py-3">
                                    <p className="text-sm text-gray-500">
                                        Are you sure you want to delete{' '}
                                        <span className="font-medium">
                                            {showDeleteConfirm.first_name} {showDeleteConfirm.last_name}
                                        </span>
                                        ? This action cannot be undone.
                                    </p>
                                </div>
                                <div className="flex gap-4 justify-center mt-4">
                                    <button
                                        onClick={cancelDelete}
                                        className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => confirmDeleteUser(showDeleteConfirm)}
                                        className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserManagement;