import { type ReactNode } from 'react';
import { type RatingMode, type CBTPlayer, type BalanceAlgorithm, getBalanceElo, teamElo, computeTeamScore, STRENGTH_COEFFICIENT } from '../services/balancedTeamsLogic';

// ─── Fairness ────────────────────────────────────────────────────────────────

type Fairness = 'very-balanced' | 'balanced' | 'slight-edge' | 'favored' | 'one-sided';

// Convert win probability (of the stronger team) to a fairness level
function probFairness(p: number): Fairness {
  const top = Math.max(p, 1 - p);
  if (top < 0.52) return 'very-balanced';
  if (top < 0.56) return 'balanced';
  if (top < 0.60) return 'slight-edge';
  if (top < 0.65) return 'favored';
  return 'one-sided';
}

function eloFairness(d: number): Fairness {
  if (d <= 50)  return 'very-balanced';
  if (d <= 100) return 'balanced';
  if (d <= 150) return 'slight-edge';
  if (d <= 200) return 'favored';
  return 'one-sided';
}

const fairnessStyles: Record<Fairness, { bar: string; badge: string; label: string; icon: string }> = {
  'very-balanced': { bar: 'bg-green-900 text-green-300',   badge: 'bg-green-700 text-green-200',   label: 'Very Balanced', icon: '✅' },
  'balanced':      { bar: 'bg-teal-900 text-teal-300',     badge: 'bg-teal-700 text-teal-200',     label: 'Balanced',      icon: '🟢' },
  'slight-edge':   { bar: 'bg-yellow-900 text-yellow-300', badge: 'bg-yellow-700 text-yellow-200', label: 'Slight Edge',   icon: '🟡' },
  'favored':       { bar: 'bg-orange-900 text-orange-300', badge: 'bg-orange-700 text-orange-200', label: 'Favored',       icon: '🟠' },
  'one-sided':     { bar: 'bg-red-900 text-red-300',       badge: 'bg-red-700 text-red-200',       label: 'One-Sided',     icon: '🔴' },
};

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  team1: CBTPlayer[];
  team2: CBTPlayer[];
  mode: RatingMode;
  algorithm: BalanceAlgorithm;
  usedAI?: boolean;
  team1Label?: string;
  team2Label?: string;
  onMovePlayer?: (player: CBTPlayer, fromTeam: 'team1' | 'team2') => void;
  showAllMethods?: boolean; // render one colored panel per balance method instead of a single bar
  children?: ReactNode; // rendered between the status bar and the team columns
}

