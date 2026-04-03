import React, { useState, useCallback } from 'react';
import { SparklesIcon, DocumentTextIcon, CheckIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

export default function AIDocumentExtract({ isOpen, onClose, onApply, documentType = 'auto' }) {
  const { session, refreshAccessToken } = useSession();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [selectedFields, setSelectedFields] = useState({});

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError('');
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
  });

  const extractData = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);

    try {
      const res = await axios.post(`${BASE_URL}/api/ai/extract-document/`, formData, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setResult(res.data);
      // Pre-select all fields
      const fields = {};
      Object.keys(res.data.extracted_data || {}).forEach(key => {
        if (key !== 'document_type' && res.data.extracted_data[key]) {
          fields[key] = true;
        }
      });
      setSelectedFields(fields);
    } catch (err) {
      if (err.response?.status === 401) await refreshAccessToken();
      setError(err.response?.data?.error || 'Extraction failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleField = (key) => {
    setSelectedFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleApply = () => {
    if (!result?.extracted_data || !onApply) return;
    const applied = {};
    Object.entries(selectedFields).forEach(([key, selected]) => {
      if (selected && result.extracted_data[key]) {
        applied[key] = result.extracted_data[key];
      }
    });
    onApply(applied, result.extraction_id);
    onClose();
  };

  const getConfidenceColor = (score) => {
    if (!score && score !== 0) return 'bg-gray-200 text-gray-600';
    if (score >= 0.8) return 'bg-green-100 text-green-700';
    if (score >= 0.5) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const formatFieldName = (key) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/30" onClick={onClose} />
        <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-white" />
                <h2 className="text-white font-semibold">AI Document Extraction</h2>
              </div>
              <button onClick={onClose} className="text-white/80 hover:text-white">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="text-blue-100 text-xs mt-1">
              Upload a document and AI will extract key data fields
            </p>
          </div>

          <div className="p-5 overflow-y-auto flex-1">
            {/* Upload area */}
            {!result && (
              <>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
                    isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <DocumentTextIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  {file ? (
                    <div>
                      <p className="text-sm font-medium text-gray-700">{file.name}</p>
                      <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600">Drop a PDF here or click to browse</p>
                      <p className="text-xs text-gray-400 mt-1">Max 10 MB</p>
                    </div>
                  )}
                </div>

                {file && (
                  <button
                    onClick={extractData}
                    disabled={loading}
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition text-sm font-medium"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Extracting data...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-4 w-4" />
                        Extract with AI
                      </>
                    )}
                  </button>
                )}
              </>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Results */}
            {result && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">
                    Extracted Fields
                    <span className="text-xs text-gray-400 ml-2">
                      ({Object.values(selectedFields).filter(Boolean).length} selected)
                    </span>
                  </p>
                  <button
                    onClick={() => { setResult(null); setFile(null); setSelectedFields({}); }}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <ArrowPathIcon className="h-3.5 w-3.5" />
                    Try another
                  </button>
                </div>

                {result.extracted_data?.document_type && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">
                    <span className="text-xs text-blue-600 font-medium">
                      Detected: {formatFieldName(result.extracted_data.document_type)}
                    </span>
                  </div>
                )}

                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {Object.entries(result.extracted_data || {}).map(([key, value]) => {
                    if (key === 'document_type' || !value || value === '' || value === false) return null;
                    const confidence = result.confidence_scores?.[key];
                    const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                    
                    return (
                      <label
                        key={key}
                        className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition ${
                          selectedFields[key] ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!selectedFields[key]}
                          onChange={() => toggleField(key)}
                          className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{formatFieldName(key)}</span>
                            {confidence !== undefined && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${getConfidenceColor(confidence)}`}>
                                {Math.round(confidence * 100)}%
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-800 truncate">{displayValue}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleApply}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                  >
                    <CheckIcon className="h-4 w-4" />
                    Apply Selected Fields
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition text-sm"
                  >
                    Cancel
                  </button>
                </div>

                {result.processing_time_ms && (
                  <p className="text-[10px] text-gray-400 mt-2 text-right">
                    Processed in {(result.processing_time_ms / 1000).toFixed(1)}s
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
