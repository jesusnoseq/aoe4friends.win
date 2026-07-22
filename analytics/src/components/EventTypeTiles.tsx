import React from 'react';
import type { EventTypeRow } from '../services/queries';

interface Props {
  rows: EventTypeRow[];
}

const LABELS: Record<string, string> = {
  app_open: 'App opens',
  profile_load: 'Profile loads',
  section_time: 'Section visits',
};

const EventTypeTiles: React.FC<Props> = ({ rows }) => {
  if (rows.length === 0) return <p className="text-gray-500 text-sm">No data for this range.</p>;

  return (
    <div className="grid grid-cols-3 gap-3">
      {rows.map((row) => (
        <div key={row.event} className="bg-gray-900 rounded-md p-3 text-center border border-gray-700">
          <div className="text-2xl font-bold text-white">{Math.round(Number(row.count))}</div>
          <div className="text-xs text-gray-400 mt-1">{LABELS[row.event] ?? row.event}</div>
        </div>
      ))}
    </div>
  );
};

export default EventTypeTiles;
