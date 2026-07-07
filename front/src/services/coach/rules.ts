// ============================================================================
// ALL COACH RULES LIVE IN THIS FILE.
//
// Every rule follows the same shape:
//   - a CONFIG const right above it with every tunable threshold,
//   - a CoachRule object whose evaluate(ctx) returns Finding[] ([] = no issue).
//
// To modify a rule: edit its CONFIG (or its logic below it).
// To add a rule: write a new CONFIG + CoachRule pair and append it to
// COACH_RULES at the bottom. Unit/building classification keywords are shared
// and live in config.ts. All times are game-time seconds.
// ============================================================================

import { type CoachRule, type Finding, type Severity } from './findings';
import { type UnitClass } from './config';
import {
  type AgeTimes,
  type PlayerContext,
  AGE_NAMES,
  formatGameTime,
  iconBasename,
  prettyName,
} from './context';

// ============================================================================
// Rule 1 — Idle Town Centers (economy)
// TCs should never stop producing villagers (1 per 20s per TC, French faster)
// until the economy is big enough.
// ============================================================================

export const IDLE_TC_CONFIG = {
  baseVillagerSeconds: 20, // one villager per 20s per TC
  // French produce villagers faster per age (I-IV): 15%, 15%, 20%, 25%.
  frenchSpeedupByAge: { 1: 0.15, 2: 0.15, 3: 0.20, 4: 0.25 } as Record<number, number>,
  frenchCivs: ['french', 'jeanne_darc'],
  graceSeconds: 15, // slack per gap before it counts as idle
  stopAtEconUnits: 110, // stop expecting villagers once this many econ units exist
  maxReportedGaps: 5,
  warningIdleSeconds: 60,
  criticalIdleSeconds: 180,
};

const idleTownCenters: CoachRule = {
  id: 'idleTownCenters',
  topic: 'economy',
  evaluate(ctx) {
    const cfg = IDLE_TC_CONFIG;
    const villagers = ctx.villagerFinishedTimes;
    if (!ctx.player.buildOrder?.length) return [];

    const isFrench = cfg.frenchCivs.includes(ctx.player.civilization);
    const expectedInterval = (t: number) => {
      const speedup = isFrench ? cfg.frenchSpeedupByAge[ctx.ageAt(t)] ?? 0 : 0;
      return cfg.baseVillagerSeconds / (1 + speedup) / ctx.activeTCsAt(t);
    };

    // Walk production gaps from game start until the econ target is reached
    // (rule 9 judges stopping early; this one judges idle time before that).
    const gaps: Array<{ start: number; idle: number }> = [];
    let totalIdle = 0;
    let villagersLost = 0;
    let prev = 0;
    for (const t of [...villagers, ctx.duration]) {
      if (ctx.econUnitCountAt(prev) >= cfg.stopAtEconUnits) break;
      const interval = expectedInterval(prev);
      const idle = t - prev - interval - cfg.graceSeconds;
      if (idle > 0) {
        gaps.push({ start: prev, idle });
        totalIdle += idle;
        villagersLost += idle / interval;
      }
      prev = t;
    }

    if (totalIdle < cfg.warningIdleSeconds) return [];
    const worst = [...gaps].sort((a, b) => b.idle - a.idle).slice(0, cfg.maxReportedGaps);
    return [{
      ruleId: this.id,
      topic: this.topic,
      severity: totalIdle >= cfg.criticalIdleSeconds ? 'critical' : 'warning',
      title: 'Idle Town Center time',
      detail:
        `~${formatGameTime(totalIdle)} of villager production lost across ${gaps.length} gaps — ` +
        `about ${Math.round(villagersLost)} villagers that were never made. Keep every Town Center producing.`,
      timestamps: worst.map(g => g.start).sort((a, b) => a - b),
    }];
  },
};

// ============================================================================
// Rule 2 — No relics collected (economy)
// Relics are free permanent gold income; collect them once in Castle Age.
// ============================================================================

export const RELIC_CONFIG = {
  // Action-name prefixes that count as collecting relics
  // (buildingRelic covers e.g. Golden Horde's buildingRelicOvooMonHaGol).
  actionPrefixes: ['pickupRelic', 'buildingRelic'],
  minSecondsInCastleAge: 300, // only judge if this long passed since castle age
};

const noRelics: CoachRule = {
  id: 'noRelics',
  topic: 'economy',
  evaluate(ctx) {
    const cfg = RELIC_CONFIG;
    const castle = ctx.ages.castle;
    if (castle === undefined || ctx.duration - castle <= cfg.minSecondsInCastleAge) return [];
    if (cfg.actionPrefixes.some(p => ctx.hasActionByPrefix(p))) return [];
    return [{
      ruleId: this.id,
      topic: this.topic,
      severity: 'warning',
      title: 'No relics collected',
      detail: 'No relics were picked up this game. Relics give a steady gold income — grab them with monks after reaching Castle Age.',
      timestamps: [castle],
    }];
  },
};

