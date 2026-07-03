import React, { useState, useMemo } from 'react';
import SortableTh from './SortableTh';
import { Game } from '../services/aoe4worldTypes.request';

interface AllyOpponent {
  Name: string;
  Stat: {
    games: number;
    wins: number;
    losses: number;
  };
}

interface GameStats {
  opponents: AllyOpponent[];
}

interface TableSortState {
  table: 'allies' | 'opponents';
  column: 'name' | 'games' | 'wins' | 'losses' | 'winrate';
  direction: 'asc' | 'desc';
}

interface OpponentsTableProps {
  stats: GameStats | null;
  tableSort: TableSortState;
  setTableSort: React.Dispatch<React.SetStateAction<TableSortState>>;
  getSorted: (list: AllyOpponent[], column: string, direction: string) => AllyOpponent[];
  games?: Game[];
  profileId?: number;
}

type MatchTypeFilter = 'all' | 'quickmatch' | 'rankedmatch';

const OpponentsTable: React.FC<OpponentsTableProps> = ({ stats, tableSort, setTableSort, getSorted, games = [], profileId }) => {
  const [matchTypeFilter, setMatchTypeFilter] = useState<MatchTypeFilter>('all');

  // Filter opponents based on match type
  const filteredOpponents = useMemo(() => {
    if (matchTypeFilter === 'all' || !games || games.length === 0 || !profileId) {
      return stats?.opponents || [];
    }

    const isQuickMatch = matchTypeFilter === 'quickmatch';
    const opponents: { [profile_id: number]: { games: number; wins: number; losses: number; name: string } } = {};

    for (const game of games) {
      const leaderboardStr = String(game.leaderboard || game.kind);
      
      // Filter by match type
      if (isQuickMatch && !leaderboardStr.startsWith('qm_')) continue;
      if (!isQuickMatch && !leaderboardStr.startsWith('rm_')) continue;

      let playerInfo = null;
      let playerTeamIndex = -1;
      
      // Find the player in the game
      for (let tIdx = 0; tIdx < game.teams.length; tIdx++) {
        for (const member of game.teams[tIdx]) {
          if (member.player.profile_id === profileId) {
            playerInfo = member.player;
            playerTeamIndex = tIdx;
            break;
          }
        }
        if (playerInfo) break;
      }
      
      if (!playerInfo) continue;
      
      const playerWon = playerInfo.result === 'win';
      
      // Process opponents
      for (let tIdx = 0; tIdx < game.teams.length; tIdx++) {
        if (tIdx === playerTeamIndex) continue; // Skip allies
        
        for (const member of game.teams[tIdx]) {
          const opponent = member.player;
          const pid = opponent.profile_id;
          const name = opponent.name;
          
          if (!opponents[pid]) {
            opponents[pid] = { games: 0, wins: 0, losses: 0, name };
          }
          opponents[pid].games++;
          if (playerWon) opponents[pid].losses++; else opponents[pid].wins++;
        }
      }
    }

    return Object.values(opponents)
      .map(stat => ({ Name: stat.name, Stat: { games: stat.games, wins: stat.wins, losses: stat.losses } }))
      .sort((a, b) => b.Stat.games - a.Stat.games)
      .slice(0, 20);
  }, [matchTypeFilter, stats, games, profileId]);
  const list = filteredOpponents || [];
  const sortedList =
    tableSort.table === 'opponents'
      ? getSorted(list, tableSort.column, tableSort.direction)
      : [...list].sort((a, b) => b.Stat.games - a.Stat.games);
  return (
    <div className="card p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-parchment-100">Top 20 Enemies</h3>
        <div className="flex gap-2">
          {(['all', 'quickmatch', 'rankedmatch'] as MatchTypeFilter[]).map((key) => (
            <button
              key={key}
              onClick={() => setMatchTypeFilter(key)}
              className={`${matchTypeFilter === key ? 'tab-active' : 'tab-idle'}`}
            >
              {key === 'all' ? 'All' : key === 'quickmatch' ? 'Quick Match' : 'Ranked Match'}
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 ? (
        <p className="text-steel-400">No opponent data available.</p>
      ) : (
        <table className="w-full text-left text-sm border-separate border-spacing-y-1 table-fixed">
          <thead>
            <tr className="bg-leather-700/60">
              <th className="py-2 px-3 rounded-l-md w-10 text-parchment-200">#</th>
              <SortableTh label="Name" column="name" table="opponents" tableSort={tableSort} setTableSort={setTableSort} className="w-2/5" />
              <SortableTh label="Games" column="games" table="opponents" tableSort={tableSort} setTableSort={setTableSort} className="w-16" />
              <SortableTh label="Your Wins" column="wins" table="opponents" tableSort={tableSort} setTableSort={setTableSort} className="w-16" />
              <SortableTh label="Your Losses" column="losses" table="opponents" tableSort={tableSort} setTableSort={setTableSort} className="w-16" />
              <SortableTh label="Win Rate" column="winrate" table="opponents" tableSort={tableSort} setTableSort={setTableSort} className="w-16" />
            </tr>
          </thead>
          <tbody>
            {sortedList
              .slice(0, 20)
              .map((op, idx) => (
                <tr
                  key={op.Name}
                  className={`hover:bg-leather-700 transition ${idx % 2 === 0 ? 'bg-ink-700/40' : 'bg-leather-800/40'}`}
                >
                  <td className="py-2 px-3 font-bold text-gold-300">{idx + 1}</td>
                  <td className="py-2 px-3 truncate">{op.Name}</td>
                  <td className="py-2 px-3">{op.Stat.games}</td>
                  <td className="py-2 px-3 text-moss-400">{op.Stat.losses}</td>
                  <td className="py-2 px-3 text-oxblood-400">{op.Stat.wins}</td>
                  <td className="py-2 px-3 font-semibold">
                    {op.Stat.games > 0 ? Math.round((op.Stat.losses / op.Stat.games) * 100) : 0}%
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OpponentsTable;
