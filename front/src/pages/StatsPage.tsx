import { useEffect, useMemo, useState } from 'react';
import { Trophy, Swords, Users2, Flame, Clock, Hourglass, Crown, BarChart2, CalendarRange } from 'lucide-react';
import DateRangeSlider from '../components/DateRangeSlider';
import AlliesTable from '../components/AlliesTable';
import OpponentsTable from '../components/OpponentsTable';
import CivCharts from '../components/CivCharts';
import TeamPerformance from '../components/TeamPerformance';
import GameDurationChart from '../components/GameDurationChart';
import MapBarChart from '../components/MapBarChart';
import RatingProgressionChart from '../components/RatingProgressionChart';
import PlayTimeSection from '../components/PlayTimeSection';
import { Game } from '../services/aoe4worldTypes.request';
import { DurationDistribution } from '../services/aoe4worldTypes.analysis';
import { buildGameStats } from '../services/aoe4worldAnalysis';

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

const DAY_MS = 86_400_000;

// Local start-of-day for a timestamp
function startOfDay(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export default function StatsPage({ stats, games, profileId, nickname }: Props) {
  // Date-range filter: day-granularity domain over the games' started_at span
  const domain = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const g of games) {
      const t = new Date(g.started_at).getTime();
      if (isNaN(t)) continue;
      if (t < min) min = t;
      if (t > max) max = t;
    }
    if (!isFinite(min)) return null;
    const start = startOfDay(min);
    return { start, totalSteps: Math.round((startOfDay(max) - start) / DAY_MS) + 1 };
  }, [games]);

  // Selected [start, end] day indices; null = full range (no filtering)
  const [range, setRange] = useState<[number, number] | null>(null);
  useEffect(() => setRange(null), [games]);

  const filteredGames = useMemo(() => {
    if (!range || !domain) return games;
    const lo = domain.start + range[0] * DAY_MS;
    const hi = domain.start + (range[1] + 1) * DAY_MS; // end day inclusive
    return games.filter((g) => {
      const t = new Date(g.started_at).getTime();
      return t >= lo && t < hi;
    });
  }, [games, range, domain]);

  // Reuse the precomputed stats when unfiltered so that path is unchanged
  const filteredStats = useMemo(
    () => (range ? buildGameStats(filteredGames, profileId) : stats),
    [range, filteredGames, profileId, stats]
  );

  const dayLabel = (idx: number) =>
    new Date((domain?.start ?? 0) + idx * DAY_MS).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  // Anchor the games-per-month chart on the selected range instead of today
  const playTimeWindow = useMemo(() => {
    if (!range || !domain) return undefined;
    const startDate = new Date(domain.start + range[0] * DAY_MS);
    const endDate = new Date(domain.start + range[1] * DAY_MS);
    const spanned =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth()) +
      1;
    return {
      anchor: new Date(domain.start + (range[1] + 1) * DAY_MS - 1),
      months: Math.min(18, Math.max(1, spanned)),
    };
  }, [range, domain]);

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
      {/* Date-range filter */}
      {domain && domain.totalSteps > 1 && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700/40">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-blue-400" /> Date Range
          </h3>
          <DateRangeSlider
            totalSteps={domain.totalSteps}
            value={range ?? [0, domain.totalSteps - 1]}
            onChange={(v) => setRange(v[0] === 0 && v[1] === domain.totalSteps - 1 ? null : v)}
            formatLabel={dayLabel}
            onReset={() => setRange(null)}
            isFiltered={range !== null}
            summary={`${filteredGames.length} of ${games.length} games`}
          />
        </div>
      )}

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
                <p className="text-xl font-semibold">{filteredStats.wins}W - {filteredStats.losses}L</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Users2 className="w-6 h-6 text-green-400" />
              <div>
                <p className="text-gray-400">Total Games</p>
                <p className="text-xl font-semibold">{filteredStats.totalGames}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Flame className="w-6 h-6 text-purple-400" />
              <div>
                <p className="text-gray-400">Current Win Streak</p>
                <p className="text-xl font-semibold">{filteredStats.currentStreak}</p>
              </div>
            </div>
            {/* Max Win Streak */}
            <div className="flex items-center space-x-3">
              <Trophy className="w-6 h-6 text-green-400" />
              <div>
                <p className="text-gray-400">Max Win Streak</p>
                <p className="text-xl font-semibold">{filteredStats.maxWinStreak ?? filteredStats.longestWinStreak}</p>
              </div>
            </div>
            {/* Favourite Civ */}
            {(() => {
              // Get favorite civ (most games played)
              const civEntries = Object.entries(filteredStats.civStats || {});
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
                <p className="text-xl font-semibold">{filteredStats.winRate}%</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <BarChart2 className="w-6 h-6 text-pink-400" />
              <div>
                <p className="text-gray-400">Win Rate (Last 10)</p>
                <p className="text-xl font-semibold">{filteredStats.winRateLast10Games}%</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <BarChart2 className="w-6 h-6 text-indigo-400" />
              <div>
                <p className="text-gray-400">Win Rate (Last 50)</p>
                <p className="text-xl font-semibold">{filteredStats.winRateLast50Games}%</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Clock className="w-6 h-6 text-yellow-400" />
              <div>
                <p className="text-gray-400">Avg. Game Length</p>
                <p className="text-xl font-semibold">{filteredStats.averageGameLength}</p>
              </div>
            </div>
            {/* Longest Game */}
            {filteredStats.longestGame !== undefined && (
              <div className="flex items-center space-x-3">
                <Hourglass className="w-6 h-6 text-red-400" />
                <div>
                  <p className="text-gray-400">Longest Game</p>
                  <p className="text-xl font-semibold">
                    {(() => {
                      const sec = filteredStats.longestGame ?? 0;
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
          stats={filteredStats}
          tableSort={tableSort}
          setTableSort={setTableSort}
          getSorted={getSorted}
          games={filteredGames}
          profileId={profileId}
        />
        <OpponentsTable
          stats={filteredStats}
          tableSort={tableSort}
          setTableSort={setTableSort}
          getSorted={getSorted}
          games={filteredGames}
          profileId={profileId}
        />
      </div>

      {/* Rating Progression */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700/40">
        <h3 className="text-xl font-semibold mb-2">Rating Progression</h3>
        <RatingProgressionChart games={filteredGames} profileId={profileId} />
      </div>



      {/* Civilization Performance */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700/40">
        <h3 className="text-xl font-semibold mb-4">Civilization Performance</h3>
        <CivCharts stats={filteredStats} games={filteredGames} profileId={profileId} />
      </div>

      {/* Team Performance */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700/40">
        <h3 className="text-xl font-semibold mb-4">Team Performance</h3>
        <TeamPerformance games={filteredGames} profileId={profileId} />
      </div>

      {/* Game Duration Distribution Section */}
      {filteredStats.durationDistribution && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700/40">
          <h3 className="text-xl font-semibold mb-2">Game Duration Distribution</h3>
          <GameDurationChart distribution={{
            veryShort: filteredStats.durationDistribution.veryShort ?? 0,
            short: filteredStats.durationDistribution.short ?? 0,
            medium: filteredStats.durationDistribution.medium ?? 0,
            long: filteredStats.durationDistribution.long ?? 0,
            veryLong: filteredStats.durationDistribution.veryLong ?? 0,
          }} />
        </div>
      )}

      {/* When Do You Play */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700/40">
        <h3 className="text-xl font-semibold mb-4">When Do You Play</h3>
        <PlayTimeSection
          games={filteredGames}
          anchor={playTimeWindow?.anchor}
          months={playTimeWindow?.months}
        />
      </div>

      {/* Top Maps Section */}
      {filteredStats.mapStats && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700/40">
          <h3 className="text-xl font-semibold mb-2">Top Maps</h3>
          <MapBarChart mapStats={filteredStats.mapStats} />
        </div>
      )}
    </div>
  );
}
