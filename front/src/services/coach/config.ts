// Shared unit/building classification used by the context builder and the
// rules. Per-rule thresholds live next to each rule in rules.ts.

export type UnitClass = 'villager' | 'siege' | 'cavalry' | 'ranged' | 'melee' | 'other';

// Matched against the icon basename with the tier suffix (_2/_3/_4) stripped,
// e.g. "icons/races/common/units/archer_2" -> "archer". First class that
// matches wins, in this order: villager, siege, cavalry, ranged, melee.
// Unmatched units fall to 'other' and are simply not judged.
export const UNIT_KEYWORDS: Record<Exclude<UnitClass, 'other'>, string[]> = {
  villager: ['villager'],
  siege: [
    'ram', 'mangonel', 'springald', 'trebuchet', 'bombard', 'culverin',
    'ribauldequin', 'nest_of_bees', 'cannon', 'scorpion', 'siege_tower',
  ],
  cavalry: [
    'horseman', 'knight', 'lancer', 'camel_rider', 'camel_lancer', 'keshik',
    'ghazi', 'sipahi', 'mounted', 'cataphract', 'riddari', 'gilded_horseman',
    'scout', 'khan', 'daimyo', 'king', 'jeannes_rider',
    // Tughluq war elephants (mounted). healer_elephant is also religious
    // (see RELIGIOUS_UNIT_KEYWORDS).
    'elephant_raider', 'healer_elephant',
  ],
  ranged: [
    'archer', 'crossbow', 'arbaletrier', 'longbow', 'zhuge_nu', 'handcannon',
    'mangudai', 'javelin', 'grenadier', 'streltsy', 'gunner', 'yumi',
    'tanegashima', 'bogmadr', 'jannisary', 'wynguard_ranger',
  ],
  melee: [
    'spearman', 'manatarms', 'landsknecht', 'landskrecht', 'samurai',
    'palace_guard', 'ghulam', 'donso', 'musofadi', 'zhanmadao', 'limitanei',
    'varangian', 'yari', 'torguud', 'kharash',
    // Shaolin monk fights in melee and is also religious (see below).
    'shaolin_monk',
  ],
};

// Religious units (relic carriers / holy-site capturers). A parallel overlay
// like ECON_UNIT_KEYWORDS: a unit may carry both a military UnitClass and the
// religious tag. 'monk' also matches shaolin_monk; healer_elephant is the
// Tughluq healer (also cavalry above).
export const RELIGIOUS_UNIT_KEYWORDS = ['monk', 'healer_elephant'];

// Economic units: villagers plus merchants/traders (yatai is the Sengoku trader).
// imperial_official is the Chinese economic supervisor (boosts buildings/gather).
export const ECON_UNIT_KEYWORDS = ['villager', 'trader', 'trade_cart', 'fishing_boat', 'yatai', 'imperial_official'];

// Land military production buildings (icon basename keywords).
// Note: varangian_arsenal is the Macedonian blacksmith equivalent, not a
// production building, so it is deliberately absent.
// military_school is the Ottoman unit-producing building (auto-trains units).
export const MILITARY_BUILDING_KEYWORDS = [
  'barracks', 'archery_range', 'stable', 'siege_workshop',
  'varangian_stronghold', 'warcamp', 'military_academy', 'stockyard',
  'military_school',
];

// Town centers (icon basename keywords).
export const TC_KEYWORDS = ['town_center', 'town_centre_capitol'];
