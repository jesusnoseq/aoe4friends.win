# AGENTS.md — aoe4friends Codebase Guide

This file provides guidance for AI coding agents working in this repository.

---

## Repository Layout

```
aoe4friends/
├── AGENTS.md               ← This guide (shared AI agent conventions)
├── CLAUDE.md               ← Claude Code entry point (defers to AGENTS.md)
├── README.md               ← Project overview
├── skills-lock.json        ← Pinned versions of autoskills (see .agents/)
├── .agents/skills/         ← Vendored skills: accessibility, frontend-design, seo
├── backend/                ← Cloudflare Worker proxying /api/v0/* to aoe4world.com
│   ├── package.json        ← wrangler scripts (dev, deploy, typecheck)
│   ├── wrangler.jsonc      ← Worker config (name: aoe4friends-api)
│   ├── tsconfig.json
│   └── src/index.ts        ← The proxy (GET-only, sets the app User-Agent)
└── front/                  ← The web app lives here (Vite + React SPA)
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
    ├── eslint.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── public/                              ← Static assets (robots.txt, sitemap.xml)
    └── src/
        ├── main.tsx                         ← React DOM entry point
        ├── App.tsx                          ← Root component + routing
        ├── index.css                        ← Tailwind entry stylesheet
        ├── vite-env.d.ts                    ← Vite type declarations
        ├── components/                      ← UI components
        │   ├── AICoach.tsx                  ← "AI Coach (BETA)" placeholder
        │   ├── AlliesTable.tsx
        │   ├── OpponentsTable.tsx
        │   ├── BalancedTeams.tsx
        │   ├── CivCharts.tsx
        │   ├── GameDurationChart.tsx
        │   ├── MapBarChart.tsx
        │   ├── SortableTh.tsx
        │   └── Spinner.tsx
        └── services/                        ← Business logic, types, API
            ├── apiConfig.ts                 ← API base URL (VITE_API_BASE_URL, default /api)
            ├── aoe4worldTypes.request.ts    ← API response types & enums
            ├── aoe4worldTypes.analysis.ts   ← Analysis result types
            ├── aoe4worldRequests.ts         ← Fetch + LZString cache helpers
            ├── aoe4worldAnalysis.ts         ← Pure analysis functions
            └── balancedTeamsLogic.ts        ← Team balancing algorithms
```

Application work happens in `front/` (the SPA) and `backend/` (a minimal Cloudflare Worker). The browser never calls aoe4world.com directly: the SPA requests `${API_BASE_URL}/v0/...` (default `/api`), which the Vite dev proxy serves in development and the Worker serves in production, forwarding upstream with the `aoe4friends (@jesusnoseq)` User-Agent. The `AICoach` component is currently a "Coming soon" placeholder — despite the "AI Coach" name it makes no API calls and requires no keys.

---

## Tech Stack

| Layer        | Technology                                      |
|--------------|-------------------------------------------------|
| UI Framework | React 18                                        |
| Routing      | React Router v7                                 |
| Build        | Vite 5 + `@vitejs/plugin-react`                 |
| Language     | TypeScript 5.5 (strict mode)                    |
| Styling      | Tailwind CSS v3 + PostCSS + Autoprefixer        |
| Charts       | Recharts 2                                      |
| Icons        | Lucide React                                    |
| Compression  | lz-string (localStorage game cache)             |

---

## Commands

Frontend commands must be run from the `front/` directory.

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Production build (outputs to front/dist/)
npm run build

# Preview production build locally
npm run preview

