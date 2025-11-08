import React, { useEffect, useState } from 'react';
import { useSession } from '../providers/SessionProvider';
import AddDriverTestResults from './AddDriverTestResults';
import { XMarkIcon, ClockIcon, PlusIcon } from '@heroicons/react/24/outline';

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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <ClockIcon className="h-6 w-6 mr-2 text-blue-600" />
            Test History for {driver.first_name} {driver.last_name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-gray-500">Loading test history...</div>
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-8">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No test history</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a test result.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Test</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Follow-Up</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tests.map((test) => (
                  <tr key={test.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{test.test_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{test.test_date}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        test.test_result === 'Pass' ? 'bg-green-100 text-green-800' :
                        test.test_result === 'Fail' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {test.test_result}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{test.test_completion_date || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{test.next_scheduled_test_date || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{test.follow_up_test_required ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200 mt-6">
          <button
            onClick={() => setAddingTest(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Test Result
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default DriverTestHistory;
