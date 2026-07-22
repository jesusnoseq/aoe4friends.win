import React from 'react';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  loading: boolean;
  error: string | null;
  children: ReactNode;
}

const ChartCard: React.FC<Props> = ({ title, loading, error, children }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h2 className="text-white font-semibold mb-3">{title}</h2>
      {loading && <p className="text-gray-400 text-sm">Loading…</p>}
      {error && !loading && (
        <p className="text-red-400 text-sm whitespace-pre-wrap break-words">{error}</p>
      )}
      {!loading && !error && children}
    </div>
  );
};

export default ChartCard;
