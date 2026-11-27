// src/components/charts/JudgePerformanceChart.jsx
import React from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import './Charts.css';

const JudgePerformanceChart = () => {
  const data = [
    { subject: 'Efficiency', A: 85, fullMark: 100 },
    { subject: 'Accuracy', A: 92, fullMark: 100 },
    { subject: 'Speed', A: 78, fullMark: 100 },
    { subject: 'Fairness', A: 95, fullMark: 100 },
    { subject: 'Knowledge', A: 90, fullMark: 100 },
    { subject: 'Communication', A: 82, fullMark: 100 }
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{payload[0].payload.subject}</p>
          <p style={{ color: '#4A6CF7' }}>Score: {payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e0e0e0" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#2c3e50', fontSize: 11 }}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 100]} 
            tick={{ fill: '#7f8c8d', fontSize: 10 }}
          />
          <Radar
            name="Performance"
            dataKey="A"
            stroke="#4A6CF7"
            fill="#4A6CF7"
            fillOpacity={0.6}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default JudgePerformanceChart;