// ============================================================================
// Rule 3 — Late economic upgrades (economy)
// Gather-rate upgrades (tier 2/3/4 unlock in Feudal/Castle/Imperial) pay for
// themselves quickly; research them soon after aging up.
// ============================================================================

export const ECON_UPGRADES_CONFIG = {
  lateAfterSeconds: 360, // 6 min after reaching the age
  actionKeyPattern: /^upgradeEcon.*Rate([234])/,
};

const ECON_TIER_TO_AGE: Record<string, keyof AgeTimes> = { '2': 'feudal', '3': 'castle', '4': 'imperial' };
const ECON_TIER_TO_AGE_NUM: Record<string, number> = { '2': 2, '3': 3, '4': 4 };

const lateEconUpgrades: CoachRule = {
  id: 'lateEconUpgrades',
  topic: 'economy',
  evaluate(ctx) {
    const cfg = ECON_UPGRADES_CONFIG;
    const findings: Finding[] = [];
    const researchedTiers = new Set<string>();
    const lateOnes: Array<{ key: string; time: number; tier: string }> = [];

    for (const key of ctx.actionKeys()) {
      const m = key.match(cfg.actionKeyPattern);
      if (!m) continue;
      const tier = m[1];
      researchedTiers.add(tier);
      const ageTime = ctx.ages[ECON_TIER_TO_AGE[tier]];
      if (ageTime === undefined) continue;
      const time = ctx.actionTimesByPrefix(key)[0];
      if (time !== undefined && time > ageTime + cfg.lateAfterSeconds) {
        lateOnes.push({ key, time, tier });
      }
    }

    if (lateOnes.length) {
      lateOnes.sort((a, b) => a.time - b.time);
      findings.push({
        ruleId: this.id,
        topic: this.topic,
        severity: 'warning',
        title: 'Late economic upgrades',
        detail:
          `${lateOnes.length} gather-rate upgrade${lateOnes.length > 1 ? 's were' : ' was'} researched more than ` +
          `${formatGameTime(cfg.lateAfterSeconds)} after the age that unlocks them.`,
        timestamps: lateOnes.map(u => u.time),
      });
    }

    // Tiers never researched although their age was reached long ago.
    for (const tier of ['2', '3', '4']) {
      if (researchedTiers.has(tier)) continue;
      const ageTime = ctx.ages[ECON_TIER_TO_AGE[tier]];
      if (ageTime === undefined || ctx.duration <= ageTime + cfg.lateAfterSeconds) continue;
      findings.push({
        ruleId: this.id,
        topic: this.topic,
        severity: 'warning',
        title: `No ${AGE_NAMES[ECON_TIER_TO_AGE_NUM[tier]]} economic upgrades`,
        detail: 'No gather-rate upgrades of that age were researched at all. They pay for themselves in a few minutes.',
        timestamps: [ageTime + cfg.lateAfterSeconds],
      });
    }

    return findings;
  },
};

// ============================================================================
// Rule 4 — Outdated units (military)
// Kept producing lower-tier units long after aging up without buying the
// veteran/elite upgrade. Only units whose icon carries an explicit tier
// suffix (_1.._4) have tiered versions, so only those are judged.
// ============================================================================

export const OUTDATED_UNITS_CONFIG = {
  graceAfterAgeUpSeconds: 180, // 3 min to buy the veteran/elite upgrade
  minLateProductions: 3, // ignore one-off stragglers from a saturated queue
  maxReportedTimestamps: 4,
};

