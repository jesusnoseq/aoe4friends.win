---
name: verify
description: How to run and verify changes in the aoe4friends SPA (dev server, live aoe4world data via proxy, logic checks without a browser).
---

# Verifying aoe4friends changes

## Build / launch

- All commands from `front/`. `npm run lint` and `npm run build` must pass (TS strict), but they are CI checks, not verification.
- `npm run dev` starts Vite (default port 5173; picks 5174+ if busy). The dev server proxies `/api` to https://aoe4world.com with the app's User-Agent (see `front/vite.config.ts`), so the app runs against **live data** with no backend or env vars.

## Driving with real data

- Find a profile: `curl "http://localhost:<port>/api/v0/players/search?query=<name>"` → `players[0].profile_id`. The repo owner's profile is `jesusnoseq` = 3995534 (plays lots of team games — good test subject).
- Games feed: `/api/v0/players/<id>/games?page=N` (50 games/page). Shape: `game.teams` is an array of sides, each side an array of `{ player }` wrappers.
- App URLs: `http://localhost:<port>/<profileId>` (stats), `/<profileId>/<section>` for other tabs.

## Verifying pure analysis logic without a browser

If the Chrome extension isn't connected, the aggregation helpers in
`front/src/services/aoe4worldAnalysis.ts` can be exercised against live data:

```sh
npx esbuild src/services/aoe4worldAnalysis.ts --bundle --format=esm --outfile=<scratch>/analysis.mjs
```

Then a node `.mjs` script can `import` the bundle, `fetch` games pages through
the dev-server proxy, and cross-check new aggregations against
`analyzeGames()` totals (they share the win/loss conventions: anything other
than `result === 'win'` counts as a loss).

## Gotchas

- Games in `localStorage` cache (`aoe4friends_games_<id>`, lz-string) — hard-refresh or clear storage if the UI shows stale data.
- Port 5173 is often already taken by the user's own running dev server, which hot-reloads edits — visual checks can happen there too.
