// Base URL of the aoe4world proxy backend. Defaults to same-origin /api
// (production route and Vite dev proxy). Override with VITE_API_BASE_URL,
// e.g. a workers.dev URL ending in /api.
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || '/api';
