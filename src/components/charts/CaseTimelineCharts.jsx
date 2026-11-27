// src/components/charts/CaseTimelineChart.jsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';
import './Charts.css';

const CaseTimelineChart = () => {
  const data = [
    { month: 'Jan', filed: 12, resolved: 8 },
    { month: 'Feb', filed: 15, resolved: 10 },
    { month: 'Mar', filed: 10, resolved: 12 },
    { month: 'Apr', filed: 18, resolved: 14 },
    { month: 'May', filed: 20, resolved: 16 },
    { month: 'Jun', filed: 25, resolved: 20 },
    { month: 'Jul', filed: 22, resolved: 24 }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{label}</p>
          <p style={{ color: '#4A6CF7' }}>Filed: {payload[0].value}</p>
          <p style={{ color: '#00E676' }}>Resolved: {payload[1].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <defs>
            <linearGradient id="filedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4A6CF7" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#4A6CF7" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00E676" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#00E676" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="filed" stroke="#4A6CF7" fill="url(#filedGradient)" strokeWidth={2} />
          <Area type="monotone" dataKey="resolved" stroke="#00E676" fill="url(#resolvedGradient)" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CaseTimelineChart;