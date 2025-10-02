import React, { useState } from 'react';
import HoursOfService from './HoursOfService'; // Import the new component

function TripsHistory({ driver, onClose }) {
  const [selectedTrip, setSelectedTrip] = useState(null); // Track the selected trip for HOS
  const tripsData = [
    { tripNumber: '001', unit: 'Unit A', start: '2023-10-01', end: '2023-10-02', preInspection: 'Pass', postInspection: 'Pass', hos: '8 hrs' },
    { tripNumber: '002', unit: 'Unit B', start: '2023-10-03', end: '2023-10-04', preInspection: 'Fail', postInspection: 'Pass', hos: '7 hrs' },
    { tripNumber: '003', unit: 'Unit C', start: '2023-10-05', end: '2023-10-06', preInspection: 'Pass', postInspection: 'Fail', hos: '9 hrs' },
  ];

  const handleHOSClick = (trip) => {
    setSelectedTrip(trip); // Set the selected trip for the HOS modal
  };

  const handleCloseHOS = () => {
    setSelectedTrip(null); // Clear the selected trip when the modal is closed
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded shadow-lg w-3/4 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Trips for {driver.first_name} {driver.last_name}</h2>
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">Trip #</th>
                <th className="border border-gray-300 px-4 py-2">Unit</th>
                <th className="border border-gray-300 px-4 py-2">Start</th>
                <th className="border border-gray-300 px-4 py-2">End</th>
                <th className="border border-gray-300 px-4 py-2">Pre-Inspection</th>
                <th className="border border-gray-300 px-4 py-2">Post-Inspection</th>
                <th className="border border-gray-300 px-4 py-2">HOS</th>
              </tr>
            </thead>
            <tbody>
              {tripsData.map((trip, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2">{trip.tripNumber}</td>
                  <td className="border border-gray-300 px-4 py-2">{trip.unit}</td>
                  <td className="border border-gray-300 px-4 py-2">{trip.start}</td>
                  <td className="border border-gray-300 px-4 py-2">{trip.end}</td>
                  <td className="border border-gray-300 px-4 py-2">{trip.preInspection}</td>
                  <td className="border border-gray-300 px-4 py-2">{trip.postInspection}</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <button
                      className="text-blue-500 hover:underline"
                      onClick={() => handleHOSClick(trip)}
                    >
                      {trip.hos}
                    </button>
                  </td>
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
      {selectedTrip && (
        <HoursOfService
          driver={driver}
          trip={selectedTrip}
          onClose={handleCloseHOS}
        />
      )}
    </div>
  );
}

export default TripsHistory;
