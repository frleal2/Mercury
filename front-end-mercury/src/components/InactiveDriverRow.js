import React from 'react';

const InactiveDriverRow = ({ driver, onEditClick, calculateDaysEmployed }) => {
  return (
    <tr className="odd:bg-gray-100 even:bg-gray-50">
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
      <td className="border px-4 py-2">{driver.teamLeader}</td>
      <td className="border px-4 py-2">{driver.state}</td>
      <td className="border px-4 py-2">{driver.recruitingSource}</td>
      <td className="border px-4 py-2">{driver.hireDate}</td>
      <td className="border px-4 py-2">{driver.terminationDate}</td>
      <td className="border px-4 py-2">
        {calculateDaysEmployed(driver.hireDate, driver.terminationDate)} days
      </td>
    </tr>
  );
};

export default InactiveDriverRow;
