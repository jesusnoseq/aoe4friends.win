import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { buildRatingProgression, LEADERBOARD_GROUPS } from '../services/aoe4worldAnalysis';
import { Game } from '../services/aoe4worldTypes.request';
import { RatingPoint } from '../services/aoe4worldTypes.analysis';

interface Props {
  games: Game[];
  profileId: number;
}

const LINE_COLOR = '#60a5fa';

interface TooltipPayload {
  payload: RatingPoint;
}

const RatingTooltip: React.FC<{ active?: boolean; payload?: TooltipPayload[] }> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const date = new Date(point.startedAt).toLocaleDateString();
  return (
    <div style={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', padding: '8px 12px', fontSize: 14, fontWeight: 600 }}>
      <div style={{ color: '#9ca3af' }}>
        {date}
        {point.season !== null && <span> · Season {point.season}</span>}
      </div>
      <div style={{ color: '#fff' }}>Rating: {point.value}</div>
      {point.diff !== null && (
        <div style={{ color: point.diff >= 0 ? '#4ade80' : '#f87171' }}>
          {point.diff >= 0 ? `+${point.diff}` : point.diff}
        </div>
      )}
      <div style={{ color: point.won ? '#4ade80' : '#f87171' }}>{point.won ? 'Win' : 'Loss'}</div>
    </div>
  );
};

const RatingProgressionChart: React.FC<Props> = ({ games, profileId }) => {
  const progression = useMemo(
    () => buildRatingProgression(games, profileId),
    [games, profileId]
  );

  // Leaderboards present, ordered by number of points (most-played first).
  const leaderboards = useMemo(
    () =>
      Object.entries(progression.byLeaderboard)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([key]) => key),
    [progression]
  );

  const [selected, setSelected] = useState<string | null>(null);
  const activeKey = selected && progression.byLeaderboard[selected] ? selected : leaderboards[0];

  const data = useMemo(() => {
    const points = activeKey ? progression.byLeaderboard[activeKey] ?? [] : [];
    return points.map((p) => ({ ...p, ts: new Date(p.startedAt).getTime() }));
  }, [progression, activeKey]);

  if (leaderboards.length === 0 || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-400">
        No rating data available.
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const pad = Math.max(20, Math.round((maxValue - minValue) * 0.1));
  const current = values[values.length - 1];
  const peak = maxValue;
  const net = current - values[0];

  return (
    <div>
      {/* Leaderboard selector — one row per category (Ranked / Quick Match / Empire Wars & FFA) */}
      <div className="space-y-2 mb-4">
        {LEADERBOARD_GROUPS.map((group) => {
          const present = group.labels.filter((label) => progression.byLeaderboard[label]);
          if (present.length === 0) return null;
          return (
            <div key={group.group} className="flex flex-wrap gap-2">
              {present.map((key) => (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    activeKey === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Summary row */}
      <div className="flex flex-wrap gap-6 mb-4 text-sm">
        <div>
          <span className="text-gray-400">Current </span>
          <span className="font-semibold">{current}</span>
        </div>
        <div>
          <span className="text-gray-400">Peak </span>
          <span className="font-semibold">{peak}</span>
        </div>
        <div>
          <span className="text-gray-400">Net change </span>
          <span className={`font-semibold ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {net >= 0 ? `+${net}` : net}
          </span>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 0, right: 20, top: 10, bottom: 10 }}>
            <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(ts) =>
                new Date(ts).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
              }
              minTickGap={40}
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              axisLine={{ stroke: '#4b5563' }}
              tickLine={{ stroke: '#4b5563' }}
            />
            <YAxis
              domain={[minValue - pad, maxValue + pad]}
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              axisLine={{ stroke: '#4b5563' }}
              tickLine={{ stroke: '#4b5563' }}
              width={48}
            />
            <Tooltip content={<RatingTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={data.length <= 40 ? { r: 2, fill: LINE_COLOR } : false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RatingProgressionChart;
