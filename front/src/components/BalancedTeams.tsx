import React, { useState, useEffect } from 'react';
import { X, Users, Trophy } from 'lucide-react';
import { fetchPlayerProfileForCBT, searchPlayersForCBT } from '../services/aoe4worldRequests';
import { type RatingMode, type CBTPlayer, type TeamsState, getBalanceElo, teamElo, createTeams } from '../services/balancedTeamsLogic';

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

  function handleCreate() {
    setTeams(createTeams(roster, balanceMode));
  }

  function handleReset() {
    setTeams(null);
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
    setTeams({ ...next, diff, balanced: diff <= 50 });
  }

  function ratingCell(r: number | undefined): React.ReactNode {
    return r !== undefined
      ? <span>{r}</span>
      : <span className="text-gray-500 text-xs">N/A</span>;
  }

  const showSearch = searchQuery.trim().length > 0;
  const leftList = showSearch
    ? searchResults.map(r => ({ profile_id: r.profile_id, name: r.name, subtitle: r.rating ? `Rating: ${r.rating}` : `#${r.profile_id}` }))
    : allies.map(a => ({ profile_id: a.profile_id, name: a.Name, subtitle: `${a.Stat.games} games` }));

  // ── Roster phase ─────────────────────────────────────────────────────────
  if (!teams) {
    return (
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">

          {/* Left: Player selection */}
          <div className="bg-gray-800 rounded-lg p-4">
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
                        <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
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
          <div className="bg-gray-800 rounded-lg p-4 flex flex-col">
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
                    <tr className="text-gray-400 border-b border-gray-700 text-xs">
                      <th className="text-left py-2 pr-3">Name</th>
                      <th className="text-center py-2 px-1">#</th>
                      {RATING_MODES.map(m => (
                        <th
                          key={m.key}
                          onClick={() => setBalanceMode(m.key)}
                          title={`Balance by ${m.label}`}
                          className={`text-center py-2 px-1 cursor-pointer select-none rounded transition-colors whitespace-nowrap ${
                            balanceMode === m.key
                              ? 'text-blue-400 font-bold underline'
                              : 'hover:text-white'
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
                Active: {RATING_MODES.find(m => m.key === balanceMode)?.label}
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

  // ── Teams phase ───────────────────────────────────────────────────────────
  const diff = Math.abs(teamElo(teams.team1, balanceMode) - teamElo(teams.team2, balanceMode));
  const isFair = diff <= 50;

  const TeamColumn = ({
    team,
    label,
    teamKey,
  }: {
    team: CBTPlayer[];
    label: string;
    teamKey: 'team1' | 'team2';
  }) => (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col">
      <h3 className="text-lg font-bold mb-4 text-center">{label}</h3>
      <ul className="space-y-2 flex-1">
        {team.map(player => (
          <li
            key={player.profile_id}
            onClick={() => movePlayer(player, teamKey)}
            title="Click to move to the other team"
            className="flex items-center justify-between px-3 py-2 rounded bg-gray-700 hover:bg-blue-900 cursor-pointer transition-colors"
          >
            <span className="font-medium text-sm flex items-center gap-2">
              {player.isAI && <span title={player.aiDifficulty}>🤖</span>}
              <span>{player.name}</span>
            </span>
             {!player.isAI && <span className="text-sm text-blue-300 ml-3">{getBalanceElo(player, balanceMode)}</span>}
          </li>
        ))}
        {team.length === 0 && (
          <li className="text-gray-500 text-sm text-center py-4">— empty —</li>
        )}
      </ul>
      <div className="mt-4 border-t border-gray-700 pt-3 flex justify-between text-sm">
        <span className="text-gray-400">Total ELO</span>
        <span className="font-bold">{teamElo(team, balanceMode)}</span>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-4">
      {/* Status bar */}
      <div
        className={`flex flex-wrap items-center gap-4 px-4 py-3 rounded-lg text-sm font-semibold ${
          isFair ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
        }`}
      >
        <span>ELO Diff: {diff}</span>
        <span>{isFair ? '✅ Fair' : '⚠️ Unfair'}</span>
        {teams.usedAI && <span className="text-orange-400">🤖 AI player included</span>}
        <span className="text-gray-400 font-normal ml-auto text-xs">
          Click any player to move them to the other team
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TeamColumn team={teams.team1} label="Team 1" teamKey="team1" />
        <TeamColumn team={teams.team2} label="Team 2" teamKey="team2" />
      </div>

      <div className="flex gap-3 justify-end">
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold transition-colors"
        >
          ← Edit Roster
        </button>
        <button
          onClick={handleCreate}
          className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-semibold transition-colors"
        >
          Recreate Teams
        </button>
      </div>
    </div>
  );
}

