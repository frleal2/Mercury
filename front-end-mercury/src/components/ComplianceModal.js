// ComplianceModal.js
import React from 'react';

const ComplianceModal = ({ isOpen, onClose, company, expirationCounts }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-gray-800 bg-opacity-50 z-10">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
        <h2 className="text-xl font-semibold mb-4">Compliance</h2>
        <h3 className="text-lg font-medium mb-2">Company: {company.name}</h3>

        <div className="mb-4">
          <div className="flex justify-between">
            <span className="font-medium">Drivers with CDL Expirations:</span>
            <span>{expirationCounts.cdlCount}</span>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between">
            <span className="font-medium">Drivers with Physical Expirations:</span>
            <span>{expirationCounts.physicalCount}</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between">
            <span className="font-medium">Drivers with VMR Expirations:</span>
            <span>{expirationCounts.vmrCount}</span>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComplianceModal;
