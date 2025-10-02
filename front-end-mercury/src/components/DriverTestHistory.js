import React, { useEffect, useState } from 'react';
import { useSession } from '../providers/SessionProvider';
import AddDriverTestResults from './AddDriverTestResults'; // Import the AddDriverTestResults component

function DriverTestHistory({ driver, onClose }) {
  const [tests, setTests] = useState(driver.tests || []);
  const [loading, setLoading] = useState(false);
  const [addingTest, setAddingTest] = useState(false); // State to handle adding test result

  useEffect(() => {
    if (!driver || !driver.id) {
      console.error('Invalid driver object:', driver);
      return;
    }

  }, [driver]);

  if (addingTest) {
    return (
      <AddDriverTestResults
        driverId={driver.id} // Pass the driver ID
        onClose={() => {
          setAddingTest(false); // Close AddDriverTestResults and return to history
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Test History for {driver.first_name} {driver.last_name}</h2>
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          Close
        </button>
        {loading ? (
          <p>Loading test history...</p>
        ) : (
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">Test Type</th>
                <th className="border border-gray-300 px-4 py-2">Test Date</th>
                <th className="border border-gray-300 px-4 py-2">Result</th>
                <th className="border border-gray-300 px-4 py-2">Completion Date</th>
                <th className="border border-gray-300 px-4 py-2">Next Scheduled Test</th>
                <th className="border border-gray-300 px-4 py-2">Follow-Up Required</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2">{test.test_type}</td>
                  <td className="border border-gray-300 px-4 py-2">{test.test_date}</td>
                  <td className="border border-gray-300 px-4 py-2">{test.test_result}</td>
                  <td className="border border-gray-300 px-4 py-2">{test.test_completion_date || 'N/A'}</td>
                  <td className="border border-gray-300 px-4 py-2">{test.next_scheduled_test_date || 'N/A'}</td>
                  <td className="border border-gray-300 px-4 py-2">{test.follow_up_test_required ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="flex justify-end mt-4">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2"
            onClick={() => setAddingTest(true)} // Open AddDriverTestResults
          >
            Add Test Result
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default DriverTestHistory;
