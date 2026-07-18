import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Search } from 'lucide-react';
import Spinner from './Spinner';
import CoachPlayerReview from './CoachPlayerReview';
import RecentGamesPicker from './RecentGamesPicker';
import { parsePlayerGameUrl, fetchGameSummary, fetchLatestFinishedGameSummary } from '../services/coach/summaryService';
import { reviewGame, type GameReview } from '../services/coach/engine';
import { formatGameTime } from '../services/coach/context';
import { formatLeaderboard } from '../services/aoe4worldAnalysis';

interface Props {
  currentPlayer?: { profile_id: number; name: string };
  /** Profile id from the URL, used to resolve deep-linked games. */
  initialProfileId?: number;
  /** Game id from the URL — reviews this specific game instead of the latest. */
  initialGameId?: number;
  /** Called when the user submits a game URL, so the parent can update the route. */
  onReview?: (profileId: number, gameId: number) => void;
}

export default function Coach({ currentPlayer, initialProfileId, initialGameId, onReview }: Props) {
  const [input, setInput] = useState('');
  const [review, setReview] = useState<GameReview | null>(null);
  const [autoLoaded, setAutoLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [error, setError] = useState('');
  // Tracks the last thing we loaded so URL/prop churn doesn't refetch it.
  const loadedKey = useRef('');

  // Load the review driven by the URL: a specific game when a game id is present,
  // otherwise the current player's latest finished game.
  useEffect(() => {
    const key = initialGameId && initialProfileId
      ? `game:${initialProfileId}:${initialGameId}`
      : currentPlayer && !initialGameId
        ? `latest:${currentPlayer.profile_id}`
        : '';
    if (!key || key === loadedKey.current) return;
    loadedKey.current = key;

    let cancelled = false;
    let finished = false;
    setLoading(true);
    setError('');
    setReview(null);

    if (initialGameId && initialProfileId) {
      setAutoLoading(false);
      setAutoLoaded(false);
      fetchGameSummary(initialProfileId, initialGameId)
        .then(summary => { if (!cancelled) setReview(reviewGame(summary)); })
        .catch(() => {
          if (!cancelled) setError(`Could not load a summary for game ${initialGameId}. Older games and ongoing games may not have one.`);
        })
        .finally(() => { finished = true; if (!cancelled) setLoading(false); });
    } else {
      setAutoLoading(true);
      fetchLatestFinishedGameSummary(currentPlayer!.profile_id)
        .then(summary => { if (!cancelled) { setReview(reviewGame(summary)); setAutoLoaded(true); } })
        .catch(() => {
          if (!cancelled) setError(`Couldn't load the summary of ${currentPlayer!.name}'s latest games. Paste a game URL below instead.`);
        })
        .finally(() => { finished = true; if (!cancelled) { setLoading(false); setAutoLoading(false); } });
    }
    // If this load is torn down before it finished (e.g. StrictMode's dev
    // remount), forget the key so the next run re-fetches instead of bailing on
    // the guard and leaving `loading` stuck true.
    return () => {
      cancelled = true;
      if (!finished) loadedKey.current = '';
    };
  }, [currentPlayer?.profile_id, initialProfileId, initialGameId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load a game directly (used when there is no router to drive the effect).
  async function loadGameDirect(profileId: number, gameId: number) {
    setLoading(true);
    setError('');
    setReview(null);
    setAutoLoaded(false);
    try {
      const summary = await fetchGameSummary(profileId, gameId);
      setReview(reviewGame(summary));
    } catch {
      setError(`Could not load a summary for game ${gameId}. Older games and ongoing games may not have one.`);
    } finally {
      setLoading(false);
    }
  }

  // Prefer the parent's router (updates the URL; the effect above loads it);
  // fall back to loading in place when there is no router.
  function selectGame(profileId: number, gameId: number) {
    if (onReview) onReview(profileId, gameId);
    else loadGameDirect(profileId, gameId);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parsePlayerGameUrl(input);
    if (!parsed) {
      setError('Paste an aoe4world game URL like https://aoe4world.com/players/3995534-jesusnoseq/games/241473484');
      return;
    }
    const profileId = parsed.profileId ?? currentPlayer?.profile_id ?? initialProfileId;
    if (profileId === undefined) {
      setError('Paste the full aoe4world game URL (including the /players/... part) or select a profile first.');
      return;
    }
    selectGame(profileId, parsed.gameId);
  }

  const pickerProfileId = initialProfileId ?? currentPlayer?.profile_id;
  const currentGameId = review?.gameId ?? initialGameId;

  return (
    <div className="w-full space-y-4">
      <div className="bg-gray-800 rounded-lg p-4 shadow-xl border border-gray-700/40">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" /> Game Review (BETA)
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Paste an aoe4world game URL to get coaching feedback for every player: idle production,
          missing upgrades, villager losses, floating resources and more.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value); setError(''); }}
              placeholder="aoe4world game URL (https://aoe4world.com/players/…/games/…)"
              className="w-full pl-9 pr-3 py-2 bg-gray-700 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
          >
            {loading ? 'Loading...' : 'Review Game'}
          </button>
        </form>
        {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
      </div>

      {pickerProfileId !== undefined && (
        <RecentGamesPicker
          profileId={pickerProfileId}
          currentGameId={currentGameId}
          onSelect={gameId => selectGame(pickerProfileId, gameId)}
        />
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <Spinner size={40} className="text-blue-400" />
          {autoLoading && currentPlayer && (
            <p className="text-sm text-blue-300">
              Reviewing latest game of <strong>{currentPlayer.name}</strong>…
            </p>
          )}
        </div>
      )}

      {review && !loading && (
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-400 px-1">
            {autoLoaded && currentPlayer && (
              <span className="text-blue-300">Latest game of <strong>{currentPlayer.name}</strong></span>
            )}
            {review.mapName && <span>Map: <strong className="text-white">{review.mapName}</strong></span>}
            {review.leaderboard && <span>Mode: <strong className="text-white">{formatLeaderboard(review.leaderboard)}</strong></span>}
            <span>Duration: <strong className="text-white">{formatGameTime(review.duration)}</strong></span>
            <span>Game: <strong className="text-white">#{review.gameId}</strong></span>
          </div>
          {review.teams.map(team => (
            <div key={team.team}>
              <h3 className="text-lg font-semibold text-gray-300 mb-2 px-1">
                {team.teamName || `Team ${team.team + 1}`}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {team.players.map(p => (
                  <CoachPlayerReview
                    key={p.player.profileId}
                    review={p}
                    highlight={p.player.profileId === currentPlayer?.profile_id}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
