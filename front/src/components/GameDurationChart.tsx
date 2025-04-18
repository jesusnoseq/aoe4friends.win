import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DurationDistribution } from '../services/aoe4worldTypes.analysis';



const COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f87171'];

const LABELS = [
  { key: 'veryShort', label: 'Very Short (<10m)' },
  { key: 'short', label: 'Short (10-20m)' },
  { key: 'medium', label: 'Medium (20-30m)' },
  { key: 'long', label: 'Long (30-40m)' },
  { key: 'veryLong', label: 'Very Long (>40m)' },
];

const GameDurationChart: React.FC<{ distribution?: DurationDistribution }> = ({ distribution }) => {
  if (!distribution) return null;

  const data = LABELS.map((item) => ({
    name: item.label,
    value: distribution[item.key as keyof DurationDistribution] || 0,
  }));

  // Always show chart, even if some/all values are 0
  if (data.every(d => d.value === 0)) return (
    <div className="h-32 flex items-center justify-center text-gray-400">
      No duration data available.
    </div>
  );

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            label={({ name, percent, value }) =>
              value > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : `${name}: 0%`
            }
          >
            {data.map((_, idx) => (
              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GameDurationChart;
