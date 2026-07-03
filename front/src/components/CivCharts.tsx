import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { WIN_LOSS_COLORS, TOOLTIP_STYLE, TOOLTIP_ITEM_STYLE, TOOLTIP_LABEL_STYLE } from '../services/chartTheme';

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
          <div key={civ} className="card p-4">
            <h4 className="font-semibold mb-2 text-parchment-100">
              <span className="inline-block bg-leather-800 border-y border-gold-700/40 px-2 py-1 -mx-2 rounded">
                {civ.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
            </h4>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={civData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  fill={WIN_LOSS_COLORS.losses}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {civData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? WIN_LOSS_COLORS.wins : WIN_LOSS_COLORS.losses} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-sm mt-2 text-parchment-200">
              Games: {stat.total} | Win Rate: {stat.total > 0 ? Math.round((stat.wins / stat.total) * 100) : 0}%
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CivCharts;
