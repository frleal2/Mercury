import React, { useState } from 'react';
import Modal from './BaseModal';

const AddCompanyModal = ({ isOpen, onClose, onAddCompany }) => {
  const [formData, setFormData] = useState({
    entityType: '',
    operatingStatus: '',
    outOfServiceDate: '',
    legalName: '',
    dbaName: '',
    physicalAddress: '',
    phone: '',
    mailingAddress: '',
    usdotNumber: '',
    stateCarrierId: '',
    mcMxFfNumbers: '',
    dunsNumber: '',
    powerUnits: '',
    drivers: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onAddCompany(formData);
    setFormData({
      entityType: '',
      operatingStatus: '',
      outOfServiceDate: '',
      legalName: '',
      dbaName: '',
      physicalAddress: '',
      phone: '',
      mailingAddress: '',
      usdotNumber: '',
      stateCarrierId: '',
      mcMxFfNumbers: '',
      dunsNumber: '',
      powerUnits: '',
      drivers: '',
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-semibold mb-4">Add New Company</h2>
      <form onSubmit={handleFormSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Entity Type */}
          <div>
            <label htmlFor="entityType" className="block mb-1">Entity Type:</label>
            <input
              type="text"
              id="entityType"
              name="entityType"
              value={formData.entityType}
              onChange={handleChange}
              placeholder="Enter entity type"
              className="border border-gray-300 p-2 w-full rounded-md"
              required
            />
          </div>

          {/* Operating Status */}
          <div>
            <label htmlFor="operatingStatus" className="block mb-1">Operating Status:</label>
            <input
              type="text"
              id="operatingStatus"
              name="operatingStatus"
              value={formData.operatingStatus}
              onChange={handleChange}
              placeholder="Enter operating status"
              className="border border-gray-300 p-2 w-full rounded-md"
              required
            />
          </div>

          {/* Out of Service Date */}
          <div>
            <label htmlFor="outOfServiceDate" className="block mb-1">Out of Service Date:</label>
            <input
              type="date"
              id="outOfServiceDate"
              name="outOfServiceDate"
              value={formData.outOfServiceDate}
              onChange={handleChange}
              className="border border-gray-300 p-2 w-full rounded-md"
            />
          </div>

          {/* Legal Name */}
          <div>
            <label htmlFor="legalName" className="block mb-1">Legal Name:</label>
            <input
              type="text"
              id="legalName"
              name="legalName"
              value={formData.legalName}
              onChange={handleChange}
              placeholder="Enter legal name"
              className="border border-gray-300 p-2 w-full rounded-md"
              required
            />
          </div>

          {/* DBA Name */}
          <div>
            <label htmlFor="dbaName" className="block mb-1">DBA Name:</label>
            <input
              type="text"
              id="dbaName"
              name="dbaName"
              value={formData.dbaName}
              onChange={handleChange}
              placeholder="Enter DBA name"
              className="border border-gray-300 p-2 w-full rounded-md"
            />
          </div>

          {/* Physical Address */}
          <div>
            <label htmlFor="physicalAddress" className="block mb-1">Physical Address:</label>
            <input
              type="text"
              id="physicalAddress"
              name="physicalAddress"
              value={formData.physicalAddress}
              onChange={handleChange}
              placeholder="Enter physical address"
              className="border border-gray-300 p-2 w-full rounded-md"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block mb-1">Phone:</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
              className="border border-gray-300 p-2 w-full rounded-md"
              required
            />
          </div>

          {/* Mailing Address */}
          <div>
            <label htmlFor="mailingAddress" className="block mb-1">Mailing Address:</label>
            <input
              type="text"
              id="mailingAddress"
              name="mailingAddress"
              value={formData.mailingAddress}
              onChange={handleChange}
              placeholder="Enter mailing address"
              className="border border-gray-300 p-2 w-full rounded-md"
            />
          </div>

          {/* USDOT Number */}
          <div>
            <label htmlFor="usdotNumber" className="block mb-1">USDOT Number:</label>
            <input
              type="text"
              id="usdotNumber"
              name="usdotNumber"
              value={formData.usdotNumber}
              onChange={handleChange}
              placeholder="Enter USDOT number"
              className="border border-gray-300 p-2 w-full rounded-md"
            />
          </div>

          {/* State Carrier ID */}
          <div>
            <label htmlFor="stateCarrierId" className="block mb-1">State Carrier ID Number:</label>
            <input
              type="text"
              id="stateCarrierId"
              name="stateCarrierId"
              value={formData.stateCarrierId}
              onChange={handleChange}
              placeholder="Enter state carrier ID"
              className="border border-gray-300 p-2 w-full rounded-md"
            />
          </div>

          {/* MC/MX/FF Numbers */}
          <div>
            <label htmlFor="mcMxFfNumbers" className="block mb-1">MC/MX/FF Number(s):</label>
            <input
              type="text"
              id="mcMxFfNumbers"
              name="mcMxFfNumbers"
              value={formData.mcMxFfNumbers}
              onChange={handleChange}
              placeholder="Enter MC/MX/FF numbers"
              className="border border-gray-300 p-2 w-full rounded-md"
            />
          </div>

          {/* DUNS Number */}
          <div>
            <label htmlFor="dunsNumber" className="block mb-1">DUNS Number:</label>
            <input
              type="text"
              id="dunsNumber"
              name="dunsNumber"
              value={formData.dunsNumber}
              onChange={handleChange}
              placeholder="Enter DUNS number"
              className="border border-gray-300 p-2 w-full rounded-md"
            />
          </div>

          {/* Power Units */}
          <div>
            <label htmlFor="powerUnits" className="block mb-1">Power Units:</label>
            <input
              type="number"
              id="powerUnits"
              name="powerUnits"
              value={formData.powerUnits}
              onChange={handleChange}
              placeholder="Enter number of power units"
              className="border border-gray-300 p-2 w-full rounded-md"
            />
          </div>

          {/* Drivers */}
          <div>
            <label htmlFor="drivers" className="block mb-1">Drivers:</label>
            <input
              type="number"
              id="drivers"
              name="drivers"
              value={formData.drivers}
              onChange={handleChange}
              placeholder="Enter number of drivers"
              className="border border-gray-300 p-2 w-full rounded-md"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-md mt-6 w-full"
        >
          Add Company
        </button>
      </form>
    </Modal>
  );
};

export default AddCompanyModal;
