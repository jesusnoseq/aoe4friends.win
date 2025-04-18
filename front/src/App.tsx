import React, { useState, useRef, useEffect } from 'react';
import { Search, Trophy, Swords, Users2 } from 'lucide-react';
import AlliesTable from './components/AlliesTable';
import OpponentsTable from './components/OpponentsTable';
import CivCharts from './components/CivCharts';
import WinLossChart from './components/WinLossChart';

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
  const [recentQueries, setRecentQueries] = useState<{ name: string; profile_id: number }[]>([]);
  const [showRecent, setShowRecent] = useState<boolean>(false);

  // Load recent queries from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('aoe4friends_recent_queries');
    if (stored) {
      setRecentQueries(JSON.parse(stored));
    }
  }, []);

  // Helper to add to recent queries and persist
  function addRecentQuery(name: string, profile_id: number) {
    setRecentQueries(prev => {
      const filtered = prev.filter(q => q.profile_id !== profile_id);
      const updated = [{ name, profile_id }, ...filtered].slice(0, 10);
      localStorage.setItem('aoe4friends_recent_queries', JSON.stringify(updated));
      return updated;
    });
  }

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

  // Handle recent query selection
  const handleRecentClick = (query: { name: string; profile_id: number }) => {
    setProfileId(query.profile_id.toString());
    setSelectedSuggestion({
      name: query.name,
      profile_id: query.profile_id,
      avatars: { small: '', medium: '', full: '' }
    });
    setShowRecent(false);
    setSuggestions([]);
    setShowSuggestions(false);
    setError('');
    // Optionally, trigger fetch immediately:
    setTimeout(() => {
      inputRef.current?.blur();
      // Simulate form submit
      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    }, 0);
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

      // Save to recent queries
      let name = '';
      if (selectedSuggestion) {
        name = selectedSuggestion.name;
      } else if (suggestions.length > 0) {
        name = suggestions[0].name;
      } else {
        name = id;
      }
      addRecentQuery(name, Number(id));

      setIsLoading(false);
    } catch (err) {
      setError('Failed to fetch stats. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-6xl mx-auto">
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
              onFocus={() => { 
                if (suggestions.length > 0) setShowSuggestions(true); 
              }}
              placeholder="Enter Profile ID or Nickname"
              className="w-full pl-10 pr-16 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
            />
            {/* Recent queries button */}
            <button
              type="button"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-600 hover:bg-gray-500 text-xs px-2 py-1 rounded"
              onClick={() => setShowRecent(v => !v)}
              tabIndex={-1}
            >
              Recent
            </button>
            {/* Recent queries dropdown */}
            {showRecent && recentQueries.length > 0 && (
              <ul className="absolute z-20 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto w-64">
                {recentQueries.map((q) => (
                  <li
                    key={q.profile_id}
                    className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-700"
                    onMouseDown={() => handleRecentClick(q)}
                  >
                    <span className="font-semibold">{q.name}</span>
                    <span className="ml-2 text-gray-400 text-xs">#{q.profile_id}</span>
                  </li>
                ))}
              </ul>
            )}
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
              <AlliesTable
                stats={stats}
                tableSort={tableSort}
                setTableSort={setTableSort}
                getSorted={getSorted}
              />
              <OpponentsTable
                stats={stats}
                tableSort={tableSort}
                setTableSort={setTableSort}
                getSorted={getSorted}
              />
            </div>

            {/* Civ charts third */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Civilization Performance</h3>
              <CivCharts stats={stats} />
            </div>

            {/* Win/Loss Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gray-700 rounded-lg p-6 shadow-xl">
                <h3 className="text-xl font-semibold mb-4">Win/Loss Distribution</h3>
                <WinLossChart stats={stats} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;