import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MAP_SERIES_COLORS, TOOLTIP_STYLE, TOOLTIP_ITEM_STYLE, TOOLTIP_LABEL_STYLE, AXIS_TICK_STYLE, AXIS_LINE_STYLE, LEGEND_WRAPPER_STYLE } from '../services/chartTheme';

interface MapStats {
  [map: string]: {
    games: number;
    wins: number;
    losses: number;
  };
}

const COLORS = MAP_SERIES_COLORS;

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
            tick={AXIS_TICK_STYLE}
            axisLine={AXIS_LINE_STYLE}
            tickLine={AXIS_LINE_STYLE}
          />
          <YAxis
            dataKey="map"
            type="category"
            width={140}
            tick={AXIS_TICK_STYLE}
            axisLine={AXIS_LINE_STYLE}
            tickLine={AXIS_LINE_STYLE}
          />
          <Tooltip
            contentStyle={{ ...TOOLTIP_STYLE, fontWeight: 600 }}
            labelStyle={{ ...TOOLTIP_LABEL_STYLE, fontWeight: 600 }}
            itemStyle={{ ...TOOLTIP_ITEM_STYLE, fontWeight: 600 }}
          />
          <Legend
            wrapperStyle={LEGEND_WRAPPER_STYLE}
            iconSize={16}
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
