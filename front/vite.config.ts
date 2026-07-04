import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      // Mirrors the production Cloudflare Worker in backend/: the dev server
      // (not the browser) calls aoe4world with the app's User-Agent.
      '/api': {
        target: 'https://aoe4world.com',
        changeOrigin: true,
        headers: { 'User-Agent': 'aoe4friends (@jesusnoseq)' },
      },
    },
  },
});