const outdatedUnits: CoachRule = {
  id: 'outdatedUnits',
  topic: 'military',
  evaluate(ctx) {
    const cfg = OUTDATED_UNITS_CONFIG;
    const findings: Finding[] = [];

    const upgradeFinishTime = (base: string, tier: number): number | undefined => {
      const wanted = `${base}_${tier}`;
      for (const e of ctx.player.buildOrder ?? []) {
        if (e.type !== 'Upgrade') continue;
        if (iconBasename(e.icon) !== wanted) continue;
        const t = e.finished?.[0] ?? e.constructed?.[0];
        if (t !== undefined) return t;
      }
      return undefined;
    };

    const windows: Array<{ ageNum: 3 | 4; from: number; to: number }> = [];
    if (ctx.ages.castle !== undefined) {
      windows.push({ ageNum: 3, from: ctx.ages.castle, to: ctx.ages.imperial ?? ctx.duration });
    }
    if (ctx.ages.imperial !== undefined) {
      windows.push({ ageNum: 4, from: ctx.ages.imperial, to: ctx.duration });
    }

    const militaryClasses = ['melee', 'ranged', 'cavalry'];
    const byBase = new Map<string, { tiers: Map<number, number[]> }>();
    for (const u of ctx.classifiedUnits) {
      if (!u.hasTierSuffix || !militaryClasses.includes(u.unitClass)) continue;
      const rec = byBase.get(u.base) ?? { tiers: new Map() };
      const times = rec.tiers.get(u.tier) ?? [];
      times.push(...(u.entry.finished ?? []).filter(t => t > 0));
      rec.tiers.set(u.tier, times);
      byBase.set(u.base, rec);
    }

    for (const [base, rec] of byBase) {
      // At most one finding per unit type: the window with most late productions.
      let best: { ageNum: number; tier: number; late: number[] } | null = null;
      for (const w of windows) {
        const deadline = w.from + cfg.graceAfterAgeUpSeconds;
        for (const [tier, times] of rec.tiers) {
          if (tier >= w.ageNum) continue;
          const late = times.filter(t => t > deadline && t < w.to).sort((a, b) => a - b);
          if (late.length < cfg.minLateProductions) continue;
          // The upgrade was bought in time after all -> data glitch, skip.
          const upgTime = upgradeFinishTime(base, tier + 1);
          if (upgTime !== undefined && upgTime <= deadline) continue;
          if (!best || late.length > best.late.length) best = { ageNum: w.ageNum, tier, late };
        }
      }
      if (best) {
        findings.push({
          ruleId: this.id,
          topic: this.topic,
          severity: 'warning',
          title: `Outdated ${prettyName(base)}`,
          detail:
            `Produced ${best.late.length} tier-${best.tier} ${prettyName(base)} well into the ` +
            `${AGE_NAMES[best.ageNum]} without buying their tier upgrade. Upgrade units within ~3 min of aging up.`,
          timestamps: [...new Set(best.late)].slice(0, cfg.maxReportedTimestamps),
        });
      }
    }

    return findings;
  },
};

// ============================================================================
// Rule 5 — Missing unit-class techs (technology)
// Big armies of a unit class need their key tech in Imperial: Biology for
// cavalry (Royal Bloodlines for French), Incendiary Arrows for ranged,
// Chemistry for gunpowder. Civs without a university are excluded per tech.
// ============================================================================

export const UNIT_CLASS_TECHS: Array<{
  unitClass: UnitClass;
  // Only units whose tier-stripped basename matches one of these count;
  // empty = every unit of the class counts.
  unitKeywords: string[];
  actionPrefixes: string[];
  iconKeywords: string[]; // fallback: buildOrder Upgrade icon basename match
  techName: string;
  minUnits: number;
  civs?: string[]; // only these civs are judged (e.g. civ-specific techs)
  excludeCivs?: string[]; // these civs are skipped (they lack the tech)
}> = [
  {
    unitClass: 'cavalry',
    unitKeywords: [],
    actionPrefixes: ['upgradeTechUniversityBiology'],
    iconKeywords: ['biology'],
    techName: 'Biology',
    minUnits: 8,
    // French have Royal Bloodlines instead; Macedonians and Golden Horde
    // have no university (and no known Biology equivalent).
    excludeCivs: ['french', 'jeanne_darc', 'macedonian_dynasty', 'golden_horde'],
  },
  {
    unitClass: 'cavalry',
    unitKeywords: [],
    actionPrefixes: ['upgradeLandmarkCavalryBloodline'],
    iconKeywords: ['bloodlines'],
    techName: 'Royal Bloodlines',
    minUnits: 8,
    civs: ['french', 'jeanne_darc'],
  },
  {
    unitClass: 'ranged',
    unitKeywords: [],
    actionPrefixes: ['upgradeRangedIncendiary'], // Golden Horde's civ variant is prefix-matched too
    iconKeywords: ['fire_arrows'],
    techName: 'Incendiary Arrows',
    minUnits: 8,
    excludeCivs: ['macedonian_dynasty'], // no university; Arsenal covers them (rule 6)
  },
  {
    unitClass: 'ranged',
    unitKeywords: ['handcannon', 'grenadier', 'streltsy', 'tanegashima', 'gunner'],
    actionPrefixes: ['upgradeTechUniversityChemistry'],
    iconKeywords: ['chemistry'],
    techName: 'Chemistry',
    minUnits: 6,
    excludeCivs: ['macedonian_dynasty', 'golden_horde'], // no university
  },
];

export const UNIT_CLASS_TECHS_CONFIG = {
  graceAfterImperialSeconds: 180,
};

