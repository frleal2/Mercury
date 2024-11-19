import React from 'react';

const ExpirationModal = ({ company, drivers, onClose }) => {
  const getExpiredCount = (drivers, type) => {
    const today = new Date();
    return drivers.filter((driver) => {
      const expirationDate = new Date(driver[type]);
      if (isNaN(expirationDate)) return false;
      return expirationDate < today;
    }).length;
  };

  const expiredCdlCount = getExpiredCount(drivers, 'cdlExpirationDate');
  const expiredPhysicalCount = getExpiredCount(drivers, 'physicalDate');
  const expiredVmrCount = getExpiredCount(drivers, 'annualVMRDate');

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-gray-500 bg-opacity-50">
      <div className="bg-white p-6 rounded-md shadow-lg max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">{company} Compliance</h2>
        <div>
          <p><strong>Expired CDL: </strong>{expiredCdlCount} out of {drivers.length} drivers</p>
          <p><strong>Expired Physicals: </strong>{expiredPhysicalCount} out of {drivers.length} drivers</p>
          <p><strong>Expired Annual VMR: </strong>{expiredVmrCount} out of {drivers.length} drivers</p>
        </div>
        <div className="flex justify-end mt-4">
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

export default ExpirationModal;
