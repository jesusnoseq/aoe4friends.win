import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Empty prefix loads all vars, including ones without VITE_ — those stay
  // server-side only (Vite never inlines them into client code), which is
  // what keeps the Cloudflare API token out of the browser bundle.
  const env = loadEnv(mode, __dirname, '');
  const accountId = env.CLOUDFLARE_ACCOUNT_ID ?? '';
  const token = env.CLOUDFLARE_API_TOKEN ?? '';

  return {
    plugins: [react()],
    server: {
      port: 5174,
      proxy: {
        // The dev server (not the browser) calls the Cloudflare Analytics
        // Engine SQL API with the bearer token, mirroring how front/vite.config.ts
        // proxies aoe4world with a server-side header.
        '/cf-sql': {
          target: 'https://api.cloudflare.com',
          changeOrigin: true,
          headers: { Authorization: `Bearer ${token}` },
          rewrite: () => `/client/v4/accounts/${accountId}/analytics_engine/sql`,
        },
      },
    },
  };
});
