import React from 'react';
import { Scale, Hourglass, Coins, Swords, Gauge } from 'lucide-react';
import { type TeamOverview, type TeamTotals } from '../services/coach/overview';
import { type PlayerScores, type ResourceTotals } from '../services/coach/types';
import { formatGameTime } from '../services/coach/context';

interface MetricDef {
  label: string;
  better: 'high' | 'low' | 'none';
  value: (t: TeamTotals) => number | undefined;
  format: (v: number) => string;
  hint?: string;
}

interface MetricGroup {
  label: string;
  icon: React.ReactNode;
  metrics: MetricDef[];
}

const fmtInt = (v: number) => Math.round(v).toLocaleString();

const GROUPS: MetricGroup[] = [
  {
    label: 'Tempo',
    icon: <Hourglass className="w-4 h-4 text-blue-400" />,
    metrics: [
      { label: 'First Feudal Age', better: 'low', value: t => t.firstFeudal, format: formatGameTime, hint: 'Earliest Feudal age-up on the team' },
      { label: 'First Castle Age', better: 'low', value: t => t.firstCastle, format: formatGameTime, hint: 'Earliest Castle age-up on the team' },
      { label: 'First Imperial Age', better: 'low', value: t => t.firstImperial, format: formatGameTime, hint: 'Earliest Imperial age-up on the team' },
    ],
  },
  {
    label: 'Economy',
    icon: <Coins className="w-4 h-4 text-yellow-400" />,
    metrics: [
      { label: 'Resources gathered', better: 'high', value: t => t.resourcesGathered?.total, format: fmtInt },
      { label: 'Unspent resources', better: 'low', value: t => t.unspentPct, format: v => `${v.toFixed(0)}%`, hint: 'Share of gathered resources never spent — floating' },
      { label: 'Villagers produced', better: 'high', value: t => t.villagersProduced, format: fmtInt },
    ],
  },
  {
    label: 'Military',
    icon: <Swords className="w-4 h-4 text-red-400" />,
    metrics: [
      { label: 'Units killed', better: 'high', value: t => t.unitsKilled, format: fmtInt },
      { label: 'Units lost', better: 'low', value: t => t.unitsLost, format: fmtInt },
      { label: 'Army efficiency', better: 'high', value: t => t.killsPerUnitProduced, format: v => v.toFixed(2), hint: 'Kills per unit produced' },
      { label: 'Buildings lost', better: 'low', value: t => t.buildingsLost, format: fmtInt },
    ],
  },
  {
    label: 'Overall',
    icon: <Gauge className="w-4 h-4 text-blue-400" />,
    metrics: [
      { label: 'Total score', better: 'high', value: t => t.scores?.total, format: fmtInt },
      { label: 'Upgrades researched', better: 'high', value: t => t.upgrades, format: fmtInt },
      { label: 'Average APM', better: 'none', value: t => t.apmAvg, format: fmtInt, hint: 'Actions per minute, averaged over the team — busy is not always better' },
    ],
  },
];

// Left/right team accents for the 2-team tug-of-war layout.
const TEAM_BAR = ['bg-blue-500', 'bg-amber-500'];
const TEAM_TEXT = ['text-blue-300', 'text-amber-300'];

const RESOURCE_SEGMENTS: Array<{ key: keyof ResourceTotals; label: string; color: string }> = [
  { key: 'food', label: 'Food', color: 'bg-red-400' },
  { key: 'wood', label: 'Wood', color: 'bg-green-500' },
  { key: 'gold', label: 'Gold', color: 'bg-yellow-400' },
  { key: 'stone', label: 'Stone', color: 'bg-gray-400' },
  { key: 'oliveoil', label: 'Olive oil', color: 'bg-purple-400' },
];

const SCORE_SEGMENTS: Array<{ key: keyof PlayerScores; label: string; color: string }> = [
  { key: 'military', label: 'Military', color: 'bg-red-400' },
  { key: 'economy', label: 'Economy', color: 'bg-yellow-400' },
  { key: 'technology', label: 'Technology', color: 'bg-purple-400' },
  { key: 'society', label: 'Society', color: 'bg-blue-400' },
];

function teamLabel(t: TeamTotals): string {
  return t.teamName || `Team ${t.team + 1}`;
}