const missingUnitClassTechs: CoachRule = {
  id: 'missingUnitClassTechs',
  topic: 'technology',
  evaluate(ctx) {
    const imperial = ctx.ages.imperial;
    if (imperial === undefined) return [];
    const deadline = imperial + UNIT_CLASS_TECHS_CONFIG.graceAfterImperialSeconds;
    if (ctx.duration <= deadline) return [];

    const findings: Finding[] = [];
    for (const tech of UNIT_CLASS_TECHS) {
      const civ = ctx.player.civilization;
      if (tech.civs && !tech.civs.includes(civ)) continue;
      if (tech.excludeCivs?.includes(civ)) continue;
      const produced = ctx.classifiedUnits
        .filter(u => u.unitClass === tech.unitClass)
        .filter(u => !tech.unitKeywords.length || tech.unitKeywords.some(k => u.base.includes(k)))
        .reduce((n, u) => n + (u.entry.finished?.filter(t => t > 0).length ?? 0), 0);
      if (produced < tech.minUnits) continue;

      let researched = tech.actionPrefixes
        .map(p => ctx.firstActionByPrefix(p))
        .filter((t): t is number => t !== undefined)
        .sort((a, b) => a - b)[0];
      if (researched === undefined) {
        for (const e of ctx.player.buildOrder ?? []) {
          if (e.type !== 'Upgrade') continue;
          const base = iconBasename(e.icon);
          if (!tech.iconKeywords.some(k => base.includes(k))) continue;
          const t = e.finished?.[0] ?? e.constructed?.[0];
          if (t !== undefined && (researched === undefined || t < researched)) researched = t;
        }
      }

      if (researched === undefined) {
        findings.push({
          ruleId: this.id,
          topic: this.topic,
          severity: 'warning',
          title: `${tech.techName} never researched`,
          detail: `Produced ${produced} ${tech.unitClass} units but never researched ${tech.techName} after reaching Imperial Age.`,
          timestamps: [deadline],
        });
      } else if (researched > deadline) {
        findings.push({
          ruleId: this.id,
          topic: this.topic,
          severity: 'info',
          title: `${tech.techName} researched late`,
          detail: `Produced ${produced} ${tech.unitClass} units but only researched ${tech.techName} at ${formatGameTime(researched)} (aim for within ~3 min of Imperial).`,
          timestamps: [researched],
        });
      }
    }
    return findings;
  },
};

// ============================================================================
// Rule 6 — Missing blacksmith upgrades (technology)
// Blacksmith upgrades for the classes you mass — armor first for melee (and
// cavalry, which share those techs), damage first for ranged. Tier n unlocks
// one age after Dark (tiers[0] = Feudal). Macedonians use the Arsenal instead
// of blacksmith + university, with their own tech keys (civOverrides).
// ============================================================================

interface BlacksmithGroup {
  name: string; // shown in the finding title
  unitClasses: UnitClass[]; // which produced units make this group relevant
  prefix: string; // action-key prefix before the tier suffix
  tiers: string[]; // tier suffixes; index 0 unlocks in Feudal, 1 Castle, 2 Imperial
  severity: Severity; // priority family = warning, secondary = info
  advice: string;
}

export const BLACKSMITH_CONFIG = {
  lateAfterSeconds: 240, // 4 min after the age that unlocks a tier
  minUnits: 6, // produce at least this many units of the class to be judged
  groups: [
    { name: 'melee armor', unitClasses: ['melee', 'cavalry'], prefix: 'upgradeMeleeArmor', tiers: ['I', 'Ii', 'Iii'], severity: 'warning', advice: 'Prioritize armor for melee units.' },
    { name: 'melee damage', unitClasses: ['melee', 'cavalry'], prefix: 'upgradeMeleeDamage', tiers: ['I', 'Ii', 'Iii'], severity: 'info', advice: '' },
    { name: 'ranged damage', unitClasses: ['ranged'], prefix: 'upgradeRangedDamage', tiers: ['I', 'Ii', 'Iii'], severity: 'warning', advice: 'Prioritize damage for ranged units.' },
    { name: 'ranged armor', unitClasses: ['ranged'], prefix: 'upgradeRangedArmor', tiers: ['I', 'Ii', 'Iii'], severity: 'info', advice: '' },
  ] as BlacksmithGroup[],
  civOverrides: {
    macedonian_dynasty: [
      { name: 'Arsenal cavalry survivability', unitClasses: ['cavalry'], prefix: 'upgradeArsenalCavalrySurvivability', tiers: ['', '2', '3'], severity: 'warning', advice: 'Prioritize survivability for cavalry.' },
      { name: 'Arsenal cavalry damage', unitClasses: ['cavalry'], prefix: 'upgradeArsenalCavalryDamage', tiers: ['', '2', '3'], severity: 'info', advice: '' },
      { name: 'Arsenal ranged damage', unitClasses: ['ranged'], prefix: 'upgradeArsenalRangedDamage', tiers: ['', '2'], severity: 'warning', advice: 'Prioritize damage for ranged units.' },
      { name: 'Arsenal ranged survivability', unitClasses: ['ranged'], prefix: 'upgradeArsenalRangedSurvivability', tiers: ['', '2'], severity: 'info', advice: '' },
    ],
  } as Record<string, BlacksmithGroup[]>,
};

