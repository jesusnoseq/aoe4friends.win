import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { SECTIONS, sectionColor, pivotByDay, type SectionDayRow } from '../services/queries';

interface Props {
  rows: SectionDayRow[];
}

const SectionTimeChart: React.FC<Props> = ({ rows }) => {
  const data = pivotByDay(rows, 'seconds').map((entry) => {
    const minutes: Record<string, string | number> = { day: entry.day };
    for (const section of SECTIONS) {
      minutes[section] = Math.round((Number(entry[section]) || 0) / 60);
    }
    return minutes;
  });

  if (data.length === 0) return <p className="text-gray-500 text-sm">No data for this range.</p>;

  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={{ stroke: '#4b5563' }} />
          <YAxis
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            axisLine={{ stroke: '#4b5563' }}
            label={{ value: 'minutes', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff', borderRadius: '0.5rem' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend wrapperStyle={{ color: '#fff', fontSize: 13 }} />
          {SECTIONS.map((section) => (
            <Area
              key={section}
              type="monotone"
              dataKey={section}
              stackId="1"
              stroke={sectionColor(section)}
              fill={sectionColor(section)}
              fillOpacity={0.55}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SectionTimeChart;
