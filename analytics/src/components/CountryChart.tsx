import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { CountryRow } from '../services/queries';

interface Props {
  rows: CountryRow[];
}

const CountryChart: React.FC<Props> = ({ rows }) => {
  const data = rows
    .map((r) => ({ country: r.country || 'unknown', visits: Number(r.visits) }))
    .slice(0, 10);

  if (data.length === 0) return <p className="text-gray-500 text-sm">No data for this range.</p>;

  const chartHeight = Math.min(Math.max(data.length * 36, 160), 400);

  return (
    <div style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 0 }}>
          <XAxis type="number" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={{ stroke: '#4b5563' }} />
          <YAxis
            dataKey="country"
            type="category"
            width={60}
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            axisLine={{ stroke: '#4b5563' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff', borderRadius: '0.5rem' }}
            labelStyle={{ color: '#fff' }}
          />
          <Bar dataKey="visits" fill="#4ade80" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CountryChart;
