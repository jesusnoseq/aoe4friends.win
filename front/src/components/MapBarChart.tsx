import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface MapStats {
  [map: string]: {
    games: number;
    wins: number;
    losses: number;
  };
}

const COLORS = {
  games: '#60a5fa',
  wins: '#4ade80',
  losses: '#ef4444',
};

const MapBarChart: React.FC<{ mapStats?: MapStats }> = ({ mapStats }) => {
  if (!mapStats) return null;

  const data = Object.entries(mapStats)
    .map(([map, stats]) => ({
      map,
      games: stats.games,
      wins: stats.wins,
      losses: stats.losses,
    }))
    .sort((a, b) => b.games - a.games);

  if (data.length === 0) return null;

  const chartHeight = Math.min(Math.max(data.length * 100, 200), 2000);

  return (
    <div style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 40, right: 20, top: 20, bottom: 20 }}>
          <XAxis
            type="number"
            tick={{ fontSize: 16, fill: '#fff', fontWeight: 600 }}
            axisLine={{ stroke: '#fff' }}
            tickLine={{ stroke: '#fff' }}
          />
          <YAxis
            dataKey="map"
            type="category"
            width={140}
            tick={{ fontSize: 16, fill: '#fff', fontWeight: 600 }}
            axisLine={{ stroke: '#fff' }}
            tickLine={{ stroke: '#fff' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#222', border: '1px solid #444', color: '#fff', fontSize: 16, fontWeight: 600 }}
            labelStyle={{ color: '#fff', fontSize: 16, fontWeight: 600 }}
            itemStyle={{ color: '#fff', fontSize: 16, fontWeight: 600 }}
          />
          <Legend
            wrapperStyle={{ color: '#fff', fontSize: 16, fontWeight: 600 }}
            iconSize={18}
          />
          <Bar dataKey="games" fill={COLORS.games} name="Games" />
          <Bar dataKey="wins" fill={COLORS.wins} name="Wins" />
          <Bar dataKey="losses" fill={COLORS.losses} name="Losses" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MapBarChart;
