import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Game } from '../services/aoe4worldTypes.request';
import { buildPlayTimeHeatmap, buildGamesPerMonth } from '../services/aoe4worldAnalysis';

// Render rows Mon..Sun (weekend grouped at the bottom); counts stay getDay()-indexed
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Time-of-day bands, each spanning 6 hour columns. Colors come from the app's
// categorical palette with the blue slot skipped so the band headers can't be
// confused with the blue cell ramp; color goes on the underline, not the text.
const BANDS = [
  { label: 'Night', color: '#34d399' },
  { label: 'Morning', color: '#fbbf24' },
  { label: 'Afternoon', color: '#a78bfa' },
  { label: 'Evening', color: '#f87171' },
];

// Stepped sequential blue ramp (low = darker) validated against the #1f2937 card
const RAMP = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];
const ZERO_COLOR = '#111827';

function cellColor(count: number, max: number): string {
  if (count === 0 || max === 0) return ZERO_COLOR;
  return RAMP[Math.min(RAMP.length - 1, Math.floor((count / max) * RAMP.length))];
}

const GRID_COLUMNS = '2.5rem repeat(24, 1fr)';

const PlayTimeSection: React.FC<{ games: Game[] }> = ({ games }) => {
  const heatmap = useMemo(() => buildPlayTimeHeatmap(games), [games]);
  const monthly = useMemo(() => buildGamesPerMonth(games), [games]);

  if (heatmap.total === 0) {
    return <p className="text-gray-400">No games to analyze.</p>;
  }

  return (
    <>
      <h4 className="text-sm font-semibold text-gray-300 mb-2">Play-time heatmap (local time)</h4>
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid" style={{ gridTemplateColumns: '2.5rem repeat(4, 1fr)' }}>
            <div />
            {BANDS.map((band) => (
              <div
                key={band.label}
                className="text-center text-xs text-gray-400 pb-1 mx-0.5 border-b-2"
                style={{ borderColor: band.color }}
              >
                {band.label}
              </div>
            ))}
          </div>
          <div className="grid" style={{ gridTemplateColumns: GRID_COLUMNS }}>
            <div />
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} className="text-center text-[10px] text-gray-500 py-1">
                {hour % 3 === 0 ? hour : ''}
              </div>
            ))}
          </div>
          {DAY_ORDER.map((day) => (
            <div key={day} className="grid mb-0.5" style={{ gridTemplateColumns: GRID_COLUMNS }}>
              <div className="text-xs text-gray-400 pr-2 text-right self-center">{DAY_LABELS[day]}</div>
              {heatmap.counts[day].map((count, hour) => (
                <div
                  key={hour}
                  className="h-5 rounded-sm mx-px"
                  style={{ backgroundColor: cellColor(count, heatmap.max) }}
                  title={`${DAY_LABELS[day]} ${String(hour).padStart(2, '0')}:00 — ${count} game${count === 1 ? '' : 's'}`}
                />
              ))}
            </div>
          ))}
          <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
            <span>Less</span>
            {[ZERO_COLOR, ...RAMP].map((color) => (
              <span key={color} className="w-4 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      <h4 className="text-sm font-semibold text-gray-300 mt-8 mb-2">Games per month (last 18 months)</h4>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="label"
              interval="preserveStartEnd"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              width={32}
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(96,165,250,0.08)' }}
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                color: '#fff',
                borderRadius: '0.5rem',
                fontSize: 14,
              }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#fff' }}
            />
            <Bar dataKey="count" name="Games" fill="#60a5fa" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

export default PlayTimeSection;
