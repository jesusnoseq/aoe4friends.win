import React from 'react';
import type { DayRange } from '../services/queries';

interface Props {
  value: DayRange;
  onChange: (range: DayRange) => void;
}

const OPTIONS: DayRange[] = [7, 30, 90];

const DateRangeSelector: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className="flex gap-2" role="group" aria-label="Date range">
      {OPTIONS.map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => onChange(range)}
          aria-pressed={value === range}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            value === range
              ? 'bg-blue-500 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {range}d
        </button>
      ))}
    </div>
  );
};

export default DateRangeSelector;
