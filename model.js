export const MAX_WEAPONS = 4;
export const WEAPONS = {
  fireball: { name: 'Fireball', icon: '✹', detail: 'Ignites enemies with fire magic', category: 'spell', knockback: 45, evolution: 'Meteor Storm', requires: 'core', ultimate: 'Solar Tempest' },
  lightning: { name: 'Lightning', icon: 'ϟ', detail: 'Electricity chains between enemies', category: 'spell', evolution: 'Storm Web', requires: 'cell', ultimate: 'Thunderstorm' },
  frost: { name: 'Frost Spike', icon: '❄', detail: 'Slows enemies and has a 25% chance to freeze', category: 'spell', knockback: 25, ultimate: 'Permafrost' },
  pistol: { name: 'Pistol', icon: '➤', detail: 'A balanced ranged weapon', category: 'ranged', knockback: 35, ultimate: 'Storm Pistol' },
  machinegun: { name: 'Machine Gun', icon: '»', detail: 'Very fast, low-damage shots', category: 'ranged', knockback: 12, ultimate: 'Firestorm' },
  sniper: { name: 'Sniper Rifle', icon: '⇥', detail: 'Slow, powerful piercing shots', category: 'ranged', knockback: 125, ultimate: 'Railgun' },
  boomerang: { name: 'Boomerang', icon: '⌁', detail: 'A piercing returning throw', category: 'ranged', knockback: 65, ultimate: 'Whirlwind' },
  blade: { name: 'Blade Ring', icon: '◈', detail: 'A ring of close-range blades', category: 'melee', knockback: 55, ultimate: 'Blade Storm' },
  sword: { name: 'Sword', icon: '⚔', detail: 'A wide melee arc with knockback', category: 'melee', knockback: 190, ultimate: 'Excalibur' },
  spear: { name: 'Spear', icon: '➶', detail: 'A long, narrow piercing thrust', category: 'melee', knockback: 120, ultimate: 'Sky Spear' },
  dagger: { name: 'Dagger', icon: '†', detail: 'Short reach, high critical chance, little knockback', category: 'melee', knockback: 8, ultimate: 'Shadow Blade' },
  turret: { name: 'Wrench', icon: '⚒', detail: 'Melee strikes and a deployed gun turret', category: 'engineering', knockback: 30, wrenchKnockback: 150, evolution: 'Hunter', requires: 'lens', ultimate: 'Fortress Wrench' },
  mine: { name: 'Mine', icon: '⊕', detail: 'An explosive placed on the ground', category: 'engineering', knockback: 180, ultimate: 'Minefield' },
  acid: { name: 'Acid Grenade', icon: '◉', detail: 'Leaves a damaging acid pool', category: 'engineering', ultimate: 'Acid Storm' }
};
export const ACTIVE_SKILLS = {
  fireball: { name: 'Fire Nova', cooldown: 10, detail: 'Launch eight fireballs that always ignite enemies.' },
  lightning: { name: 'Lightning Surge', cooldown: 12, detail: 'Strike up to five enemies and stun them for 0.8 seconds.' },
  frost: { name: 'Frost Nova', cooldown: 12, detail: 'Freeze enemies within 180 range for 1.75 seconds.' },
  pistol: { name: 'Rapid Fire', cooldown: 10, detail: 'Fire three times faster with +1 pierce for 2 seconds.' },
  machinegun: { name: 'Overdrive', cooldown: 12, detail: 'Fire twice as fast with triple knockback for 2 seconds.' },
  sniper: { name: 'Power Shot', cooldown: 12, detail: 'Fire a piercing shot that marks targets for 3 seconds; marked enemies take 25% more direct damage.' },
  boomerang: { name: 'Whirling Throws', cooldown: 11, detail: 'Throw six boomerangs and pull XP and gold within 250 range.' },
  blade: { name: 'Blade Burst', cooldown: 10, detail: 'Damage nearby enemies and gain 0.5 seconds of protection.' },
  sword: { name: 'Whirlwind', cooldown: 10, detail: 'Strike nearby enemies with 60% extra knockback.' },
  spear: { name: 'Triple Thrust', cooldown: 10, detail: 'Thrust in three directions and stun hit enemies for 0.65 seconds.' },
  dagger: { name: 'Execution', cooldown: 9, detail: 'Strike with high critical chance; killing an enemy resets Evade.' },
  turret: { name: 'Turret Overdrive', cooldown: 12, detail: 'Your turret fires twice as fast and gains 150 range for 3 seconds.' },
  mine: { name: 'Mine Cluster', cooldown: 12, detail: 'Deploy five mines that stun enemies for 0.75 seconds.' },
  acid: { name: 'Acid Rain', cooldown: 12, detail: 'Launch four grenades whose acid pools slow enemies inside.' }
};
export const EVADE = { cooldown: 5, duration: .2, speed: 650, image: 'assets/skill-icons/green-surge.png' };
export const HERO_SKILL_COOLDOWN = 6;
export const HERO_SKILL_MAX_LEVEL = 4;
export const HERO_SKILLS = {
  warrior: { name: 'Sundering Arc', icon: '➶', image: 'assets/skill-icons/sword-cleave.png', category: 'melee', detail: level => `Cleave a ${235 + level * 15} range arc for ${70 + level * 32} melee damage; stun and hurl enemies away.` },
  scout: { name: 'Deadeye Bolt', icon: '➤', image: 'assets/skill-icons/blue-bolt.png', category: 'ranged', detail: level => `Fire a wide, fast, piercing ${85 + level * 35} damage shot that marks targets for ${3 + level}s.` },
  mage: { name: 'Arcane Comet', icon: '✹', image: 'assets/skill-icons/fireball.png', category: 'spell', detail: level => `Launch an explosive fireball for ${50 + level * 30} spell damage; its ${95 + level * 12} radius blast ignites enemies.` },
  engineer: { name: 'Siege Charge', icon: '⚒', image: 'assets/skill-icons/explosion.png', category: 'engineering', detail: level => `Launch a bomb for ${75 + level * 34} engineering damage; its ${100 + level * 14} radius blast stuns enemies.` }
};
export const HERO_SECONDARY_SKILLS = {
  warrior: { name: 'Iron Tempest', icon: '✸', image: 'assets/skill-icons/whirlwind.png', category: 'melee', unlockLevel: 3, cooldown: 9, detail: level => `Charge ${230 + level * 20} units through a line, dealing ${100 + level * 40} melee damage and knocking foes aside.` },
  scout: { name: 'Pinning Volley', icon: '➶', image: 'assets/skill-icons/burst-volley.png', category: 'ranged', unlockLevel: 3, cooldown: 9, detail: level => `Fire three piercing shots in a narrow fan for ${42 + level * 16} ranged damage each; briefly stun and mark each hit.` },
  mage: { name: 'Firewall', icon: '♨', image: 'assets/skill-icons/arcane-strike.png', category: 'spell', unlockLevel: 3, cooldown: 11, detail: level => `Raise a ${150 + level * 20} half-length burning wall; it blasts, ignites and repels enemies.` },
  engineer: { name: 'Field Sentry', icon: '⚒', image: 'assets/skill-icons/explosion.png', category: 'engineering', unlockLevel: 3, cooldown: 7, detail: level => `Deploy a permanent sentry at the target; it stays until the wave ends and independently fires explosive shots at nearby enemies.` }
};
export const HERO_PASSIVES = {
  warrior: { name: 'Open Wounds', icon: '✸', image: 'assets/skill-icons/sword-cleave.png', category: 'melee', unlockLevel: 5, detail: level => `Melee hits cause ${2 + level}% weapon damage as bleed per tick${level === 4 ? '; hits deal 10% more damage to bleeding enemies' : ''}.` },
  scout: { name: 'Ricochet Rounds', icon: '⤴', image: 'assets/skill-icons/arrow-volley.png', category: 'ranged', unlockLevel: 5, detail: level => `Ranged shots pierce and ricochet to ${Math.ceil(level / 2)} extra target${level > 2 ? 's' : ''}${level === 4 ? '; each chained hit gains 10% damage' : ''}.` },
  mage: { name: 'Cinderburst', icon: '♨', image: 'assets/skill-icons/skull.png', category: 'spell', unlockLevel: 5, detail: level => `Burning enemies explode on death for ${28 + level * 14} base spell damage within ${55 + level * 12} range; explosions can chain.` },
  engineer: { name: 'Ricochet Circuit', icon: 'ϟ', image: 'assets/skill-icons/arcane-strike.png', category: 'engineering', unlockLevel: 5, detail: level => `During Turret Overclock, engineering projectiles gain ${level * 2.5}% damage per ricochet.` }
};
export const HERO_PASSIVE_MAX_LEVEL = 4;
export const ULTIMATE_COOLDOWN = 20;
export const ULTIMATE_UPGRADE_CHANCE = .08;
export const ULTIMATES = {
  warrior: { name: 'Earthshaker', icon: '✸', image: 'assets/skill-icons/explosion.png', category: 'melee', detail: level => `Smash enemies within ${240 + level * 45} range for ${180 + level * 90} melee damage, stun and hurl them back; gain 1.2 seconds of protection.` },
  scout: { name: 'Bullet Storm', icon: '✷', image: 'assets/skill-icons/arrow-volley.png', category: 'ranged', detail: level => `Fire ${16 + level * 4} piercing shots in all directions, each dealing ${85 + level * 35} ranged damage.` },
  mage: { name: 'Inferno', icon: '✹', image: 'assets/skill-icons/fireball.png', category: 'spell', detail: level => `Scorch enemies within ${250 + level * 45} range for ${140 + level * 70} spell damage, hurl them back and ignite them. Wildfire spreads the burn.` },
  engineer: { name: 'Turret Overclock', icon: 'ϟ', image: 'assets/skill-icons/green-surge.png', category: 'engineering', detail: level => `For ${4 + level}s, all turrets fire twice as fast and their shots ricochet between ${1 + level} additional enemies.` }
};
export const CHARACTERS = {
  warrior: { name: 'Warrior', weapon: 'sword', ability: 'Up to +30% melee damage as health decreases' },
  scout: { name: 'Scout', weapon: 'pistol', ability: '+10% movement speed and +10% ranged damage', stats: { speed: 10, ranged: 10 } },
  mage: { name: 'Mage', weapon: 'fireball', ability: '+15% spell damage, +15% damage, +10% attack speed and +6 armor', stats: { spell: 15, damage: 15, attackSpeed: 10, armor: 6 } },
  engineer: { name: 'Engineer', weapon: 'turret', ability: '+15% engineering, +15% damage and +6 armor', stats: { engineering: 15, damage: 15, armor: 6 } }
};
export const CATEGORIES = {
  melee: { name: 'MELEE', color: '#ff8b93', iconImage: 'assets/skill-icons/sword-cleave.png' },
  ranged: { name: 'RANGED', color: '#8bdd99', iconImage: 'assets/skill-icons/arrow-volley.png' },
  spell: { name: 'SPELL', color: '#f4d477', iconImage: 'assets/skill-icons/fireball.png' },
  engineering: { name: 'ENGINEERING', color: '#83bfff', iconImage: 'assets/skill-icons/explosion.png' }
};
export const ITEMS = {
  strafe: { name: 'Class Strafe', icon: '➟', special: 'Transforms Evade into a class-specific move' },
  autoMastery: { name: 'Basic Attack Mastery', icon: '⚔', special: '+20% basic-attack damage, +4% firing speed (not Engineer turret)', progression: '+1 strike/projectile at ranks 3 and 6' },
  core: { name: 'Fire Core', icon: '✦', category: 'spell', special: '+15% Fireball hit damage' },
  cell: { name: 'Energy Cell', icon: '▰', stats: { attackSpeed: 8 } },
  armor: { name: 'Iron Armor', icon: '⬡', stats: { armor: 4 } },
  life: { name: 'Life Crystal', icon: '♥', special: '+15 max HP' },
  magnet: { name: 'Magnet', icon: '⊂', special: '+35 pickup radius' },
  lens: { name: 'Targeting Lens', icon: '◎', stats: { crit: 5 } },
  investment: { name: 'Investor’s Purse', icon: '◆', stats: { attackSpeed: -5 }, special: '+4 gold at the end of each wave' },
  whetstone: { name: 'Whetstone', icon: '◆', category: 'melee', stats: { melee: 16 } },
  gauntlet: { name: 'Heavy Gauntlet', icon: '✊', category: 'melee', stats: { melee: 14, speed: -4 } },
  bulwark: { name: 'Battle Shield', icon: '⬟', category: 'melee', stats: { armor: 5, attackSpeed: -4 } },
  rage: { name: 'Mark of Rage', icon: '✚', category: 'melee', stats: { melee: 12, armor: -3 }, rare: true },
  scope: { name: 'Long Scope', icon: '⊙', category: 'ranged', stats: { ranged: 16 } },
  quiver: { name: 'Light Quiver', icon: '➶', category: 'ranged', stats: { ranged: 10, armor: -3 } },
  trigger: { name: 'Hair Trigger', icon: '»', category: 'ranged', stats: { attackSpeed: 10, spell: -2 } },
  marksman: { name: 'Marksman’s Mark', icon: '⊕', category: 'ranged', stats: { crit: 7, speed: -3 } },
  grimoire: { name: 'Grimoire', icon: '▤', category: 'spell', stats: { spell: 16 } },
  prism: { name: 'Light Prism', icon: '◇', category: 'spell', stats: { spell: 12, armor: -3 } },
  focus: { name: 'Focus', icon: '✺', category: 'spell', stats: { spell: 10, ranged: -2 } },
  embers: { name: 'Glowing Embers', icon: '♨', category: 'spell', stats: { armor: -2 }, special: '+7 burn damage per tick' },
  flint: { name: 'Flint', icon: '✧', category: 'spell', stats: { ranged: -2 }, special: '+15 percentage points Fireball ignition chance' },
  wildfire: { name: 'Wildfire', icon: '⌁', category: 'spell', special: 'Burn spreads to +1 nearby enemy per burning target' },
  scorchRounds: { name: 'Scorch Rounds', icon: '♨', special: 'Any hit has a 30% chance to ignite its target', rare: true },
  volatile: { name: 'Volatile Core', icon: '✹', stats: { armor: -2 }, special: 'Enemies explode on death for 30% of their max HP in a 100 radius', rare: true },
  harvest: { name: 'Blood Harvest', icon: '♥', special: 'Restore 2 HP whenever you kill an enemy' },
  gearbox: { name: 'Gearbox', icon: '⚙', category: 'engineering', stats: { engineering: 16 } },
  toolkit: { name: 'Toolkit', icon: '⌗', category: 'engineering', stats: { engineering: 12, speed: -4 } },
  battery: { name: 'Overloaded Battery', icon: '▣', category: 'engineering', stats: { engineering: 10, armor: -3 }, rare: true },
  circuit: { name: 'Control Circuit', icon: '⌘', category: 'engineering', stats: { engineering: 12, melee: -2 } },
  boots: { name: 'Running Boots', icon: '➟', stats: { speed: 8 } },
  clover: { name: 'Lucky Charm', icon: '✿', stats: { luck: 20, attackSpeed: -4 } },
  plating: { name: 'Heavy Plating', icon: '▥', stats: { armor: 7, speed: -4 } },
  reflex: { name: 'Reflex Spring', icon: '↯', stats: { attackSpeed: 9, armor: -3 } },
  bloodstone: { name: 'Bloodstone', icon: '♦', category: 'melee', stats: { lifeLeech: 3, spell: -2 } },
  siphon: { name: 'Siphon Coil', icon: '♧', stats: { lifeLeech: 4, armor: -3 } },
  fangs: { name: 'Sharp Fangs', icon: '⋁', category: 'melee', stats: { lifeLeech: 2, ranged: -2 } },
  catalyst: { name: 'Universal Catalyst', icon: '✧', stats: { damage: 8, armor: -3 } },
  impact: { name: 'Impact Bracer', icon: '⬡', stats: { knockback: 35, attackSpeed: -4 } },
  recoil: { name: 'Recoil Spring', icon: '↔', category: 'ranged', stats: { knockback: 25, armor: -3 } }
};
export const RARITIES = [
  { id: 'normal', name: 'Normal', color: '#b2bdca', weight: 70, multiplier: 1 },
  { id: 'rare', name: 'Rare', color: '#69aaff', weight: 18, multiplier: 2 },
  { id: 'epic', name: 'Epic', color: '#bf85ff', weight: 8, multiplier: 3 },
  { id: 'mythic', name: 'Mythic', color: '#ff6b78', weight: 3, multiplier: 4 },
  { id: 'legendary', name: 'Legendary', color: '#ffad4d', weight: 1, multiplier: 5 }
];
export const STATS = {
  damage: { name: 'All Damage', unit: '%', base: 5 },
  ranged: { name: 'Ranged Damage', unit: '%', base: 8 },
  melee: { name: 'Melee Damage', unit: '%', base: 8 },
  spell: { name: 'Spell Damage', unit: '%', base: 8 },
  engineering: { name: 'Engineering', unit: '%', base: 8 },
  attackSpeed: { name: 'Attack Speed', unit: '%', base: 5 },
  armor: { name: 'Armor', unit: '', base: 2 },
  crit: { name: 'Critical Chance', unit: '%', base: 3 },
  speed: { name: 'Movement Speed', unit: '%', base: 4 },
  luck: { name: 'Luck', unit: '%', base: 12 },
  lifeLeech: { name: 'Life Steal', unit: '%', base: 1 },
  health: { name: 'Max Health', unit: '', base: 8 },
  knockback: { name: 'Knockback', unit: '%', base: 15 }
};
export const MAX_WAVE = 10;
export const MAX_AUTO_MASTERY = MAX_WAVE - 1;
const SINGLE_PURCHASE_ITEMS = new Set(['scorchRounds', 'volatile', 'harvest']);
export const itemMaxLevel = id => id === 'autoMastery' ? MAX_AUTO_MASTERY : SINGLE_PURCHASE_ITEMS.has(id) ? 1 : 4;
export const waveDuration = wave => 30 + (wave - 1) * 3;
export const xpRequired = level => 16 + (level - 1) * 9;
export const waveIncome = run => 9 + run.wave + (run.items.investment || 0) * 4;
export const rangedPierce = (id, level, merged = false) => {
  if (WEAPONS[id]?.category !== 'ranged') throw new Error('Not a ranged weapon: ' + id);
  return (id === 'sniper' ? 3 : id === 'boomerang' ? 2 : 1) + Number(level >= 2) + Number(level >= 4) + (id === 'sniper' && merged ? 2 : 0);
};
export const spawnInterval = (wave, elapsed) => (1.2 + Math.max(0, 4 - wave) * .14) * Math.max(.08, Math.max(.24, .52 - wave * .025) / (1 + Math.floor(Math.max(0, elapsed) / 5) * .12));
export const adaptiveSpawnInterval = (wave, elapsed, activeCount) => {
  const baseline = spawnInterval(wave, elapsed);
  if (activeCount > 32) return baseline * Math.min(3, 1 + (activeCount - 32) / 16);
  if (activeCount < 12) return baseline * Math.max(.55, .55 + activeCount / 12 * .45);
  return baseline;
};
export const enemySpeedScale = wave => 1.1 + Math.max(0, wave - 1) * .02;
export const chaserSpeed = wave => 190 * (.78 + .22 * Math.min(1, Math.max(0, wave - 1) / 3)) * enemySpeedScale(wave);
export const enemyHealthScale = wave => 1 + Math.max(0, wave - 2) * .025;
export const bossHealth = wave => (1100 + Math.max(0, wave - 1) * 1450) * (enemyHealthScale(wave) + Math.max(0, wave - 2) * .0375);
export const rerollPrice = (wave, rerolls) => (wave + rerolls) * 2;
export function newRun(character = 'mage') {
  const selected = CHARACTERS[character];
  if (!selected) throw new Error('Unknown character: ' + character);
  const stats = Object.fromEntries(Object.keys(STATS).map(id => [id, 0]));
  Object.assign(stats, selected.stats || {});
  return { character, wave: 1, gold: 0, xp: 0, level: 1, pending: 0, heroSkillLevel: 1, heroSkills: { q: 1, w: 0 }, heroPassiveLevel: 0, ultimateLevel: 1, hp: 100, maxHp: 100, weapons: [{ uid: 1, id: selected.weapon, level: 1, evolved: false }], nextWeaponId: 2, items: {}, stats, kills: 0, damageBySource: {} };
}
export function effectiveStats(run) {
  const stats = { ...run.stats };
  for (const [id, level] of Object.entries(run.items)) {
    const item = ITEMS[id];
    for (const [stat, amount] of Object.entries(item.stats || {})) stats[stat] += amount < 0 ? amount : amount * level;
  }
  stats.damage += Object.values(run.items).reduce((total, level) => total + level * 3, 0);
  for (const id of ['ranged', 'melee', 'spell', 'engineering']) stats[id] = Math.max(-80, stats[id]);
  stats.attackSpeed = Math.max(-50, stats.attackSpeed);
  stats.speed = Math.max(-40, stats.speed);
  stats.armor = Math.max(-10, stats.armor);
  stats.crit = Math.max(0, stats.crit);
  stats.lifeLeech = Math.max(0, stats.lifeLeech);
  stats.luck = Math.max(0, stats.luck);
  stats.knockback = Math.max(-80, stats.knockback);
  return stats;
}
export function itemDescription(id) {
  const item = ITEMS[id];
  if (!item) throw new Error('Unknown item: ' + id);
  const changes = Object.keys(item.stats || {}).map(stat => itemStatDescription(id, stat));
  if (item.special) changes.push(item.special + (itemMaxLevel(id) > 1 ? ' / level' : ''));
  if (item.progression) changes.push(item.progression);
  return changes.join(' · ');
}
export function itemStatDescription(id, stat) {
  const item = ITEMS[id];
  if (!item || item.stats?.[stat] === undefined || !STATS[stat]) throw new Error('Unknown item stat: ' + id + '/' + stat);
  const amount = item.stats[stat];
  const scaling = amount < 0 ? ' (fixed)' : ' / level';
  return (amount > 0 ? '+' : '') + amount + STATS[stat].unit + ' ' + STATS[stat].name.toLowerCase() + scaling;
}
export function burnStats(run, level, stats) {
  const spread = run.items.wildfire || 0;
  return { chance: Math.min(1, .55 + (run.items.flint || 0) * .15), damage: weaponPower(run, 'fireball', 7 + level * 3 + (run.items.embers || 0) * 7, stats), remaining: 4, spread, spreadLimit: spread, spreadDepth: 3 };
}
export function acidStats(run, level, stats) {
  return { damage: weaponPower(run, 'acid', 7 + level * 3, stats), remaining: 2.5, radius: 40 + level * 12, poolLife: 1.5 + level * .75 };
}
export function applyDot(current, incoming) {
  if (!current || current.remaining <= 0) return { ...incoming, tick: .5 };
  return { ...current, damage: Math.max(current.damage, incoming.damage), source: incoming.damage > current.damage ? incoming.source : current.source, remaining: Math.max(current.remaining, incoming.remaining), spread: current.spread ?? incoming.spread, spreadLimit: Math.max(current.spreadLimit || 0, incoming.spreadLimit || 0), spreadDepth: Math.max(current.spreadDepth || 0, incoming.spreadDepth || 0) };
}
export function spreadBurn(source, enemies) {
  const status = source.burn;
  if (!status || status.spread <= 0 || !status.spreadDepth) return 0;
  const targets = enemies.filter(other => other !== source && other.hp > 0 && !other.escaped && !(other.burn?.remaining > 0) && Math.hypot(other.x - source.x, other.y - source.y) < 150)
    .sort((a, b) => Math.hypot(a.x - source.x, a.y - source.y) - Math.hypot(b.x - source.x, b.y - source.y))
    .slice(0, status.spread);
  for (const target of targets) {
    target.burn = applyDot(target.burn, { damage: status.damage, source: status.source, remaining: 4, spread: status.spreadLimit, spreadLimit: status.spreadLimit, spreadDepth: status.spreadDepth - 1 });
  }
  status.spread -= targets.length;
  return targets.length;
}
export function advanceDot(status, dt) {
  status.tick -= Math.min(dt, Math.max(0, status.remaining));
  status.remaining -= dt;
  let damage = 0;
  while (status.tick <= 1e-9) { damage += status.damage; status.tick += .5; }
  return damage;
}
export function weaponPower(run, id, base, stats = effectiveStats(run), category = WEAPONS[id]?.category) {
  const weapon = WEAPONS[id];
  if (!weapon) throw new Error('Unknown weapon: ' + id);
  const warriorBonus = run.character === 'warrior' ? 1 + .3 * (1 - Math.max(0, Math.min(1, run.hp / run.maxHp))) : 1;
  return base * Math.max(.2, 1 + (stats[category] + stats.damage) / 100) * warriorBonus;
}
export function autoAttackMultiplier(run) {
  return 1 + (run.items.autoMastery || 0) * .2;
}
export function autoAttackMasteryBonus(run) {
  return Math.min(2, Math.floor((run.items.autoMastery || 0) / 3));
}
export function autoAttackRateMultiplier(run) {
  return 1 + (run.items.autoMastery || 0) * .04;
}
export function autoAttackPower(run, id, base, stats = effectiveStats(run), category = WEAPONS[id]?.category) {
  return weaponPower(run, id, base, stats, category) * autoAttackMultiplier(run);
}
export function lifeLeechHeal(run, dealt, remaining, stats = effectiveStats(run)) {
  return Math.max(0, Math.min(run.maxHp - run.hp, remaining, dealt * stats.lifeLeech / 100));
}
export function withinArc(dx, dy, angle, range, halfAngle) {
  const distance = Math.hypot(dx, dy);
  return distance <= range && (distance === 0 || (dx * Math.cos(angle) + dy * Math.sin(angle)) / distance >= Math.cos(halfAngle));
}
export function withinThrust(dx, dy, angle, range, width, radius) {
  const forward = dx * Math.cos(angle) + dy * Math.sin(angle);
  const sideways = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
  return forward >= 0 && forward <= range && sideways <= width + radius;
}
export function damageAfterArmor(run, amount, stats = effectiveStats(run)) {
  return Math.max(1, amount * 100 / (100 + stats.armor * 5));
}
export function rarityWeights(luck = 0) {
  const strength = Math.log1p(Math.max(0, luck) / 100) * 1.5;
  return RARITIES.map((rarity, i) => rarity.weight * Math.pow(1.5, -(RARITIES.length - 1 - i) * strength));
}
function rollRarityFrom(luck, random, first) {
  const weights = rarityWeights(luck);
  let roll = random() * weights.slice(first).reduce((sum, weight) => sum + weight, 0);
  for (let i = first; i < weights.length; i++) {
    roll -= weights[i];
    if (roll < 0) return RARITIES[i].id;
  }
  return RARITIES[RARITIES.length - 1].id;
}
export function rollRarity(luck = 0, random = Math.random) {
  return rollRarityFrom(luck, random, 0);
}
export function rarityById(id) {
  const rarity = RARITIES.find(entry => entry.id === id);
  if (!rarity) throw new Error('Unknown rarity: ' + id);
  return rarity;
}
export function gainXp(run, amount) {
  run.xp += amount;
  while (run.xp >= xpRequired(run.level)) {
    run.xp -= xpRequired(run.level); run.level++; run.pending++;
    run.maxHp += 4; run.hp = Math.min(run.maxHp, run.hp + 4); run.stats.damage += 2;
  }
}
export function upgradeOptions(run) {
  return [...run.weapons.filter(weapon => weapon.level < 4).map(weapon => ({ type: 'weapon', id: weapon.id, weaponId: weapon.uid })),
    ...(run.heroSkills.q < HERO_SKILL_MAX_LEVEL ? [{ type: 'heroSkill', id: run.character, skillId: 'q' }] : []),
    ...(run.level >= HERO_SECONDARY_SKILLS[run.character].unlockLevel && run.heroSkills.w < HERO_SKILL_MAX_LEVEL ? [{ type: 'heroSkill', id: run.character, skillId: 'w' }] : []),
    ...(run.level >= HERO_PASSIVES[run.character].unlockLevel && run.heroPassiveLevel < HERO_PASSIVE_MAX_LEVEL ? [{ type: 'heroPassive', id: run.character }] : []),
    ...(run.ultimateLevel < 3 ? [{ type: 'ultimate', id: run.character }] : []),
    ...Object.keys(STATS).map(id => ({ type: 'stat', id }))];
}
export function makeUpgradeChoices(run, random = Math.random) {
  const eligible = upgradeOptions(run);
  const stats = shuffled(eligible.filter(option => option.type === 'stat'), random);
  const selected = stats.slice(0, 3);
  const heroSkills = eligible.filter(option => option.type === 'heroSkill');
  const passive = eligible.find(option => option.type === 'heroPassive');
  const heroProgression = (passive && run.heroPassiveLevel === 0 ? passive : null)
    || heroSkills.find(option => option.skillId === 'w' && run.heroSkills.w === 0)
    || (heroSkills.length || passive
      ? [...heroSkills, ...(passive ? [passive] : [])][Math.floor(random() * (heroSkills.length + Number(Boolean(passive))))]
      : null);
  if (heroProgression) selected[selected.length - 1] = heroProgression;
  const ultimate = eligible.find(option => option.type === 'ultimate');
  if (ultimate && random() < ULTIMATE_UPGRADE_CHANCE) {
    const replaceIndex = selected.findLastIndex(option => option.type !== 'heroSkill' && option.type !== 'heroPassive');
    if (replaceIndex >= 0) selected[replaceIndex] = ultimate;
  }
  const luck = effectiveStats(run).luck;
  return selected.map(option => ({ ...option, rarity: option.type === 'ultimate' ? rollRarityFrom(luck, random, 2) : rollRarity(luck, random) }));
}
export function statUpgradeAmount(id, rarity) {
  if (!STATS[id]) throw new Error('Unknown stat: ' + id);
  const multiplier = rarityById(rarity).multiplier;
  return STATS[id].base * multiplier;
}
export function gearBonus(option) {
  const rarity = rarityById(option.rarity || 'normal');
  if (rarity.multiplier === 1 || option.type !== 'weapon') return null;
  const stat = WEAPONS[option.id]?.category;
  if (!stat) return null;
  return { stat, amount: (rarity.multiplier - 1) * 2 };
}
export function upgrade(run, option) {
  if (!upgradeOptions(run).some(o => o.type === option.type && o.id === option.id && o.weaponId === option.weaponId && o.skillId === option.skillId)) return false;
  if (option.type === 'ultimate' && !['epic', 'mythic', 'legendary'].includes(option.rarity)) return false;
  if (option.type === 'weapon') run.weapons.find(weapon => weapon.uid === option.weaponId).level++;
  else if (option.type === 'heroSkill') {
    run.heroSkills[option.skillId]++;
    if (option.skillId === 'q') run.heroSkillLevel = run.heroSkills.q;
  }
  else if (option.type === 'heroPassive') run.heroPassiveLevel++;
  else if (option.type === 'ultimate') run.ultimateLevel++;
  else {
    const amount = statUpgradeAmount(option.id, option.rarity || 'normal');
    run.stats[option.id] += amount;
    if (option.id === 'health') { run.maxHp += amount; run.hp += amount; }
  }
  if (option.type === 'weapon') {
    const bonus = gearBonus(option);
    if (bonus) {
      run.stats[bonus.stat] += bonus.amount;
    }
  }
  return true;
}
export function evolve(run) {
  const result = [];
  for (const weapon of run.weapons) {
    const definition = WEAPONS[weapon.id];
    if (definition.evolution && weapon.level === 4 && run.items[definition.requires] && !weapon.evolved) {
      weapon.evolved = true; result.push(definition.evolution);
    }
  }
  return result;
}
export function combineWeapons(run, firstId, secondId) {
  const first = run.weapons.find(weapon => weapon.uid === firstId);
  const second = run.weapons.find(weapon => weapon.uid === secondId);
  if (!first || !second || first === second || first.id !== second.id || first.level !== 4 || second.level !== 4 || first.merged || second.merged) return false;
  first.merged = true;
  first.evolved = first.evolved || second.evolved;
  run.weapons.splice(run.weapons.indexOf(second), 1);
  return true;
}
export function shuffled(list, random = Math.random) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function makeOffers(run, old = [], random = Math.random) {
  const locked = old.filter(offer => offer?.locked && offer.type === 'item' && (run.items[offer.id] || 0) === (offer.level || 1) - 1 && (offer.level || 1) <= itemMaxLevel(offer.id));
  const candidates = [
    ...Object.keys(ITEMS).filter(id => (run.items[id] || 0) < itemMaxLevel(id) && (run.items[id] || !ITEMS[id].rare || random() < .18))
      .map(id => ({ type: 'item', id, level: (run.items[id] || 0) + 1, cost: id === 'autoMastery' ? 18 + (run.items[id] || 0) * 4 : (ITEMS[id].rare ? 30 : 18) + (run.items[id] || 0) * 6 }))
  ].filter(offer => !locked.some(item => item.type === offer.type && item.id === offer.id));
  const masteryOffer = candidates.find(offer => offer.id === 'autoMastery');
  const pool = shuffled(candidates.filter(offer => offer.id !== 'autoMastery'), random);
  const masteryLocked = locked.some(offer => offer.id === 'autoMastery');
  const masteryIndex = masteryOffer && !masteryLocked ? Math.max(0, old.findIndex((offer, index) => !locked.includes(offer))) : -1;
  const makeOffer = offer => {
    const rarity = rollRarity(effectiveStats(run).luck, random);
    return { ...offer, rarity, cost: offer.cost + (rarityById(rarity).multiplier - 1) * 3 };
  };
  return Array.from({ length: 4 }, (_, i) => {
    if (locked.includes(old[i])) return old[i];
    if (i === masteryIndex) return makeOffer(masteryOffer);
    const offer = pool.pop();
    if (!offer) return null;
    return makeOffer(offer);
  });
}
export function buy(run, offer) {
  if (!offer || run.gold < offer.cost) return false;
  if (offer.type !== 'weapon' && offer.type !== 'item') return false;
  const catalog = offer.type === 'weapon' ? WEAPONS : ITEMS;
  if (!catalog[offer.id]) return false;
  if (offer.type === 'weapon' && run.weapons.length >= MAX_WEAPONS) return false;
  if (offer.type === 'item' && ((offer.level || 1) !== (run.items[offer.id] || 0) + 1 || (offer.level || 1) > itemMaxLevel(offer.id))) return false;
  run.gold -= offer.cost;
  if (offer.type === 'weapon') run.weapons.push({ uid: run.nextWeaponId++, id: offer.id, level: 1, evolved: false });
  else run.items[offer.id] = offer.level || 1;
  if (offer.type === 'item') run.stats.damage += (rarityById(offer.rarity || 'normal').multiplier - 1) * 2;
  if (offer.id === 'life' && offer.type === 'item') { run.maxHp += 15; run.hp += 15; }
  return true;
}
export function sellWeapon(run, weaponId) {
  const index = run.weapons.findIndex(weapon => weapon.uid === weaponId);
  if (index < 0 || run.weapons.length <= 1) return false;
  const value = 8 + (run.weapons[index].level - 1) * 3;
  run.weapons.splice(index, 1);
  run.gold += value;
  return value;
}