// Action keys look like upgradeMeleeArmorIi, upgradeMeleeArmorIJpn or
// upgradeArsenalCavalryDamage2ByzHaMac: prefix + tier + optional civ suffix
// (starts uppercase). A plain startsWith would let tier "I" also match
// "Ii"/"Iii" (and "" match "2"), so the char right after the tier must not be
// a lowercase letter or digit.
function earliestBlacksmithTier(ctx: PlayerContext, prefix: string, tierSuffix: string): number | undefined {
  const full = `${prefix}${tierSuffix}`;
  let earliest: number | undefined;
  for (const key of ctx.actionKeys()) {
    if (!key.startsWith(full)) continue;
    const next = key.charAt(full.length);
    if (next && /[a-z0-9]/.test(next)) continue;
    const t = ctx.actionTimesByPrefix(key)[0];
    if (t !== undefined && (earliest === undefined || t < earliest)) earliest = t;
  }
  return earliest;
}

const BLACKSMITH_TIER_AGE: Array<keyof AgeTimes> = ['feudal', 'castle', 'imperial'];

const missingBlacksmithUpgrades: CoachRule = {
  id: 'missingBlacksmithUpgrades',
  topic: 'technology',
  evaluate(ctx) {
    const cfg = BLACKSMITH_CONFIG;
    const groups = cfg.civOverrides[ctx.player.civilization] ?? cfg.groups;
    const findings: Finding[] = [];

    for (const group of groups) {
      const produced = ctx.classifiedUnits
        .filter(u => group.unitClasses.includes(u.unitClass))
        .reduce((n, u) => n + (u.entry.finished?.filter(t => t > 0).length ?? 0), 0);
      if (produced < cfg.minUnits) continue;

      const missing: string[] = [];
      const late: number[] = [];
      for (let i = 0; i < group.tiers.length; i++) {
        const ageTime = ctx.ages[BLACKSMITH_TIER_AGE[i]];
        if (ageTime === undefined) continue;
        const deadline = ageTime + cfg.lateAfterSeconds;
        if (ctx.duration <= deadline) continue;
        const researched = earliestBlacksmithTier(ctx, group.prefix, group.tiers[i]);
        if (researched === undefined) missing.push(`${i + 1}`);
        else if (researched > deadline) late.push(researched);
      }
      if (!missing.length && !late.length) continue;

      const classes = group.unitClasses.join('/');
      const parts: string[] = [];
      if (missing.length) parts.push(`tier ${missing.join(', ')} never researched`);
      if (late.length) parts.push(`${late.length} tier${late.length > 1 ? 's' : ''} researched late (${late.map(formatGameTime).join(', ')})`);
      findings.push({
        ruleId: this.id,
        topic: this.topic,
        severity: group.severity,
        title: `${group.name} behind`,
        detail:
          `Produced ${produced} ${classes} units but ${group.name} upgrades lag behind: ${parts.join('; ')}. ` +
          `${group.advice} Research each tier within ~${Math.round(cfg.lateAfterSeconds / 60)} min of its age.`.trim(),
        timestamps: late.length ? late : undefined,
      });
    }
    return findings;
  },
};

// ============================================================================
// Rule 7 — Villager losses (economy)
// Dead villagers are lost economy. Deaths are clustered into "raids" so the
// timestamps point at the moments the player got punished.
// ============================================================================

export const VILLAGER_LOSS_CONFIG = {
  warningLosses: 6, // > 5
  criticalLosses: 16, // > 15
  raidGapSeconds: 60, // deaths closer than this belong to the same raid
};

const villagerLosses: CoachRule = {
  id: 'villagerLosses',
  topic: 'economy',
  evaluate(ctx) {
    const cfg = VILLAGER_LOSS_CONFIG;
    const deaths = ctx.villagerDeathTimes;
    if (deaths.length < cfg.warningLosses) return [];

    const clusters: number[] = [];
    let prev = -Infinity;
    for (const t of deaths) {
      if (t - prev > cfg.raidGapSeconds) clusters.push(t);
      prev = t;
    }

    return [{
      ruleId: this.id,
      topic: this.topic,
      severity: deaths.length >= cfg.criticalLosses ? 'critical' : 'warning',
      title: 'Villager losses',
      detail:
        `Lost ${deaths.length} villagers across ${clusters.length} raid${clusters.length > 1 ? 's' : ''}. ` +
        'Pull villagers to safety early and build defenses around exposed resources.',
      timestamps: clusters,
    }];
  },
};

// ============================================================================
// Rule 8 — Floating resources (economy)
// Unspent resources are wasted potential until the population cap is reached.
// Uses the ~20s-sampled stockpile series against per-age thresholds. Stacking
// food+gold shortly before an age-up is normal and is not flagged.
// ============================================================================

export const FLOATING_RESOURCES_CONFIG = {
  popCap: 190, // stop judging once the pop proxy reaches this
  thresholdByAge: { 1: 800, 2: 1200, 3: 2000, 4: 3000 } as Record<number, number>,
  minWindowSeconds: 60, // must float this long to count
  criticalWindowSeconds: 180,
  maxReportedWindows: 4,
  dominantResourceShare: 0.25, // resources holding at least this share are named
  // Saving food+gold shortly before an age-up is normal, not floating:
  // windows ending within this many seconds before an age-up whose float is
  // mostly food+gold are ignored.
  ageUpSavingWindowSeconds: 240,
  ageUpSavingFoodGoldShare: 0.7,
};

const RESOURCE_NAMES = ['food', 'wood', 'gold', 'stone'] as const;
type ResourceName = (typeof RESOURCE_NAMES)[number];

interface FloatWindow {
  start: number;
  end: number;
  peakTotal: number;
  peakByResource: Record<ResourceName, number>;
}

const floatingResources: CoachRule = {
  id: 'floatingResources',
  topic: 'economy',
  evaluate(ctx) {
    const cfg = FLOATING_RESOURCES_CONFIG;
    const r = ctx.resources;
    const ts = r?.timestamps;
    if (!r || !ts?.length) return [];

    const at = (name: ResourceName, i: number) => r[name]?.[i] ?? 0;
    const windows: FloatWindow[] = [];
    let run: FloatWindow | null = null;

    const closeRun = () => {
      if (run && run.end - run.start >= cfg.minWindowSeconds) windows.push(run);
      run = null;
    };

    for (let i = 0; i < ts.length; i++) {
      const t = ts[i];
      const byResource = Object.fromEntries(
        RESOURCE_NAMES.map(n => [n, at(n, i)]),
      ) as Record<ResourceName, number>;
      const total = RESOURCE_NAMES.reduce((s, n) => s + byResource[n], 0);
      const over = ctx.totalUnitCountAt(t) < cfg.popCap && total > cfg.thresholdByAge[ctx.ageAt(t)];
      if (!over) {
        closeRun();
        continue;
      }
      if (!run) {
        run = { start: t, end: t, peakTotal: total, peakByResource: byResource };
      } else {
        run.end = t;
        if (total > run.peakTotal) {
          run.peakTotal = total;
          run.peakByResource = byResource;
        }
      }
    }
    closeRun();

    // Saving up mostly food+gold right before an age-up is fine.
    const ageUps = [ctx.ages.feudal, ctx.ages.castle, ctx.ages.imperial]
      .filter((t): t is number => t !== undefined);
    const isAgeUpSaving = (w: FloatWindow) => {
      const foodGold = w.peakByResource.food + w.peakByResource.gold;
      if (foodGold < w.peakTotal * cfg.ageUpSavingFoodGoldShare) return false;
      return ageUps.some(a => w.end >= a - cfg.ageUpSavingWindowSeconds && w.start <= a);
    };
    const flagged = windows.filter(w => !isAgeUpSaving(w));
    if (!flagged.length) return [];

    const worst = flagged.reduce((a, b) => (b.peakTotal > a.peakTotal ? b : a));
    const dominant = RESOURCE_NAMES
      .filter(n => worst.peakByResource[n] >= worst.peakTotal * cfg.dominantResourceShare)
      .map(n => `${n} (~${worst.peakByResource[n]})`);
    const longest = Math.max(...flagged.map(w => w.end - w.start));

    return [{
      ruleId: this.id,
      topic: this.topic,
      severity: longest >= cfg.criticalWindowSeconds ? 'critical' : 'warning',
      title: 'Floating resources',
      detail:
        `Sat on large unspent stockpiles ${flagged.length} time${flagged.length > 1 ? 's' : ''} ` +
        `(peak ~${worst.peakTotal} at ${formatGameTime(worst.start)}, mostly ${dominant.join(', ')}; ` +
        `longest stretch ${formatGameTime(longest)}). ` +
        'Spend on units, upgrades or production buildings — banked resources do nothing.',
      timestamps: flagged.slice(0, cfg.maxReportedWindows).map(w => w.start),
    }];
  },
};

// ============================================================================
// Rule 9 — Stopped villager production early (economy)
// Keep making villagers until ~100 economic units (merchants/traders count).
// ============================================================================

export const STOPPED_VILLAGERS_CONFIG = {
  targetEconUnits: 100,
  minIdleTailSeconds: 240, // no villager for this long before game end
  minGameSeconds: 900, // don't judge very short games
};

