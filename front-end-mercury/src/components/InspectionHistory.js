import React from 'react';

function InspectionHistory({ onClose }) {
  const staticData = [
    {
      truck: 'Truck 1',
      driver: 'John Doe',
      inspectionType: 'pre-trip',
      inspectionDate: '2023-10-01',
      defectsFound: true,
      overallStatus: 'fail',
      notes: 'Brake issue',
      signedBy: 'John Doe',
      signedAt: '2023-10-01 08:00:00',
    },
    {
      truck: 'Truck 2',
      driver: 'Jane Smith',
      inspectionType: 'post-trip',
      inspectionDate: '2023-10-02',
      defectsFound: false,
      overallStatus: 'pass',
      notes: 'No issues',
      signedBy: 'Jane Smith',
      signedAt: '2023-10-02 18:00:00',
    },
  ];

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-3/4 max-w-4xl">
        <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold">Inspection History</h2>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="p-6 overflow-auto max-h-[70vh]">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">Truck</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Driver</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Inspection Type</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Inspection Date</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Defects Found</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Overall Status</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Notes</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Signed By</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Signed At</th>
              </tr>
            </thead>
            <tbody>
              {staticData.map((entry, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2">{entry.truck}</td>
                  <td className="border border-gray-300 px-4 py-2">{entry.driver}</td>
                  <td className="border border-gray-300 px-4 py-2">{entry.inspectionType}</td>
                  <td className="border border-gray-300 px-4 py-2">{entry.inspectionDate}</td>
                  <td className="border border-gray-300 px-4 py-2">
                    {entry.defectsFound ? 'Yes' : 'No'}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">{entry.overallStatus}</td>
                  <td className="border border-gray-300 px-4 py-2">{entry.notes}</td>
                  <td className="border border-gray-300 px-4 py-2">{entry.signedBy}</td>
                  <td className="border border-gray-300 px-4 py-2">{entry.signedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end border-t border-gray-200 px-6 py-4">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default InspectionHistory;
