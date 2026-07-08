import { type GameSummary, type SummaryPlayer, type BuildOrderEntry, type ResourceSeries } from './types';
import {
  type UnitClass,
  UNIT_KEYWORDS,
  ECON_UNIT_KEYWORDS,
  MILITARY_BUILDING_KEYWORDS,
  TC_KEYWORDS,
} from './config';

export interface ClassifiedUnit {
  entry: BuildOrderEntry;
  base: string; // icon basename with the tier suffix stripped
  unitClass: UnitClass;
  tier: 1 | 2 | 3 | 4;
  hasTierSuffix: boolean; // icon explicitly ends in _1.._4 (unit has tiered versions)
}

export interface AgeTimes {
  feudal?: number;
  castle?: number;
  imperial?: number;
}

export interface PlayerContext {
  summary: GameSummary;
  player: SummaryPlayer;
  duration: number;
  ages: AgeTimes;
  ageAt(t: number): 1 | 2 | 3 | 4;
  // Actions: prefix matching includes civ-suffixed keys (e.g. ...Rate2Jpn).
  actionTimesByPrefix(prefix: string): number[];
  firstActionByPrefix(prefix: string): number | undefined;
  hasActionByPrefix(prefix: string): boolean;
  actionKeys(): string[];
  // Build order
  entriesByIconKeyword(keywords: string[], type?: string): BuildOrderEntry[];
  classifiedUnits: ClassifiedUnit[];
  villagerFinishedTimes: number[]; // t=0 starting villagers excluded
  villagerDeathTimes: number[];
  activeTCsAt(t: number): number;
  econUnitCountAt(t: number): number;
  econUnitFinishedTimes: number[]; // villagers + traders/merchants, sorted
  totalUnitCountAt(t: number): number; // rough population proxy
  militaryUnitTimes: number[]; // finished times of melee/ranged/cavalry/siege units
  militaryBuildingCountAt(t: number): number;
  resources?: ResourceSeries;
}

// Icon basename: "icons/races/common/units/archer_2" -> "archer_2".
export function iconBasename(icon: string): string {
  const i = icon.lastIndexOf('/');
  return i >= 0 ? icon.slice(i + 1) : icon;
}

// Trailing tier marker. Covers the classic "_2".."_4" form and the newer
// civ-specific "_age2" / "_age_3" forms (Byzantine, Macedonian, Golden Horde,
// Knights Templar). e.g. "archer_2", "bogmadr_age2", "templar_brother_age_3".
const TIER_SUFFIX = /_(?:age_?)?([1-4])$/;

// "archer_2" -> { base: "archer", tier: 2, hasTierSuffix: true }
// "bogmadr_age2" -> { base: "bogmadr", tier: 2, hasTierSuffix: true }
export function stripTier(basename: string): { base: string; tier: 1 | 2 | 3 | 4; hasTierSuffix: boolean } {
  const m = basename.match(TIER_SUFFIX);
  if (!m) return { base: basename, tier: 1, hasTierSuffix: false };
  return { base: basename.replace(TIER_SUFFIX, ''), tier: Number(m[1]) as 1 | 2 | 3 | 4, hasTierSuffix: true };
}

function matchesAnyKeyword(base: string, keywords: string[]): boolean {
  return keywords.some(k => base.includes(k));
}

export function classifyUnitBase(base: string): UnitClass {
  const order: Array<Exclude<UnitClass, 'other'>> = ['villager', 'naval', 'siege', 'cavalry', 'ranged', 'melee'];
  for (const cls of order) {
    if (matchesAnyKeyword(base, UNIT_KEYWORDS[cls])) return cls;
  }
  return 'other';
}

// Timeline of +1/-1 events -> count of alive instances at time t.
function makeCounter(added: number[], removed: number[]): (t: number) => number {
  const events = added
    .map(time => ({ time, delta: +1 }))
    .concat(removed.map(time => ({ time, delta: -1 })))
    .sort((a, b) => a.time - b.time || b.delta - a.delta);
  return (t: number) => {
    let count = 0;
    for (const e of events) {
      if (e.time > t) break;
      count += e.delta;
    }
    return count;
  };
}

