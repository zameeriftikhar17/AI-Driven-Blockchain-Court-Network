// src/components/charts/PriorityChart.jsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './Charts.css';

const PriorityChart = () => {
  const data = [
    { name: 'Corp. Fraud', priority: 92, expertise: 95 },
    { name: 'Property', priority: 88, expertise: 90 },
    { name: 'Civil Rights', priority: 75, expertise: 82 },
    { name: 'Family', priority: 70, expertise: 78 }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{label}</p>
          <p style={{ color: '#4A6CF7' }}>Priority: {payload[0].value}%</p>
          <p style={{ color: '#00E676' }}>Expertise: {payload[1]?.value || 0}%</p>
        </div>
      );
    }
    return null;
  };

  const getColor = (value) => {
    if (value > 80) return '#4CAF50';
    if (value > 60) return '#FF9800';
    return '#f44336';
  };

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 60, right: 20, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} />
          <YAxis type="category" dataKey="name" width={60} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="priority" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.priority)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriorityChart;