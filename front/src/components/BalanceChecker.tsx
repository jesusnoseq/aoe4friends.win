import React, { useState, useEffect } from 'react';
import { Scale, Search } from 'lucide-react';
import { type CheckedGame, parseGameId, fetchGameForBalanceCheck, fetchLastGameForBalanceCheck } from '../services/aoe4worldRequests';
import Spinner from './Spinner';
import TeamsDisplay from './TeamsDisplay';
import RecentGamesPicker from './RecentGamesPicker';

interface Props {
  currentPlayer?: { profile_id: number; name: string };
}

export default function BalanceChecker({ currentPlayer }: Props) {
  const [input, setInput] = useState('');
  const [game, setGame] = useState<CheckedGame | null>(null);
  const [autoLoaded, setAutoLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-show the current player's latest game (even if still ongoing)
  useEffect(() => {
    if (!currentPlayer) return;
    let cancelled = false;
    setLoading(true);
    setAutoLoading(true);
    setError('');
    fetchLastGameForBalanceCheck(currentPlayer.profile_id)
      .then(g => {
        if (cancelled) return;
        setGame(g);
        setAutoLoaded(true);
      })
      .catch(() => { /* no last game available; leave the manual search usable */ })
      .finally(() => { if (!cancelled) { setLoading(false); setAutoLoading(false); } });
    return () => { cancelled = true; };
  }, [currentPlayer?.profile_id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSelectGame(gameId: number) {
    setLoading(true);
    setError('');
    setAutoLoaded(false);
    try {
      setGame(await fetchGameForBalanceCheck(gameId));
    } catch {
      setError(`Could not load game ${gameId}. Check the ID and try again.`);
    } finally {
      setLoading(false);
    }
  }

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
    setAutoLoaded(false);
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

      {currentPlayer && (
        <RecentGamesPicker
          profileId={currentPlayer.profile_id}
          currentGameId={game?.game_id}
          onSelect={handleSelectGame}
          includeOngoing
        />
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <Spinner size={40} className="text-blue-400" />
          {autoLoading && currentPlayer && (
            <p className="text-sm text-blue-300">
              Loading latest game of <strong>{currentPlayer.name}</strong>…
            </p>
          )}
        </div>
      )}

      {game && !loading && (
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-400 px-1">
            {autoLoaded && currentPlayer && (
              <span className="text-blue-300">Latest game of <strong>{currentPlayer.name}</strong></span>
            )}
            <span>Map: <strong className="text-white">{game.map}</strong></span>
            <span>Mode: <strong className="text-white">{game.leaderboard}</strong></span>
            <span>Game: <strong className="text-white">#{game.game_id}</strong></span>
            {game.ongoing && (
              <span className="px-2 py-0.5 rounded bg-yellow-900 text-yellow-300 text-xs font-semibold">⏳ Ongoing</span>
            )}
          </div>
          <TeamsDisplay
            team1={game.team1}
            team2={game.team2}
            mode={game.mode}
            algorithm="raw-elo"
            showAllMethods
            team1Label={game.team1Won === undefined ? 'Team 1' : game.team1Won ? 'Team 1 🏆' : 'Team 1'}
            team2Label={game.team1Won === undefined ? 'Team 2' : game.team1Won ? 'Team 2' : 'Team 2 🏆'}
          />
        </>
      )}
    </div>
  );
}
