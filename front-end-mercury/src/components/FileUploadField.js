import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

const FileUploadField = ({ 
  label, 
  name, 
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg'],
    'application/pdf': ['.pdf']
  },
  maxSize = 5 * 1024 * 1024, // 5MB
  onFileSelect,
  currentFile,
  error
}) => {
  const [preview, setPreview] = useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      const errorMessage = rejection.errors.map(e => e.message).join(', ');
      console.error('File rejected:', errorMessage);
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      onFileSelect(name, file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    }
  }, [name, onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false
  });

  const removeFile = () => {
    onFileSelect(name, null);
    setPreview(null);
  };

  return (
    <div className="file-upload-field">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      {!currentFile ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
            ${isDragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${error ? 'border-red-300 bg-red-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="space-y-2">
            <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <div className="text-sm text-gray-600">
              {isDragActive ? (
                <p>Drop the file here...</p>
              ) : (
                <div>
                  <p>Drag & drop a file here, or <span className="text-blue-600 font-medium">click to browse</span></p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to {Math.round(maxSize / (1024 * 1024))}MB</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {preview ? (
                <img src={preview} alt="Preview" className="h-12 w-12 object-cover rounded" />
              ) : (
                <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">{currentFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(currentFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={removeFile}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Remove
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default FileUploadField;