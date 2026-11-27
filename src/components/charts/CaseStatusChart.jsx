import React from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
);

export const CaseStatusChart = ({ stats }) => {
  // Destructure stats with fallbacks
  const { active = 0, pending = 0, completed = 0, total = 0 } = stats || {};

  // Calculate "Other" statuses (if any) – assuming total minus known statuses
  const other = Math.max(0, total - (active + pending + completed));

  // Prepare data for chart
  const labels = ['Active', 'Pending', 'Completed'];
  const dataValues = [active, pending, completed];
  const colors = ['#4A6CF7', '#FF9A56', '#00E676'];

  // Only include "Other" if > 0
  if (other > 0) {
    labels.push('Other');
    dataValues.push(other);
    colors.push('#FF6B6B');
  }

  // Check if all values are zero
  const hasData = dataValues.some(v => v > 0);

  const chartData = {
    labels: labels,
    datasets: [
      {
        data: dataValues,
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 8
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: '500'
          }
        }
      }
    },
    cutout: '65%'
  };

  return (
    <div style={{ height: '250px', position: 'relative' }}>
      {hasData ? (
        <Pie data={chartData} options={options} />
      ) : (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: '#6B7280',
          fontSize: '0.95rem'
        }}>
          No case data available
        </div>
      )}
    </div>
  );
};