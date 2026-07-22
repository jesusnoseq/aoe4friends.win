// SQL builders for the aoe4friends_usage dataset. Mirrors the example
// queries documented in backend/ANALYTICS.md. Rows are always weighted by
// _sample_interval because Analytics Engine samples data under load.

export type DayRange = 7 | 30 | 90;

export const SECTIONS = ['home', 'stats', 'balanced', 'checker', 'coach'] as const;
export type Section = (typeof SECTIONS)[number];

export interface SectionDayRow {
  day: string;
  section: string;
  seconds: number;
}

export interface VisitsDayRow {
  day: string;
  section: string;
  visits: number;
}

export interface WeekUsersRow {
  week: string;
  users: number;
}

export interface NickSectionRow {
  nick_hash: string;
  section: string;
  seconds: number;
}

export interface CountryRow {
  country: string;
  visits: number;
}

export interface EventTypeRow {
  event: string;
  count: number;
}

export function timePerSectionPerDay(days: DayRange): string {
  return `
    SELECT toStartOfInterval(timestamp, INTERVAL '1' DAY) AS day,
           blob2 AS section,
           SUM(double1 * _sample_interval) AS seconds
    FROM aoe4friends_usage
    WHERE blob1 = 'section_time' AND timestamp > NOW() - INTERVAL '${days}' DAY
    GROUP BY day, section
    ORDER BY day, section
  `;
}

export function visitsPerSectionPerDay(days: DayRange): string {
  return `
    SELECT toStartOfInterval(timestamp, INTERVAL '1' DAY) AS day,
           blob2 AS section,
           SUM(_sample_interval) AS visits
    FROM aoe4friends_usage
    WHERE blob1 = 'section_time' AND timestamp > NOW() - INTERVAL '${days}' DAY
    GROUP BY day, section
    ORDER BY day, section
  `;
}

export function distinctUsersPerWeek(): string {
  return `
    SELECT toStartOfInterval(timestamp, INTERVAL '7' DAY) AS week,
           COUNT(DISTINCT index1) AS users
    FROM aoe4friends_usage
    GROUP BY week
    ORDER BY week
  `;
}

export function timePerNickPerSection(days: DayRange): string {
  return `
    SELECT blob3 AS nick_hash,
           blob2 AS section,
           SUM(double1 * _sample_interval) AS seconds
    FROM aoe4friends_usage
    WHERE blob1 = 'section_time' AND timestamp > NOW() - INTERVAL '${days}' DAY
    GROUP BY nick_hash, section
    ORDER BY seconds DESC
  `;
}

export function visitsByCountry(days: DayRange): string {
  return `
    SELECT blob4 AS country,
           SUM(_sample_interval) AS visits
    FROM aoe4friends_usage
    WHERE blob1 = 'app_open' AND timestamp > NOW() - INTERVAL '${days}' DAY
    GROUP BY country
    ORDER BY visits DESC
  `;
}

export function eventTypeCounts(days: DayRange): string {
  return `
    SELECT blob1 AS event,
           SUM(_sample_interval) AS count
    FROM aoe4friends_usage
    WHERE timestamp > NOW() - INTERVAL '${days}' DAY
    GROUP BY event
  `;
}

const SECTION_COLORS: Record<Section, string> = {
  home: '#60a5fa',
  stats: '#4ade80',
  balanced: '#fbbf24',
  checker: '#a78bfa',
  coach: '#f87171',
};

export function sectionColor(section: string): string {
  return SECTION_COLORS[section as Section] ?? '#9ca3af';
}

/** Pivots {day, section, value}[] rows into one object per day with a key per section, zero-filled. */
export function pivotByDay<K extends string>(
  rows: ({ day: string; section: string } & Record<K, number>)[],
  valueKey: K
): Record<string, string | number>[] {
  const byDay = new Map<string, Record<string, string | number>>();

  for (const row of rows) {
    const day = formatDay(row.day);
    if (!byDay.has(day)) {
      const base: Record<string, string | number> = { day };
      for (const section of SECTIONS) base[section] = 0;
      byDay.set(day, base);
    }
    const entry = byDay.get(day)!;
    entry[row.section] = Number(row[valueKey]) + (Number(entry[row.section]) || 0);
  }

  return Array.from(byDay.values()).sort((a, b) =>
    String(a.day).localeCompare(String(b.day))
  );
}

function formatDay(raw: string): string {
  // toStartOfInterval returns e.g. "2026-07-13T00:00:00Z" or "2026-07-13 00:00:00".
  const datePart = raw.slice(0, 10);
  return datePart.slice(5); // MM-DD
}
