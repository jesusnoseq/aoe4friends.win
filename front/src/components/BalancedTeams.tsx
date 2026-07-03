import React, { useState, useEffect } from 'react';
import { X, Users, Trophy, Shield, ShieldCheck, ShieldAlert, Bot } from 'lucide-react';
import { fetchPlayerProfileForCBT, searchPlayersForCBT } from '../services/aoe4worldRequests';
import { type RatingMode, type CBTPlayer, type TeamsState, type BalanceAlgorithm, getBalanceElo, teamElo, computeTeamScore, createTeams, isTeamBalanced, BALANCE_ALGORITHMS, STRENGTH_COEFFICIENT } from '../services/balancedTeamsLogic';
import Spinner from './Spinner';

// ─── Types ───────────────────────────────────────────────────────────────────

const RATING_MODES: { key: RatingMode; label: string }[] = [
  { key: 'rm_1v1', label: 'RM 1v1' },
  { key: 'qm_1v1', label: 'QM 1v1' },
  { key: 'rm_2v2', label: 'RM 2v2' },
  { key: 'qm_2v2', label: 'QM 2v2' },
  { key: 'rm_3v3', label: 'RM 3v3' },
  { key: 'qm_3v3', label: 'QM 3v3' },
  { key: 'rm_4v4', label: 'RM 4v4' },
  { key: 'qm_4v4', label: 'QM 4v4' },
];

interface AllyEntry {
  Name: string;
  profile_id?: number;
  Stat: { games: number; wins: number; losses: number };
}

interface Props {
  allies: AllyEntry[];
  currentPlayer?: { profile_id: number; name: string };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BalancedTeams({ allies, currentPlayer }: Props) {
  const [roster, setRoster] = useState<CBTPlayer[]>([]);
  const [balanceMode, setBalanceMode] = useState<RatingMode>('rm_1v1');
  const [teams, setTeams] = useState<TeamsState | null>(null);
  const [phase, setPhase] = useState<'roster' | 'teams'>('roster');
  const [algorithm, setAlgorithm] = useState<BalanceAlgorithm>('raw-elo');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ profile_id: number; name: string; rating?: number }>>([]); 
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [searchLoading, setSearchLoading] = useState(false);

  const rosterIds = new Set(roster.map(p => p.profile_id));
  const maxReached = roster.length >= 8;

