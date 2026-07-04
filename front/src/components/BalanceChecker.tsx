import React, { useState } from 'react';
import { Scale, Search } from 'lucide-react';
import { type CheckedGame, parseGameId, fetchGameForBalanceCheck } from '../services/aoe4worldRequests';
import Spinner from './Spinner';
import TeamsDisplay from './TeamsDisplay';

export default function BalanceChecker() {
  const [input, setInput] = useState('');
  const [game, setGame] = useState<CheckedGame | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const gameId = parseGameId(input);
    if (gameId === null) {
      setError('Enter a game ID (e.g. 241337674) or an aoe4world game URL.');
      return;
    }
    setLoading(true);
    setError('');
    setGame(null);
    try {
      setGame(await fetchGameForBalanceCheck(gameId));
    } catch {
      setError(`Could not load game ${gameId}. Check the ID and try again.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-4">
      <div className="bg-gray-800 rounded-lg p-4 shadow-xl border border-gray-700/40">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Scale className="w-5 h-5 text-blue-400" /> Balance Checker
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Paste a game ID or an aoe4world game URL to see how balanced the match was.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value); setError(''); }}
              placeholder="Game ID or aoe4world game URL"
              className="w-full pl-9 pr-3 py-2 bg-gray-700 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
          >
            {loading ? 'Loading...' : 'Check Balance'}
          </button>
        </form>
        {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Spinner size={40} className="text-blue-400" />
        </div>
      )}

      {game && !loading && (
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-400 px-1">
            <span>Map: <strong className="text-white">{game.map}</strong></span>
            <span>Mode: <strong className="text-white">{game.leaderboard}</strong></span>
            <span>Game: <strong className="text-white">#{game.game_id}</strong></span>
          </div>
          <TeamsDisplay
            team1={game.team1}
            team2={game.team2}
            mode={game.mode}
            algorithm="raw-elo"
            team1Label={game.team1Won === undefined ? 'Team 1' : game.team1Won ? 'Team 1 🏆' : 'Team 1'}
            team2Label={game.team1Won === undefined ? 'Team 2' : game.team1Won ? 'Team 2' : 'Team 2 🏆'}
          />
        </>
      )}
    </div>
  );
}
