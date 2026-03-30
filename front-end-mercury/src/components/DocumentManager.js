import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import { useDropzone } from 'react-dropzone';
import {
  DocumentTextIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  CheckBadgeIcon,
  PencilSquareIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const DOCUMENT_TYPE_LABELS = {
  rate_confirmation: 'Rate Confirmation',
  bol: 'Bill of Lading',
  pod: 'Proof of Delivery',
  carrier_packet: 'Carrier Packet',
  lumper_receipt: 'Lumper Receipt',
  invoice: 'Invoice',
  weight_ticket: 'Weight Ticket',
  customs: 'Customs Document',
  receipt: 'Receipt',
  photo: 'Photo',
  other: 'Other',
};

const DOCUMENT_TYPE_COLORS = {
  rate_confirmation: 'bg-purple-100 text-purple-800',
  bol: 'bg-blue-100 text-blue-800',
  pod: 'bg-green-100 text-green-800',
  carrier_packet: 'bg-yellow-100 text-yellow-800',
  lumper_receipt: 'bg-orange-100 text-orange-800',
  invoice: 'bg-indigo-100 text-indigo-800',
  weight_ticket: 'bg-gray-100 text-gray-800',
  customs: 'bg-red-100 text-red-800',
  receipt: 'bg-teal-100 text-teal-800',
  photo: 'bg-pink-100 text-pink-800',
  other: 'bg-gray-100 text-gray-600',
};

/**
 * DocumentManager — reusable component for managing documents on a load or trip.
 *
 * Props:
 *   entityType: 'load' | 'trip'
 *   entityId: number (the load or trip ID)
 *   documentTypes: array of type keys to show in dropdown (optional, defaults to all)
 *   readOnly: boolean (optional, hides upload/delete)
 */
export default function DocumentManager({ entityType, entityId, documentTypes, readOnly = false }) {
  const { session, refreshAccessToken } = useSession();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadType, setUploadType] = useState('bol');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [error, setError] = useState('');
  const [signModalDoc, setSignModalDoc] = useState(null);
  const [signerName, setSignerName] = useState('');

  const apiBase = entityType === 'load' ? 'load-documents' : 'trip-documents';
  const filterParam = entityType === 'load' ? 'load' : 'trip';

  const availableTypes = documentTypes || Object.keys(DOCUMENT_TYPE_LABELS);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/${apiBase}/?${filterParam}=${entityId}`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      setDocuments(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching documents:', err);
      if (err.response?.status === 401) await refreshAccessToken();
    } finally {
      setLoading(false);
    }
  }, [entityId, apiBase, filterParam, session.accessToken]);

  useEffect(() => {
    if (entityId) fetchDocuments();
  }, [entityId, fetchDocuments]);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setUploadFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 10 * 1024 * 1024,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('document_type', uploadType);
      formData.append('description', uploadDescription);
      formData.append(filterParam === 'load' ? 'load' : 'trip', entityId);

      await axios.post(`${BASE_URL}/api/${apiBase}/`, formData, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setShowUpload(false);
      setUploadFile(null);
      setUploadDescription('');
      setUploadType('bol');
      fetchDocuments();
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err.response?.data?.error || err.response?.data?.detail || 'Upload failed');
      if (err.response?.status === 401) await refreshAccessToken();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await axios.delete(`${BASE_URL}/api/${apiBase}/${docId}/`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` },
      });
      fetchDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      if (err.response?.status === 401) await refreshAccessToken();
    }
  };

  const handleSign = async () => {
    if (!signModalDoc || !signerName.trim()) return;
    try {
      await axios.post(
        `${BASE_URL}/api/documents/${entityType}/${signModalDoc.id}/sign/`,
        { signer_name: signerName },
        { headers: { 'Authorization': `Bearer ${session.accessToken}` } }
      );
      setSignModalDoc(null);
      setSignerName('');
      fetchDocuments();
    } catch (err) {
      console.error('Error signing document:', err);
      if (err.response?.status === 401) await refreshAccessToken();
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Documents ({documents.length})
        </h4>
        {!readOnly && (
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <ArrowUpTrayIcon className="h-4 w-4 mr-1" />
            Upload
          </button>
        )}
      </div>

      {/* Upload Area */}
      {showUpload && (
        <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Document Type</label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="w-full text-sm border-gray-300 rounded-md"
              >
                {availableTypes.map((t) => (
                  <option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t] || t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
              <input
                type="text"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="e.g. Signed BOL from shipper"
                className="w-full text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            {uploadFile ? (
              <div className="text-sm text-gray-700">
                <DocumentTextIcon className="h-8 w-8 mx-auto text-blue-500 mb-1" />
                <p className="font-medium">{uploadFile.name}</p>
                <p className="text-gray-500">{formatFileSize(uploadFile.size)}</p>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                <ArrowUpTrayIcon className="h-8 w-8 mx-auto text-gray-400 mb-1" />
                <p>Drag & drop a file here, or click to select</p>
                <p className="text-xs mt-1">PDF, Images, Word — Max 10MB</p>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => { setShowUpload(false); setUploadFile(null); setError(''); }}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </div>
      )}

      {/* Document List */}
      {documents.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3 min-w-0">
                <DocumentTextIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${DOCUMENT_TYPE_COLORS[doc.document_type] || 'bg-gray-100 text-gray-600'}`}>
                      {doc.document_type_display || DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                    </span>
                    {doc.is_signed && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        <CheckBadgeIcon className="h-3 w-3 mr-0.5" />
                        Signed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 truncate mt-0.5">
                    {doc.description || doc.file_name || 'No description'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {doc.uploaded_by_name} · {new Date(doc.uploaded_at).toLocaleDateString()}
                    {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}
                    {doc.is_signed && doc.signed_by_name ? ` · Signed by ${doc.signed_by_name}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {doc.file_url && (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </a>
                )}
                {!readOnly && !doc.is_signed && (
                  <button
                    onClick={() => { setSignModalDoc(doc); setSignerName(''); }}
                    className="p-1.5 text-gray-400 hover:text-green-600 rounded"
                    title="E-Sign"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                )}
                {!readOnly && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* E-Sign Modal */}
      {signModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">E-Sign Document</h3>
              <button onClick={() => setSignModalDoc(null)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              You are signing: <span className="font-medium">{signModalDoc.document_type_display || signModalDoc.document_type}</span>
              {signModalDoc.description && <> — {signModalDoc.description}</>}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Signer Name</label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Full legal name"
                className="w-full border-gray-300 rounded-md"
              />
            </div>
            <p className="text-xs text-gray-500 mb-4">
              By signing, you confirm that you have reviewed this document and agree to its contents.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSignModalDoc(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSign}
                disabled={!signerName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Sign Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
