// Privacy-light usage analytics. Events (app_open, profile_load, section_time)
// are beaconed to the Worker's POST /api/track endpoint, which stores them in
// Cloudflare Analytics Engine (see backend/ANALYTICS.md). The only identity
// ever sent is a truncated SHA-256 hash of the viewed player's nickname.
//
// Disabled in dev: besides polluting the data, the Vite proxy would forward
// /api/track straight to aoe4world.

import { API_BASE_URL } from './apiConfig';

const ENABLED = !import.meta.env.DEV;
const TRACK_URL = `${API_BASE_URL}/track`;
const MIN_DURATION_SECONDS = 1;

let currentSection: string | null = null;
// Timestamp since the current section has been visible; null while the tab is
// hidden. Durations count visible time only.
let visibleSince: number | null = null;
let accumulatedMs = 0;
let nickHash = 'anonymous';
let lastIdentifiedName: string | null = null;
let initialized = false;

export function initAnalytics(): void {
  if (!ENABLED || initialized) return;
  initialized = true;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      flushSectionTime();
    } else if (currentSection !== null) {
      visibleSince = Date.now();
    }
  });
  // Flushing on hidden already covers most tab closes; pagehide catches the
  // rest (e.g. navigation away while visible).
  window.addEventListener('pagehide', flushSectionTime);

  send('app_open', 'home', 0);
}

export function identifyUser(nickname: string | null): void {
  if (!ENABLED) return;
  if (!nickname) {
    nickHash = 'anonymous';
    lastIdentifiedName = null;
    return;
  }
  if (nickname === lastIdentifiedName) return;
  lastIdentifiedName = nickname;
  void hashNickname(nickname).then(hash => {
    nickHash = hash;
    send('profile_load', currentSection ?? 'home', 0);
  });
}

export function trackSection(section: string): void {
  if (!ENABLED || section === currentSection) return;
  flushSectionTime();
  currentSection = section;
  if (!document.hidden) visibleSince = Date.now();
}

// Send the accumulated visible time of the current section and zero the
// accumulator, so repeated flushes (hidden -> pagehide) never double count.
function flushSectionTime(): void {
  if (visibleSince !== null) {
    accumulatedMs += Date.now() - visibleSince;
    visibleSince = null;
  }
  const seconds = accumulatedMs / 1000;
  accumulatedMs = 0;
  if (currentSection !== null && seconds >= MIN_DURATION_SECONDS) {
    send('section_time', currentSection, Math.round(seconds));
  }
}

async function hashNickname(name: string): Promise<string> {
  if (!crypto?.subtle) return 'anonymous';
  const data = new TextEncoder().encode(name.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

function send(type: string, section: string, duration: number): void {
  if (!navigator.sendBeacon) return;
  const body = JSON.stringify({ type, section, nickHash, duration });
  // text/plain keeps the beacon a CORS "simple request" (no preflight) when
  // API_BASE_URL points at a cross-origin workers.dev URL.
  navigator.sendBeacon(TRACK_URL, new Blob([body], { type: 'text/plain' }));
}
