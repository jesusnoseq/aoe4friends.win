# AOE4friends.win

A website to track multiplayer statistics with friends in Age of Empires IV.
It turns your match history into insights on civilizations, win rates, allies,
opponents, maps, and more — all powered by the public
[aoe4world.com API](https://aoe4world.com/).

**Live site:** <https://aoe4friends.win/>

## Features

### Player insights
- **Search** any player by nickname (with live autocomplete) or numeric profile ID.
- **Recent queries** are remembered locally (last 10) for quick re-visits.
- **Deep-linkable URLs** — every player has a shareable link (`/:profileId`).
- **Overall stats**: win/loss record, win rate, current streak, longest win and
  loss streaks, win rate over the last 10 and last 50 games, average game length,
  and longest game.
- **Civilization stats & charts** — see which civs you play and win with.
- **Allies & Opponents tables** — sortable by name, games, wins, losses, or win rate.
- **Game duration distribution** — from very short to very long matches.
- **Map performance** — win/loss breakdown by map.

### Team balancer
- Build **balanced custom-game teams** across all rating modes (ranked/quick match,
  1v1 through 4v4).
- Three balancing algorithms: `raw-elo`, `strength-sum`, and `strength-std-max`.
- Fill empty slots with **AI opponents** at selectable difficulties.

### AI Coach *(BETA)*
- Placeholder for upcoming AI-powered coaching. Currently shows "Coming soon".

### Under the hood
- **Client-side caching** — game data is LZString-compressed in `localStorage`, and
  revisits fetch only new games incrementally.
- **No backend** — a purely client-side SPA; no server or environment variables required.

## Tech Stack

| Layer        | Technology                               |
|--------------|------------------------------------------|
| UI Framework | React 18                                 |
| Routing      | React Router v7                          |
| Build        | Vite 5 + `@vitejs/plugin-react`          |
| Language     | TypeScript 5.5 (strict mode)             |
| Styling      | Tailwind CSS v3 + PostCSS + Autoprefixer |
| Charts       | Recharts 2                               |
| Icons        | lucide-react                             |
| Compression  | lz-string (localStorage game cache)      |

## Getting Started

The entire application lives in the [`front/`](./front) directory. Run all commands
from there:

```bash
cd front

# Install dependencies
npm install

# Start the development server
npm run dev

# Production build (outputs to front/dist/)
npm run build

# Preview the production build locally
npm run preview

# Lint (ESLint v9 flat config)
npm run lint
```

No backend, API keys, or environment variables are required — the app talks
directly to the public aoe4world.com API.

## Project Structure

- `front/` — the Vite + React SPA (all application code).
  - `front/src/components/` — UI components (tables, charts, team balancer, ...).
  - `front/src/services/` — pure business logic: API fetching, caching, analysis,
    and team-balancing algorithms.

For detailed conventions, layout, and contributor guidance see
[`AGENTS.md`](./AGENTS.md) (or [`CLAUDE.md`](./CLAUDE.md), which defers to it).

## Developer Objectives

- Experiment with AI tools to enhance the development experience.
- Explore Cloudflare deployment.

## Credits

This project is powered by the [aoe4world.com API](https://aoe4world.com/). It is
an unofficial, fan-made project and is not affiliated with aoe4world, Relic
Entertainment, World's Edge, or Microsoft.

## License

Released under the [MIT License](./LICENSE).
