import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface CivStats {
  [civ: string]: {
    total: number;
    wins: number;
    losses: number;
  };
}

interface GameStats {
  civStats: CivStats;
}

const CivCharts: React.FC<{ stats: GameStats | null }> = ({ stats }) => {
  if (!stats || !stats.civStats) return null;
  const civs = Object.entries(stats.civStats);
  if (civs.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {civs.map(([civ, stat]) => {
        const civData = [
          { name: 'Wins', value: stat.wins },
          { name: 'Losses', value: stat.losses }
        ];
        return (
          <div key={civ} className="bg-gray-700 rounded-lg p-4 shadow">
            <h4 className="font-semibold mb-2">{civ.replace(/_/g, ' ').toUpperCase()}</h4>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={civData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {civData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#4ade80' : '#ef4444'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-sm mt-2">
              Games: {stat.total} | Win Rate: {stat.total > 0 ? Math.round((stat.wins / stat.total) * 100) : 0}%
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CivCharts;
