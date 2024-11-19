import React, { useState } from 'react';
import Modal from './BaseModal';

const AddCompanyModal = ({ isOpen, onClose, onAddCompany }) => {
  const [newCompanyName, setNewCompanyName] = useState('');

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (newCompanyName.trim()) {
      onAddCompany(newCompanyName.trim());
      setNewCompanyName('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-semibold mb-4">Add New Company</h2>
      <form onSubmit={handleFormSubmit}>
        <label htmlFor="companyName" className="block mb-2">Company Name:</label>
        <input
          type="text"
          id="companyName"
          value={newCompanyName}
          onChange={(e) => setNewCompanyName(e.target.value)}
          placeholder="Enter company name"
          className="border border-gray-300 p-2 w-full rounded-md"
          required
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-md mt-4"
        >
          Add Company
        </button>
      </form>
    </Modal>
  );
};

export default AddCompanyModal;
