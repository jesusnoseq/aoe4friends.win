import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { SECTIONS, sectionColor, pivotByDay, type VisitsDayRow } from '../services/queries';

interface Props {
  rows: VisitsDayRow[];
}

const SectionVisitsChart: React.FC<Props> = ({ rows }) => {
  const data = pivotByDay(rows, 'visits');

  if (data.length === 0) return <p className="text-gray-500 text-sm">No data for this range.</p>;

  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={{ stroke: '#4b5563' }} />
          <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={{ stroke: '#4b5563' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff', borderRadius: '0.5rem' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend wrapperStyle={{ color: '#fff', fontSize: 13 }} />
          {SECTIONS.map((section) => (
            <Bar key={section} dataKey={section} stackId="1" fill={sectionColor(section)} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SectionVisitsChart;
