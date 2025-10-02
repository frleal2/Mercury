import React from 'react';

function HoursOfService({ driver, trip, onClose }) {
  const hosData = [
    { dutyDate: '2023-10-01', status: 'On Duty', start: '08:00', end: '16:00', duration: '8 hrs', miles: '120', notes: 'No issues' },
    { dutyDate: '2023-10-02', status: 'Off Duty', start: '16:00', end: '00:00', duration: '8 hrs', miles: '0', notes: 'Rest period' },
  ];

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded shadow-lg w-3/4 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Hours of Service for {driver.first_name} {driver.last_name} - Trip {trip.tripNumber}</h2>
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">Driver</th>
                <th className="border border-gray-300 px-4 py-2">Trip #</th>
                <th className="border border-gray-300 px-4 py-2">Duty Date</th>
                <th className="border border-gray-300 px-4 py-2">Status</th>
                <th className="border border-gray-300 px-4 py-2">Start</th>
                <th className="border border-gray-300 px-4 py-2">End</th>
                <th className="border border-gray-300 px-4 py-2">Duration</th>
                <th className="border border-gray-300 px-4 py-2">Miles</th>
                <th className="border border-gray-300 px-4 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {hosData.map((hos, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2">{driver.first_name} {driver.last_name}</td>
                  <td className="border border-gray-300 px-4 py-2">{trip.tripNumber}</td>
                  <td className="border border-gray-300 px-4 py-2">{hos.dutyDate}</td>
                  <td className="border border-gray-300 px-4 py-2">{hos.status}</td>
                  <td className="border border-gray-300 px-4 py-2">{hos.start}</td>
                  <td className="border border-gray-300 px-4 py-2">{hos.end}</td>
                  <td className="border border-gray-300 px-4 py-2">{hos.duration}</td>
                  <td className="border border-gray-300 px-4 py-2">{hos.miles}</td>
                  <td className="border border-gray-300 px-4 py-2">{hos.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default HoursOfService;
