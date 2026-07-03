// Centralized chart styling so Recharts colors stay in lockstep with the
// Tailwind theme tokens defined in tailwind.config.js.

export const CHART_COLORS = {
  gold:      '#c9a35a',
  goldLight: '#e3b878',
  moss:      '#6c8a4f',
  mossLight: '#8fab6e',
  oxblood:   '#7d2b22',
  oxbloodLight: '#a24238',
  steel:     '#6c7680',
  steelLight: '#9aa3ad',
  parchment: '#e8d8b0',
} as const;

// Wins / losses pair used by civ donut charts
export const WIN_LOSS_COLORS = {
  wins: CHART_COLORS.mossLight,
  losses: CHART_COLORS.oxbloodLight,
} as const;

// Five-step progression for the duration distribution donut
export const DURATION_COLORS = [
  CHART_COLORS.goldLight,
  CHART_COLORS.mossLight,
  CHART_COLORS.parchment,
  CHART_COLORS.steelLight,
  CHART_COLORS.oxbloodLight,
] as const;

export const MAP_SERIES_COLORS = {
  games: CHART_COLORS.gold,
  wins: CHART_COLORS.moss,
  losses: CHART_COLORS.oxblood,
} as const;

export const TOOLTIP_STYLE = {
  backgroundColor: '#1c1815',
  border: '1px solid #7a5c2a',
  color: '#f4e9d0',
  borderRadius: '0.5rem',
  fontSize: 14,
} as const;

export const TOOLTIP_ITEM_STYLE = { color: '#f4e9d0' } as const;
export const TOOLTIP_LABEL_STYLE = { color: '#f4e9d0' } as const;

export const AXIS_TICK_STYLE = {
  fontSize: 14,
  fill: '#e8d8b0',
  fontWeight: 600,
} as const;

export const AXIS_LINE_STYLE = { stroke: '#9aa3ad' } as const;

export const LEGEND_WRAPPER_STYLE = {
  color: '#e8d8b0',
  fontSize: 14,
  fontWeight: 600,
} as const;