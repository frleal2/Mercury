import React from 'react';

const InactiveDriverModal = ({ selectedDriver, onClose, onSave, onInputChange }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-10">
      <div className="bg-white p-6 rounded-lg shadow-lg w-1/2">
        <h2 className="text-xl font-bold mb-4">Edit Driver</h2>
        <div>
          <label className="block mb-2">First Name</label>
          <input
            type="text"
            name="firstName"
            value={selectedDriver.firstName}
            onChange={onInputChange}
            className="mb-4 p-2 border border-gray-300 w-full"
          />
        </div>
        <div>
          <label className="block mb-2">Last Name</label>
          <input
            type="text"
            name="lastName"
            value={selectedDriver.lastName}
            onChange={onInputChange}
            className="mb-4 p-2 border border-gray-300 w-full"
          />
        </div>
        <div>
          <label className="block mb-2">Team Leader</label>
          <input
            type="text"
            name="teamLeader"
            value={selectedDriver.teamLeader}
            onChange={onInputChange}
            className="mb-4 p-2 border border-gray-300 w-full"
          />
        </div>
        <div className="flex justify-end">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-md mr-2"
            onClick={onSave}
          >
            Save
          </button>
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded-md"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default InactiveDriverModal;