# Lint (ESLint v9 flat config)
npm run lint
```

Backend (Cloudflare Worker) commands run from `backend/`:

```bash
npm install        # once
npm run dev        # wrangler dev on http://localhost:8787
npm run typecheck  # tsc --noEmit
npm run deploy     # wrangler deploy
```

### Testing

**There are currently no tests.** No test runner (Vitest, Jest, etc.) is installed or configured. There are no `*.test.*` or `*.spec.*` files. The service layer (`src/services/`) contains pure functions that are well-suited for unit testing if tests are added in future.

If adding tests, Vitest is the recommended choice given the Vite build setup. A typical single-test run would look like:

```bash
npx vitest run src/services/aoe4worldAnalysis.test.ts
```

---

## TypeScript Configuration

The project uses **strict TypeScript**. Key compiler options (`tsconfig.app.json`):

- `"strict": true` — all strict checks enabled
- `"noUnusedLocals": true` — unused local variables are errors
- `"noUnusedParameters": true` — unused function parameters are errors
- `"noFallthroughCasesInSwitch": true` — switch fallthrough is an error
- `"moduleResolution": "bundler"` — Vite-style resolution
- `"allowImportingTsExtensions": true` — `.tsx` extensions allowed in imports

Do not disable strict mode or suppress these checks. Fix type errors properly.

---

## Code Style Guidelines

### Imports

- Use ES module `import`/`export` exclusively — no `require()`.
- Use named imports for services and types; default imports for components.
- Use the inline `type` keyword for type-only imports:
  ```ts
  import { type RatingMode, type BalanceAlgorithm } from '../services/balancedTeamsLogic';
  ```
- Include `.tsx` extensions explicitly when importing components:
  ```ts
  import App from './App.tsx';
  ```
- Group imports: external libraries first, then internal services/types, then components.

### Naming Conventions

| Item                        | Convention              | Example                            |
|-----------------------------|-------------------------|------------------------------------|
| React components            | PascalCase              | `AlliesTable`, `SortableTh`        |
| Interfaces / Types          | PascalCase              | `CBTPlayer`, `TeamsState`          |
| Enums (name + members)      | PascalCase              | `Leaderboard.RmSolo`, `Result.Win` |
| Functions / variables       | camelCase               | `analyzeGames`, `handleSubmit`     |
| True constants              | SCREAMING_SNAKE_CASE    | `STRENGTH_COEFFICIENT`, `AI_DIFFICULTIES` |
| Type aliases (unions, etc.) | PascalCase              | `RatingMode`, `MatchTypeFilter`    |
| Component props interfaces  | `Props` suffix per file | `interface Props { ... }`          |

### Types

- Define explicit `interface Props` for every component — no anonymous inline prop types.
- Use TypeScript enums for domain values (`Leaderboard`, `Civilization`, `Result`, `Server`).
- Avoid `any` except at external API boundaries (e.g., raw `fetch` response parsing). When `any` is unavoidable, limit its scope.
- Use non-null assertions (`!`) only when you can guarantee non-null (e.g., `document.getElementById('root')!`).
- Prefer `type` for union types and aliases; prefer `interface` for object shapes.
- Do not use `React.FC<Props>` exclusively — typed function declarations are also acceptable:
  ```ts
  // Both are used in this codebase:
  const MyComponent: React.FC<Props> = ({ foo }) => { ... };
  function MyComponent({ foo }: Props) { ... }
  ```

### Formatting

There is no Prettier config. Follow the existing style observed in the codebase:

- 2-space indentation.
- Single quotes for strings in TypeScript/TSX.
- Trailing commas in multi-line arrays and objects.
- Semicolons at end of statements.
- Opening braces on the same line (`if (cond) {`).
- JSX attributes on the same line for short props; one-per-line for long prop lists.

### Styling

- Use **Tailwind CSS utility classes** exclusively for all styling.
- No CSS modules, no styled-components, no inline `style` objects (except unavoidable SVG attributes).
- Construct conditional class strings with template literals directly — no `clsx`/`classnames` helper is currently used, though either may be added.

### Components

- Functional components only — no class components.
- Keep business logic in `src/services/` as pure functions; components consume and display.
- Use `useMemo` for expensive derived data (see `AlliesTable.tsx` for the filter example).
- Use `useRef` for values that must not trigger re-renders.
- Inline sub-components inside a parent are acceptable for small scoped helpers (see `TeamColumn` inside `BalancedTeams.tsx`), but prefer separate files for reusable components.

### Error Handling

- Use `try/catch/finally` in all async functions.
- Throw errors with descriptive messages: `throw new Error('Failed to fetch games: ' + status)`.
- Surface errors to users via component state (`setError('...')`), not `alert()` or console only.
- Use `console.error` for internal failures, `console.warn` for non-fatal issues (e.g., localStorage quota).
- Handle known storage errors by name:
  ```ts
  if (e instanceof DOMException &&
      (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
    console.warn('localStorage quota exceeded');
  }
  ```
- Do not swallow errors silently unless intentional and commented.

---

## Architecture Notes

- **Separation of concerns**: API types, fetch logic, analysis logic, and algorithm logic live in `src/services/` as pure modules. Components in `src/components/` only handle rendering and user interaction.
- **localStorage caching**: Game data is LZString-compressed before storage. Incremental updates fetch only new games on re-visits. See `aoe4worldRequests.ts`.
- **URL-based deep linking**: Player profile IDs are embedded in the URL path via React Router (`/:profileIdParam?`), enabling bookmarkable links. Routing is defined in `App.tsx`.
- **API proxy**: All data comes from the public aoe4world.com API, but always through the `/api` proxy (Vite dev proxy locally, the `backend/` Worker in production) — never directly from the browser. The base URL is configurable via `VITE_API_BASE_URL` (see `src/services/apiConfig.ts`); no environment variables are required for basic usage.
- **No CI/CD**: There is no `.github/workflows/` directory. Linting and building must be run manually.

---

## Before Submitting Changes

1. Run `npm run lint` from `front/` — fix all ESLint errors and warnings.
2. Run `npm run build` from `front/` — the build must succeed with zero TypeScript errors.
3. Ensure no new `noUnusedLocals` or `noUnusedParameters` violations are introduced.
4. If adding new service functions, keep them pure (no side effects) where possible.