function ResultBadge({ won }: { won?: boolean }) {
  if (won === undefined) return null;
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${won ? 'bg-green-900 text-green-300' : 'bg-red-900/70 text-red-300'}`}>
      {won ? 'Victory' : 'Defeat'}
    </span>
  );
}

// A stacked composition bar (resource mix, score shape) for one team.
function StackedBar<K extends string>({
  values,
  segments,
}: {
  values: Partial<Record<K, number>>;
  segments: Array<{ key: K; label: string; color: string }>;
}) {
  const present = segments.filter(s => (values[s.key] ?? 0) > 0);
  const total = present.reduce((n, s) => n + (values[s.key] ?? 0), 0);
  if (total <= 0) return null;
  return (
    <div className="h-2 flex rounded-full overflow-hidden bg-gray-700">
      {present.map(s => (
        <div
          key={s.key}
          className={s.color}
          style={{ width: `${(100 * (values[s.key] ?? 0)) / total}%` }}
          title={`${s.label}: ${fmtInt(values[s.key] ?? 0)}`}
        />
      ))}
    </div>
  );
}

function SegmentLegend({ segments }: { segments: Array<{ label: string; color: string }> }) {
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
      {segments.map(s => (
        <span key={s.label} className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${s.color}`} /> {s.label}
        </span>
      ))}
    </p>
  );
}

// One metric as a two-sided tug-of-war row.
function TugRow({ metric, left, right }: { metric: MetricDef; left: number; right: number }) {
  const total = left + right;
  const leftPct = total > 0 ? (100 * left) / total : 50;
  const leader =
    metric.better === 'none' || left === right
      ? undefined
      : (left < right) === (metric.better === 'low')
        ? 0
        : 1;
  return (
    <div>
      <div className="flex items-baseline gap-2 text-sm">
        <span className={`w-20 shrink-0 tabular-nums ${leader === 0 ? `font-semibold ${TEAM_TEXT[0]}` : 'text-gray-400'}`}>
          {metric.format(left)}
        </span>
        <span className="flex-1 text-center text-xs text-gray-400" title={metric.hint}>
          {metric.label}
        </span>
        <span className={`w-20 shrink-0 text-right tabular-nums ${leader === 1 ? `font-semibold ${TEAM_TEXT[1]}` : 'text-gray-400'}`}>
          {metric.format(right)}
        </span>
      </div>
      <div className="mt-1 h-1.5 flex rounded-full overflow-hidden bg-gray-700">
        {total > 0 ? (
          <>
            <div className={TEAM_BAR[0]} style={{ width: `${leftPct}%` }} />
            <div className={TEAM_BAR[1]} style={{ width: `${100 - leftPct}%` }} />
          </>
        ) : null}
      </div>
    </div>
  );
}

function AwardChips({ team }: { team: TeamTotals }) {
  if (team.awards.length === 0) return null;
  return (
    <p className="mt-1 flex flex-wrap gap-1">
      {team.awards.map(a => (
        <span key={a.label} className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 text-[11px]" title={a.detail}>
          {a.label}: {a.playerName}
        </span>
      ))}
    </p>
  );
}

// Note shown when an age row is hidden because a team never reached the age,
// but the teams differ — that gap is itself the interesting fact.
function ageGapNote(teams: TeamTotals[], ageName: string, reached: (t: TeamTotals) => number): string | undefined {
  const counts = teams.map(reached);
  if (new Set(counts).size < 2) return undefined;
  const parts = teams.map((t, i) => `${counts[i]}/${t.playerCount}`).join(' vs ');
  return `Players who reached ${ageName}: ${parts}`;
}

