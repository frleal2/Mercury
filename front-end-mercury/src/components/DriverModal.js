// Modal.js
import React, { useState } from 'react';

const DriverModal = ({ driver, onClose, onSave }) => {
  const [editedDriver, setEditedDriver] = useState(driver);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedDriver((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    onSave(editedDriver);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-gray-500 bg-opacity-50">
      <div className="bg-white p-6 rounded-md shadow-lg max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Edit Driver</h2>
        <div>
          <label className="block mb-2">First Name</label>
          <input
            type="text"
            name="firstName"
            value={editedDriver.firstName}
            onChange={handleChange}
            className="border px-3 py-2 w-full mb-4"
          />
        </div>
        <div>
          <label className="block mb-2">Last Name</label>
          <input
            type="text"
            name="lastName"
            value={editedDriver.lastName}
            onChange={handleChange}
            className="border px-3 py-2 w-full mb-4"
          />
        </div>
        <div>
          <label className="block mb-2">State</label>
          <input
            type="text"
            name="state"
            value={editedDriver.state}
            onChange={handleChange}
            className="border px-3 py-2 w-full mb-4"
          />
        </div>
        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-500 text-white px-4 py-2 rounded-md"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverModal;
