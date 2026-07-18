import { useState } from 'react';
import { Trophy, Swords, Users2, Flame, Clock, Hourglass, Crown, BarChart2 } from 'lucide-react';
import AlliesTable from '../components/AlliesTable';
import OpponentsTable from '../components/OpponentsTable';
import CivCharts from '../components/CivCharts';
import GameDurationChart from '../components/GameDurationChart';
import MapBarChart from '../components/MapBarChart';
import RatingProgressionChart from '../components/RatingProgressionChart';
import { Game } from '../services/aoe4worldTypes.request';
import { DurationDistribution } from '../services/aoe4worldTypes.analysis';

export interface CivStats {
  [civ: string]: {
    total: number;
    wins: number;
    losses: number;
  };
}

export interface AllyOpponent {
  Name: string;
  profile_id?: number;
  Stat: {
    games: number;
    wins: number;
    losses: number;
  };
}

export interface GameStats {
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  averageGameLength?: string;
  civStats: CivStats;
  allies: AllyOpponent[];
  opponents: AllyOpponent[];
  currentStreak: number;
  maxWinStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
  winRateLast10Games: number;
  winRateLast50Games: number;
  durationDistribution?: DurationDistribution;
  mapStats?: {
    [map: string]: {
      games: number;
      wins: number;
      losses: number;
    };
  };
  longestGame?: number;
}

interface Props {
  stats: GameStats;
  games: Game[];
  profileId: number;
  nickname: string;
}

export default function StatsPage({ stats, games, profileId, nickname }: Props) {
  // Sorting state for the allies/opponents tables
  const [tableSort, setTableSort] = useState<{
    table: 'allies' | 'opponents';
    column: 'name' | 'games' | 'wins' | 'losses' | 'winrate';
    direction: 'asc' | 'desc';
  }>({ table: 'allies', column: 'games', direction: 'desc' });

  // Helper for sorting
  function getSorted(list: AllyOpponent[], column: string, direction: string) {
    const sorted = [...list].sort((a, b) => {
      let aVal, bVal;
      switch (column) {
        case 'name':
          aVal = a.Name.toLowerCase();
          bVal = b.Name.toLowerCase();
          if (aVal < bVal) return direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return direction === 'asc' ? 1 : -1;
          return 0;
        case 'games':
          aVal = a.Stat.games;
          bVal = b.Stat.games;
          break;
        case 'wins':
          aVal = a.Stat.wins;
          bVal = b.Stat.wins;
          break;
        case 'losses':
          aVal = a.Stat.losses;
          bVal = b.Stat.losses;
          break;
        case 'winrate':
          aVal = a.Stat.games > 0 ? a.Stat.wins / a.Stat.games : 0;
          bVal = b.Stat.games > 0 ? b.Stat.wins / b.Stat.games : 0;
          break;
        default:
          aVal = 0; bVal = 0;
      }
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  return (
    <div className="space-y-8">
      {/* General stats first */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700/40">
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" /> Player Statistics - {nickname}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-3">
              <Swords className="w-6 h-6 text-blue-400" />
              <div>
                <p className="text-gray-400">Win/Loss</p>
                <p className="text-xl font-semibold">{stats.wins}W - {stats.losses}L</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Users2 className="w-6 h-6 text-green-400" />
              <div>
                <p className="text-gray-400">Total Games</p>
                <p className="text-xl font-semibold">{stats.totalGames}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Flame className="w-6 h-6 text-purple-400" />
              <div>
                <p className="text-gray-400">Current Win Streak</p>
                <p className="text-xl font-semibold">{stats.currentStreak}</p>
              </div>
            </div>
            {/* Max Win Streak */}
            <div className="flex items-center space-x-3">
              <Trophy className="w-6 h-6 text-green-400" />
              <div>
                <p className="text-gray-400">Max Win Streak</p>
                <p className="text-xl font-semibold">{stats.maxWinStreak ?? stats.longestWinStreak}</p>
              </div>
            </div>
            {/* Favourite Civ */}
            {(() => {
              // Get favorite civ (most games played)
              const civEntries = Object.entries(stats.civStats || {});
              if (civEntries.length === 0) return null;
              const [favCiv, favStats] = civEntries.reduce(
                (max, curr) => curr[1].total > max[1].total ? curr : max,
                civEntries[0]
              );
              return (
                <div className="flex items-center space-x-3">
                  <Crown className="w-6 h-6 text-orange-400" />
                  <div>
                    <p className="text-gray-400">Favourite Civ</p>
                    <p className="text-xl font-semibold">{favCiv} <span className="text-gray-400 text-base">({favStats.total} games)</span></p>
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-3">
              <BarChart2 className="w-6 h-6 text-yellow-400" />
              <div>
                <p className="text-gray-400">Win Rate</p>
                <p className="text-xl font-semibold">{stats.winRate}%</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <BarChart2 className="w-6 h-6 text-pink-400" />
              <div>
                <p className="text-gray-400">Win Rate (Last 10)</p>
                <p className="text-xl font-semibold">{stats.winRateLast10Games}%</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <BarChart2 className="w-6 h-6 text-indigo-400" />
              <div>
                <p className="text-gray-400">Win Rate (Last 50)</p>
                <p className="text-xl font-semibold">{stats.winRateLast50Games}%</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Clock className="w-6 h-6 text-yellow-400" />
              <div>
                <p className="text-gray-400">Avg. Game Length</p>
                <p className="text-xl font-semibold">{stats.averageGameLength}</p>
              </div>
            </div>
            {/* Longest Game */}
            {stats.longestGame !== undefined && (
              <div className="flex items-center space-x-3">
                <Hourglass className="w-6 h-6 text-red-400" />
                <div>
                  <p className="text-gray-400">Longest Game</p>
                  <p className="text-xl font-semibold">
                    {(() => {
                      const sec = stats.longestGame ?? 0;
                      const min = Math.floor(sec / 60);
                      const s = sec % 60;
                      return `${min}:${s.toString().padStart(2, '0')}`;
                    })()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top teammates and enemies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <AlliesTable
          stats={stats}
          tableSort={tableSort}
          setTableSort={setTableSort}
          getSorted={getSorted}
          games={games}
          profileId={profileId}
        />
        <OpponentsTable
          stats={stats}
          tableSort={tableSort}
          setTableSort={setTableSort}
          getSorted={getSorted}
          games={games}
          profileId={profileId}
        />
      </div>

      {/* Rating Progression */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700/40">
        <h3 className="text-xl font-semibold mb-2">Rating Progression</h3>
        <RatingProgressionChart games={games} profileId={profileId} />
      </div>

      {/* Civilization Performance */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700/40">
        <h3 className="text-xl font-semibold mb-4">Civilization Performance</h3>
        <CivCharts stats={stats} />
      </div>

      {/* Game Duration Distribution Section */}
      {stats.durationDistribution && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700/40">
          <h3 className="text-xl font-semibold mb-2">Game Duration Distribution</h3>
          <GameDurationChart distribution={{
            veryShort: stats.durationDistribution.veryShort ?? 0,
            short: stats.durationDistribution.short ?? 0,
            medium: stats.durationDistribution.medium ?? 0,
            long: stats.durationDistribution.long ?? 0,
            veryLong: stats.durationDistribution.veryLong ?? 0,
          }} />
        </div>
      )}

      {/* Top Maps Section */}
      {stats.mapStats && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700/40">
          <h3 className="text-xl font-semibold mb-2">Top Maps</h3>
          <MapBarChart mapStats={stats.mapStats} />
        </div>
      )}
    </div>
  );
}
