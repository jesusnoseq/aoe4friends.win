import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface GameStats {
  wins: number;
  losses: number;
}

const COLORS = ['#4ade80', '#ef4444'];

const WinLossChart: React.FC<{ stats: GameStats | null }> = ({ stats }) => {
  if (!stats) return null;

  const data = [
    { name: 'Wins', value: stats.wins },
    { name: 'Losses', value: stats.losses }
  ];

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
            fill="#8884d8"
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WinLossChart;
