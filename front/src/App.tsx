import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { Search, Swords, MessageSquare } from 'lucide-react';
import { Game, Player } from './services/aoe4worldTypes.request';
import { fetchGamesWithCache, fetchRecentGamesLite } from './services/aoe4worldRequests';
import { API_BASE_URL } from './services/apiConfig';
import BalancedTeams from './components/BalancedTeams';
import BalanceChecker from './components/BalanceChecker';
import Coach from './components/Coach';
import Spinner from './components/Spinner';
import StatsPage, { type GameStats } from './pages/StatsPage';
import { buildGameStats } from './services/aoe4worldAnalysis';
import { initAnalytics, identifyUser, trackSection } from './services/analytics';

interface PlayerSuggestion {
  name: string;
  profile_id: number;
  avatars: { small: string; medium: string; full: string };
  country?: string;
  rating?: number;
  // ...other fields if needed
}

const SECTIONS = ['stats', 'balanced', 'checker', 'coach'] as const;
type Section = typeof SECTIONS[number];

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/:profileIdParam" element={<MainApp />} />
        <Route path="/:profileIdParam/coach/:gameId" element={<MainApp />} />
        <Route path="/:profileIdParam/:section" element={<MainApp />} />
      </Routes>
    </BrowserRouter>
  );
}