export function buildPlayerContext(summary: GameSummary, player: SummaryPlayer): PlayerContext {
  const actions = player.actions ?? {};
  const buildOrder = player.buildOrder ?? [];
  const duration = summary.duration;

  const ages: AgeTimes = {
    feudal: actions['feudalAge']?.[0],
    castle: actions['castleAge']?.[0],
    imperial: actions['imperialAge']?.[0],
  };

  const ageAt = (t: number): 1 | 2 | 3 | 4 => {
    if (ages.imperial !== undefined && t >= ages.imperial) return 4;
    if (ages.castle !== undefined && t >= ages.castle) return 3;
    if (ages.feudal !== undefined && t >= ages.feudal) return 2;
    return 1;
  };

  const actionTimesByPrefix = (prefix: string): number[] => {
    const times: number[] = [];
    for (const [key, value] of Object.entries(actions)) {
      if (key.startsWith(prefix) && Array.isArray(value)) times.push(...value);
    }
    return times.sort((a, b) => a - b);
  };

  // Some entries are mislabeled upstream: a few buildings (e.g. the Knights
  // Templar 'fortress') arrive with type "Unit" but carry a constructed[]
  // timeline and no finished[]. Classify by shape, not just the declared type.
  const hasConstructed = (e: BuildOrderEntry) => (e.constructed?.length ?? 0) > 0;
  const isBuildingEntry = (e: BuildOrderEntry) => e.type === 'Building' || hasConstructed(e);
  const isUnitEntry = (e: BuildOrderEntry) => e.type === 'Unit' && !hasConstructed(e);

  const entriesByIconKeyword = (keywords: string[], type?: string): BuildOrderEntry[] =>
    buildOrder.filter(e => {
      if (type === 'Building') {
        if (!isBuildingEntry(e)) return false;
      } else if (type && e.type !== type) {
        return false;
      }
      return matchesAnyKeyword(iconBasename(e.icon), keywords);
    });

  const classifiedUnits: ClassifiedUnit[] = buildOrder
    .filter(isUnitEntry)
    .map(e => {
      const { base, tier, hasTierSuffix } = stripTier(iconBasename(e.icon));
      return { entry: e, base, unitClass: classifyUnitBase(base), tier, hasTierSuffix };
    });

  const villagerUnits = classifiedUnits.filter(u => u.unitClass === 'villager');
  const villagerFinishedTimes = villagerUnits
    .flatMap(u => u.entry.finished ?? [])
    .filter(t => t > 0)
    .sort((a, b) => a - b);
  const villagerDeathTimes = villagerUnits
    .flatMap(u => u.entry.destroyed ?? [])
    .sort((a, b) => a - b);

  const tcEntries = entriesByIconKeyword(TC_KEYWORDS, 'Building');
  const tcCounter = makeCounter(
    tcEntries.flatMap(e => e.constructed ?? []),
    tcEntries.flatMap(e => e.destroyed ?? []),
  );
  // Every player starts with a TC (constructed at t=0 in the data); guard in
  // case the capital is missing from the build order.
  const activeTCsAt = (t: number) => Math.max(tcCounter(t), 1);

  const econUnits = classifiedUnits.filter(u => matchesAnyKeyword(u.base, ECON_UNIT_KEYWORDS));
  const econUnitFinishedTimes = econUnits
    .flatMap(u => u.entry.finished ?? [])
    .sort((a, b) => a - b);
  const econCounter = makeCounter(
    econUnitFinishedTimes,
    econUnits.flatMap(u => u.entry.destroyed ?? []),
  );

  const allUnitsCounter = makeCounter(
    classifiedUnits.flatMap(u => u.entry.finished ?? []),
    classifiedUnits.flatMap(u => u.entry.destroyed ?? []),
  );

  const militaryClasses: UnitClass[] = ['melee', 'ranged', 'cavalry', 'siege', 'naval'];
  const militaryUnitTimes = classifiedUnits
    .filter(u => militaryClasses.includes(u.unitClass))
    .flatMap(u => u.entry.finished ?? [])
    .filter(t => t > 0)
    .sort((a, b) => a - b);

  const milBuildings = entriesByIconKeyword(MILITARY_BUILDING_KEYWORDS, 'Building');
  const milBuildingCounter = makeCounter(
    milBuildings.flatMap(e => e.constructed ?? []),
    milBuildings.flatMap(e => e.destroyed ?? []),
  );

  return {
    summary,
    player,
    duration,
    ages,
    ageAt,
    actionTimesByPrefix,
    firstActionByPrefix: prefix => actionTimesByPrefix(prefix)[0],
    hasActionByPrefix: prefix => Object.keys(actions).some(k => k.startsWith(prefix)),
    actionKeys: () => Object.keys(actions),
    entriesByIconKeyword,
    classifiedUnits,
    villagerFinishedTimes,
    villagerDeathTimes,
    activeTCsAt,
    econUnitCountAt: econCounter,
    econUnitFinishedTimes,
    totalUnitCountAt: allUnitsCounter,
    militaryUnitTimes,
    militaryBuildingCountAt: milBuildingCounter,
    resources: player.resources,
  };
}

export const AGE_NAMES: Record<number, string> = {
  1: 'Dark Age',
  2: 'Feudal Age',
  3: 'Castle Age',
  4: 'Imperial Age',
};

// "gilded_manatarms" -> "Gilded Manatarms" (for finding texts).
export function prettyName(base: string): string {
  return base
    .split('_')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatGameTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
