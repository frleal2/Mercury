import React from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

// Register necessary Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const HomePage = () => {
  // Mock data for Pie Chart (Driver Certifications Expired)
  const driverExpirationData = {
    labels: ['Expired CDL', 'Expired Physical', 'Expired VMR', 'All Good'],
    datasets: [
      {
        label: 'Driver Certifications Expiration',
        data: [3, 2, 1, 4], // 3 drivers with expired CDLs, 2 with expired Physicals, etc.
        backgroundColor: ['#FF5733', '#FFC300', '#DAF7A6', '#28A745'],
        borderColor: ['#FF5733', '#FFC300', '#DAF7A6', '#28A745'],
        borderWidth: 1,
      },
    ],
  };

  // Mock data for Bar Chart (Truck Companies by State)
  const companiesByStateData = {
    labels: ['TX', 'CA', 'FL', 'NY', 'IL'],
    datasets: [
      {
        label: 'Number of Companies',
        data: [5, 8, 6, 3, 4], // Number of companies in each state
        backgroundColor: '#4E73DF',
        borderColor: '#4E73DF',
        borderWidth: 1,
      },
    ],
  };

  // Options for the Bar Chart
  const barChartOptions = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Truck Companies by State',
        font: {
          size: 18,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => `Companies: ${context.raw}`,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'State',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Number of Companies',
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="p-6 flex justify-center items-center flex-col space-y-8">
      <h1 className="text-3xl font-bold mb-8">Truck Drivers and Companies Overview</h1>
      
      {/* Pie Chart */}
      <div className="w-3/4 sm:w-1/2 lg:w-1/3">
        <h2 className="text-xl font-semibold mb-4">Driver Certifications Expiration</h2>
        <div className="bg-white shadow-md rounded-lg p-4">
          <Pie data={driverExpirationData} />
        </div>
      </div>

      {/* Bar Chart */}
      <div className="w-3/4 sm:w-1/2 lg:w-1/3">
        <h2 className="text-xl font-semibold mb-4">Truck Companies by State</h2>
        <div className="bg-white shadow-md rounded-lg p-4">
          <Bar data={companiesByStateData} options={barChartOptions} />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
