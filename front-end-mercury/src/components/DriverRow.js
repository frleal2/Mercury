// DriverRow.js
import React from 'react';

const DriverRow = ({ driver, onEditClick, calculateDaysUntil, addOneYear }) => {
  const physicalExpirationDate = addOneYear(driver.physicalDate);
  const annualVMRExpirationDate = addOneYear(driver.annualVMRDate);

  return (
    <tr key={driver.id} className="odd:bg-gray-100 even:bg-gray-50">
      <td className="border px-4 py-2">{driver.company}</td>
      <td
        className="border px-4 py-2 cursor-pointer"
        onClick={() => onEditClick(driver)}
      >
        {driver.firstName}
      </td>
      <td
        className="border px-4 py-2 cursor-pointer"
        onClick={() => onEditClick(driver)}
      >
        {driver.lastName}
      </td>
      <td className="border px-4 py-2">{driver.employeeVerification ? 'Yes' : 'No'}</td>
      <td className="border px-4 py-2">{driver.state}</td>
      <td className="border px-4 py-2">{driver.cdlNumber}</td>
      <td className="border px-4 py-2">{driver.cdlExpirationDate}</td>
      <td className="border px-4 py-2">{calculateDaysUntil(driver.cdlExpirationDate)}</td>
      <td className="border px-4 py-2">{driver.physicalDate}</td>
      <td className="border px-4 py-2">{physicalExpirationDate.toLocaleDateString()}</td>
      <td className="border px-4 py-2">{calculateDaysUntil(physicalExpirationDate)}</td>
      <td className="border px-4 py-2">{driver.annualVMRDate}</td>
      <td className="border px-4 py-2">{annualVMRExpirationDate.toLocaleDateString()}</td>
      <td className="border px-4 py-2">{calculateDaysUntil(annualVMRExpirationDate)}</td>
      <td className="border px-4 py-2">{driver.dob}</td>
      <td className="border px-4 py-2">{driver.ssn}</td>
      <td className="border px-4 py-2">{driver.hireDate}</td>
      <td className="border px-4 py-2">{driver.phone}</td>
    </tr>
  );
};

export default DriverRow;
