import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import { 
  EyeIcon, 
  PhoneIcon, 
  EnvelopeIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  MapPinIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';

const Recruitment = () => {
  const { session, refreshAccessToken } = useSession();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchApplications = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/applications/`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      setApplications(response.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          return fetchApplications();
        }
      }
      console.error('Error fetching applications:', error);
      alert('Failed to fetch applications.');
    } finally {
      setLoading(false);
    }
  };

  // Add function to handle secure file download
  const handleFileDownload = async (applicationId, fileType) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/applications/${applicationId}/download/${fileType}/`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      );
      
      // Open the signed URL in new tab
      window.open(response.data.download_url, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const applicationDate = new Date(dateString);
    const diffTime = Math.abs(now - applicationDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'new': 'bg-blue-100 text-blue-800',
      'reviewed': 'bg-yellow-100 text-yellow-800',
      'contacted': 'bg-purple-100 text-purple-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'New'}
      </span>
    );
  };

  const filteredApplications = applications.filter(app => {
    const matchesStatus = statusFilter === 'all' || (app.status || 'new') === statusFilter;
    const matchesSearch = searchTerm === '' || 
      `${app.first_name || ''} ${app.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.phone_number.includes(searchTerm);
    
    return matchesStatus && matchesSearch;
  });

  useEffect(() => {
    fetchApplications();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Driver Recruitment</h1>
        <p className="text-gray-600">Manage and review driver applications</p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Applications</option>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="contacted">Contacted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading applications...</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {filteredApplications.length} Application{filteredApplications.length !== 1 ? 's' : ''}
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applicant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CDL Experience
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documents
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-800">
                              {application.first_name?.charAt(0) || '?'}{application.last_name?.charAt(0) || '?'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {application.first_name || 'Unknown'} {application.middle_name && application.middle_name + ' '}{application.last_name || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <a href={`mailto:${application.email}`} className="text-blue-600 hover:text-blue-800">
                            {application.email}
                          </a>
                        </div>
                        <div className="flex items-center">
                          <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <a href={`tel:${application.phone_number}`} className="text-blue-600 hover:text-blue-800">
                            {application.phone_number}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span>{application.state} {application.zip_code}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        application.cdla_experience 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {application.cdla_experience ? 'Has CDL-A' : 'No CDL-A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        {application.drivers_license_url && (
                          <div className="flex items-center">
                            <DocumentIcon className="h-4 w-4 text-blue-500" />
                            <span className="ml-1 text-xs text-blue-600">License</span>
                          </div>
                        )}
                        {application.medical_certificate_url && (
                          <div className="flex items-center">
                            <DocumentIcon className="h-4 w-4 text-green-500" />
                            <span className="ml-1 text-xs text-green-600">Medical</span>
                          </div>
                        )}
                        {!application.drivers_license_url && !application.medical_certificate_url && (
                          <span className="text-xs text-gray-400">No docs</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(application.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                        {application.created_at ? getTimeAgo(application.created_at) : 'Recently'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setSelectedApplication(application)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="View Details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <a
                          href={`mailto:${application.email}`}
                          className="text-gray-600 hover:text-gray-800 p-1"
                          title="Send Email"
                        >
                          <EnvelopeIcon className="h-5 w-5" />
                        </a>
                        <a
                          href={`tel:${application.phone_number}`}
                          className="text-green-600 hover:text-green-800 p-1"
                          title="Call"
                        >
                          <PhoneIcon className="h-5 w-5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredApplications.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No applications found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Application Detail Modal */}
      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onStatusUpdate={() => {
            fetchApplications();
            setSelectedApplication(null);
          }}
          session={session}
        />
      )}
    </div>
  );
};

// Application Detail Modal Component
const ApplicationDetailModal = ({ application, onClose, onStatusUpdate, session }) => {
  const [status, setStatus] = useState(application.status || 'new');
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const updateApplicationStatus = async () => {
    setUpdating(true);
    try {
      await axios.patch(`${BASE_URL}/api/applications/${application.id}/`, {
        status: status,
        notes: notes
      }, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      onStatusUpdate();
    } catch (error) {
      console.error('Error updating application:', error);
      alert('Failed to update application status.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Application Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Personal Information */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Personal Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {application.first_name || 'Unknown'} {application.middle_name && application.middle_name + ' '}{application.last_name || ''}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="mt-1 text-sm text-gray-900">
                    <a href={`mailto:${application.email}`} className="text-blue-600 hover:text-blue-800">
                      {application.email}
                    </a>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">
                    <a href={`tel:${application.phone_number}`} className="text-blue-600 hover:text-blue-800">
                      {application.phone_number}
                    </a>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">CDL-A Experience</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      application.cdla_experience 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {application.cdla_experience ? 'Has CDL-A Experience' : 'No CDL-A Experience'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Street Address</label>
                  <p className="mt-1 text-sm text-gray-900">{application.address}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">State</label>
                  <p className="mt-1 text-sm text-gray-900">{application.state}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">ZIP Code</label>
                  <p className="mt-1 text-sm text-gray-900">{application.zip_code}</p>
                </div>
              </div>
            </div>

            {/* Uploaded Documents */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Uploaded Documents</h4>
              {application.drivers_license_url || application.medical_certificate_url ? (
                <div className="space-y-3">
                  {application.drivers_license_url && (
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <DocumentIcon className="h-8 w-8 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Driver's License</p>
                          <p className="text-xs text-gray-500">Uploaded document</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleFileDownload(application.id, 'license')}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </button>
                    </div>
                  )}
                  {application.medical_certificate_url && (
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <DocumentIcon className="h-8 w-8 text-green-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Medical Certificate</p>
                          <p className="text-xs text-gray-500">DOT Physical / Medical cert</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleFileDownload(application.id, 'medical')}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                  <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No documents uploaded</p>
                  <p className="text-xs text-gray-400">Driver's license and medical certificate</p>
                </div>
              )}
            </div>

            {/* Status Management */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Recruitment Status</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="new">New</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="contacted">Contacted</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add notes about this application..."
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Quick Actions</h4>
              <div className="flex space-x-3">
                <a
                  href={`mailto:${application.email}?subject=Driver Application - ${application.first_name || 'Unknown'} ${application.last_name || ''}`}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  Send Email
                </a>
                <a
                  href={`tel:${application.phone_number}`}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PhoneIcon className="h-4 w-4 mr-2" />
                  Call
                </a>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={updateApplicationStatus}
              disabled={updating}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Recruitment;
