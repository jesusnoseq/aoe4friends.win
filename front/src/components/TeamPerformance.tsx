import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Game } from '../services/aoe4worldTypes.request';
import { LEADERBOARD_LABELS, LEADERBOARD_GROUPS, buildAllyCivCombos } from '../services/aoe4worldAnalysis';
import { prettyName } from '../services/coach/context';

const MAX_COMBOS_SHOWN = 6;

const TeamPerformance: React.FC<{ games: Game[]; profileId: number }> = ({ games, profileId }) => {
  const [modeFilter, setModeFilter] = useState<string>('all');

  // Game-mode labels the player has team games for (a game only counts if the
  // player's own side has more than one member, so 1v1/FFA modes stay hidden),
  // in the same Ranked → Quick Match → Empire Wars order used elsewhere.
  const availableModes = useMemo<string[]>(() => {
    const present = new Set<string>();
    for (const game of games) {
      const label = LEADERBOARD_LABELS[String(game.leaderboard || game.kind)];
      if (!label) continue;
      const playerTeam = game.teams.find((team) =>
        team.some((member) => member.player.profile_id === profileId)
      );
      if (playerTeam && playerTeam.length > 1) present.add(label);
    }
    const ordered = LEADERBOARD_GROUPS.flatMap((g) => g.labels).filter((label) => present.has(label));
    return ['all', ...ordered];
  }, [games, profileId]);

  const allyCombos = useMemo(
    () => buildAllyCivCombos(games, profileId, modeFilter, 20),
    [games, profileId, modeFilter]
  );

  const pct = (wins: number, total: number) => (total > 0 ? Math.round((wins / total) * 100) : 0);

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
      {allyCombos.length === 0 ? (
        <p className="text-gray-400">No team games for this mode.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allyCombos.map((ally) => {
            const allyData = [
              { name: 'Wins', value: ally.wins },
              { name: 'Losses', value: ally.losses }
            ];
            const shownCombos = ally.combos.slice(0, MAX_COMBOS_SHOWN);
            const hiddenCombos = ally.combos.length - shownCombos.length;
            return (
              <div key={ally.profileId} className="bg-gray-800 rounded-lg p-4 shadow-xl border border-gray-700/40">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{ally.name}</h4>
                    <div className="text-sm text-gray-400">
                      {ally.totalGames} games together · {pct(ally.wins, ally.totalGames)}%
                    </div>
                  </div>
                  <div className="w-20 h-20 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allyData}
                          cx="50%"
                          cy="50%"
                          innerRadius={24}
                          outerRadius={36}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {allyData.map((entry, index) => (
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
                  </div>
                </div>
                {shownCombos.length === 0 ? (
                  <p className="text-sm text-gray-400">No civilization data.</p>
                ) : (
                  <div className="space-y-2">
                    {shownCombos.map((combo) => (
                      <div key={`${combo.myCiv}|${combo.allyCiv}`}>
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="truncate">
                            {prettyName(combo.myCiv)} + {prettyName(combo.allyCiv)}
                          </span>
                          <span className="text-gray-400 whitespace-nowrap">
                            {combo.games}g · {pct(combo.wins, combo.games)}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden flex mt-1">
                          <div
                            style={{ width: `${(combo.wins / combo.games) * 100}%`, backgroundColor: '#4ade80' }}
                          />
                          <div
                            style={{ width: `${(combo.losses / combo.games) * 100}%`, backgroundColor: '#ef4444' }}
                          />
                        </div>
                      </div>
                    ))}
                    {hiddenCombos > 0 && (
                      <div className="text-xs text-gray-500">+{hiddenCombos} more combos</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default TeamPerformance;