  // Auto-add the current player when the component mounts or the viewed player changes
  useEffect(() => {
    if (!currentPlayer) return;
    setRoster(prev => {
      if (prev.some(p => p.profile_id === currentPlayer.profile_id)) return prev;
      return prev; // placeholder until fetch completes
    });
    setLoadingIds(prev => { const next = new Set(prev); next.add(currentPlayer.profile_id); return next; });
    fetchPlayerProfileForCBT(currentPlayer.profile_id)
      .then(profile => {
        const player: CBTPlayer = {
          profile_id: profile.profile_id,
          name: profile.name || currentPlayer.name,
          ratings: profile.ratings,
        };
        setRoster(prev =>
          prev.some(p => p.profile_id === player.profile_id) ? prev : [player, ...prev]
        );
      })
      .catch(() => { /* silently skip if fetch fails */ })
      .finally(() => {
        setLoadingIds(prev => { const next = new Set(prev); next.delete(currentPlayer.profile_id); return next; });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer?.profile_id]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchPlayersForCBT(searchQuery);
        setSearchResults(results);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  async function addPlayer(profile_id: number, nameHint?: string) {
    if (rosterIds.has(profile_id) || maxReached) return;
    setLoadingIds(prev => { const next = new Set(prev); next.add(profile_id); return next; });
    try {
      const profile = await fetchPlayerProfileForCBT(profile_id);
      const player: CBTPlayer = {
        profile_id: profile.profile_id,
        name: profile.name || nameHint || String(profile_id),
        ratings: profile.ratings,
      };
      setRoster(prev => [...prev, player]);
    } finally {
      setLoadingIds(prev => { const next = new Set(prev); next.delete(profile_id); return next; });
    }
  }

  function removePlayer(profile_id: number) {
    setRoster(prev => prev.filter(p => p.profile_id !== profile_id));
  }

  function handleCreate(algo: BalanceAlgorithm = algorithm) {
    setTeams(createTeams(roster, balanceMode, algo));
    setPhase('teams');
  }

  function handleSwitchAlgorithm(algo: BalanceAlgorithm) {
    setAlgorithm(algo);
    setTeams(createTeams(roster, balanceMode, algo));
  }

  function handleReset() {
    setTeams(null);
    setPhase('roster');
  }

  function movePlayer(player: CBTPlayer, fromTeam: 'team1' | 'team2') {
    if (!teams) return;
    const toTeam = fromTeam === 'team1' ? 'team2' : 'team1';
    const next: TeamsState = {
      ...teams,
      [fromTeam]: teams[fromTeam].filter(p => p.profile_id !== player.profile_id),
      [toTeam]: [...teams[toTeam], player],
    };
    const diff = Math.abs(teamElo(next.team1, balanceMode) - teamElo(next.team2, balanceMode));
    const balanced = isTeamBalanced(next.team1, next.team2, balanceMode, teams.algorithm);
    setTeams({ ...next, diff, balanced });
  }

  function ratingCell(r: number | undefined): React.ReactNode {
    return r !== undefined
      ? <span>{r}</span>
      : <span className="text-steel-500 text-xs">N/A</span>;
  }

  const showSearch = searchQuery.trim().length > 0;
  const leftList = showSearch
    ? searchResults
        .filter((r, idx, arr) => arr.findIndex(x => x.profile_id === r.profile_id) === idx)
        .map(r => ({ profile_id: r.profile_id, name: r.name, subtitle: r.rating ? `Rating: ${r.rating}` : `#${r.profile_id}` }))
    : Object.values(
        allies.reduce<Record<number | string, { profile_id?: number; name: string; games: number }>>((acc, a) => {
          const key = a.profile_id ?? a.Name;
          if (acc[key]) {
            acc[key].games += a.Stat.games;
          } else {
            acc[key] = { profile_id: a.profile_id, name: a.Name, games: a.Stat.games };
          }
          return acc;
        }, {})
      )
      .sort((a, b) => b.games - a.games)
      .slice(0, 30)
      .map(e => ({ profile_id: e.profile_id, name: e.name, subtitle: `${e.games} games` }));

  // ── Roster phase ─────────────────────────────────────────────────────────
  if (phase === 'roster') {
    return (
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">

          {/* Left: Player selection */}
          <div className="card p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-parchment-100">
              <Users className="w-5 h-5 text-gold-400" /> Add Players
            </h3>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search player by name..."
              className="w-full px-3 py-2 bg-leather-800 rounded-lg text-sm text-parchment-100 placeholder-steel-500 focus:outline-none focus:ring-2 focus:ring-gold-500 mb-3 border border-gold-700/40"
            />
            {showSearch && searchLoading && (
              <p className="text-steel-400 text-sm px-1 mb-2">Searching...</p>
            )}
            {showSearch && !searchLoading && searchResults.length === 0 && (
              <p className="text-steel-400 text-sm px-1 mb-2">No players found.</p>
            )}
            {!showSearch && allies.length > 0 && (
              <p className="text-steel-500 text-xs px-1 mb-2">Top teammates - click + to add</p>
            )}
            <ul className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {leftList.map((item, i) => {
                const pid = item.profile_id;
                const alreadyIn = pid !== undefined && rosterIds.has(pid);
                const isLoading = pid !== undefined && loadingIds.has(pid);
                const disabled = alreadyIn || maxReached || isLoading || pid === undefined;
                return (
                  <li key={pid ?? `search-${i}`} className="flex items-center justify-between px-3 py-2 rounded hover:bg-leather-700">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-sm truncate block">{item.name}</span>
                      <span className="text-xs text-steel-400">{item.subtitle}</span>
                    </div>
                    <button
                      onClick={() => pid !== undefined && addPlayer(pid, item.name)}
                      disabled={disabled}
                      title={alreadyIn ? 'Already in roster' : maxReached ? 'Roster full (8/8)' : 'Add to roster'}
                      className={`ml-3 w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full text-sm font-bold transition-colors ${
                        alreadyIn
                          ? 'bg-leather-700 text-moss-400 cursor-default'
                          : isLoading
                            ? 'bg-leather-700 text-steel-400 cursor-wait'
                            : disabled
                              ? 'bg-leather-800 text-steel-500 cursor-not-allowed'
                              : 'bg-navy-500 hover:bg-navy-400 text-parchment-100 cursor-pointer'
                      }`}
                    >
                      {isLoading ? (
                        <Spinner size={12} className="text-steel-400" />
                      ) : alreadyIn ? '✓' : '+'}
                    </button>
                  </li>
                );
              })}
              {!showSearch && allies.length === 0 && (
                <li className="text-steel-500 text-sm px-3 py-4 text-center">
                  Load a player in the Stats tab to see their teammates here, or search above.
                </li>
              )}
            </ul>
          </div>

          {/* Right: Roster */}
          <div className="card p-4 flex flex-col">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-parchment-100">
              <Trophy className="w-5 h-5 text-gold-400" /> Match Roster
              <span className={`ml-auto text-sm font-normal ${maxReached ? 'text-oxblood-400' : 'text-steel-400'}`}>
                {roster.length}/8
              </span>
            </h3>
            {roster.length === 0 ? (
              <p className="text-steel-500 text-sm flex-1 py-4 text-center">
                No players added yet. Use the panel on the left.
              </p>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-steel-400 border-b border-gold-700/40 text-xs bg-leather-700/40">
                      <th className="text-left py-2 pr-3 text-parchment-200">Name</th>
                      <th className="text-center py-2 px-1 text-parchment-200">#</th>
                      {RATING_MODES.map(m => (
                        <th
                          key={m.key}
                          onClick={() => setBalanceMode(m.key)}
                          title={`Balance by ${m.label}`}
                          className={`text-center py-2 px-1 cursor-pointer select-none rounded transition-colors whitespace-nowrap hover:text-parchment-100 ${
                            balanceMode === m.key
                              ? 'text-gold-400 font-bold'
                              : 'text-steel-400'
                          }`}
                        >
                          {m.label}
                        </th>
                      ))}
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map(player => (
                      <tr key={player.profile_id} className="border-b border-gold-700/30 hover:bg-leather-700">
                        <td className="py-2 pr-3 font-medium">{player.name}</td>
                        <td className="text-center px-1 text-steel-400 text-xs">{player.profile_id}</td>
                        {RATING_MODES.map(m => (
                          <td
                            key={m.key}
                            className={`text-center px-1 ${balanceMode === m.key ? 'text-gold-300 font-semibold' : ''}`}
                          >
                            {ratingCell(player.ratings[m.key])}
                          </td>
                        ))}
                        <td className="text-center pl-2">
                          <button
                            onClick={() => removePlayer(player.profile_id)}
                            className="text-steel-500 hover:text-oxblood-400 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-xs text-steel-500">
              Click a column header to set the ELO used for balancing.{' '}
              <span className="text-gold-400">
                Active: {RATING_MODES.find(m => m.key === balanceMode)?.label}
              </span>
            </p>
            <button
              onClick={handleCreate}
              disabled={roster.length < 2}
              className="mt-4 w-full bg-navy-500 hover:bg-navy-400 disabled:opacity-40 disabled:cursor-not-allowed py-2 rounded-lg font-semibold transition-colors text-parchment-100"
            >
              Create Balanced Teams
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Teams phase ───────────────────────────────────────────────────────────────────
  if (!teams) return null;

  const eloDiff         = Math.abs(teamElo(teams.team1, balanceMode) - teamElo(teams.team2, balanceMode));

  const sSum1 = computeTeamScore(teams.team1, balanceMode, 'strength-sum');
  const sSum2 = computeTeamScore(teams.team2, balanceMode, 'strength-sum');
  const sAdv1 = computeTeamScore(teams.team1, balanceMode, 'strength-std-max');
  const sAdv2 = computeTeamScore(teams.team2, balanceMode, 'strength-std-max');

  const pStrSum1 = sSum1 + sSum2 > 0 ? sSum1 / (sSum1 + sSum2) : 0.5;
  const pStrAdv1 = sAdv1 + sAdv2 > 0 ? sAdv1 / (sAdv1 + sAdv2) : 0.5;

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
  const fairness: Fairness =
    algorithm === 'raw-elo'      ? eloFairness(eloDiff) :
    algorithm === 'strength-sum' ? probFairness(pStrSum1) :
                                   probFairness(pStrAdv1);
  const fairnessStyles: Record<Fairness, { bar: string; badge: string; label: string; icon: React.ReactNode }> = {
    'very-balanced': { bar: 'bg-moss-600 text-parchment-100', badge: 'bg-moss-500 text-ink-900', label: 'Very Balanced', icon: <ShieldCheck className="w-4 h-4 inline" /> },
    'balanced':      { bar: 'bg-moss-500 text-ink-900',       badge: 'bg-moss-600 text-parchment-100', label: 'Balanced',      icon: <Shield className="w-4 h-4 inline" /> },
    'slight-edge':   { bar: 'bg-gold-700 text-parchment-100', badge: 'bg-gold-600 text-ink-900',       label: 'Slight Edge',   icon: <Shield className="w-4 h-4 inline" /> },
    'favored':       { bar: 'bg-gold-600 text-ink-900',       badge: 'bg-gold-700 text-parchment-100', label: 'Favored',       icon: <ShieldAlert className="w-4 h-4 inline" /> },
    'one-sided':     { bar: 'bg-oxblood-600 text-parchment-100', badge: 'bg-oxblood-500 text-parchment-100', label: 'One-Sided', icon: <ShieldAlert className="w-4 h-4 inline" /> },
  };
  const fs = fairnessStyles[fairness];

  const TeamColumn = ({
    team,
    label,
    teamKey,
  }: {
    team: CBTPlayer[];
    label: string;
    teamKey: 'team1' | 'team2';
  }) => {
    const strengthSum   = computeTeamScore(team, balanceMode, 'strength-sum');
    const strengthAdv   = computeTeamScore(team, balanceMode, 'strength-std-max');
    return (
      <div className="card p-4 flex flex-col">
        <h3 className="text-lg font-bold mb-4 text-center text-parchment-100 border-b border-gold-700/40 pb-2">{label}</h3>
        <ul className="space-y-2 flex-1">
          {team.map(player => {
            const elo      = getBalanceElo(player, balanceMode);
            const strength = Math.pow(10, elo / STRENGTH_COEFFICIENT);
            return (
              <li
                key={player.profile_id}
                onClick={() => movePlayer(player, teamKey)}
                title="Click to move to the other team"
                className="flex items-center justify-between px-3 py-2 rounded bg-leather-800 hover:bg-gold-700/40 cursor-pointer transition-colors border border-gold-700/30"
              >
                <span className="font-medium text-sm flex items-center gap-2">
                  {player.isAI && <Bot className="w-4 h-4 text-steel-400" />}
                  <span>{player.name}</span>
                </span>
                {!player.isAI && (
                  <span className="flex items-center gap-2 ml-3 shrink-0">
                    <span className="text-sm text-gold-300">{elo}</span>
                    <span className="text-xs text-steel-400">({strength.toFixed(2)})</span>
                  </span>
                )}
              </li>
            );
          })}
          {team.length === 0 && (
            <li className="text-steel-500 text-sm text-center py-4">— empty —</li>
          )}
        </ul>
        <div className="mt-4 border-t border-gold-700/40 pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-steel-400">Total ELO</span>
            <span className="font-bold">{teamElo(team, balanceMode)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-steel-400">Strength sum</span>
            <span className="font-bold">{strengthSum.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-steel-400">Strength+Std/Max</span>
            <span className="font-bold">{strengthAdv.toFixed(3)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Status bar */}
      <div className={`px-4 py-3 rounded-lg text-sm font-semibold ${fs.bar}`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 ${fs.badge}`}>
            {fs.icon} {fs.label}
          </span>
          {teams.usedAI && <span className="text-gold-300 text-xs flex items-center gap-1"><Bot className="w-4 h-4" /> AI included</span>}
          <span className="text-xs font-normal opacity-70 ml-auto">Click player to swap teams</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs font-normal opacity-90">
          <span>ELO diff: <strong>{eloDiff}</strong></span>
          <span>Strength win%: <strong>T1 {(pStrSum1 * 100).toFixed(1)}% · T2 {((1 - pStrSum1) * 100).toFixed(1)}%</strong></span>
          <span>Str+Std/Max win%: <strong>T1 {(pStrAdv1 * 100).toFixed(1)}% · T2 {((1 - pStrAdv1) * 100).toFixed(1)}%</strong></span>
        </div>
      </div>

      {/* Algorithm switcher */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-steel-400 mr-1">Method:</span>
        {BALANCE_ALGORITHMS.map(algo => (
          <button
            key={algo.key}
            onClick={() => handleSwitchAlgorithm(algo.key)}
            title={algo.description}
            className={`${algorithm === algo.key ? 'tab-active' : 'tab-idle'}`}
          >
            {algo.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TeamColumn team={teams.team1} label="Team 1" teamKey="team1" />
        <TeamColumn team={teams.team2} label="Team 2" teamKey="team2" />
      </div>

      <div className="flex gap-3 justify-end">
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-leather-700 hover:bg-leather-600 text-parchment-100 rounded-lg font-semibold transition-colors"
        >
          ← Edit Roster
        </button>
        <button
          onClick={() => handleCreate(algorithm)}
          className="px-6 py-2 bg-navy-500 hover:bg-navy-400 text-parchment-100 rounded-lg font-semibold transition-colors"
        >
          Recreate Teams
        </button>
      </div>
    </div>
  );
}

