import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Game } from '../services/aoe4worldTypes.request';
import { LEADERBOARD_LABELS, LEADERBOARD_GROUPS } from '../services/aoe4worldAnalysis';

interface CivStats {
  [civ: string]: {
    total: number;
    wins: number;
    losses: number;
  };
}

interface GameStats {
  civStats: CivStats;
}

const CivCharts: React.FC<{ stats: GameStats | null; games?: Game[]; profileId?: number }> = ({
  stats,
  games = [],
  profileId,
}) => {
  const [modeFilter, setModeFilter] = useState<string>('all');

  // Game-mode labels the player actually has games for, in the same
  // Ranked → Quick Match → Empire Wars/FFA order used by the rating chart.
  const availableModes = useMemo<string[]>(() => {
    const present = new Set<string>();
    for (const game of games) {
      const label = LEADERBOARD_LABELS[String(game.leaderboard || game.kind)];
      if (label) present.add(label);
    }
    const ordered = LEADERBOARD_GROUPS.flatMap((g) => g.labels).filter((label) => present.has(label));
    return ['all', ...ordered];
  }, [games]);

  // Civ stats for the selected mode. 'all' reuses the pre-aggregated (already
  // sorted) civStats; a specific mode recomputes from raw games.
  const civs = useMemo<[string, { total: number; wins: number; losses: number }][]>(() => {
    if (modeFilter === 'all' || !games.length || !profileId) {
      return Object.entries(stats?.civStats || {});
    }

    const civStats: CivStats = {};
    for (const game of games) {
      if (LEADERBOARD_LABELS[String(game.leaderboard || game.kind)] !== modeFilter) continue;

      let playerInfo = null;
      for (const team of game.teams) {
        for (const member of team) {
          if (member.player.profile_id === profileId) {
            playerInfo = member.player;
            break;
          }
        }
        if (playerInfo) break;
      }
      if (!playerInfo) continue;

      const playerWon = playerInfo.result === 'win';
      const pciv = playerInfo.civilization;
      if (!civStats[pciv]) civStats[pciv] = { total: 0, wins: 0, losses: 0 };
      civStats[pciv].total++;
      if (playerWon) civStats[pciv].wins++; else civStats[pciv].losses++;
    }

    return Object.entries(civStats).sort((a, b) => b[1].total - a[1].total);
  }, [modeFilter, stats, games, profileId]);

  if (!stats || !stats.civStats) return null;

  return (
    <>
      {availableModes.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {availableModes.map((mode) => (
            <button
              key={mode}
              onClick={() => setModeFilter(mode)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                modeFilter === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {mode === 'all' ? 'All' : mode}
            </button>
          ))}
        </div>
      )}
      {civs.length === 0 ? (
        <p className="text-gray-400">No civilization data for this mode.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {civs.map(([civ, stat]) => {
            const civData = [
              { name: 'Wins', value: stat.wins },
              { name: 'Losses', value: stat.losses }
            ];
            return (
              <div key={civ} className="bg-gray-800 rounded-lg p-4 shadow-xl border border-gray-700/40">
                <h4 className="font-semibold mb-2">{civ.replace(/_/g, ' ').toUpperCase()}</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={civData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {civData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#4ade80' : '#ef4444'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff', borderRadius: '0.5rem', fontSize: 14 }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-sm mt-2">
                  Games: {stat.total} | Win Rate: {stat.total > 0 ? Math.round((stat.wins / stat.total) * 100) : 0}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default CivCharts;
