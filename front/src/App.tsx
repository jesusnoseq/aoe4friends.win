import React, { useState, useRef } from 'react';
import { Search, Trophy, Swords, Users2, Timer } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface GameStats {
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  averageGameLength?: string;
  civStats: CivStats;
  allies: AllyOpponent[];
  opponents: AllyOpponent[];
}

interface CivStats {
  [civ: string]: {
    total: number;
    wins: number;
    losses: number;
  };
}

interface AllyOpponent {
  Name: string;
  Stat: {
    games: number;
    wins: number;
    losses: number;
  };
}

interface PlayerSuggestion {
  name: string;
  profile_id: number;
  avatars: { small: string; medium: string; full: string };
  country?: string;
  rating?: number;
  // ...other fields if needed
}

function App() {
  const [profileId, setProfileId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [error, setError] = useState<string>('');
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<PlayerSuggestion | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sorting state for tables
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

  // Table header cell with sort indicator and click handler
  function SortableTh({
    label,
    column,
    table,
  }: { label: string; column: any; table: 'allies' | 'opponents' }) {
    const active = tableSort.table === table && tableSort.column === column;
    return (
      <th
        className="py-2 px-3 cursor-pointer select-none"
        onClick={() => {
          setTableSort(prev => {
            if (prev.table === table && prev.column === column) {
              return { ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { table, column, direction: 'desc' };
          });
        }}
      >
        {label}
        {active && (
          <span className="ml-1">{tableSort.direction === 'asc' ? '▲' : '▼'}</span>
        )}
      </th>
    );
  }

  // Helper: check if input is a number (profile id)
  const isProfileId = (value: string) => /^\d+$/.test(value.trim());

  // Autocomplete nickname search
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProfileId(value);
    setSelectedSuggestion(null);
    setError('');
    if (!value.trim() || isProfileId(value)) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const res = await fetch(
        `https://aoe4world.com/api/v0/players/autocomplete?leaderboard=rm_team&query=${encodeURIComponent(value)}`
      );
      const data = await res.json();
      setSuggestions(data.players || []);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (player: PlayerSuggestion) => {
    setProfileId(player.profile_id.toString());
    setSelectedSuggestion(player);
    setSuggestions([]);
    setShowSuggestions(false);
    setError('');
    // Optionally, focus input out
    inputRef.current?.blur();
  };

  // Hide suggestions on blur (with delay for click)
  const handleInputBlur = () => setTimeout(() => setShowSuggestions(false), 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let id = profileId.trim();
    if (!id) {
      setError('Please enter a profile ID or nickname');
      return;
    }
    // If not a number and a suggestion is selected, use its profile_id
    if (!isProfileId(id)) {
      if (selectedSuggestion) {
        id = selectedSuggestion.profile_id.toString();
      } else if (suggestions.length > 0) {
        id = suggestions[0].profile_id.toString();
      } else {
        setError('Please select a player from the suggestions');
        return;
      }
    }
    setIsLoading(true);
    setError('');
    setShowSuggestions(false);

    try {
      const res = await fetch(
        `https://7dek3qyuyj.execute-api.eu-central-1.amazonaws.com/Prod/analyze?profile_id=${id}`
      );
      if (!res.ok) throw new Error('API error');
      const data = await res.json();

      const matchStats = data.MatchStats;
      const civStats = data.CivStats || {};
      const allies = data.Allies || [];
      const opponents = data.Opponents || [];

      if (!matchStats) throw new Error('No stats found');

      const wins = matchStats.wins || 0;
      const losses = matchStats.losses || 0;
      const totalGames = matchStats.total || wins + losses;
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

      setStats({
        wins,
        losses,
        totalGames,
        winRate,
        averageGameLength: '-', // Replace with actual value if available
        civStats,
        allies: allies.slice(0, 20),
        opponents: opponents.slice(0, 20),
      });
      setIsLoading(false);
    } catch (err) {
      setError('Failed to fetch stats. Please try again.');
      setIsLoading(false);
    }
  };

  const COLORS = ['#4ade80', '#ef4444'];

  const renderWinLossChart = () => {
    if (!stats) return null;

    const data = [
      { name: 'Wins', value: stats.wins },
      { name: 'Losses', value: stats.losses }
    ];

    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Civ chart
  const renderCivCharts = () => {
    if (!stats || !stats.civStats) return null;
    const civs = Object.entries(stats.civStats);
    if (civs.length === 0) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {civs.map(([civ, stat]) => {
          const civData = [
            { name: 'Wins', value: stat.wins },
            { name: 'Losses', value: stat.losses }
          ];
          return (
            <div key={civ} className="bg-gray-700 rounded-lg p-4 shadow">
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
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-sm mt-2">
                Games: {stat.total} | Win Rate: {stat.total > 0 ? Math.round((stat.wins / stat.total) * 100) : 0}%
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Allies table
  const renderAlliesTable = () => {
    const list = stats?.allies || [];
    const sortedList =
      tableSort.table === 'allies'
        ? getSorted(list, tableSort.column, tableSort.direction)
        : [...list].sort((a, b) => b.Stat.games - a.Stat.games);
    return (
      <div className="bg-gray-700 rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-4">Top 20 Team Mates</h3>
        {list.length === 0 ? (
          <p className="text-gray-400">No team‐mate data available.</p>
        ) : (
          <table className="w-full text-left text-sm border-separate border-spacing-y-1">
            <thead>
              <tr className="bg-gray-800">
                <th className="py-2 px-3 rounded-l-lg">#</th>
                <SortableTh label="Name" column="name" table="allies" />
                <SortableTh label="Games" column="games" table="allies" />
                <SortableTh label="Wins" column="wins" table="allies" />
                <SortableTh label="Losses" column="losses" table="allies" />
                <SortableTh label="Win Rate" column="winrate" table="allies" />
              </tr>
            </thead>
            <tbody>
              {sortedList
                .slice(0, 20)
                .map((ally, idx) => (
                  <tr key={ally.Name + idx}
                      className={`hover:bg-gray-600 transition ${idx % 2 === 0 ? 'bg-gray-700' : 'bg-gray-800'}`}>
                    <td className="py-2 px-3 font-bold text-blue-300">{idx + 1}</td>
                    <td className="py-2 px-3 break-all">{ally.Name}</td>
                    <td className="py-2 px-3">{ally.Stat.games}</td>
                    <td className="py-2 px-3 text-green-400">{ally.Stat.wins}</td>
                    <td className="py-2 px-3 text-red-400">{ally.Stat.losses}</td>
                    <td className="py-2 px-3 font-semibold">
                      {ally.Stat.games > 0 ? Math.round((ally.Stat.wins / ally.Stat.games) * 100) : 0}%
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // Opponents table
  const renderOpponentsTable = () => {
    if (!stats || !stats.opponents || stats.opponents.length === 0) return null;
    const list = stats.opponents;
    const sortedList =
      tableSort.table === 'opponents'
        ? getSorted(list, tableSort.column, tableSort.direction)
        : [...list].sort((a, b) => b.Stat.games - a.Stat.games);
    return (
      <div className="bg-gray-700 rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-4">Top 20 Enemies</h3>
        <table className="w-full text-left text-sm border-separate border-spacing-y-1">
          <thead>
            <tr className="bg-gray-800">
              <th className="py-2 px-3 rounded-l-lg">#</th>
              <SortableTh label="Name" column="name" table="opponents" />
              <SortableTh label="Games" column="games" table="opponents" />
              <SortableTh label="Wins" column="wins" table="opponents" />
              <SortableTh label="Losses" column="losses" table="opponents" />
              <SortableTh label="Win Rate" column="winrate" table="opponents" />
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
                  <td className="py-2 px-3 break-all">{op.Name}</td>
                  <td className="py-2 px-3">{op.Stat.games}</td>
                  <td className="py-2 px-3 text-green-400">{op.Stat.wins}</td>
                  <td className="py-2 px-3 text-red-400">{op.Stat.losses}</td>
                  <td className="py-2 px-3 font-semibold">
                    {op.Stat.games > 0 ? Math.round((op.Stat.wins / op.Stat.games) * 100) : 0}%
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          Age of Empires IV Friends Stats
        </h1>

        <form onSubmit={handleSubmit} className="mb-8" autoComplete="off">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={profileId}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              placeholder="Enter Profile ID or Nickname"
              className="w-full pl-10 pr-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
            />
            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-10 left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((player) => (
                  <li
                    key={player.profile_id}
                    className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-700"
                    onMouseDown={() => handleSuggestionClick(player)}
                  >
                    <img
                      src={player.avatars.small.startsWith('http') ? player.avatars.small : `https:${player.avatars.small}`}
                      alt={player.name}
                      className="w-6 h-6 rounded-full mr-3"
                    />
                    <span className="font-semibold">{player.name}</span>
                    <span className="ml-2 text-gray-400 text-xs">#{player.profile_id}</span>
                    {player.country && (
                      <span className="ml-2 text-xs">{player.country.toUpperCase()}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && <p className="mt-2 text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold transition duration-200 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'View Stats'}
          </button>
        </form>

        {stats && (
          <div className="space-y-8">
            {/* General stats first */}
            <div className="bg-gray-700 rounded-lg p-6 shadow-xl">
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <Trophy className="mr-2" /> Player Statistics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-3">
                  <Swords className="text-blue-400" />
                  <div>
                    <p className="text-gray-400">Win/Loss</p>
                    <p className="text-xl font-semibold">{stats.wins}W - {stats.losses}L</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Users2 className="text-green-400" />
                  <div>
                    <p className="text-gray-400">Total Games</p>
                    <p className="text-xl font-semibold">{stats.totalGames}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Trophy className="text-yellow-400" />
                  <div>
                    <p className="text-gray-400">Win Rate</p>
                    <p className="text-xl font-semibold">{stats.winRate}%</p>
                  </div>
                </div>
                {/* <div className="flex items-center space-x-3">
                  <Timer className="text-purple-400" />
                  <div>
                    <p className="text-gray-400">Avg. Game Length</p>
                    <p className="text-xl font-semibold">{stats.averageGameLength}</p>
                  </div>
                </div> */}
              </div>
            </div>

            {/* Top teammates and enemies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {renderAlliesTable()}
              {renderOpponentsTable()}
            </div>

            {/* Civ charts third */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Civilization Performance</h3>
              {renderCivCharts()}
            </div>

            {/* Win/Loss Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gray-700 rounded-lg p-6 shadow-xl">
                <h3 className="text-xl font-semibold mb-4">Win/Loss Distribution</h3>
                {renderWinLossChart()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;