import React, { useState, useRef } from 'react';
import { Search, Trophy, Swords, Users2, Timer } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface GameStats {
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  averageGameLength: string;
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

    // Simulated API call - replace with actual API endpoint
    try {
      // Mock data for demonstration
      const mockStats: GameStats = {
        wins: 150,
        losses: 100,
        totalGames: 250,
        winRate: 60,
        averageGameLength: '25:30',
      };
      
      setTimeout(() => {
        setStats(mockStats);
        setIsLoading(false);
      }, 1000);
    } catch (err) {
      setError('Failed to fetch stats. Please try again.');
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('https://<YOUR_WORKER_SUBDOMAIN>.workers.dev');
      const data = await res.json();
      console.log('API data:', data);
    } catch (err) {
      console.error('Failed to fetch API data', err);
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

  const renderGameLengthChart = () => {
    if (!stats) return null;

    // Mock game length distribution data
    const data = [
      { length: '0-15min', games: 45 },
      { length: '15-30min', games: 120 },
      { length: '30-45min', games: 65 },
      { length: '45+min', games: 20 }
    ];

    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="length" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#374151',
                border: 'none',
                borderRadius: '0.5rem',
                color: '#fff'
              }}
            />
            <Bar dataKey="games" fill="#60a5fa" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
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
                <div className="flex items-center space-x-3">
                  <Timer className="text-purple-400" />
                  <div>
                    <p className="text-gray-400">Avg. Game Length</p>
                    <p className="text-xl font-semibold">{stats.averageGameLength}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gray-700 rounded-lg p-6 shadow-xl">
                <h3 className="text-xl font-semibold mb-4">Win/Loss Distribution</h3>
                {renderWinLossChart()}
              </div>
              <div className="bg-gray-700 rounded-lg p-6 shadow-xl">
                <h3 className="text-xl font-semibold mb-4">Game Length Distribution</h3>
                {renderGameLengthChart()}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={fetchStats}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Fetch API Data
        </button>
      </div>
    </div>
  );
}

export default App;