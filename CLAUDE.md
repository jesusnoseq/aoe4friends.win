# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Read this first

All codebase conventions — repository layout, tech stack, commands, TypeScript
config, code style, architecture notes, and pre-submit checks — live in
**[AGENTS.md](./AGENTS.md)**. Read it before making changes and follow it.

## Quick reference

- The entire project lives in `front/` (a client-side Vite + React SPA). There is
  no backend and no required environment variables.
- Run all commands from `front/`: `npm run dev`, `npm run build`, `npm run lint`.
- There are no tests configured.

## Before submitting changes

From `front/`, both must pass cleanly:

1. `npm run lint` — fix all ESLint errors and warnings.
2. `npm run build` — must succeed with zero TypeScript errors (strict mode).
