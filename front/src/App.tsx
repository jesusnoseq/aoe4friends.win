import React, { useState } from 'react';
import { Search, Trophy, Swords, Users2, Timer } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface GameStats {
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  averageGameLength: string;
}

function App() {
  const [profileId, setProfileId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId.trim()) {
      setError('Please enter a profile ID');
      return;
    }

    setIsLoading(true);
    setError('');

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
          Age of Empires IV Stats
        </h1>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              placeholder="Enter Profile ID"
              className="w-full pl-10 pr-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
            />
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
      </div>
    </div>
  );
}

export default App;