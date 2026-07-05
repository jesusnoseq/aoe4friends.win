import React, { useState, useEffect } from 'react';
import { X, Users, Trophy } from 'lucide-react';
import { fetchPlayerProfileForCBT, searchPlayersForCBT } from '../services/aoe4worldRequests';
import { type RatingMode, type BalanceMode, type CBTPlayer, type TeamsState, type BalanceAlgorithm, teamElo, createTeams, isTeamBalanced, getBalanceElo, BALANCE_ALGORITHMS } from '../services/balancedTeamsLogic';
import Spinner from './Spinner';
import TeamsDisplay from './TeamsDisplay';

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
  const [balanceMode, setBalanceMode] = useState<BalanceMode>('rm_1v1');
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
      : <span className="text-gray-500 text-xs">N/A</span>;
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
          <div className="bg-gray-800 rounded-lg p-4 shadow-xl border border-gray-700/40">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" /> Add Players
            </h3>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search player by name..."
              className="w-full px-3 py-2 bg-gray-700 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            />
            {showSearch && searchLoading && (
              <p className="text-gray-400 text-sm px-1 mb-2">Searching...</p>
            )}
            {showSearch && !searchLoading && searchResults.length === 0 && (
              <p className="text-gray-400 text-sm px-1 mb-2">No players found.</p>
            )}
            {!showSearch && allies.length > 0 && (
              <p className="text-gray-500 text-xs px-1 mb-2">Top teammates - click + to add</p>
            )}
            <ul className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {leftList.map((item, i) => {
                const pid = item.profile_id;
                const alreadyIn = pid !== undefined && rosterIds.has(pid);
                const isLoading = pid !== undefined && loadingIds.has(pid);
                const disabled = alreadyIn || maxReached || isLoading || pid === undefined;
                return (
                  <li key={pid ?? `search-${i}`} className="flex items-center justify-between px-3 py-2 rounded hover:bg-gray-700">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-sm truncate block">{item.name}</span>
                      <span className="text-xs text-gray-400">{item.subtitle}</span>
                    </div>
                    <button
                      onClick={() => pid !== undefined && addPlayer(pid, item.name)}
                      disabled={disabled}
                      title={alreadyIn ? 'Already in roster' : maxReached ? 'Roster full (8/8)' : 'Add to roster'}
                      className={`ml-3 w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full text-sm font-bold transition-colors ${
                        alreadyIn
                          ? 'bg-gray-600 text-green-400 cursor-default'
                          : isLoading
                            ? 'bg-gray-600 text-gray-400 cursor-wait'
                            : disabled
                              ? 'bg-gray-700 text-gray-600 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                      }`}
                    >
                      {isLoading ? (
                        <Spinner size={12} className="text-gray-400" />
                      ) : alreadyIn ? '✓' : '+'}
                    </button>
                  </li>
                );
              })}
              {!showSearch && allies.length === 0 && (
                <li className="text-gray-500 text-sm px-3 py-4 text-center">
                  Load a player in the Stats tab to see their teammates here, or search above.
                </li>
              )}
            </ul>
          </div>

          {/* Right: Roster */}
          <div className="bg-gray-800 rounded-lg p-4 shadow-xl border border-gray-700/40 flex flex-col">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" /> Match Roster
              <span className={`ml-auto text-sm font-normal ${maxReached ? 'text-red-400' : 'text-gray-400'}`}>
                {roster.length}/8
              </span>
            </h3>
            {roster.length === 0 ? (
              <p className="text-gray-500 text-sm flex-1 py-4 text-center">
                No players added yet. Use the panel on the left.
              </p>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700 text-xs bg-gray-700/40">
                      <th className="text-left py-2 pr-3 text-gray-300">Name</th>
                      <th className="text-center py-2 px-1 text-gray-300">#</th>
                      {RATING_MODES.map(m => (
                        <th
                          key={m.key}
                          onClick={() => setBalanceMode(m.key)}
                          title={`Balance by ${m.label}`}
                          className={`text-center py-2 px-1 cursor-pointer select-none rounded transition-colors whitespace-nowrap hover:text-white ${
                            balanceMode === m.key
                              ? 'text-blue-400 font-bold'
                              : 'text-gray-400'
                          }`}
                        >
                          {m.label}
                        </th>
                      ))}
                      <th
                        onClick={() => setBalanceMode('max')}
                        title="Balance by highest ELO"
                        className={`text-center py-2 px-1 cursor-pointer select-none rounded transition-colors whitespace-nowrap hover:text-white ${
                          balanceMode === 'max'
                            ? 'text-blue-400 font-bold'
                            : 'text-gray-400'
                        }`}
                      >
                        Max
                      </th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map(player => (
                      <tr key={player.profile_id} className="border-b border-gray-700 hover:bg-gray-700">
                        <td className="py-2 pr-3 font-medium">{player.name}</td>
                        <td className="text-center px-1 text-gray-400 text-xs">{player.profile_id}</td>
                        {RATING_MODES.map(m => (
                          <td
                            key={m.key}
                            className={`text-center px-1 ${balanceMode === m.key ? 'text-blue-300 font-semibold' : ''}`}
                          >
                            {ratingCell(player.ratings[m.key])}
                          </td>
                        ))}
                        <td
                          className={`text-center px-1 ${balanceMode === 'max' ? 'text-blue-300 font-semibold' : ''}`}
                        >
                          {ratingCell(getBalanceElo(player, 'max') || undefined)}
                        </td>
                        <td className="text-center pl-2">
                          <button
                            onClick={() => removePlayer(player.profile_id)}
                            className="text-gray-500 hover:text-red-400 transition-colors"
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
            <p className="mt-3 text-xs text-gray-500">
              Click a column header to set the ELO used for balancing.{' '}
              <span className="text-blue-400">
                Active: {balanceMode === 'max' ? 'Max' : RATING_MODES.find(m => m.key === balanceMode)?.label}
              </span>
            </p>
            <button
              onClick={handleCreate}
              disabled={roster.length < 2}
              className="mt-4 w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed py-2 rounded-lg font-semibold transition-colors"
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

  return (
    <div className="w-full space-y-4">
      <TeamsDisplay
        team1={teams.team1}
        team2={teams.team2}
        mode={balanceMode}
        algorithm={algorithm}
        usedAI={teams.usedAI}
        onMovePlayer={movePlayer}
      >
        {/* Algorithm switcher */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-400 mr-1">Method:</span>
          {BALANCE_ALGORITHMS.map(algo => (
            <button
              key={algo.key}
              onClick={() => handleSwitchAlgorithm(algo.key)}
              title={algo.description}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                algorithm === algo.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {algo.label}
            </button>
          ))}
        </div>
      </TeamsDisplay>

      <div className="flex gap-3 justify-end">
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold transition-colors"
        >
          ← Edit Roster
        </button>
        <button
          onClick={() => handleCreate(algorithm)}
          className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-semibold transition-colors"
        >
          Recreate Teams
        </button>
      </div>
    </div>
  );
}

