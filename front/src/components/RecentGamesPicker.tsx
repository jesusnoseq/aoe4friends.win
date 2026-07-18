import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import Spinner from './Spinner';
import { fetchRecentFinishedGames, type RecentGame } from '../services/coach/summaryService';
import { formatGameTime, prettyName } from '../services/coach/context';

interface Props {
  profileId: number;
  /** Game currently being reviewed, highlighted in the list. */
  currentGameId?: number;
  onSelect: (gameId: number) => void;
  /** Include ongoing/live games in the list (default: finished games only). */
  includeOngoing?: boolean;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function RecentGamesPicker({ profileId, currentGameId, onSelect, includeOngoing = false }: Props) {
  const [games, setGames] = useState<RecentGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchRecentFinishedGames(profileId, undefined, includeOngoing)
      .then(list => { if (!cancelled) setGames(list); })
      .catch(() => { if (!cancelled) setError('Could not load recent games.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profileId, includeOngoing]);

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-xl border border-gray-700/40">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-300">
        <History className="w-4 h-4 text-blue-400" /> Recent games
      </h3>

      {loading && (
        <div className="flex items-center gap-2 py-2 text-sm text-gray-400">
          <Spinner size={18} className="text-blue-400" /> Loading recent games…
        </div>
      )}
      {error && !loading && <p className="text-sm text-red-400">{error}</p>}
      {!loading && !error && games.length === 0 && (
        <p className="text-sm text-gray-500">No finished games found.</p>
      )}

      {games.length > 0 && (
        <ul className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {games.map(g => {
            const selected = g.gameId === currentGameId;
            const won = g.result === 'win';
            const lost = g.result === 'loss';
            return (
              <li key={g.gameId}>
                <button
                  type="button"
                  onClick={() => onSelect(g.gameId)}
                  aria-current={selected}
                  className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    selected
                      ? 'bg-blue-600/20 border border-blue-500/60'
                      : 'border border-transparent hover:bg-gray-700/60'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      won ? 'bg-green-400' : lost ? 'bg-red-400' : 'bg-gray-500'
                    }`}
                    title={g.result || 'unknown result'}
                  />
                  <span className="text-white truncate min-w-0 flex-1">
                    {g.map ? prettyName(g.map) : `Game #${g.gameId}`}
                    {g.opponents.length > 0 && (
                      <span className="text-gray-500"> vs {g.opponents.join(', ')}</span>
                    )}
                  </span>
                  {g.ongoing && (
                    <span className="px-1.5 py-0.5 rounded bg-yellow-900 text-yellow-300 text-xs font-semibold shrink-0">
                      ⏳ Live
                    </span>
                  )}
                  {g.civilization && (
                    <span className="hidden sm:inline text-xs text-gray-400 shrink-0">
                      {prettyName(g.civilization)}
                    </span>
                  )}
                  {g.duration !== undefined && (
                    <span className="text-xs text-gray-500 shrink-0 font-mono">{formatGameTime(g.duration)}</span>
                  )}
                  {g.startedAt && (
                    <span className="hidden sm:inline text-xs text-gray-500 shrink-0 w-12 text-right">
                      {formatDate(g.startedAt)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
