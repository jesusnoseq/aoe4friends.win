# aoe4friends analytics

A local-only dashboard for the usage data the main app beacons to Cloudflare
Workers Analytics Engine. It visualizes the queries documented in
[`../backend/ANALYTICS.md`](../backend/ANALYTICS.md): time and visits per
section per day, distinct users per week, visits by country, event type
totals, and a per-user breakdown (with optional friend-nickname labeling).

This app has no server component of its own and is never deployed — it runs
with `npm run dev` and talks to the Cloudflare Analytics Engine **SQL API**
directly from your machine. The Cloudflare API token is read by the Vite dev
server and injected into a proxied request server-side, so it never reaches
the browser or gets bundled into any JS.

## Quick start

1. **Create a Cloudflare API token.**
   Cloudflare dashboard → My Profile → API Tokens → Create Custom Token →
   permission **Account | Account Analytics | Read**.

2. **Find your Account ID.**
   Cloudflare dashboard → Workers & Pages overview → right sidebar.

3. **Configure credentials.**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in both values:

   ```
   CLOUDFLARE_ACCOUNT_ID=your-account-id-here
   CLOUDFLARE_API_TOKEN=your-api-token-here
   ```

   `.env` is gitignored — it's never committed. `.env.example` is the
   committed template.

4. **Install and run.**

   ```bash
   npm install
   npm run dev
   ```

   Open the URL Vite prints (default `http://localhost:5174`).

If the token or account ID is wrong or missing, each chart card shows the
Cloudflare API's error message inline instead of failing silently.

## Friend labels

The "Time per user per section" table shows a `nick_hash` (first 16 hex
characters of `SHA-256(nickname.trim().toLowerCase())`) per row — the same
hash the main app computes client-side, with no raw nicknames ever sent to
Cloudflare. Add a nickname in the "Friend labels" box and, if it matches a
hash in the data, that row is labeled with the name instead of the hash. The
friend list and the matching are entirely local (browser `localStorage` +
Web Crypto); nothing is sent anywhere. See "Matching hashes to friends" in
`../backend/ANALYTICS.md` for the offline `sha256sum` equivalent.

## Notes

- Retention on the dataset is ~90 days, so the date-range selector tops out
  at 90 days.
- Cloudflare Analytics Engine samples data under load; all queries weight
  rows by `_sample_interval` rather than using raw row counts, per the
  guidance in `../backend/ANALYTICS.md`.
- `npm run build` type-checks (`tsc -b`, strict mode) and builds a static
  bundle, but that bundle isn't meant to be deployed anywhere — the proxy
  only exists in the Vite dev server.
