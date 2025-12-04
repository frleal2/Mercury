import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import AddQualifiedInspector from './AddQualifiedInspector';
import EditQualifiedInspector from './EditQualifiedInspector';
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  PlusIcon,
  PencilIcon,
  CalendarIcon,
  DocumentTextIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

function InspectorQualificationManagement() {
  const { session, refreshAccessToken } = useSession();
  const [inspectors, setInspectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInspector, setSelectedInspector] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchInspectors();
  }, []);

  const fetchInspectors = async () => {
    try {
      setLoading(true);
      
      const response = await axios.get(`${BASE_URL}/api/qualified-inspectors/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });

      setInspectors(response.data);
      
    } catch (error) {
      console.error('Error fetching qualified inspectors:', error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
      }
    } finally {
      setLoading(false);
    }
  };

  const getCertificationStatus = (inspector) => {
    if (!inspector.certification_expiry_date) {
      return { 
        status: 'no_expiry', 
        label: 'Valid', 
        icon: CheckCircleIcon, 
        color: 'text-green-600 bg-green-50 border-green-200',
        daysText: 'No expiry date'
      };
    }

    const expiryDate = new Date(inspector.certification_expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { 
        status: 'expired', 
        label: 'Expired', 
        icon: XCircleIcon, 
        color: 'text-red-600 bg-red-50 border-red-200',
        daysText: `${Math.abs(daysUntilExpiry)} days overdue`
      };
    } else if (daysUntilExpiry <= 30) {
      return { 
        status: 'expiring', 
        label: 'Expiring Soon', 
        icon: ExclamationTriangleIcon, 
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        daysText: `${daysUntilExpiry} days remaining`
      };
    } else {
      return { 
        status: 'valid', 
        label: 'Valid', 
        icon: CheckCircleIcon, 
        color: 'text-green-600 bg-green-50 border-green-200',
        daysText: `${daysUntilExpiry} days remaining`
      };
    }
  };

  const handleEditInspector = (inspector) => {
    setSelectedInspector(inspector);
    setIsEditModalOpen(true);
  };

  const handleInspectorUpdated = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedInspector(null);
    fetchInspectors();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  const getFilteredInspectors = () => {
    switch (filter) {
      case 'expired':
        return inspectors.filter(inspector => getCertificationStatus(inspector).status === 'expired');
      case 'expiring':
        return inspectors.filter(inspector => getCertificationStatus(inspector).status === 'expiring');
      case 'valid':
        return inspectors.filter(inspector => 
          getCertificationStatus(inspector).status === 'valid' || 
          getCertificationStatus(inspector).status === 'no_expiry'
        );
      default:
        return inspectors;
    }
  };

  const filteredInspectors = getFilteredInspectors();
  
  const statusCounts = {
    all: inspectors.length,
    expired: inspectors.filter(i => getCertificationStatus(i).status === 'expired').length,
    expiring: inspectors.filter(i => getCertificationStatus(i).status === 'expiring').length,
    valid: inspectors.filter(i => 
      getCertificationStatus(i).status === 'valid' || 
      getCertificationStatus(i).status === 'no_expiry'
    ).length
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading qualified inspectors...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Inspector Qualification Management</h1>
            <p className="text-gray-600">CFR 396.19 - Qualified Inspector Requirements</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Inspector
          </button>
        </div>
      </div>

      {/* Compliance Alerts */}
      {statusCounts.expired > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-3" />
            <h3 className="text-lg font-medium text-red-800">CFR 396.19 Compliance Alert</h3>
          </div>
          
          <div className="text-sm text-red-700">
            <p>
              {statusCounts.expired} qualified inspector(s) have expired certifications. 
              Only qualified inspectors may perform annual vehicle inspections per CFR 396.19.
            </p>
          </div>
        </div>
      )}

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div 
          className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer border-2 ${filter === 'all' ? 'border-blue-500' : 'border-transparent'}`}
          onClick={() => setFilter('all')}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserIcon className="h-8 w-8 text-gray-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Inspectors</dt>
                  <dd className="text-lg font-medium text-gray-900">{statusCounts.all}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer border-2 ${filter === 'valid' ? 'border-green-500' : 'border-transparent'}`}
          onClick={() => setFilter('valid')}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Qualified</dt>
                  <dd className="text-lg font-medium text-green-600">{statusCounts.valid}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer border-2 ${filter === 'expiring' ? 'border-yellow-500' : 'border-transparent'}`}
          onClick={() => setFilter('expiring')}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Expiring Soon</dt>
                  <dd className="text-lg font-medium text-yellow-600">{statusCounts.expiring}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white overflow-hidden shadow rounded-lg cursor-pointer border-2 ${filter === 'expired' ? 'border-red-500' : 'border-transparent'}`}
          onClick={() => setFilter('expired')}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-8 w-8 text-red-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Expired</dt>
                  <dd className="text-lg font-medium text-red-600">{statusCounts.expired}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inspectors Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Qualified Inspectors ({filteredInspectors.length} inspectors)
          </h2>
        </div>

        {filteredInspectors.length === 0 ? (
          <div className="text-center py-8">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No inspectors found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' ? 'No qualified inspectors registered yet.' : `No inspectors with ${filter} certification status.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inspector
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qualifications
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Certification
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
                {filteredInspectors.map((inspector) => {
                  const status = getCertificationStatus(inspector);
                  const StatusIcon = status.icon;

                  return (
                    <tr key={inspector.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <UserIcon className="h-6 w-6 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {inspector.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {inspector.email || 'No email provided'}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center mb-1">
                            <ShieldCheckIcon className="h-4 w-4 text-blue-500 mr-1" />
                            <span className="font-medium">ID: {inspector.certification_number}</span>
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            {inspector.issuing_authority && (
                              <div>Authority: {inspector.issuing_authority}</div>
                            )}
                            {inspector.qualification_types && inspector.qualification_types.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {inspector.qualification_types.map((type, index) => (
                                  <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    {type}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                            <span>Issued: {formatDate(inspector.certification_date)}</span>
                          </div>
                          {inspector.certification_expiry_date && (
                            <div className="text-xs text-gray-500 mt-1">
                              Expires: {formatDate(inspector.certification_expiry_date)}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className={`h-3 w-3 mr-1 ${status.color.split(' ')[0]}`} />
                          {status.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{status.daysText}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditInspector(inspector)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CFR 396.19 Information */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <DocumentTextIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">CFR 396.19 - Inspector Qualifications</p>
            <p className="mt-1">
              Inspectors must be qualified to perform annual vehicle inspections. Qualifications may include 
              ASE certification, manufacturer training, state inspection certification, or other recognized 
              automotive maintenance training programs.
            </p>
          </div>
        </div>
      </div>

      {/* Add Qualified Inspector Modal */}
      {isAddModalOpen && (
        <AddQualifiedInspector
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onInspectorAdded={handleInspectorUpdated}
        />
      )}

      {/* Edit Qualified Inspector Modal */}
      {isEditModalOpen && selectedInspector && (
        <EditQualifiedInspector
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          inspector={selectedInspector}
          onInspectorUpdated={handleInspectorUpdated}
        />
      )}
    </div>
  );
}

export default InspectorQualificationManagement;