export default function TeamsDisplay({ team1, team2, mode, algorithm, usedAI, team1Label = 'Team 1', team2Label = 'Team 2', onMovePlayer, showAllMethods, children }: Props) {
  const elo1 = teamElo(team1, mode);
  const elo2 = teamElo(team2, mode);
  const eloDiff = Math.abs(elo1 - elo2);

  const sSum1 = computeTeamScore(team1, mode, 'strength-sum');
  const sSum2 = computeTeamScore(team2, mode, 'strength-sum');
  const sAdv1 = computeTeamScore(team1, mode, 'strength-std-max');
  const sAdv2 = computeTeamScore(team2, mode, 'strength-std-max');

  const pStrSum1 = sSum1 + sSum2 > 0 ? sSum1 / (sSum1 + sSum2) : 0.5;
  const pStrAdv1 = sAdv1 + sAdv2 > 0 ? sAdv1 / (sAdv1 + sAdv2) : 0.5;

  const fairness: Fairness =
    algorithm === 'raw-elo'      ? eloFairness(eloDiff) :
    algorithm === 'strength-sum' ? probFairness(pStrSum1) :
                                   probFairness(pStrAdv1);
  const fs = fairnessStyles[fairness];

  // One evaluation per balance method — shown as separate colored panels when showAllMethods is set.
  const methods: { name: string; fairness: Fairness; detail: ReactNode }[] = [
    {
      name: 'ELO',
      fairness: eloFairness(eloDiff),
      detail: <>ELO diff <strong>{eloDiff}</strong> · T1 {elo1} · T2 {elo2}</>,
    },
    {
      name: 'Strength',
      fairness: probFairness(pStrSum1),
      detail: <>Win% T1 <strong>{(pStrSum1 * 100).toFixed(1)}%</strong> · T2 <strong>{((1 - pStrSum1) * 100).toFixed(1)}%</strong></>,
    },
    {
      name: 'Str+Std/Max',
      fairness: probFairness(pStrAdv1),
      detail: <>Win% T1 <strong>{(pStrAdv1 * 100).toFixed(1)}%</strong> · T2 <strong>{((1 - pStrAdv1) * 100).toFixed(1)}%</strong></>,
    },
  ];

  const TeamColumn = ({
    team,
    label,
    teamKey,
  }: {
    team: CBTPlayer[];
    label: string;
    teamKey: 'team1' | 'team2';
  }) => {
    const strengthSum   = computeTeamScore(team, mode, 'strength-sum');
    const strengthAdv   = computeTeamScore(team, mode, 'strength-std-max');
    return (
      <div className="bg-gray-800 rounded-lg p-4 shadow-xl border border-gray-700/40 flex flex-col">
        <h3 className="text-lg font-bold mb-4 text-center">{label}</h3>
        <ul className="space-y-2 flex-1">
          {team.map(player => {
            const elo      = getBalanceElo(player, mode);
            const strength = Math.pow(10, elo / STRENGTH_COEFFICIENT);
            return (
              <li
                key={player.profile_id}
                onClick={onMovePlayer ? () => onMovePlayer(player, teamKey) : undefined}
                title={onMovePlayer ? 'Click to move to the other team' : undefined}
                className={`flex items-center justify-between px-3 py-2 rounded bg-gray-700 transition-colors ${
                  onMovePlayer ? 'hover:bg-blue-900 cursor-pointer' : ''
                }`}
              >
                <span className="font-medium text-sm flex items-center gap-2">
                  {player.isAI && <span title={player.aiDifficulty}>🤖</span>}
                  <span>{player.name}</span>
                </span>
                {!player.isAI && (
                  <span className="flex items-center gap-2 ml-3 shrink-0">
                    <span className="text-sm text-blue-300">{elo}</span>
                    <span className="text-xs text-gray-400">({strength.toFixed(2)})</span>
                  </span>
                )}
              </li>
            );
          })}
          {team.length === 0 && (
            <li className="text-gray-500 text-sm text-center py-4">— empty —</li>
          )}
        </ul>
        <div className="mt-4 border-t border-gray-700 pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Total ELO</span>
            <span className="font-bold">{teamElo(team, mode)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Strength sum</span>
            <span className="font-bold">{strengthSum.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Strength+Std/Max</span>
            <span className="font-bold">{strengthAdv.toFixed(3)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-4">
      {showAllMethods ? (
        <>
          {usedAI && <p className="text-orange-400 text-xs px-1">🤖 AI included</p>}
          {/* One colored evaluation panel per balance method */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {methods.map(m => {
              const ms = fairnessStyles[m.fairness];
              return (
                <div key={m.name} className={`px-4 py-3 rounded-lg ${ms.bar}`}>
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-70">{m.name}</div>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-bold ${ms.badge}`}>
                    {ms.icon} {ms.label}
                  </span>
                  <div className="mt-2 text-xs font-normal opacity-90">{m.detail}</div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Status bar */
        <div className={`px-4 py-3 rounded-lg text-sm font-semibold ${fs.bar}`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${fs.badge}`}>
              {fs.icon} {fs.label}
            </span>
            {usedAI && <span className="text-orange-400 text-xs">🤖 AI included</span>}
            {onMovePlayer && <span className="text-xs font-normal opacity-70 ml-auto">Click player to swap teams</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs font-normal opacity-90">
            <span>ELO sum: <strong>T1 {elo1} · T2 {elo2}</strong></span>
            <span>ELO diff: <strong>{eloDiff}</strong></span>
            <span>Strength win%: <strong>T1 {(pStrSum1 * 100).toFixed(1)}% · T2 {((1 - pStrSum1) * 100).toFixed(1)}%</strong></span>
            <span>Str+Std/Max win%: <strong>T1 {(pStrAdv1 * 100).toFixed(1)}% · T2 {((1 - pStrAdv1) * 100).toFixed(1)}%</strong></span>
          </div>
        </div>
      )}

      {children}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TeamColumn team={team1} label={team1Label} teamKey="team1" />
        <TeamColumn team={team2} label={team2Label} teamKey="team2" />
      </div>
    </div>
  );
}