function TwoTeamComparison({ teams }: { teams: [TeamTotals, TeamTotals] }) {
  const [left, right] = teams;
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`font-semibold ${TEAM_TEXT[0]} flex items-center gap-2`}>
            {teamLabel(left)} <ResultBadge won={left.won} />
          </p>
          <AwardChips team={left} />
        </div>
        <div className="text-right">
          <p className={`font-semibold ${TEAM_TEXT[1]} flex items-center gap-2 justify-end`}>
            <ResultBadge won={right.won} /> {teamLabel(right)}
          </p>
          <AwardChips team={right} />
        </div>
      </div>

      {GROUPS.map(group => {
        const rows = group.metrics.filter(m => teams.every(t => m.value(t) !== undefined));
        const notes: string[] = [];
        if (group.label === 'Tempo') {
          for (const [ageName, reached] of [
            ['Feudal Age', (t: TeamTotals) => t.reachedFeudal],
            ['Castle Age', (t: TeamTotals) => t.reachedCastle],
            ['Imperial Age', (t: TeamTotals) => t.reachedImperial],
          ] as const) {
            const note = ageGapNote(teams, ageName, reached);
            if (note) notes.push(note);
          }
        }
        if (rows.length === 0 && notes.length === 0) return null;
        return (
          <div key={group.label}>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-2">
              {group.icon} {group.label}
            </h4>
            <div className="space-y-2">
              {rows.map(m => (
                <TugRow key={m.label} metric={m} left={m.value(left) as number} right={m.value(right) as number} />
              ))}
              {group.label === 'Economy' && teams.every(t => t.resourcesGathered) && (
                <div className="space-y-1 pt-1">
                  <p className="text-xs text-gray-400">Resource mix</p>
                  {teams.map((t, i) => (
                    <div key={t.team} className="flex items-center gap-2">
                      <span className={`w-20 shrink-0 text-[11px] ${TEAM_TEXT[i]}`}>{teamLabel(t)}</span>
                      <div className="flex-1">
                        <StackedBar values={t.resourcesGathered ?? {}} segments={RESOURCE_SEGMENTS} />
                      </div>
                    </div>
                  ))}
                  <SegmentLegend
                    segments={RESOURCE_SEGMENTS.filter(s => teams.some(t => (t.resourcesGathered?.[s.key] ?? 0) > 0))}
                  />
                </div>
              )}
              {group.label === 'Overall' && teams.every(t => t.scores) && (
                <div className="space-y-1 pt-1">
                  <p className="text-xs text-gray-400">Score shape</p>
                  {teams.map((t, i) => (
                    <div key={t.team} className="flex items-center gap-2">
                      <span className={`w-20 shrink-0 text-[11px] ${TEAM_TEXT[i]}`}>{teamLabel(t)}</span>
                      <div className="flex-1">
                        <StackedBar values={t.scores ?? {}} segments={SCORE_SEGMENTS} />
                      </div>
                    </div>
                  ))}
                  <SegmentLegend segments={SCORE_SEGMENTS} />
                </div>
              )}
              {notes.map(n => (
                <p key={n} className="text-xs text-gray-400">{n}</p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// FFA / 3+ team fallback: same metrics as a compact table.
function MultiTeamTable({ teams }: { teams: TeamTotals[] }) {
  const metrics = GROUPS.flatMap(g => g.metrics).filter(m => teams.every(t => m.value(t) !== undefined));
  if (metrics.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400">
            <th className="py-1 pr-3 font-normal">Metric</th>
            {teams.map(t => (
              <th key={t.team} className="py-1 pr-3 font-semibold text-gray-200">
                <span className="flex items-center gap-2">{teamLabel(t)} <ResultBadge won={t.won} /></span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map(m => {
            const values = teams.map(t => m.value(t) as number);
            const best =
              m.better === 'none'
                ? undefined
                : m.better === 'high'
                  ? Math.max(...values)
                  : Math.min(...values);
            return (
              <tr key={m.label} className="border-t border-gray-700/40">
                <td className="py-1 pr-3 text-xs text-gray-400" title={m.hint}>{m.label}</td>
                {values.map((v, i) => (
                  <td
                    key={teams[i].team}
                    className={`py-1 pr-3 tabular-nums ${best !== undefined && v === best ? 'font-semibold text-blue-300' : 'text-gray-300'}`}
                  >
                    {m.format(v)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function CoachTeamOverview({ overview }: { overview: TeamOverview }) {
  if (overview.teams.length < 2) return null;
  const twoTeams = overview.teams.length === 2;
  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-xl border border-gray-700/40">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-100 mb-3">
        <Scale className="w-5 h-5 text-blue-400" /> Team Comparison
      </h3>
      {twoTeams ? (
        <TwoTeamComparison teams={overview.teams as [TeamTotals, TeamTotals]} />
      ) : (
        <MultiTeamTable teams={overview.teams} />
      )}
    </div>
  );
}