// --- MainApp contains the previous App logic ---
function MainApp() {
  const [profileId, setProfileId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  // Whether `games` is the player's full history. Game review loads only recent
  // games, so this is false until a stats view needs (and triggers) a full load.
  const [gamesComplete, setGamesComplete] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<PlayerSuggestion | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [recentQueries, setRecentQueries] = useState<{ name: string; profile_id: number }[]>([]);
  const [showRecent, setShowRecent] = useState<boolean>(false);
  const [currentNickname, setCurrentNickname] = useState<string>('');
  const [currentProfileId, setCurrentProfileId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Section>('stats');
  const navigate = useNavigate();
  const { profileIdParam, section, gameId } = useParams();

  const coachProfileId = profileIdParam && /^\d+$/.test(profileIdParam) ? Number(profileIdParam) : undefined;
  const coachGameId = gameId && /^\d+$/.test(gameId) ? Number(gameId) : undefined;

  // Keep the active tab in sync with the URL section (the game-review route has
  // no :section segment, so a game id implies the coach section).
  useEffect(() => {
    const desired = gameId ? 'coach' : section;
    setActiveTab((SECTIONS as readonly string[]).includes(desired ?? '') ? (desired as Section) : 'stats');
  }, [section, gameId]);

  useEffect(() => {
    initAnalytics();
  }, []);

  // Report feature usage: the search screen counts as 'home', otherwise the
  // active tab is the feature in use.
  useEffect(() => {
    trackSection(currentProfileId === null ? 'home' : activeTab);
  }, [activeTab, currentProfileId]);

  // Switch tab and reflect it in the URL when a player is loaded.
  function goToTab(tab: Section) {
    setActiveTab(tab);
    if (currentProfileId !== null) {
      navigate(tab === 'stats' ? `/${currentProfileId}` : `/${currentProfileId}/${tab}`);
    }
  }

  // Load recent queries from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('aoe4friends_recent_queries');
    if (stored) {
      setRecentQueries(JSON.parse(stored));
    }
  }, []);

  // On mount or when profileIdParam changes, load stats if present. On the
  // game-review deep link (a game id in the URL) only the latest games are
  // loaded; the full history is fetched lazily when a stats view is opened.
  useEffect(() => {
    if (profileIdParam && /^\d+$/.test(profileIdParam)) {
      setProfileId(profileIdParam);
      setSelectedSuggestion(null);
      setSuggestions([]);
      setShowSuggestions(false);
      setError('');
      if (gameId) loadStatsLite(Number(profileIdParam));
      else loadStats(Number(profileIdParam));
    }
    // eslint-disable-next-line
  }, [profileIdParam]);

  // Upgrade to the full match history the first time a stats view is opened
  // after a lightweight (game-review) load.
  useEffect(() => {
    if (activeTab === 'stats' && !gamesComplete && currentProfileId !== null && !isLoading) {
      loadStats(currentProfileId);
    }
    // eslint-disable-next-line
  }, [activeTab, gamesComplete, currentProfileId]);

  // Helper to add to recent queries and persist
  function addRecentQuery(name: string, profile_id: number) {
    setRecentQueries(prev => {
      const filtered = prev.filter(q => q.profile_id !== profile_id);
      const updated = [{ name, profile_id }, ...filtered].slice(0, 10);
      localStorage.setItem('aoe4friends_recent_queries', JSON.stringify(updated));
      return updated;
    });
  }

  // Helper: display format used in the profile bar
  const formatProfileLabel = (name: string, id: number) => `${name} (#${id})`;

  // Helper: extract a profile id from the input value ("12345" or "Nickname (#12345)")
  function extractProfileId(value: string): number | null {
    const raw = value.trim();
    if (/^\d+$/.test(raw)) return Number(raw);
    const match = raw.match(/#(\d+)\)?$/);
    return match ? Number(match[1]) : null;
  }

  // Autocomplete nickname search
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProfileId(value);
    setSelectedSuggestion(null);
    setError('');
    if (!value.trim() || extractProfileId(value) !== null) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/v0/players/autocomplete?leaderboard=rm_team&query=${encodeURIComponent(value)}`
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
    setProfileId(formatProfileLabel(player.name, player.profile_id));
    setSelectedSuggestion(player);
    setSuggestions([]);
    setShowSuggestions(false);
    setError('');
    // Optionally, focus input out
    inputRef.current?.blur();
  };

  // Handle recent query selection
  const handleRecentClick = (query: { name: string; profile_id: number }) => {
    setProfileId(formatProfileLabel(query.name, query.profile_id));
    setSelectedSuggestion({
      name: query.name,
      profile_id: query.profile_id,
      avatars: { small: '', medium: '', full: '' }
    });
    setShowRecent(false);
    setSuggestions([]);
    setShowSuggestions(false);
    setError('');
    loadStats(query.profile_id, query.name);
  };

  // Hide suggestions on blur (with delay for click)
  const handleInputBlur = () => setTimeout(() => setShowSuggestions(false), 100);

  // Helper: extract nickname from the first game for a given profile id
  function getNicknameFromGames(games: Game[], profileId: number): string | undefined {
    if (games.length > 0 && Array.isArray(games[0].teams)) {
      // Combine all players from both teams into a single array
      const players: { player: Player }[] = [
        ...(Array.isArray(games[0].teams[0]) ? games[0].teams[0] : []),
        ...(Array.isArray(games[0].teams[1]) ? games[0].teams[1] : [])
      ];
      const player = players.find((p: { player: Player }) => {
        return p.player.profile_id == profileId;
      });
      if (player) {
        return player.player.name;
      }
    }
    return undefined;
  }

  // Apply a fetched games list to all the derived state. `complete` records
  // whether these games are the full history (see `gamesComplete`).
  function applyStats(fetchedGames: Game[], id: number, forcedName: string | undefined, complete: boolean) {
    setGames(fetchedGames);
    setGamesComplete(complete);
    setStats(buildGameStats(fetchedGames, id));

    const name =
      forcedName ||
      selectedSuggestion?.name ||
      suggestions[0]?.name ||
      getNicknameFromGames(fetchedGames, id) ||
      id.toString();

    setCurrentNickname(name);
    identifyUser(name);
    setCurrentProfileId(id);
    setProfileId(formatProfileLabel(name, id));
    addRecentQuery(name, id);
  }

  // New: shared loader — fetches the full match history for the stats views.
  async function loadStats(id: number, forcedName?: string) {
    setIsLoading(true);
    setError('');
    setShowSuggestions(false);

    try {
      const fetchedGames = await fetchGamesWithCache(id);
      applyStats(fetchedGames, id, forcedName, true);

      // Update URL if not already there
      if (profileIdParam !== String(id)) {
        navigate(`/${id}`, { replace: false });
      }
    } catch (err){
      console.error('Failed to fetch stats', err);
      setError('Failed to fetch stats. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // Lightweight loader for game review: only the most recent games, so a
  // deep-linked review doesn't page through the player's entire history. A
  // full load happens later if the user opens a stats view (see effect below).
  async function loadStatsLite(id: number, forcedName?: string) {
    setIsLoading(true);
    setError('');
    setShowSuggestions(false);

    try {
      const { games: fetchedGames, complete } = await fetchRecentGamesLite(id);
      applyStats(fetchedGames, id, forcedName, complete);
    } catch (err) {
      console.error('Failed to fetch recent games', err);
      setError('Failed to fetch stats. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // Reset the whole app to its initial state and go back to root
  const handleTitleClick = () => {
    setProfileId('');
    setStats(null);
    setGames([]);
    setError('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestion(null);
    setShowRecent(false);
    setCurrentNickname('');
    identifyUser(null);
    setCurrentProfileId(null);
    setActiveTab('stats');
    navigate('/');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = profileId.trim();
    if (!raw) {
      setError('Please enter a profile ID or nickname');
      return;
    }

    let idNum: number;
    const parsedId = extractProfileId(raw);
    if (parsedId !== null) {
      idNum = parsedId;
    } else if (selectedSuggestion) {
      idNum = selectedSuggestion.profile_id;
    } else if (suggestions.length) {
      idNum = suggestions[0].profile_id;
    } else {
      setError('Please select a player from the suggestions');
      return;
    }

    loadStats(idNum);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4 sm:p-8 flex flex-col">
      {/* Loading spinner overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Spinner size={64} className="text-blue-400" />
        </div>
      )}
      <div className="max-w-6xl mx-auto flex-1 w-full">
        <h1 className="text-4xl font-bold text-center mb-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleTitleClick}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <span className="bg-blue-600 rounded-full p-2 inline-flex">
              <Swords className="w-7 h-7 text-white" />
            </span>
            Age of Empires IV Friends Stats
          </button>
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
              onClick={() => {
                setShowRecent(prev => {
                  const next = !prev;
                  if (next) setShowSuggestions(false);
                  return next;
                });
              }}
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

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-800/60 rounded-lg p-1 mb-6">
          <button
            className={`flex-1 px-4 py-2 rounded-md font-semibold transition-colors ${
              activeTab === 'stats'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            onClick={() => goToTab('stats')}
          >
            Stats
          </button>
          <button
            className={`flex-1 px-4 py-2 rounded-md font-semibold transition-colors ${
              activeTab === 'balanced'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            onClick={() => goToTab('balanced')}
          >
            Create Balanced Teams
          </button>
          <button
            className={`flex-1 px-4 py-2 rounded-md font-semibold transition-colors ${
              activeTab === 'checker'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            onClick={() => goToTab('checker')}
          >
            Balance Checker
          </button>
           { <button
            className={`flex-1 px-4 py-2 rounded-md font-semibold transition-colors ${
              activeTab === 'coach'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            onClick={() => goToTab('coach')}
          >
            Game Review (BETA)
          </button>}
        </div>

        {activeTab === 'coach' && (
          <Coach
            currentPlayer={stats && currentProfileId !== null ? { profile_id: currentProfileId, name: currentNickname } : undefined}
            initialProfileId={coachProfileId}
            initialGameId={coachGameId}
            onReview={(pid, gid) => navigate(`/${pid}/coach/${gid}`)}
          />
        )}

        {activeTab === 'checker' && (
          <BalanceChecker
            currentPlayer={stats && currentProfileId !== null ? { profile_id: currentProfileId, name: currentNickname } : undefined}
          />
        )}

        {activeTab === 'balanced' && (
          <BalancedTeams
            allies={stats?.allies ?? []}
            currentPlayer={stats && currentProfileId !== null ? { profile_id: currentProfileId, name: currentNickname } : undefined}
          />
        )}

        {activeTab === 'stats' && stats && (
          <StatsPage
            stats={stats}
            games={games}
            profileId={Number(profileIdParam) || 0}
            nickname={currentNickname}
          />
        )}
        <Footer />
      </div>
    </div>
  );
}

export default App;

// --- Add footer below the main export ---
/*
  Footer: Thank aoe4world.com and credit jesusnoseq
*/
function Footer() {
  return (
    <footer className="mt-16 text-center text-gray-400 text-sm">
      <div className="mb-4">
        <a
          href="https://github.com/jesusnoseq/aoe4friends.win/issues/new"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          Send Feedback
        </a>
      </div>
      <div>
        Data powered by{' '}
        <a
          href="https://aoe4world.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-blue-300"
        >
          aoe4world.com
        </a>
        .<br />
        Made by{' '}
        <a
          href="https://jesusnoseq.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-blue-300"
        >
          jesusnoseq
        </a>
        .
      </div>
    </footer>
  );
}