const stoppedVillagerProduction: CoachRule = {
  id: 'stoppedVillagerProduction',
  topic: 'economy',
  evaluate(ctx) {
    const cfg = STOPPED_VILLAGERS_CONFIG;
    if (ctx.duration < cfg.minGameSeconds) return [];
    const villagers = ctx.villagerFinishedTimes;
    if (!villagers.length) return [];

    const lastVillager = villagers[villagers.length - 1];
    if (ctx.duration - lastVillager <= cfg.minIdleTailSeconds) return [];
    // Peak count over the whole game, so traders made after the last villager
    // still count towards the target.
    const peakEcon = Math.max(
      ...ctx.econUnitFinishedTimes.map(t => ctx.econUnitCountAt(t)),
      0,
    );
    if (peakEcon >= cfg.targetEconUnits) return [];

    return [{
      ruleId: this.id,
      topic: this.topic,
      severity: 'warning',
      title: 'Stopped villager production early',
      detail:
        `Last villager finished at ${formatGameTime(lastVillager)}; the economy peaked at ~${peakEcon} economic units. ` +
        `Keep producing until ~${cfg.targetEconUnits} economic units (villagers + traders).`,
      timestamps: [lastVillager],
    }];
  },
};

// ============================================================================
// Rule 10 — No university in Imperial (technology)
// Build a university soon after Imperial (its techs are army-wide force
// multipliers). Civs without a university are excluded.
// ============================================================================

export const UNIVERSITY_CONFIG = {
  // Macedonians use the Arsenal; Golden Horde has no university either.
  excludedCivs: ['macedonian_dynasty', 'golden_horde'],
  graceAfterImperialSeconds: 180,
  iconKeyword: 'university',
};

const noUniversity: CoachRule = {
  id: 'noUniversity',
  topic: 'technology',
  evaluate(ctx) {
    const cfg = UNIVERSITY_CONFIG;
    const imperial = ctx.ages.imperial;
    if (imperial === undefined) return [];
    if (cfg.excludedCivs.includes(ctx.player.civilization)) return [];
    const deadline = imperial + cfg.graceAfterImperialSeconds;
    if (ctx.duration <= deadline) return [];

    const built = ctx
      .entriesByIconKeyword([cfg.iconKeyword], 'Building')
      .flatMap(e => e.constructed ?? [])
      .some(t => t <= deadline);
    if (built) return [];

    return [{
      ruleId: this.id,
      topic: this.topic,
      severity: 'warning',
      title: 'No university in Imperial',
      detail: 'No university was built within ~3 min of reaching Imperial Age. Its techs (Biology, Incendiary Arrows, Chemistry…) upgrade your whole army.',
      timestamps: [deadline],
    }];
  },
};

// ============================================================================
// Rule 11 — Idle military production / too few buildings (military)
// Two heuristics: (a) too few military production buildings for the age,
// (b) stretches where existing buildings produced far below capacity. Both
// are approximations (the data can't distinguish idleness from resource
// starvation), hence generous thresholds.
// ============================================================================

export const MILITARY_PRODUCTION_CONFIG = {
  minBuildingsByAge: { 2: 1, 3: 2, 4: 4 } as Record<number, number>,
  graceAfterAgeUpSeconds: 180,
  secondsPerUnitPerBuilding: 35, // rough average train time
  bucketSeconds: 60,
  minIdleBuckets: 3, // consecutive low-production buckets before flagging
  lowProductionRatio: 0.3, // producing under 30% of capacity counts as idle
  maxReportedRuns: 4,
};

