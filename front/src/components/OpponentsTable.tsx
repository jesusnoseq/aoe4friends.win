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

interface OpponentsTableProps {
  stats: GameStats | null;
  tableSort: {
    table: 'allies' | 'opponents';
    column: string;
    direction: 'asc' | 'desc';
  };
  setTableSort: React.Dispatch<React.SetStateAction<any>>;
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
      .sort((a, b) => b.Stat.games - a.Stat.games);
  }, [matchTypeFilter, stats, games, profileId]);
  if (!filteredOpponents || filteredOpponents.length === 0) return null;
  const list = filteredOpponents;
  const sortedList =
    tableSort.table === 'opponents'
      ? getSorted(list, tableSort.column, tableSort.direction)
      : [...list].sort((a, b) => b.Stat.games - a.Stat.games);
  return (
    <div className="bg-gray-700 rounded-lg p-4 shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Top 20 Enemies</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setMatchTypeFilter('all')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              matchTypeFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setMatchTypeFilter('quickmatch')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              matchTypeFilter === 'quickmatch'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            Quick Match
          </button>
          <button
            onClick={() => setMatchTypeFilter('rankedmatch')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              matchTypeFilter === 'rankedmatch'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            Ranked Match
          </button>
        </div>
      </div>
      <table className="w-full text-left text-sm border-separate border-spacing-y-1 table-fixed">
        <thead>
          <tr className="bg-gray-800">
            <th className="py-2 px-3 rounded-l-lg w-10">#</th>
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
                className={`hover:bg-gray-600 transition ${idx % 2 === 0 ? 'bg-gray-700' : 'bg-gray-800'}`}
              >
                <td className="py-2 px-3 font-bold text-blue-300">{idx + 1}</td>
                <td className="py-2 px-3 truncate">{op.Name}</td>
                <td className="py-2 px-3">{op.Stat.games}</td>
                {/* Show your wins (opponent's losses) */}
                <td className="py-2 px-3 text-green-400">{op.Stat.losses}</td>
                {/* Show your losses (opponent's wins) */}
                <td className="py-2 px-3 text-red-400">{op.Stat.wins}</td>
                <td className="py-2 px-3 font-semibold">
                  {/* Win rate: your wins / total games */}
                  {op.Stat.games > 0 ? Math.round((op.Stat.losses / op.Stat.games) * 100) : 0}%
                </td>
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OpponentsTable;
