import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { WeekUsersRow } from '../services/queries';

interface Props {
  rows: WeekUsersRow[];
}

const WeeklyUsersChart: React.FC<Props> = ({ rows }) => {
  const data = rows.map((r) => ({ week: r.week.slice(5, 10), users: Number(r.users) }));

  if (data.length === 0) return <p className="text-gray-500 text-sm">No data available.</p>;

  return (
    <div style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={{ stroke: '#4b5563' }} />
          <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={{ stroke: '#4b5563' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff', borderRadius: '0.5rem' }}
            labelStyle={{ color: '#fff' }}
          />
          <Bar dataKey="users" name="Distinct users" fill="#60a5fa" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeeklyUsersChart;