const idleMilitaryProduction: CoachRule = {
  id: 'idleMilitaryProduction',
  topic: 'military',
  evaluate(ctx) {
    const cfg = MILITARY_PRODUCTION_CONFIG;
    const findings: Finding[] = [];

    // (a) building count below the per-age minimum after a grace period.
    const ageTimes: Array<{ ageNum: number; time: number | undefined }> = [
      { ageNum: 2, time: ctx.ages.feudal },
      { ageNum: 3, time: ctx.ages.castle },
      { ageNum: 4, time: ctx.ages.imperial },
    ];
    for (const { ageNum, time } of ageTimes) {
      if (time === undefined) continue;
      const required = cfg.minBuildingsByAge[ageNum];
      const checkTime = time + cfg.graceAfterAgeUpSeconds;
      if (ctx.duration <= checkTime) continue;
      const count = ctx.militaryBuildingCountAt(checkTime);
      if (count >= required) continue;
      findings.push({
        ruleId: this.id,
        topic: this.topic,
        severity: count === 0 ? 'warning' : 'info',
        title: `Few military buildings in ${AGE_NAMES[ageNum]}`,
        detail: `Only ${count} military production building${count === 1 ? '' : 's'} ${formatGameTime(cfg.graceAfterAgeUpSeconds)} into ${AGE_NAMES[ageNum]} (aim for at least ${required}).`,
        timestamps: [checkTime],
      });
    }

    // (b) sustained low production vs. building capacity, in 60s buckets.
    const firstBuilding = ctx.militaryBuildingCountAt(ctx.duration) > 0
      ? (() => {
          let t = 0;
          while (t < ctx.duration && ctx.militaryBuildingCountAt(t) === 0) t += cfg.bucketSeconds;
          return t;
        })()
      : undefined;
    if (firstBuilding !== undefined) {
      const runs: Array<{ start: number; buckets: number }> = [];
      let current: { start: number; buckets: number } | null = null;
      // Start judging in Feudal at the earliest (Dark Age military is optional)
      // and skip the final partial bucket: production legitimately winds down
      // as the game ends or the population cap is hit.
      const scanFrom = Math.max(firstBuilding, ctx.ages.feudal ?? 0);
      for (let t = scanFrom; t + cfg.bucketSeconds <= ctx.duration; t += cfg.bucketSeconds) {
        const buildings = ctx.militaryBuildingCountAt(t);
        const popCapped = ctx.totalUnitCountAt(t) >= FLOATING_RESOURCES_CONFIG.popCap;
        const expected = (buildings * cfg.bucketSeconds) / cfg.secondsPerUnitPerBuilding;
        const produced = ctx.militaryUnitTimes.filter(u => u >= t && u < t + cfg.bucketSeconds).length;
        const idle = buildings > 0 && !popCapped && produced < expected * cfg.lowProductionRatio;
        if (idle) {
          if (!current) current = { start: t, buckets: 0 };
          current.buckets++;
        } else if (current) {
          if (current.buckets >= cfg.minIdleBuckets) runs.push(current);
          current = null;
        }
      }
      if (current && current.buckets >= cfg.minIdleBuckets) runs.push(current);

      if (runs.length) {
        const totalIdleSeconds = runs.reduce((s, r) => s + r.buckets * cfg.bucketSeconds, 0);
        findings.push({
          ruleId: this.id,
          topic: this.topic,
          severity: 'warning',
          title: 'Idle military production',
          detail:
            `Military buildings produced far below capacity for ~${formatGameTime(totalIdleSeconds)} in total ` +
            `(${runs.length} stretch${runs.length > 1 ? 'es' : ''}). Keep production queues running or add rally/hotkey cycles.`,
          timestamps: runs.slice(0, cfg.maxReportedRuns).map(r => r.start),
        });
      }
    }

    return findings;
  },
};

// ============================================================================
// Rule 12 — Idle villagers (general) — DISABLED
// The summary contains no per-villager idle data. The closest field is
// player._stats.inactperiod, but its semantics are unconfirmed (likely
// overall player inactivity, not villager idle time). Flip `enabled` once
// better data exists.
// ============================================================================

export const IDLE_VILLAGERS_CONFIG = {
  enabled: false,
};

const idleVillagers: CoachRule = {
  id: 'idleVillagers',
  topic: 'general',
  evaluate(ctx) {
    if (!IDLE_VILLAGERS_CONFIG.enabled) return [];
    const inactperiod = ctx.player._stats?.inactperiod;
    if (inactperiod === undefined) return [];
    return [{
      ruleId: this.id,
      topic: this.topic,
      severity: 'info',
      title: 'Inactivity (experimental)',
      detail: `_stats.inactperiod = ${inactperiod} (semantics unverified).`,
    }];
  },
};

// ============================================================================
// Rule 13 — Low APM (general)
// Below `good` is a warning; below `bad` is critical.
// ============================================================================

export const APM_CONFIG = {
  good: 100,
  bad: 70,
};

const lowApm: CoachRule = {
  id: 'lowApm',
  topic: 'general',
  evaluate(ctx) {
    const apm = ctx.player.apm;
    if (apm === undefined || apm >= APM_CONFIG.good) return [];
    return [{
      ruleId: this.id,
      topic: this.topic,
      severity: apm < APM_CONFIG.bad ? 'critical' : 'warning',
      title: 'Low APM',
      detail: `${apm} actions per minute (aim for at least ${APM_CONFIG.good}). Practice hotkeys and a production/economy camera cycle to act faster.`,
    }];
  },
};

// ============================================================================
// Registry — the engine runs these in order. Add new rules here.
// ============================================================================

export const COACH_RULES: CoachRule[] = [
  idleTownCenters, // 1
  noRelics, // 2
  lateEconUpgrades, // 3
  outdatedUnits, // 4
  missingUnitClassTechs, // 5
  missingBlacksmithUpgrades, // 6
  villagerLosses, // 7
  floatingResources, // 8
  stoppedVillagerProduction, // 9
  noUniversity, // 10
  idleMilitaryProduction, // 11
  idleVillagers, // 12 (disabled)
  lowApm, // 13
];
