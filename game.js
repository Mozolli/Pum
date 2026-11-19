import { WEAPONS, ACTIVE_SKILLS, EVADE, HERO_SKILLS, HERO_SECONDARY_SKILLS, HERO_PASSIVES, HERO_PASSIVE_MAX_LEVEL, HERO_SKILL_COOLDOWN, ULTIMATES, ULTIMATE_COOLDOWN, CHARACTERS, ITEMS, STATS, CATEGORIES, MAX_WAVE, waveDuration, xpRequired, waveIncome, rangedPierce, adaptiveSpawnInterval, enemySpeedScale, chaserSpeed, enemyHealthScale, bossHealth, rerollPrice, newRun, gainXp, makeUpgradeChoices, statUpgradeAmount, gearBonus, rarityById, effectiveStats, itemDescription, itemStatDescription, itemMaxLevel, burnStats, acidStats, applyDot, advanceDot, spreadBurn, weaponPower, autoAttackPower, autoAttackMultiplier, autoAttackMasteryBonus, autoAttackRateMultiplier, lifeLeechHeal, withinArc, withinThrust, damageAfterArmor, upgrade, evolve, combineWeapons, makeOffers, buy, sellWeapon } from './model.js';
import { createPixelArt } from './pixel-art.js';
import { getMusicVolume, getSfxVolume, isAudioEnabled, pauseMusic, playSound, resumeMusic, setAudioEnabled, setMusicVolume, setSfxVolume, startMusic, unlockAudio } from './audio.js';

const canvas = document.querySelector('#arena');
const arenaFrame = document.querySelector('.arena-frame');
const ctx = canvas.getContext('2d');
const art = createPixelArt(ctx);
const SPAWN_WARNING = .8;
const ENEMY_SHOT_WARNING = .45;
const PICKUP_RADIUS = 60;
const PROJECTILE_SPEED_MULTIPLIER = 2.1;
const ENEMY_PROJECTILE_SPEED_MULTIPLIER = 1.4;
const GAMEPAD_AIM_MIN_DISTANCE = 40;
const GAMEPAD_AIM_MAX_DISTANCE = 850;
const AUTO_ATTACK_AIM_DISTANCE = 200;
const GAMEPAD_BUTTON = { A: 0, B: 1, LB: 4, LT: 6, RT: 7, BACK: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const ISO_X = Math.SQRT1_2, ISO_Y = Math.SQRT1_2 / 2;
const skillColors = { melee: '#d9f3ff', ranged: '#b6f5d2', spell: '#ffe6a1', engineering: '#a9dbff', frost: '#b7edff', acid: '#e4b7ff' };
const RECORDS_KEY = 'arena-survivors-records-v1';
const overlay = document.querySelector('#overlay');
const $ = selector => document.querySelector(selector);
function setAbilityIcon(control, image) {
  const icon = control.querySelector('.ability-icon');
  if (icon.dataset.image === image) return;
  icon.dataset.image = image;
  icon.src = image;
}
let viewW, viewH, W, H;
const keys = new Set();
const enemyTypes = {
  swarm: { color: '#ad7442', hp: 22, speed: 118, radius: 11, damage: 10, reward: 1 },
  chaser: { color: '#966138', hp: 38, speed: 190, radius: 14, damage: 15, reward: 3 },
  tank: { color: '#74543c', hp: 120, speed: 55, radius: 21, damage: 20, reward: 5 },
  ranged: { color: '#8c6948', hp: 48, speed: 75, radius: 14, damage: 15, reward: 4 },
  charger: { color: '#b4793f', hp: 52, speed: 95, radius: 15, damage: 18, reward: 4 },
  bull: { color: '#8d5c37', hp: 105, speed: 95, radius: 19, damage: 25, reward: 5 },
  summoner: { color: '#806147', hp: 115, speed: 55, radius: 19, damage: 16, reward: 7 },
  exploder: { color: '#c18441', hp: 45, speed: 145, radius: 15, damage: 28, reward: 4 },
  boss: { color: '#70472e', hp: 1100, speed: 52, radius: 39, damage: 25, reward: 30 },
  goblin: { color: '#ffc86b', hp: 85, speed: 115, radius: 14, damage: 0, reward: 0 },
  sapling: { color: '#83d39a', hp: 35, speed: 0, radius: 14, damage: 0, reward: 0 }
};
const enemyRadius = type => enemyTypes[type].radius * (type === 'boss' || type === 'sapling' ? 1 : 1.2);
let run, phase = 'start', player, enemies, pendingSpawns, shots, hostileShots, drops, pickups, puddles, effects, damageNumbers, mines, turrets, placedTurrets, temporaryTurrets, flameWalls, cooldowns, cooldownDurations, abilityCooldowns, abilityBuffs, battleStats, goblinSchedule, offers = [], time = 0, spawnTimer = 0, saplingTimer = 0, shopRerolls = 0, leechRemaining = 1.5, leechTimer = 0, invulnerable = 0, engineerOverdrive = 0, bossDefeated = false, previous = 0, animationTime = 0, message = '';
let evadeCooldown = 0, evadeTime = 0, evadeX = 1, evadeY = 0, facingX = 1, facingY = 0;
let heroSkillCooldown = 0, secondarySkillCooldown = 0, aimX = 0, aimY = 0, aimScreenX = null, aimScreenY = null, evadeImpact = null, previewSkill = '', levelUpTimer = 0, primaryHeld = false;
let ultimateCooldown = 0;
let lastWaveDamageBySource = {}, waveDamageAtStart = {};
let shakeTime = 0, shakeStrength = 0;
let framePending = false, accumulator = 0, lastDraw = 0;
let gamepadFramePending = false, activeGamepadIndex = -1, previousGamepadButtons = [], previousGamepadDirections = [], gamepadSuppressedButtons = new Set();
let gamepadMoveX = 0, gamepadMoveY = 0, gamepadPrimaryHeld = false, pointerPrimaryHeld = false, gamepadAimDirection = null, gamepadAimTargetDirection = null, gamepadAimDistance = 200, gamepadAimTargetDistance = 200, gamepadAiming = false, gamepadPreviousTimestamp = 0;
const hudValues = {};
let lastInputMode = 'keyboard';
const inputPromptUpdates = new Set();

function registerInputPrompt(update) {
  inputPromptUpdates.add(update);
  update();
}
function setInputMode(mode) {
  if (mode !== 'gamepad') gamepadAiming = false;
  if (lastInputMode === mode) return;
  lastInputMode = mode;
  unlockAudio();
  for (const update of inputPromptUpdates) update();
}
function inputPrompt(element, keyboard, gamepad) {
  registerInputPrompt(() => { element.textContent = lastInputMode === 'gamepad' ? gamepad : keyboard; });
  return element;
}
function bindAbilityPrompt(control, keyboard, gamepad, description) {
  registerInputPrompt(() => {
    const binding = lastInputMode === 'gamepad' ? gamepad : keyboard;
    control.querySelector('.ability-key').textContent = binding;
    control.title = binding + ': ' + description;
    control.setAttribute('aria-label', binding + ': ' + description);
  });
}

function resizeArena() {
  const bounds = canvas.getBoundingClientRect();
  const arenaWidth = bounds.width < 700 ? 700 : 1000;
  viewW = Math.round(arenaWidth / 1.15);
  viewH = Math.round(viewW * bounds.height / bounds.width);
  canvas.width = viewW; canvas.height = viewH;
  ctx.imageSmoothingEnabled = false;
  W = Math.round(arenaWidth * Math.SQRT2);
  H = W;
  if (player) {
    player.x = Math.max(17, Math.min(W - 17, player.x));
    player.y = Math.max(17, Math.min(H - 17, player.y));
  }
}
function camera() {
  const center = project(player.x, player.y);
  const clamp = (value, min, max, size) => max - min <= size ? (min + max - size) / 2 : Math.max(min, Math.min(max - size, value - size / 2));
  return { x: clamp(center.x, -H * ISO_X, W * ISO_X, viewW), y: clamp(center.y, 0, (W + H) * ISO_Y, viewH) };
}
function project(x, y) {
  return { x: (x - y) * ISO_X, y: (x + y) * ISO_Y };
}
function unproject(x, y) {
  return { x: (x / ISO_X + y / ISO_Y) / 2, y: (y / ISO_Y - x / ISO_X) / 2 };
}
function visible(x, y, radius = 0, offset = camera()) {
  const point = project(x, y);
  return point.x + radius >= offset.x && point.x - radius <= offset.x + viewW && point.y + radius >= offset.y && point.y - radius <= offset.y + viewH;
}
function upright(x, y, drawAtPoint) {
  ctx.save(); ctx.translate(x, y);
  ctx.transform(1 / (2 * ISO_X), -1 / (2 * ISO_X), 1 / (2 * ISO_Y), 1 / (2 * ISO_Y), 0, 0);
  ctx.translate(-x, -y); drawAtPoint(); ctx.restore();
}
function reset(character = 'mage') {
  run = newRun(character);
  lastWaveDamageBySource = {}; waveDamageAtStart = {};
  player = { x: W / 2, y: H / 2 };
  enemies = []; pendingSpawns = []; shots = []; hostileShots = []; drops = []; pickups = []; puddles = []; effects = []; damageNumbers = []; mines = []; turrets = {}; placedTurrets = []; temporaryTurrets = []; flameWalls = []; cooldowns = {}; cooldownDurations = {}; abilityCooldowns = {}; abilityBuffs = {}; engineerOverdrive = 0; goblinSchedule = [];
  evadeCooldown = 0; evadeTime = 0; heroSkillCooldown = 0; secondarySkillCooldown = 0; evadeImpact = null; ultimateCooldown = 0; facingX = 1; facingY = 0; previewSkill = ''; levelUpTimer = 0; primaryHeld = false; pointerPrimaryHeld = false; gamepadPrimaryHeld = false; gamepadMoveX = 0; gamepadMoveY = 0; gamepadAimDirection = null; gamepadAimTargetDirection = null; gamepadAimDistance = gamepadAimTargetDistance = 200; gamepadAiming = false; gamepadPreviousTimestamp = 0; gamepadSuppressedButtons.clear(); previousGamepadButtons = []; previousGamepadDirections = []; shakeTime = 0; shakeStrength = 0;
  aimX = player.x + facingX * AUTO_ATTACK_AIM_DISTANCE; aimY = player.y + facingY * AUTO_ATTACK_AIM_DISTANCE;
  aimScreenX = aimScreenY = null;
  offers = []; time = 0; spawnTimer = 0; saplingTimer = 0; shopRerolls = 0; leechRemaining = 1.5; leechTimer = 0; invulnerable = 0; bossDefeated = false; animationTime = 0; message = '';
  keys.clear();
}
function button(text, action, className = 'primary') {
  const el = document.createElement('button');
  el.className = className; el.textContent = text;
  el.addEventListener('click', () => { playSound('menu'); action(); });
  return el;
}
function show(content) { audioMenu.hidden = true; refreshAudioSettings(); overlay.classList.remove('hidden'); document.querySelector('.arena-frame').classList.add('modal-open'); overlay.replaceChildren(content); }
function hide() { overlay.classList.add('hidden'); document.querySelector('.arena-frame').classList.remove('modal-open'); overlay.replaceChildren(); }
function panel(kicker, title, description) {
  const card = document.createElement('div'); card.className = 'overlay-card';
  const k = document.createElement('div'); k.className = 'overlay-kicker'; k.textContent = kicker;
  const h = document.createElement('h2'); h.textContent = title;
  const p = document.createElement('p'); p.textContent = description;
  card.append(k, h, p); return card;
}
function readRecords() {
  const saved = localStorage.getItem(RECORDS_KEY);
  if (!saved) return {};
  const records = JSON.parse(saved);
  if (!records || typeof records !== 'object' || Array.isArray(records)) throw new Error('Invalid saved run records');
  return records;
}
function recordsFor(character, records = readRecords()) {
  const record = records[character] || {};
  return {
    bestWave: Math.max(0, Number(record.bestWave) || 0),
    maxKills: Math.max(0, Number(record.maxKills) || 0),
    cleared: Boolean(record.cleared)
  };
}
function saveRunRecord(cleared) {
  const records = readRecords(), record = records[run.character] || {};
  records[run.character] = {
    bestWave: Math.max(Number(record.bestWave) || 0, run.wave),
    maxKills: Math.max(Number(record.maxKills) || 0, run.kills),
    cleared: Boolean(record.cleared || cleared)
  };
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}
function startScreen() {
  inputPromptUpdates.clear();
  phase = 'start'; reset(); updateHud(); draw();
  const records = readRecords();
  const card = panel('ARENA SURVIVORS', 'Choose your hero.', 'Four paths into the arena. Each hero brings a weapon, two class skills, a passive and an ultimate.');
  card.className += ' character-select-panel';
  const symbol = document.createElement('div'); symbol.className = 'start-symbol'; symbol.textContent = '✳'; card.prepend(symbol);
  const inputHint = document.createElement('div'); inputHint.className = 'input-hint';
  const selectBinding = inputPrompt(document.createElement('span'), 'TAB / ENTER', 'D-PAD / A');
  const selectCopy = document.createElement('span'); selectCopy.textContent = ' · MOVE / SELECT';
  inputHint.append(selectBinding, selectCopy);
  const choices = document.createElement('div'); choices.className = 'choices shop-grid';
  for (const [id, character] of Object.entries(CHARACTERS)) {
    const weapon = WEAPONS[character.weapon];
    const choice = button('', () => { reset(id); startWave(); }, 'choice character-card category-border-' + weapon.category);
    const heading = document.createElement('div'); heading.className = 'character-heading';
    heading.append(art.portrait(id));
    const identity = document.createElement('div'); identity.className = 'character-identity';
    const name = document.createElement('strong'); name.textContent = character.name;
    identity.append(name, categoryBadge(weapon.category));
    heading.append(identity);
    const starter = document.createElement('div'); starter.className = 'character-starter';
    const starterLabel = document.createElement('span'); starterLabel.className = 'character-label'; starterLabel.textContent = 'STARTING WEAPON';
    const starterName = document.createElement('strong'); starterName.textContent = weapon.name + ' · BASIC ATTACK';
    const starterAbility = document.createElement('small'); starterAbility.textContent = character.ability;
    starter.append(starterLabel, starterName, starterAbility);
    const skills = document.createElement('div'); skills.className = 'character-skills';
    for (const [keyboard, gamepad, skillName, unlock] of [
      ['RMB', 'LT', HERO_SKILLS[id].name, 'SIGNATURE'],
      ['Q', 'LB', HERO_SECONDARY_SKILLS[id].name, 'LVL ' + HERO_SECONDARY_SKILLS[id].unlockLevel],
      ['R', 'A / ×', ULTIMATES[id].name, 'ULTIMATE']
    ]) {
      const row = document.createElement('div'); row.className = 'character-skill';
      const binding = inputPrompt(document.createElement('kbd'), keyboard, gamepad);
      const skill = document.createElement('span'); skill.textContent = skillName;
      const unlockLabel = document.createElement('small'); unlockLabel.textContent = unlock;
      row.append(binding, skill, unlockLabel); skills.append(row);
    }
    const passive = document.createElement('div'); passive.className = 'character-skill';
    const passiveBinding = document.createElement('kbd'); passiveBinding.textContent = 'PASSIVE';
    const passiveName = document.createElement('span'); passiveName.textContent = HERO_PASSIVES[id].name;
    const passiveUnlock = document.createElement('small'); passiveUnlock.textContent = 'LVL ' + HERO_PASSIVES[id].unlockLevel;
    passive.append(passiveBinding, passiveName, passiveUnlock); skills.append(passive);
    choice.append(heading, starter, skills);
    const record = recordsFor(id, records);
    const recordText = document.createElement('small'); recordText.className = 'character-record';
    recordText.textContent = 'BEST WAVE ' + record.bestWave + ' · MAX KILLS ' + record.maxKills;
    choice.append(recordText);
    if (record.cleared) {
      choice.classList.add('character-cleared');
      const badge = document.createElement('span'); badge.className = 'clear-badge'; badge.textContent = 'CLEARED';
      choice.append(badge);
    }
    choice.append(recordText); choices.append(choice);
  }
  card.append(choices, inputHint); show(card);
}
function startWave() {
  phase = 'battle'; time = waveDuration(run.wave); spawnTimer = .5;
  waveDamageAtStart = { ...run.damageBySource };
  unlockAudio(); startMusic(); playSound('wave', { minInterval: .8 });
  battleStats = effectiveStats(run);
  gamepadSuppressedButtons = new Set(previousGamepadButtons.flatMap((pressed, index) => pressed ? [index] : []));
  enemies = []; pendingSpawns = []; shots = []; hostileShots = []; drops = []; pickups = []; puddles = []; effects = []; damageNumbers = []; mines = []; turrets = {}; cooldowns = {}; cooldownDurations = {};
  abilityCooldowns = Object.fromEntries(run.weapons.map(weapon => [weapon.uid, ACTIVE_SKILLS[weapon.id].cooldown]));
  abilityBuffs = {}; placedTurrets = []; temporaryTurrets = []; engineerOverdrive = 0; flameWalls = []; evadeCooldown = EVADE.cooldown; evadeTime = 0; heroSkillCooldown = HERO_SKILL_COOLDOWN;
  secondarySkillCooldown = HERO_SECONDARY_SKILLS[run.character].cooldown;
  evadeImpact = null; ultimateCooldown = ULTIMATE_COOLDOWN; facingX = 1; facingY = 0; levelUpTimer = 0; primaryHeld = false; previewSkill = ''; shakeTime = 0; shakeStrength = 0;
  player.x = W / 2; player.y = H / 2;
  aimX = player.x + facingX * AUTO_ATTACK_AIM_DISTANCE; aimY = player.y + facingY * AUTO_ATTACK_AIM_DISTANCE;
  aimScreenX = aimScreenY = null;
  gamepadAimDirection = gamepadAimTargetDirection = null; gamepadAimDistance = gamepadAimTargetDistance = AUTO_ATTACK_AIM_DISTANCE; gamepadAiming = false;
  const goblinCount = Math.floor(Math.random() * 3);
  goblinSchedule = Array.from({ length: goblinCount }, () => 3 + Math.random() * (time - 6)).sort((a, b) => a - b);
  invulnerable = 1.5; saplingTimer = 12; leechRemaining = 1.5; leechTimer = 0;
  spawn('sapling'); spawn('sapling');
  if (run.wave === MAX_WAVE) spawn('boss');
  buildAbilityBar(); hide(); updateHud(); draw(); startLoop();
}
function endWave() {
  if (phase !== 'battle') return;
  lastWaveDamageBySource = Object.fromEntries([...new Set([...Object.keys(waveDamageAtStart), ...Object.keys(run.damageBySource)])].map(source => [
    source, Math.max(0, (run.damageBySource[source] || 0) - (waveDamageAtStart[source] || 0))
  ]));
  primaryHeld = false; previewSkill = '';
  for (const drop of drops) { run.gold += drop.gold; awardXp(drop.xp); }
  run.gold += waveIncome(run);
  run.hp = Math.min(run.maxHp, run.hp + 16);
  phase = 'upgrade'; keys.clear();
  if (run.wave < MAX_WAVE) playSound('wave', { pitch: .82, minInterval: .8 });
  updateHud();
  if (run.wave === MAX_WAVE) return victory();
  if (run.pending) showUpgrade(); else openShop();
}
function choiceCard(icon, name, detail, action) {
  const el = button('', action, 'choice');
  const i = document.createElement('span'); i.className = 'choice-icon'; i.textContent = icon;
  const strong = document.createElement('strong'); strong.textContent = name;
  const small = document.createElement('small'); small.textContent = detail;
  el.append(i, strong, small); return el;
}
function awardXp(amount) {
  const previousLevel = run.level;
  gainXp(run, amount);
  if (run.level > previousLevel) {
    playSound('level', { minInterval: .35 });
    levelUpTimer = 1.5;
    effects.push({ kind: 'pulse', x: player.x, y: player.y, radius: 115, life: .8, max: .8, color: '#ffdc82' });
  }
}
function statCategory(id) { return CATEGORIES[id] ? id : null; }
function categoryBadge(category) {
  if (!category) return null;
  const badge = document.createElement('span'); badge.className = 'category-tag category-' + category;
  badge.textContent = CATEGORIES[category].name; return badge;
}
function itemEffects(id) {
  const item = ITEMS[id];
  const details = document.createElement('small'); details.className = 'item-effects';
  for (const stat of Object.keys(item.stats || {})) {
    const effect = document.createElement('span');
    const category = statCategory(stat);
    if (category) effect.className = 'category-' + category;
    effect.textContent = itemStatDescription(id, stat);
    details.append(effect);
  }
  if (item.special) { const special = document.createElement('span'); special.textContent = item.special + (itemMaxLevel(id) > 1 ? ' / level' : ''); details.append(special); }
  return details;
}
function showUpgrade() {
  phase = 'upgrade';
  const card = panel('LEVEL UP / ' + run.pending + ' REMAINING', 'Choose an upgrade.', 'Each level restores 4 HP, adds 4 max HP and grants +2% damage. Unlock or rank up class skills, then buy unique items between waves, including Basic Attack Mastery.');
  const choices = document.createElement('div'); choices.className = 'choices';
  const options = makeUpgradeChoices(run);
  for (const option of options) {
    let icon, name, detail;
    if (option.type === 'stat') {
      icon = '✦'; name = STATS[option.id].name;
      detail = '+' + statUpgradeAmount(option.id, option.rarity) + STATS[option.id].unit;
    } else if (option.type === 'heroSkill') {
      const skill = option.skillId === 'q' ? HERO_SKILLS[run.character] : HERO_SECONDARY_SKILLS[run.character];
      const nextLevel = run.heroSkills[option.skillId] + 1;
      icon = skill.icon; name = skill.name + ' · Lv ' + nextLevel;
      detail = option.skillId !== 'q' && nextLevel === 1 ? 'UNLOCK · ' + skill.detail(nextLevel) : skill.detail(nextLevel);
    } else if (option.type === 'heroPassive') {
      const passive = HERO_PASSIVES[run.character];
      const nextLevel = run.heroPassiveLevel + 1;
      icon = passive.icon; name = passive.name + ' · Lv ' + nextLevel;
      detail = run.heroPassiveLevel ? passive.detail(nextLevel) : 'UNLOCK · ' + passive.detail(nextLevel);
    } else if (option.type === 'ultimate') {
      const ultimate = ULTIMATES[run.character];
      icon = ultimate.icon; name = ultimate.name + ' · Lv ' + (run.ultimateLevel + 1);
      detail = ultimate.detail(run.ultimateLevel + 1);
    } else {
      const item = WEAPONS[option.id];
      const index = run.weapons.findIndex(weapon => weapon.uid === option.weaponId);
      const level = run.weapons[index].level + 1;
      icon = item.icon; name = item.name + ' #' + (index + 1) + ' · Lv ' + level;
      detail = weaponUpgradeText(option.id, level);
      const bonus = gearBonus(option);
      if (bonus) detail += ' · +' + bonus.amount + STATS[bonus.stat].unit + ' ' + STATS[bonus.stat].name.toLowerCase();
    }
    const choice = choiceCard(icon, name, detail, () => {
      if (!upgrade(run, option)) return;
      run.pending--; updateHud();
      if (run.pending > 0) showUpgrade(); else openShop();
    });
    const category = option.type === 'stat' ? statCategory(option.id)
      : option.type === 'heroSkill' ? (option.skillId === 'q' ? HERO_SKILLS[run.character] : HERO_SECONDARY_SKILLS[run.character]).category
        : option.type === 'heroPassive' ? HERO_PASSIVES[run.character].category
          : option.type === 'ultimate' ? ULTIMATES[run.character].category : WEAPONS[option.id].category;
    if (category) choice.append(categoryBadge(category));
    const rarity = rarityById(option.rarity);
    choice.classList.add('rarity-choice', 'rarity-' + rarity.id); choice.style.setProperty('--rarity', rarity.color);
    const badge = document.createElement('span'); badge.className = 'rarity'; badge.textContent = rarity.name;
    choice.prepend(badge); choices.append(choice);
  }
  card.append(choices, buildPanel()); show(card);
}
function weaponUpgradeText(id, level) {
  const descriptions = {
    fireball: ['More damage and burn damage', 'Two fireballs', 'Explodes on impact'],
    lightning: ['More damage', 'Chains to enemies', 'Hits more targets'],
    boomerang: ['Faster throw and +1 pierce', 'Two throws', '+1 pierce'],
    pistol: ['More damage and +1 pierce', 'Two projectiles', 'Faster firing and +1 pierce'],
    machinegun: ['More damage and +1 pierce', 'Faster firing', 'More damage and +1 pierce'],
    sniper: ['More damage and +1 pierce', 'Large damage increase', 'Faster firing and +1 pierce'],
    turret: ['More wrench damage and turret range', 'Faster turret firing', 'Triple turret shot'],
    mine: ['Larger explosion', 'Faster placement', 'More damage'],
    acid: ['Larger, longer-lasting pool', 'More acid damage and area', 'Larger, longer-lasting pool'],
    frost: ['More damage', 'Two frost spikes', 'Longer slow and freeze'],
    blade: ['Larger ring', 'Faster ring', 'Stronger ring'],
    sword: ['Wider, faster swing', 'Add lighter side strikes', 'Wider and faster again'],
    spear: ['More damage', 'Longer thrust', 'Faster thrust'],
    dagger: ['+10 percentage points critical chance', 'Longer reach', '+15 percentage points critical chance']
  };
  return descriptions[id][level - 2];
}
function skillSummary() {
  const section = document.createElement('section'); section.className = 'skill-summary';
  section.setAttribute('aria-label', 'Class skills');
  const heading = document.createElement('h3'); heading.textContent = 'SKILLS';
  const list = document.createElement('div'); list.className = 'skill-list';
  const primary = HERO_SKILLS[run.character], secondary = HERO_SECONDARY_SKILLS[run.character];
  const passive = HERO_PASSIVES[run.character], ultimate = ULTIMATES[run.character];
  const entries = [
    { name: primary.name, image: primary.image, description: primary.detail(run.heroSkillLevel), source: 'heroSkill' },
    {
      name: secondary.name, image: secondary.image,
      description: run.heroSkills.w ? secondary.detail(run.heroSkills.w) : 'Unlock at level ' + secondary.unlockLevel + '. ' + secondary.detail(1),
      source: 'heroSecondarySkill'
    },
    {
      name: passive.name, image: passive.image,
      description: run.heroPassiveLevel ? passive.detail(run.heroPassiveLevel) : 'Unlock at level ' + passive.unlockLevel + '. ' + passive.detail(1),
      source: 'heroPassive'
    },
    { name: ultimate.name, image: ultimate.image, description: ultimate.detail(run.ultimateLevel), source: 'ultimate' }
  ];
  for (const entry of entries) {
    const damage = Math.round(lastWaveDamageBySource[entry.source] || 0).toLocaleString('en-US');
    const detail = entry.name + '. ' + entry.description + ' Last wave: ' + damage + ' damage.';
    const tile = document.createElement('button'); tile.type = 'button'; tile.className = 'skill-tile';
    tile.dataset.shopFocus = 'skill:' + entry.source;
    tile.title = detail; tile.setAttribute('aria-label', entry.name + '. ' + detail);
    const icon = document.createElement('img'); icon.src = entry.image; icon.alt = ''; icon.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span'); name.textContent = entry.name;
    const tooltip = document.createElement('span'); tooltip.className = 'skill-tooltip'; tooltip.setAttribute('role', 'tooltip');
    const description = document.createElement('span'); description.textContent = entry.description;
    const damageLabel = document.createElement('b'); damageLabel.textContent = 'LAST WAVE · ' + damage + ' DAMAGE';
    tooltip.append(description, damageLabel); tile.append(icon, name, tooltip); list.append(tile);
  }
  section.append(heading, list);
  return section;
}
function buildPanel(selling = false, compact = false) {
  const build = document.createElement('div'); build.className = 'build';
  if (compact) build.classList.add('result-build');
  const inventorySection = document.createElement('div'); inventorySection.className = 'build-section';
  const title = document.createElement('h3'); title.textContent = 'BASIC ATTACK';
  const inventory = document.createElement('div'); inventory.className = 'weapon-inventory';
  for (const weapon of run.weapons) {
    const { id, level, uid, evolved, merged } = weapon;
    const row = document.createElement('div'); row.className = 'weapon-card category-border-' + WEAPONS[id].category;
    const name = document.createElement('b'); name.textContent = WEAPONS[id].icon + ' ' + (merged ? WEAPONS[id].ultimate : evolved ? WEAPONS[id].evolution : WEAPONS[id].name) + ' · BASIC ATTACK';
    row.append(name, categoryBadge(WEAPONS[id].category));
    if (!compact && id === 'turret') {
      const detail = document.createElement('small'); detail.textContent = 'Wrench strikes scale with melee damage; turret shots scale with engineering.';
      row.append(detail);
    }
    if (!compact && WEAPONS[id].category === 'ranged') {
      const pierce = document.createElement('small'); pierce.textContent = 'Hits ' + rangedPierce(id, level, merged) + ' targets / projectile';
      row.append(pierce);
    }
    if (!compact && merged) {
      const detail = document.createElement('small'); detail.textContent = 'ULTIMATE · 2× attacks, +15% damage' + (evolved ? ' · ' + WEAPONS[id].evolution : '');
      row.append(detail);
    }
    inventory.append(row);
  }
  inventorySection.append(title, inventory);
  const itemTitle = document.createElement('h3'); itemTitle.className = 'item-title'; itemTitle.textContent = 'ITEMS ' + Object.keys(run.items).length + ' · OPEN FOR DETAILS';
  const itemList = document.createElement('div'); itemList.className = 'item-inventory';
  for (const [id, level] of Object.entries(run.items)) {
    const detail = document.createElement('details'); detail.className = 'item-chip';
    const summary = document.createElement('summary'); summary.textContent = ITEMS[id].icon + ' ' + ITEMS[id].name + ' ' + level;
    if (ITEMS[id].category) summary.classList.add('category-' + ITEMS[id].category);
    detail.append(summary, itemEffects(id)); itemList.append(detail);
  }
  if (!itemList.childElementCount) { const empty = document.createElement('span'); empty.className = 'empty'; empty.textContent = 'No items'; itemList.append(empty); }
  inventorySection.append(itemTitle, itemList);
  const statSection = document.createElement('div'); statSection.className = 'build-section';
  const statTitle = document.createElement('h3'); statTitle.textContent = 'STATS · ' + CHARACTERS[run.character].name.toUpperCase();
  const statList = document.createElement('div'); statList.className = 'stats';
  const stats = effectiveStats(run);
  for (const group of [['health', 'damage', 'melee', 'ranged', 'spell', 'engineering'], ['attackSpeed', 'armor', 'crit', 'knockback'], ['speed', 'luck', 'lifeLeech']]) {
    const column = document.createElement('div'); column.className = 'stat-column';
    for (const id of group) {
      const definition = STATS[id], entry = document.createElement('span');
      const category = statCategory(id); if (category) entry.classList.add('category-' + category);
      const label = document.createElement('span'); label.textContent = id === 'health' ? 'Health (HP)' : definition.name;
      const value = document.createElement('b'); value.textContent = id === 'health' ? Math.ceil(run.hp) + ' / ' + run.maxHp : (stats[id] >= 0 ? '+' : '') + stats[id] + definition.unit;
      entry.append(label, value); column.append(entry);
    }
    statList.append(column);
  }
  statSection.append(statTitle, skillSummary(), statList); build.append(inventorySection, statSection);
  return build;
}
function openShop() {
  phase = 'shop';
  shopRerolls = 0;
  const evolutions = evolve(run);
  if (evolutions.length) message = 'EVOLUTION: ' + evolutions.join(', ') + '!';
  offers = makeOffers(run, offers);
  renderShop();
}
function renderShop() {
  const menu = menuButtons();
  const focusedIndex = menu.indexOf(document.activeElement);
  const focusedControl = focusedIndex >= 0 ? document.activeElement?.dataset?.shopFocus : null;
  const card = panel('WAVE ' + run.wave + ' COMPLETE / SHOP', 'Prepare for the next wave.', 'Spend gold on upgrades, then continue.');
  card.classList.add('shop-panel');
  const price = rerollPrice(run.wave, shopRerolls);
  const info = document.createElement('div'); info.className = 'message'; info.textContent = '◆ ' + run.gold + ' GOLD · REROLL ' + price + ' GOLD' + (message ? ' · ' + message : '');
  const stats = effectiveStats(run), category = WEAPONS[CHARACTERS[run.character].weapon].category;
  const statsPanel = document.createElement('div'); statsPanel.className = 'shop-stats'; statsPanel.setAttribute('role', 'group'); statsPanel.setAttribute('aria-label', 'Hero stats');
  for (const [label, value, className = ''] of [
    ['HP', Math.ceil(run.hp) + ' / ' + run.maxHp, 'shop-stat-health'],
    ['ARMOR', stats.armor, ''],
    ['ALL DAMAGE', (stats.damage >= 0 ? '+' : '') + stats.damage + '%', ''],
    [STATS[category].name.toUpperCase(), (stats[category] >= 0 ? '+' : '') + stats[category] + '%', ''],
    ['ATTACK SPEED', (stats.attackSpeed >= 0 ? '+' : '') + stats.attackSpeed + '%', ''],
    ['LIFE STEAL', (stats.lifeLeech >= 0 ? '+' : '') + stats.lifeLeech + '%', '']
  ]) {
    const stat = document.createElement('div'); stat.className = 'shop-stat' + (className ? ' ' + className : '');
    const name = document.createElement('span'); name.textContent = label;
    const amount = document.createElement('strong'); amount.textContent = value;
    stat.append(name, amount); statsPanel.append(stat);
  }
  const grid = document.createElement('div'); grid.className = 'choices shop-grid';
  offers.forEach((offer, index) => {
    const wrap = document.createElement('div'); wrap.className = 'offer-wrap';
    if (!offer) { const empty = document.createElement('div'); empty.className = 'choice'; empty.textContent = 'No offer'; wrap.append(empty); grid.append(wrap); return; }
    const item = ITEMS[offer.id];
    const offerName = offer.id === 'autoMastery' ? 'BASIC ATTACK MASTERY' : item.name;
    const choice = choiceCard(item.icon, offerName + ' · Lv ' + offer.level, itemDescription(offer.id), () => {
      if (buy(run, offer)) {
        playSound('coin');
        offers[index] = null;
        message = offer.level > 1 ? 'Upgraded: ' + item.name + ' Lv ' + offer.level : 'Bought: ' + item.name;
        updateHud(); renderShop();
      }
    });
    choice.dataset.shopFocus = 'offer:' + index;
    const rarity = rarityById(offer.rarity || 'normal');
    choice.classList.add('rarity-choice', 'rarity-' + rarity.id);
    choice.style.setProperty('--rarity', rarity.color);
    const badge = document.createElement('span'); badge.className = 'rarity'; badge.textContent = rarity.name;
    choice.prepend(badge);
    choice.querySelector('small').replaceWith(itemEffects(offer.id));
    if (item.category) choice.append(categoryBadge(item.category));
    choice.disabled = run.gold < offer.cost;
    const cost = document.createElement('span'); cost.className = 'cost'; cost.textContent = '◆ ' + offer.cost; choice.append(cost);
    const lock = button(offer.locked ? '● LOCKED' : '○ LOCK', () => { offer.locked = !offer.locked; renderShop(); }, 'lock' + (offer.locked ? ' active' : ''));
    lock.dataset.shopFocus = 'lock:' + index;
    wrap.append(choice, lock); grid.append(wrap);
  });
  const actions = document.createElement('div'); actions.className = 'shop-actions';
  const reroll = button('↻ REROLL / ' + price + ' ◆', () => { if (run.gold >= price) { playSound('coin'); run.gold -= price; shopRerolls++; offers = makeOffers(run, offers); message = ''; updateHud(); renderShop(); } }, 'primary secondary');
  reroll.dataset.shopFocus = 'reroll';
  reroll.disabled = run.gold < price;
  const heal = button('✚ HEAL 30 HP / 8 ◆', () => {
    if (run.gold >= 8 && run.hp < run.maxHp) {
      playSound('coin');
      run.gold -= 8; run.hp = Math.min(run.maxHp, run.hp + 30); message = 'Health restored'; updateHud(); renderShop();
    }
  }, 'primary secondary');
  heal.dataset.shopFocus = 'heal';
  heal.disabled = run.gold < 8 || run.hp >= run.maxHp;
  const nextWave = button('NEXT WAVE →', () => { run.wave++; message = ''; startWave(); });
  nextWave.dataset.shopFocus = 'next-wave';
  actions.append(reroll, heal, nextWave);
  card.append(info, statsPanel, skillSummary(), grid, actions); show(card);
  const buttons = menuButtons();
  const focused = buttons.find(control => control.dataset.shopFocus === focusedControl);
  const firstOffer = buttons.find(control => control.dataset.shopFocus?.startsWith('offer:'));
  (focused || (focusedIndex < 0 && firstOffer) || buttons[Math.max(0, Math.min(focusedIndex, buttons.length - 1))])?.focus();
}
function damageSummary() {
  const section = document.createElement('section'); section.className = 'damage-summary';
  const heading = document.createElement('h3'); heading.textContent = 'DAMAGE DEALT';
  const total = Object.values(run.damageBySource).reduce((sum, amount) => sum + amount, 0);
  const description = document.createElement('p');
  description.textContent = 'Total: ' + Math.round(total).toLocaleString('en-US') + ' · Weapon copies and evolutions are grouped by base weapon.';
  const extraSources = {
    heroSkill: { name: HERO_SKILLS[run.character].name, icon: HERO_SKILLS[run.character].icon, category: HERO_SKILLS[run.character].category },
    heroSecondarySkill: { name: HERO_SECONDARY_SKILLS[run.character].name, icon: HERO_SECONDARY_SKILLS[run.character].icon, category: HERO_SECONDARY_SKILLS[run.character].category },
    heroPassive: { name: HERO_PASSIVES[run.character].name, icon: HERO_PASSIVES[run.character].icon, category: HERO_PASSIVES[run.character].category },
    strafe: { name: 'Class Strafe', icon: '➟', category: HERO_SKILLS[run.character].category },
    scorchRounds: { name: ITEMS.scorchRounds.name, icon: ITEMS.scorchRounds.icon, category: WEAPONS[CHARACTERS[run.character].weapon].category },
    volatile: { name: ITEMS.volatile.name, icon: ITEMS.volatile.icon }
  };
  const ids = new Set([...run.weapons.map(weapon => weapon.id), ...Object.keys(run.damageBySource)]);
  const entries = [...ids].map(id => ({
    id, amount: run.damageBySource[id] || 0,
    name: id === 'ultimate' ? ULTIMATES[run.character].name + ' · Hero ultimate' : id === 'bomb' ? 'Loot bomb' : WEAPONS[id]?.name || extraSources[id]?.name || 'Other (' + id + ')',
    icon: id === 'ultimate' ? ULTIMATES[run.character].icon : id === 'bomb' ? '✹' : WEAPONS[id]?.icon || extraSources[id]?.icon || '✦'
  })).sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
  const list = document.createElement('div'); list.className = 'damage-list';
  for (const entry of entries) {
    const row = document.createElement('div'); row.className = 'damage-row';
    const label = document.createElement('span'); label.textContent = entry.icon + ' ' + entry.name;
    const category = WEAPONS[entry.id]?.category || extraSources[entry.id]?.category;
    if (category) label.className = 'category-' + category;
    const value = document.createElement('b'); value.textContent = Math.round(entry.amount).toLocaleString('en-US');
    const track = document.createElement('div'); track.className = 'damage-track';
    const fill = document.createElement('span'); fill.style.width = (total > 0 ? 100 * entry.amount / total : 0) + '%';
    track.append(fill); row.append(label, value, track); list.append(row);
  }
  section.append(heading, description, list);
  return section;
}
function victory() {
  playSound('victory', { minInterval: 1 });
  saveRunRecord(true);
  phase = 'victory';
  const card = panel('ARENA CLEARED', 'You survived.', 'The final boss is defeated. You survived 10 waves and defeated ' + run.kills + ' enemies.');
  card.append(damageSummary(), buildPanel(false, true), button('PLAY AGAIN →', startScreen)); show(card); updateHud();
}
function gameOver(endedEarly = false) {
  if (!endedEarly) playSound('defeat', { minInterval: 1 });
  saveRunRecord(false);
  phase = 'gameover'; keys.clear(); primaryHeld = false; pointerPrimaryHeld = false; gamepadPrimaryHeld = false; previewSkill = '';
  if (!endedEarly) run.hp = 0;
  updateHud();
  const card = panel(
    (endedEarly ? 'RUN ENDED / WAVE ' : 'GAME OVER / WAVE ') + run.wave,
    endedEarly ? 'Run ended.' : 'The arena won.',
    endedEarly
      ? 'You ended the run after defeating ' + run.kills + ' enemies.'
      : 'You defeated ' + run.kills + ' enemies. Every run is a new chance to find a winning build.'
  );
  card.append(damageSummary(), buildPanel(false, true), button(endedEarly ? 'PLAY AGAIN →' : 'TRY AGAIN →', startScreen)); show(card);
}
function togglePause() {
  playSound('menu');
  if (phase === 'battle') {
    pauseMusic();
    phase = 'paused'; keys.clear(); primaryHeld = false; pointerPrimaryHeld = false; gamepadPrimaryHeld = false; previewSkill = '';
    const card = panel('PAUSED', 'Game paused.', 'Press Esc or P to resume, or end the run to view its summary.');
    const actions = document.createElement('div'); actions.className = 'pause-actions';
    actions.append(button('RESUME →', togglePause), button('END THE RUN →', () => gameOver(true)));
    card.append(actions); show(card);
  } else if (phase === 'paused') {
    phase = 'battle'; keys.clear(); hide(); resumeMusic(); startLoop();
  }
}
function spawn(type, x, y) {
  if (enemies.length + pendingSpawns.length >= 240 && type !== 'boss' && type !== 'goblin' && type !== 'sapling' && enemies.filter(enemy => enemy.type !== 'sapling').length + pendingSpawns.length >= 240) return;
  const def = enemyTypes[type];
  if (x === undefined) {
    if (type === 'sapling') {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.min(viewW, viewH) * .58 + Math.random() * 80;
      x = Math.max(12, Math.min(W - 12, player.x + Math.cos(angle) * distance));
      y = Math.max(12, Math.min(H - 12, player.y + Math.sin(angle) * distance));
    } else {
      const offset = camera(), margin = enemyRadius(type) * 1.3 + 8;
      for (let attempt = 0; attempt < 120; attempt++) {
        const side = Math.floor(Math.random() * 4), distance = margin + Math.random() * 80;
        const sx = side === 0 ? -distance : side === 1 ? viewW + distance : Math.random() * viewW;
        const sy = side === 2 ? -distance : side === 3 ? viewH + distance : Math.random() * viewH;
        const point = unproject(offset.x + sx, offset.y + sy);
        if (point.x >= 0 && point.x <= W && point.y >= 0 && point.y <= H && !visible(point.x, point.y, margin, offset)) {
          x = point.x; y = point.y; break;
        }
      }
      if (x === undefined) {
        const corners = [[0, 0], [W, 0], [0, H], [W, H]];
        const center = project(player.x, player.y);
        corners.sort((a, b) => {
          const pa = project(...a), pb = project(...b);
          return Math.hypot(pb.x - center.x, pb.y - center.y) - Math.hypot(pa.x - center.x, pa.y - center.y);
        });
        [x, y] = corners[0];
      }
    }
  }
  x = Math.max(0, Math.min(W, x)); y = Math.max(0, Math.min(H, y));
  if (type === 'sapling') spawnNow(type, x, y);
  else pendingSpawns.push({ type, x, y, remaining: SPAWN_WARNING });
}
function spawnNow(type, x, y) {
  const def = enemyTypes[type], progression = run.wave - 1;
  const hp = type === 'boss' ? bossHealth(run.wave) : (type === 'goblin' || type === 'sapling') ? def.hp * (1 + progression * .12) : def.hp * (1 + progression * .25 + progression * progression * .035) * enemyHealthScale(run.wave);
  enemies.push({ type, x, y, hp, maxHp: hp, speed: type === 'chaser' ? chaserSpeed(run.wave) : def.speed * enemySpeedScale(run.wave), radius: enemyRadius(type), cooldown: 1 + Math.random() * 2, charge: 0, slow: 0, acidSlow: 0, frozen: 0, stunned: 0, controlImmunity: 0, marked: 0, hit: 0, attackWarning: false, pushX: 0, pushY: 0, bullState: 'approach', life: type === 'goblin' ? 18 : Infinity, wander: Math.random() * Math.PI * 2 });
}
function spawnRandom() {
  const pool = ['swarm', 'swarm', 'chaser'];
  if (run.wave >= 2 && Math.random() < .5) pool.push('ranged');
  if (run.wave >= 3) pool.push('charger', 'tank', 'bull');
  if (run.wave >= 5) pool.push('exploder');
  if (run.wave >= 7) pool.push('summoner');
  spawn(pool[Math.floor(Math.random() * pool.length)]);
}
function nearest(x, y, range = Infinity, excluded = []) {
  let best = null, distanceSquared = range * range;
  for (const enemy of enemies) {
    if (enemy.hp <= 0 || enemy.escaped || (excluded instanceof Set ? excluded.has(enemy) : excluded.includes(enemy))) continue;
    const dx = enemy.x - x, dy = enemy.y - y, d = dx * dx + dy * dy;
    if (d < distanceSquared) { distanceSquared = d; best = enemy; }
  }
  return best;
}
function aimedTarget(x, y, range, halfAngle = .12) {
  const aim = autoAimPoint();
  const aimDx = aim.x - player.x, aimDy = aim.y - player.y;
  const aimLength = Math.hypot(aimDx, aimDy) || 1;
  const ux = aimDx / aimLength, uy = aimDy / aimLength;
  let best = null, bestProjection = range;
  for (const enemy of enemies) {
    if (enemy.hp <= 0 || enemy.escaped) continue;
    const dx = enemy.x - x, dy = enemy.y - y;
    const projection = dx * ux + dy * uy;
    const lateral = Math.abs(dx * uy - dy * ux);
    if (projection < 0 || projection > range + enemy.radius || lateral > enemy.radius + Math.max(10, projection * Math.tan(halfAngle))) continue;
    if (projection < bestProjection) { best = enemy; bestProjection = projection; }
  }
  return best;
}
function aimPoint(x, y, range) {
  const aim = autoAimPoint();
  const dx = aim.x - player.x, dy = aim.y - player.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: x + dx / length * range, y: y + dy / length * range };
}
function autoAimPoint() {
  const dx = aimX - player.x, dy = aimY - player.y, distance = Math.hypot(dx, dy);
  const length = distance || 1, clampedDistance = Math.min(distance || AUTO_ATTACK_AIM_DISTANCE, AUTO_ATTACK_AIM_DISTANCE - 1e-7);
  return { x: player.x + dx / length * clampedDistance, y: player.y + dy / length * clampedDistance };
}
function aimAngle() {
  const aim = autoAimPoint();
  return Math.atan2(aim.y - player.y, aim.x - player.x);
}
function knockback(enemy, dx, dy, strength) {
  const length = Math.hypot(dx, dy);
  if (!strength || !length || enemy.type === 'sapling' || enemy.hp <= 0) return;
  const resistance = enemy.type === 'boss' ? .28 : enemy.type === 'tank' ? .65 : enemy.type === 'bull' ? .75 : 1;
  const impulse = strength * 4 * (1 + battleStats.knockback / 100) * resistance;
  enemy.pushX += dx / length * impulse;
  enemy.pushY += dy / length * impulse;
  const speed = Math.hypot(enemy.pushX, enemy.pushY);
  if (speed > 1800) { enemy.pushX *= 1800 / speed; enemy.pushY *= 1800 / speed; }
}
function applyKnockback(enemy, dt) {
  if (!enemy.pushX && !enemy.pushY) return;
  const decay = Math.exp(-4 * dt), distance = (1 - decay) / 4;
  enemy.x = Math.max(0, Math.min(W, enemy.x + enemy.pushX * distance));
  enemy.y = Math.max(0, Math.min(H, enemy.y + enemy.pushY * distance));
  enemy.pushX *= decay; enemy.pushY *= decay;
  if (Math.hypot(enemy.pushX, enemy.pushY) < .5) { enemy.pushX = 0; enemy.pushY = 0; }
}
function recordDamage(enemy, amount, source) {
  if (!source || enemy.type === 'sapling') return;
  const actual = Math.min(Math.max(0, enemy.hp), amount);
  run.damageBySource[source] = (run.damageBySource[source] || 0) + actual;
}
function combatCategory(source) {
  return WEAPONS[source]?.category || (['heroSkill', 'heroSecondarySkill', 'ultimate', 'strafe'].includes(source) ? HERO_SKILLS[run.character].category : null);
}
function damage(enemy, amount, color = '#fff', critBonus = 0, push = null, source = null) {
  const critical = Math.random() < Math.min(critBonus ? .95 : .75, battleStats.crit / 100 + critBonus);
  if (amount > 0) playSound('hit', { pitch: critical ? 1.13 : 1, minInterval: .055 });
  const category = combatCategory(source), passiveLevel = run.heroPassiveLevel || 0;
  const warriorPassive = run.character === 'warrior' && passiveLevel > 0 && category === 'melee';
  const finisher = warriorPassive && passiveLevel === HERO_PASSIVE_MAX_LEVEL && enemy.bleed?.remaining > 0;
  const dealt = amount * (enemy.marked > 0 ? 1.25 : 1) * (critical ? 1.7 : 1) * (finisher ? 1.1 : 1);
  const wasAlive = enemy.hp > 0;
  recordDamage(enemy, dealt, source);
  showDamage(enemy, dealt, critical);
  if (run.hp > 0 && enemy.type !== 'sapling') {
    const healing = lifeLeechHeal(run, Math.min(enemy.hp, dealt), leechRemaining, battleStats);
    run.hp += healing; leechRemaining -= healing;
  }
  enemy.hp -= dealt; enemy.hit = .2;
  if (wasAlive && enemy.hp <= 0 && enemy.type !== 'sapling') playSound('kill', { minInterval: .12 });
  if (push) knockback(enemy, push.x, push.y, push.strength);
  applyScorch(enemy, source);
  if (wasAlive && enemy.hp > 0 && warriorPassive) {
    enemy.bleed = applyDot(enemy.bleed, { damage: dealt * (.02 + passiveLevel / 100), remaining: 2, source: 'heroPassive' });
  }
  if (effects.length < 100 && enemy.type !== 'sapling') {
    effects.push({ kind: 'hit', x: enemy.x, y: enemy.y, radius: critical ? 23 : 17, life: .2, max: .2, color: category ? CATEGORIES[category].color : color });
  }
  if (critical) effects.push({ kind: 'impact', x: enemy.x, y: enemy.y, radius: 20, life: .2, max: .2, color });
}
function applyScorch(enemy, source) {
  if (enemy.hp <= 0 || !run.items.scorchRounds || !source || Math.random() >= .3) return;
  const weapon = WEAPONS[source] ? source : CHARACTERS[run.character].weapon;
  const burn = {
    ...burnStats(run, 1, battleStats),
    damage: weaponPower(run, weapon, 10 + (run.items.embers || 0) * 7, battleStats),
    chance: 1,
    source: 'scorchRounds'
  };
  enemy.burn = applyDot(enemy.burn, burn);
}
function controlEnemy(enemy, type, duration) {
  if (enemy.type === 'sapling' || enemy.hp <= 0 || enemy.escaped) return;
  if (enemy.type === 'boss' && enemy.controlImmunity > 0) return;
  const resisted = enemy.type === 'boss' ? duration * .5 : duration;
  enemy[type] = Math.max(enemy[type], resisted);
  if (enemy.type === 'boss') enemy.controlImmunity = 1.5;
}
function showDamage(enemy, amount, critical = false, color = '#ffffff') {
  const actual = Math.min(Math.max(0, enemy.hp), amount);
  if (actual <= 0) return;
  if (damageNumbers.length >= 120) damageNumbers.shift();
  damageNumbers.push({ x: enemy.x, y: enemy.y, height: enemy.radius, value: Math.max(1, Math.round(actual)), critical, color, life: .7 });
}
function projectile(x, y, target, opts = {}) {
  if (opts.visual === 'turret') playSound('turret', { minInterval: .1, pitch: opts.source === 'heroSkill' ? 1.08 : .96 });
  else if (opts.source === 'fireball') playSound('fire', { minInterval: .1 });
  else if (opts.source === 'frost') playSound('frost', { minInterval: .1 });
  else if (opts.source !== 'heroSkill' && opts.source !== 'ultimate') playSound('shot', { minInterval: .075 });
  const category = WEAPONS[opts.visual || opts.source]?.category, passiveLevel = run.heroPassiveLevel || 0;
  const scoutChain = run.character === 'scout' && category === 'ranged' && passiveLevel > 0 ? Math.ceil(passiveLevel / 2) : 0;
  const pierce = (opts.pierce || 1) + scoutChain;
  const ricochets = (opts.ricochets || 0) + scoutChain;
  const angle = Math.atan2(target.y - y, target.x - x) + (opts.angle || 0);
  const speed = (opts.speed || 320) * PROJECTILE_SPEED_MULTIPLIER;
  shots.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: opts.life || 2, radius: opts.radius || 7, damage: opts.damage || 20, source: opts.source, color: opts.color || '#f4a65e', visual: opts.visual, special: opts.special || false, pierce, ricochets, ricochetRange: opts.ricochetRange || 320, splash: opts.splash || 0, slow: opts.slow || 0, freezeChance: opts.freezeChance || 0, freezeDuration: opts.freezeDuration || 0, mark: opts.mark || 0, stun: opts.stun || 0, burn: opts.burn || null, acid: opts.acid || null, knockback: opts.knockback || 0, hit: new Set(), returnAt: opts.returnAt || 0, homing: opts.homing || false });
}
function skillColor(id) {
  return skillColors[id] || skillColors[WEAPONS[id].category];
}
function skillPulse(x, y, color, radius = 70) {
  const sound = color === skillColors.frost ? 'frost'
    : run.character === 'engineer' ? 'tech'
      : run.character === 'warrior' ? 'melee'
        : run.character === 'mage' ? 'fire' : 'skill';
  playSound(sound, { minInterval: .09 });
  screenShake(Math.min(8, 3 + radius / 35), .16);
  effects.push({ kind: 'pulse', x, y, radius, life: .45, max: .45, color });
}
function allTurrets() {
  return [...Object.values(turrets), ...placedTurrets, ...temporaryTurrets];
}
function screenShake(strength, duration) {
  shakeStrength = Math.max(shakeStrength, strength);
  shakeTime = Math.max(shakeTime, duration);
}
function movementDirection() {
  const x = Number(keys.has('d') || keys.has('arrowright') || keys.has('right')) - Number(keys.has('a') || keys.has('arrowleft') || keys.has('left')) + gamepadMoveX;
  const y = Number(keys.has('s') || keys.has('arrowdown') || keys.has('down')) - Number(keys.has('w') || keys.has('arrowup') || keys.has('up')) + gamepadMoveY;
  const direction = unproject(x, y), length = Math.hypot(direction.x, direction.y);
  return length ? { x: direction.x / length, y: direction.y / length } : null;
}
function gamepadButtonValue(gamepad, index) {
  const button = gamepad.buttons?.[index];
  return typeof button === 'number' ? button : Math.max(Number(button?.value) || 0, Number(Boolean(button?.pressed)));
}
function updateGamepadAim(dt = 1 / 60) {
  if (!gamepadAiming || !gamepadAimDirection || !gamepadAimTargetDirection) return;
  const currentAngle = Math.atan2(gamepadAimDirection.y, gamepadAimDirection.x);
  const targetAngle = Math.atan2(gamepadAimTargetDirection.y, gamepadAimTargetDirection.x);
  const difference = Math.atan2(Math.sin(targetAngle - currentAngle), Math.cos(targetAngle - currentAngle));
  const angle = currentAngle + difference * (1 - Math.exp(-12 * dt));
  gamepadAimDirection = { x: Math.cos(angle), y: Math.sin(angle) };
  gamepadAimDistance += (gamepadAimTargetDistance - gamepadAimDistance) * (1 - Math.exp(-12 * dt));
  const world = project(player.x, player.y), offset = camera();
  const screenX = world.x - offset.x, screenY = world.y - offset.y;
  const screenDirection = project(player.x + gamepadAimDirection.x, player.y + gamepadAimDirection.y);
  const dx = screenDirection.x - world.x, dy = screenDirection.y - world.y, padding = 18;
  let visibleDistance = GAMEPAD_AIM_MAX_DISTANCE;
  if (dx > 0) visibleDistance = Math.min(visibleDistance, (viewW - padding - screenX) / dx);
  else if (dx < 0) visibleDistance = Math.min(visibleDistance, (padding - screenX) / dx);
  if (dy > 0) visibleDistance = Math.min(visibleDistance, (viewH - padding - screenY) / dy);
  else if (dy < 0) visibleDistance = Math.min(visibleDistance, (padding - screenY) / dy);
  aimX = Math.max(0, Math.min(W, player.x + gamepadAimDirection.x * Math.min(gamepadAimDistance, visibleDistance)));
  aimY = Math.max(0, Math.min(H, player.y + gamepadAimDirection.y * Math.min(gamepadAimDistance, visibleDistance)));
  aimScreenX = aimScreenY = null;
}
function menuButtons() {
  return [...overlay.querySelectorAll('button:not(:disabled)')]
    .filter(button => !button.className.split(/\s+/).includes('skill-tile'));
}
function moveMenuFocus(direction) {
  const buttons = menuButtons();
  if (!buttons.length) return;
  const index = buttons.indexOf(document.activeElement);
  const next = index < 0 ? (direction > 0 ? 0 : buttons.length - 1) : (index + direction + buttons.length) % buttons.length;
  buttons[next].focus();
}
function confirmMenu() {
  const buttons = menuButtons();
  const active = buttons.includes(document.activeElement) ? document.activeElement : buttons[0];
  active?.click();
}
function cancelMenu() {
  if (phase === 'paused') togglePause();
  else if (phase === 'help') menuButtons().find(button => button.textContent.includes('BACK'))?.click();
}
function processGamepad(gamepad, dt = 1 / 60) {
  dt = Math.max(0, Math.min(.05, dt));
  const values = Array.from({ length: 16 }, (_, index) => gamepadButtonValue(gamepad, index));
  const buttons = values.map(value => value >= .5);
  const axes = gamepad.axes || [];
  if (buttons.some(Boolean) || axes.some(value => Math.abs(value || 0) >= .18)) setInputMode('gamepad');
  const axis = value => Math.abs(value || 0) < .18 ? 0 : Math.max(-1, Math.min(1, value));
  const leftX = axis(axes[0]), leftY = axis(axes[1]);
  const rightX = axis(axes[2]), rightY = axis(axes[3]);
  const directions = [
    buttons[GAMEPAD_BUTTON.UP] || phase !== 'battle' && leftY < -.55,
    buttons[GAMEPAD_BUTTON.DOWN] || phase !== 'battle' && leftY > .55,
    buttons[GAMEPAD_BUTTON.LEFT] || phase !== 'battle' && leftX < -.55,
    buttons[GAMEPAD_BUTTON.RIGHT] || phase !== 'battle' && leftX > .55
  ];
  const wasPressed = index => Boolean(previousGamepadButtons[index]);
  const justPressed = index => buttons[index] && !wasPressed(index);
  const blocked = index => {
    if (!gamepadSuppressedButtons.has(index)) return false;
    if (!buttons[index]) gamepadSuppressedButtons.delete(index);
    return true;
  };
  const skill = (index, preview, unlocked, activate) => {
    if (blocked(index)) return;
    if (phase === 'battle') {
      if (justPressed(index) && unlocked) previewSkill = preview;
      if (!buttons[index] && wasPressed(index) && unlocked) {
        activate();
        if (previewSkill === preview) previewSkill = '';
      }
    } else if (wasPressed(index) && previewSkill === preview) previewSkill = '';
  };
  if (phase === 'battle') {
    gamepadMoveX = leftX; gamepadMoveY = leftY;
    if (!gamepadAimDirection) {
      const length = Math.hypot(facingX, facingY) || 1;
      gamepadAimDirection = { x: facingX / length, y: facingY / length };
      gamepadAimTargetDirection = { ...gamepadAimDirection };
      gamepadAimDistance = gamepadAimTargetDistance = Math.min(GAMEPAD_AIM_MAX_DISTANCE, Math.hypot(aimX - player.x, aimY - player.y) || GAMEPAD_AIM_MAX_DISTANCE);
      gamepadAiming = true;
    }
    const aimLength = Math.hypot(rightX, rightY);
    if (aimLength >= .2) {
      const direction = unproject(rightX / aimLength, rightY / aimLength);
      const length = Math.hypot(direction.x, direction.y) || 1;
      gamepadAimTargetDirection = { x: direction.x / length, y: direction.y / length };
      const strength = Math.max(0, Math.min(1, (Math.min(1, aimLength) - .2) / .8));
      gamepadAimTargetDistance = GAMEPAD_AIM_MIN_DISTANCE + strength * (GAMEPAD_AIM_MAX_DISTANCE - GAMEPAD_AIM_MIN_DISTANCE);
      gamepadAiming = true;
    }
    updateGamepadAim(dt);
    gamepadPrimaryHeld = buttons[GAMEPAD_BUTTON.RT] && !blocked(GAMEPAD_BUTTON.RT);
    primaryHeld = pointerPrimaryHeld || gamepadPrimaryHeld;
    skill(GAMEPAD_BUTTON.LT, 'right', skillAvailable('right'), activateHeroSkill);
    skill(GAMEPAD_BUTTON.LB, 'q', skillAvailable('q'), activateSecondarySkill);
    skill(GAMEPAD_BUTTON.A, 'ultimate', skillAvailable('ultimate'), activateUltimate);
    if (justPressed(GAMEPAD_BUTTON.B) && !blocked(GAMEPAD_BUTTON.B)) evade();
    if (justPressed(GAMEPAD_BUTTON.START) && !blocked(GAMEPAD_BUTTON.START)) togglePause();
    if (justPressed(GAMEPAD_BUTTON.BACK) && !blocked(GAMEPAD_BUTTON.BACK)) $('#help').click();
  } else {
    gamepadMoveX = gamepadMoveY = 0;
    gamepadPrimaryHeld = false;
    primaryHeld = pointerPrimaryHeld;
    if (wasPressed(GAMEPAD_BUTTON.LT) && previewSkill === 'right') previewSkill = '';
    skill(GAMEPAD_BUTTON.LB, 'q', false, activateSecondarySkill);
    skill(GAMEPAD_BUTTON.A, 'ultimate', false, activateUltimate);
    for (let index = 0; index < directions.length; index++) {
      if (directions[index] && !previousGamepadDirections[index]) moveMenuFocus(index < 2 ? (index === 0 ? -1 : 1) : (index === 2 ? -1 : 1));
    }
    if (justPressed(GAMEPAD_BUTTON.A) && !blocked(GAMEPAD_BUTTON.A)) {
      confirmMenu();
      if (phase === 'battle') gamepadSuppressedButtons.add(GAMEPAD_BUTTON.A);
    }
    if ((justPressed(GAMEPAD_BUTTON.B) && !blocked(GAMEPAD_BUTTON.B)) ||
        (justPressed(GAMEPAD_BUTTON.BACK) && !blocked(GAMEPAD_BUTTON.BACK))) cancelMenu();
    if (justPressed(GAMEPAD_BUTTON.START) && !blocked(GAMEPAD_BUTTON.START)) togglePause();
  }
  previousGamepadButtons = buttons;
  previousGamepadDirections = directions;
}
function releaseGamepad() {
  if ((previewSkill === 'right' && previousGamepadButtons[GAMEPAD_BUTTON.LT]) ||
      (previewSkill === 'q' && previousGamepadButtons[GAMEPAD_BUTTON.LB]) ||
      (previewSkill === 'ultimate' && previousGamepadButtons[GAMEPAD_BUTTON.A])) previewSkill = '';
  gamepadMoveX = gamepadMoveY = gamepadPrimaryHeld = false;
  gamepadAimDirection = gamepadAimTargetDirection = null; gamepadAimDistance = gamepadAimTargetDistance = 200; gamepadAiming = false; gamepadPreviousTimestamp = 0;
  primaryHeld = pointerPrimaryHeld;
  previousGamepadButtons = []; previousGamepadDirections = []; gamepadSuppressedButtons.clear();
  activeGamepadIndex = -1;
}
function pollGamepadFrame(timestamp = 0) {
  gamepadFramePending = false;
  const pads = globalThis.navigator?.getGamepads?.();
  const gamepad = Array.from(pads || []).find(pad => pad?.connected);
  if (!gamepad) { releaseGamepad(); return; }
  if (activeGamepadIndex !== gamepad.index) {
    releaseGamepad();
    activeGamepadIndex = gamepad.index;
  }
  const dt = gamepadPreviousTimestamp ? Math.min(.05, (timestamp - gamepadPreviousTimestamp) / 1000) : 1 / 60;
  gamepadPreviousTimestamp = timestamp;
  processGamepad(gamepad, dt);
  gamepadFramePending = true;
  requestAnimationFrame(pollGamepadFrame);
}
function startGamepadLoop() {
  if (gamepadFramePending) return;
  gamepadFramePending = true;
  requestAnimationFrame(pollGamepadFrame);
}
function evade() {
  if (phase !== 'battle' || evadeCooldown > 0) return;
  playSound('evade', { minInterval: .2 });
  const direction = movementDirection() || { x: facingX, y: facingY };
  evadeX = direction.x; evadeY = direction.y;
  facingX = direction.x; facingY = direction.y;
  const startX = player.x, startY = player.y, strafeLevel = run.items.strafe || 0;
  evadeCooldown = EVADE.cooldown;
  if (!strafeLevel) {
    evadeTime = EVADE.duration;
    invulnerable = Math.max(invulnerable, EVADE.duration);
  } else if (run.character === 'mage') {
    const distance = 160 + strafeLevel * 28;
    player.x = Math.max(17, Math.min(W - 17, player.x + direction.x * distance));
    player.y = Math.max(17, Math.min(H - 17, player.y + direction.y * distance));
    invulnerable = Math.max(invulnerable, .35);
    const radius = 65 + strafeLevel * 12;
    effects.push({ kind: 'frost', x: player.x, y: player.y, radius, life: .35, max: .35, color: '#b7edff' });
    for (const enemy of enemies) if (enemy.hp > 0 && !enemy.escaped && Math.hypot(enemy.x - player.x, enemy.y - player.y) < radius + enemy.radius) {
      damage(enemy, weaponPower(run, 'fireball', 22 + strafeLevel * 12, battleStats), '#b7edff', 0, null, 'strafe');
    }
  } else {
    const distanceScale = 1 + strafeLevel * .08;
    evadeTime = EVADE.duration;
    invulnerable = Math.max(invulnerable, EVADE.duration);
    if (run.character === 'warrior') evadeImpact = { character: 'warrior', level: strafeLevel };
    if (run.character === 'scout') mines.push({ owner: 'strafe', source: 'strafe', special: true, x: startX, y: startY, life: 15, radius: 55 + strafeLevel * 12, damage: weaponPower(run, 'pistol', 28 + strafeLevel * 16, battleStats) });
    if (run.character === 'engineer') temporaryTurrets.push({ x: startX, y: startY, life: 3 + strafeLevel, cooldown: 0 });
    evadeX *= distanceScale; evadeY *= distanceScale;
  }
  skillPulse(startX, startY, '#b7edff', 45);
  updateAbilityHud();
}
function buildAbilityBar() {
  inputPromptUpdates.clear();
  const attackControl = $('#attack-control');
  setAbilityIcon(attackControl, CATEGORIES[WEAPONS[CHARACTERS[run.character].weapon].category].iconImage);
  bindAbilityPrompt(attackControl, 'LMB', 'RT / R2', 'hold for Basic Attack');
  const evadeControl = $('#evade');
  setAbilityIcon(evadeControl, EVADE.image);
  evadeControl.classList.remove('cooling', 'ready-flash');
  const heroSkill = HERO_SKILLS[run.character], heroControl = $('#hero-skill');
  setAbilityIcon(heroControl, heroSkill.image);
  heroControl.classList.remove('cooling', 'ready-flash');
  bindAbilityPrompt(heroControl, 'RMB', 'LT / L2', heroSkill.name);
  heroControl.querySelector('strong').textContent = heroSkill.name;
  heroControl.title = heroSkill.detail(run.heroSkillLevel) + ' Cooldown: ' + HERO_SKILL_COOLDOWN + 's.';
  const secondary = HERO_SECONDARY_SKILLS[run.character], secondaryControl = $('#hero-skill-w');
  setAbilityIcon(secondaryControl, secondary.image);
  bindAbilityPrompt(secondaryControl, 'Q', 'LB / L1', secondary.name);
  secondaryControl.querySelector('strong').textContent = secondary.name;
  secondaryControl.title = secondary.detail(Math.max(1, run.heroSkills.w)) + ' Cooldown: ' + secondary.cooldown + 's.';
  secondaryControl.hidden = false;
  const ultimate = $('#ultimate'), skill = ULTIMATES[run.character];
  setAbilityIcon(ultimate, skill.image);
  ultimate.classList.remove('cooling', 'ready-flash');
  bindAbilityPrompt(ultimate, 'R', 'A / ×', skill.name);
  ultimate.querySelector('strong').textContent = skill.name;
  ultimate.title = skill.detail(run.ultimateLevel) + ' Cooldown: ' + ULTIMATE_COOLDOWN + 's.';
  bindAbilityPrompt(evadeControl, 'SPACE', 'B / ○', 'evade');
  updateAbilityHud();
}
function updateSecondarySkillHud() {
  const skill = HERO_SECONDARY_SKILLS[run.character], control = $('#hero-skill-w');
  setAbilityIcon(control, skill.image);
  const unlocked = run.heroSkills.w > 0;
  control.hidden = false;
  control.disabled = !unlocked;
  control.classList.toggle('locked', !unlocked);
  control.querySelector('strong').textContent = skill.name;
  bindAbilityPrompt(control, 'Q', 'LB / L1', skill.name);
  if (!run.heroSkills.w) {
    control.querySelector('.ability-status').textContent = 'LVL ' + skill.unlockLevel;
    control.title = 'Unlock at level ' + skill.unlockLevel + '.';
    return;
  }
  control.title = skill.detail(run.heroSkills.w) + ' Cooldown: ' + skill.cooldown + 's.';
}
function updateAbilityHud() {
  const update = (control, cooldown, total, flashOnReady = true) => {
    const text = cooldown > 0 ? (Math.ceil(cooldown * 10) / 10).toFixed(1) + 's' : 'READY';
    const status = control.querySelector('.ability-status');
    if (status.textContent !== text) status.textContent = text;
    const cooling = cooldown > 0, wasCooling = control.classList.contains('cooling');
    if (cooling !== wasCooling) {
      control.classList.toggle('cooling', cooling);
      if (cooling || !flashOnReady) control.classList.remove('ready-flash');
      else control.classList.add('ready-flash');
    }
    const remaining = Math.min(1, cooldown / total);
    if (control.dataset.remaining !== String(remaining)) {
      control.dataset.remaining = String(remaining);
      control.style.setProperty('--remaining', remaining);
      control.style.setProperty('--cooldown-angle', remaining * 360 + 'deg');
    }
  };
  updateSecondarySkillHud();
  update($('#hero-skill'), heroSkillCooldown, HERO_SKILL_COOLDOWN);
  if (run.heroSkills.w) update($('#hero-skill-w'), secondarySkillCooldown, HERO_SECONDARY_SKILLS[run.character].cooldown);
  update($('#ultimate'), ultimateCooldown, ULTIMATE_COOLDOWN);
  update($('#evade'), evadeCooldown, EVADE.cooldown);
  const attack = run.weapons[0];
  if (attack) {
    const key = attack.id === 'turret' ? 'wrench:' + attack.uid : attack.uid;
    update($('#attack-control'), cooldowns[key] || 0, cooldownDurations[key] || 1, false);
  }
  const weaponControl = $('#weapon-skill-control');
  if (attack) {
    const weaponSkill = ACTIVE_SKILLS[attack.id];
    const skillCategory = WEAPONS[attack.id].category;
    const color = CATEGORIES[skillCategory]?.color || '#f6dfa9';
    setAbilityIcon(weaponControl, CATEGORIES[skillCategory]?.iconImage || HERO_SKILLS[run.character].image);
    const weaponKey = weaponControl.querySelector('.ability-key');
    const weaponName = weaponControl.querySelector('strong');
    const weaponStatus = weaponControl.querySelector('.ability-status');
    if (weaponKey.textContent !== 'AUTO') weaponKey.textContent = 'AUTO';
    if (weaponName.textContent !== weaponSkill.name) weaponName.textContent = weaponSkill.name;
    if (weaponControl.dataset.category !== skillCategory) {
      weaponControl.dataset.category = skillCategory;
      weaponControl.style.setProperty('--effect-color', color);
    }
    const activeTime = abilityBuffs[attack.uid] || 0;
    if (activeTime > 0) {
      const duration = attack.id === 'turret' ? 3 : 2;
      update(weaponControl, activeTime, duration, false);
      weaponControl.classList.remove('cooling');
      weaponControl.classList.add('buff-active');
      const activeLabel = 'ACTIVE ' + activeTime.toFixed(1) + 's';
      if (weaponStatus.textContent !== activeLabel) weaponStatus.textContent = activeLabel;
    } else {
      weaponControl.classList.remove('buff-active');
      update(weaponControl, abilityCooldowns[attack.uid] || 0, weaponSkill.cooldown, false);
    }
    const skillTitle = weaponSkill.detail + ' Automatically triggered while attacking. Cooldown: ' + weaponSkill.cooldown + 's.';
    if (weaponControl.title !== skillTitle) weaponControl.title = skillTitle;
    weaponControl.hidden = false;
  } else {
    weaponControl.hidden = true;
  }
  const passiveControl = $('#hero-passive-control');
  const passive = HERO_PASSIVES[run.character];
  setAbilityIcon(passiveControl, passive.image);
  const passiveLevel = run.heroPassiveLevel || 0;
  const passiveCategory = passive.category;
  const passiveColor = CATEGORIES[passiveCategory]?.color || '#f6dfa9';
  const passiveKey = passiveControl.querySelector('.ability-key');
  const passiveName = passiveControl.querySelector('strong');
  const passiveStatus = passiveControl.querySelector('.ability-status');
  if (passiveKey.textContent !== 'PASSIVE') passiveKey.textContent = 'PASSIVE';
  if (passiveName.textContent !== passive.name) passiveName.textContent = passive.name;
  const passiveLabel = passiveLevel ? 'LVL ' + passiveLevel : 'LVL ' + passive.unlockLevel;
  if (passiveStatus.textContent !== passiveLabel) passiveStatus.textContent = passiveLabel;
  if (passiveControl.dataset.category !== passiveCategory) {
    passiveControl.dataset.category = passiveCategory;
    passiveControl.style.setProperty('--effect-color', passiveColor);
  }
  const passiveActive = passiveLevel > 0;
  if (passiveControl.classList.contains('passive-active') !== passiveActive) passiveControl.classList.toggle('passive-active', passiveActive);
  const passiveTitle = passiveActive
    ? passive.detail(passiveLevel)
    : 'Unlock at level ' + passive.unlockLevel + '. ' + passive.detail(1);
  if (passiveControl.title !== passiveTitle) passiveControl.title = passiveTitle;
}
function skillAvailable(id) {
  if (id === 'right') return heroSkillCooldown <= 0;
  if (id === 'q') return run.heroSkills.w > 0 && secondarySkillCooldown <= 0;
  if (id === 'ultimate') return ultimateCooldown <= 0;
  return false;
}
function activateSecondarySkill() {
  if (phase !== 'battle' || !run.heroSkills.w || secondarySkillCooldown > 0) return;
  const level = run.heroSkills.w, skill = HERO_SECONDARY_SKILLS[run.character];
  const source = 'heroSecondarySkill';
  const x = Math.max(0, Math.min(W, aimX)), y = Math.max(0, Math.min(H, aimY));
  if (run.character === 'warrior') {
    const startX = player.x, startY = player.y;
    const dx = aimX - startX, dy = aimY - startY, length = Math.hypot(dx, dy) || 1;
    const distance = 230 + level * 20;
    const endX = Math.max(0, Math.min(W, startX + dx / length * distance));
    const endY = Math.max(0, Math.min(H, startY + dy / length * distance));
    const travel = Math.hypot(endX - startX, endY - startY), angle = Math.atan2(endY - startY, endX - startX);
    effects.push({ kind: 'thrust', x: startX, y: startY, radius: travel, angle, life: .28, max: .28, color: skillColors[skill.category] });
    for (const enemy of enemies) if (enemy.hp > 0 && !enemy.escaped && withinThrust(enemy.x - startX, enemy.y - startY, angle, travel, 36, enemy.radius)) {
      damage(enemy, weaponPower(run, 'sword', 100 + level * 40, battleStats),
        skillColors[skill.category], 0,         { x: enemy.x - startX, y: enemy.y - startY, strength: 300 }, source);
      controlEnemy(enemy, 'stunned', .25 + level * .05);
    }
    player.x = endX; player.y = endY;
  } else if (run.character === 'scout') {
    const angle = Math.atan2(y - player.y, x - player.x), damagePerShot = weaponPower(run, 'pistol', 42 + level * 16, battleStats);
    for (const spread of [-.09, 0, .09]) {
      const shotAngle = angle + spread;
      projectile(player.x, player.y, { x: player.x + Math.cos(shotAngle) * 1200, y: player.y + Math.sin(shotAngle) * 1200 }, {
        damage: damagePerShot, speed: 750, radius: 15, pierce: 2 + Math.floor((level - 1) / 2),
        mark: 2 + level, stun: .18 + level * .03, knockback: 100,
        color: skillColors.ranged, visual: 'pistol', special: true, source
      });
    }
  } else if (run.character === 'mage') {
    const dx = x - player.x, dy = y - player.y, distance = Math.hypot(dx, dy) || 1;
    const halfLength = 150 + level * 20, halfWidth = 30;
    const wall = { x, y, dx: -dy / distance, dy: dx / distance, halfLength, halfWidth, life: 4 + level, level };
    flameWalls.push(wall);
    for (const enemy of enemies) {
      if (enemy.hp <= 0 || enemy.escaped) continue;
      const ex = enemy.x - x, ey = enemy.y - y;
      if (Math.abs(ex * wall.dx + ey * wall.dy) > halfLength + enemy.radius || Math.abs(ex * wall.dy - ey * wall.dx) > halfWidth + enemy.radius) continue;
      damage(enemy, weaponPower(run, 'fireball', 45 + level * 20, battleStats), skillColors.spell, 0,
        { x: ex, y: ey, strength: 170 }, source);
      if (enemy.hp > 0) enemy.burn = applyDot(enemy.burn, { ...burnStats(run, level, battleStats), source, chance: 1 });
    }
  } else {
    placedTurrets.push({ x, y, life: Infinity, cooldown: 0, source, skillLevel: level, permanent: true });
  }
  skillPulse(run.character === 'warrior' ? player.x : x, run.character === 'warrior' ? player.y : y, skillColors[skill.category], run.character === 'mage' ? 120 : 100);
  secondarySkillCooldown = skill.cooldown;
  updateAbilityHud();
}
function activateHeroSkill() {
  if (phase !== 'battle' || heroSkillCooldown > 0) return;
  const level = run.heroSkillLevel, skill = HERO_SKILLS[run.character];
  const dx = aimX - player.x, dy = aimY - player.y, length = Math.hypot(dx, dy) || 1;
  const target = { x: player.x + dx / length * 1200, y: player.y + dy / length * 1200 };
  const configs = {
    warrior: { range: 235 + level * 15, base: 70 + level * 32, halfAngle: Math.PI / 3, knockback: 320, stun: .45 + level * .1, color: '#ffb1b8' },
    scout: { weapon: 'pistol', base: 85 + level * 35, speed: 1000, radius: 22, pierce: level + 6, mark: 3 + level, knockback: 100, color: '#b6f5d2' },
    mage: { weapon: 'fireball', base: 50 + level * 30, speed: 500, radius: 16, pierce: 1, splash: 95 + level * 12, knockback: 180, color: '#ffe6a1' },
    engineer: { weapon: 'mine', base: 75 + level * 34, speed: 460, radius: 16, pierce: 1, splash: 100 + level * 14, stun: .6 + level * .12, knockback: 240, color: '#a9dbff' }
  };
  const config = configs[run.character];
  if (run.character === 'warrior') {
    const angle = Math.atan2(dy, dx);
    effects.push({ kind: 'arc', x: player.x, y: player.y, radius: config.range, angle, halfAngle: config.halfAngle, life: .28, max: .28, color: config.color });
    for (const enemy of enemies) {
      if (enemy.hp <= 0 || enemy.escaped || !withinArc(enemy.x - player.x, enemy.y - player.y, angle, config.range + enemy.radius, config.halfAngle)) continue;
      damage(enemy, weaponPower(run, 'sword', config.base, battleStats), config.color, 0,
        { x: enemy.x - player.x, y: enemy.y - player.y, strength: config.knockback }, 'heroSkill');
      controlEnemy(enemy, 'stunned', config.stun);
    }
    skillPulse(player.x + Math.cos(angle) * config.range * .55, player.y + Math.sin(angle) * config.range * .55, skillColors[skill.category], config.range * .45);
    heroSkillCooldown = HERO_SKILL_COOLDOWN;
    updateAbilityHud();
    return;
  }
  const options = {
    damage: weaponPower(run, config.weapon, config.base, battleStats),
    speed: config.speed,
    radius: config.radius,
    pierce: config.pierce,
    splash: config.splash || 0,
    mark: config.mark || 0,
    stun: config.stun || 0,
    knockback: config.knockback,
    color: config.color,
    visual: config.weapon,
    special: true,
    source: 'heroSkill'
  };
  if (run.character === 'mage') options.burn = { ...burnStats(run, level, battleStats), chance: 1, source: 'heroSkill' };
  projectile(player.x, player.y, target, options);
  skillPulse(player.x, player.y, skillColors[skill.category], config.splash || 100);
  heroSkillCooldown = HERO_SKILL_COOLDOWN;
  updateAbilityHud();
}
function activateUltimate() {
  if (phase !== 'battle' || ultimateCooldown > 0) return;
  playSound(run.character === 'engineer' ? 'overdrive' : 'ultimate', { minInterval: .8 });
  const level = run.ultimateLevel, character = run.character;
  if (character === 'warrior') {
    const radius = 240 + level * 45, power = weaponPower(run, 'sword', 180 + level * 90, battleStats);
    invulnerable = Math.max(invulnerable, 1.2);
    effects.push({ kind: 'pulse', x: player.x, y: player.y, radius, life: .45, max: .45, color: '#ffffff' });
    for (const enemy of enemies) if (enemy.hp > 0 && !enemy.escaped && Math.hypot(enemy.x - player.x, enemy.y - player.y) < radius + enemy.radius) {
      damage(enemy, power, '#ffffff', 0, { x: enemy.x - player.x, y: enemy.y - player.y, strength: 620 }, 'ultimate');
      controlEnemy(enemy, 'stunned', .8);
    }
  } else if (character === 'scout') {
    const count = 16 + level * 4, power = weaponPower(run, 'pistol', 85 + level * 35, battleStats);
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count;
      projectile(player.x, player.y, { x: player.x + Math.cos(angle), y: player.y + Math.sin(angle) }, { damage: power, speed: 560, pierce: 4 + level, knockback: 240, color: '#ffffff', visual: 'pistol', special: true, source: 'ultimate' });
    }
  } else if (character === 'mage') {
    const radius = 250 + level * 45, power = weaponPower(run, 'fireball', 140 + level * 70, battleStats);
    const burn = { ...burnStats(run, level, battleStats), source: 'ultimate' };
    effects.push({ kind: 'explosion', x: player.x, y: player.y, radius, life: .45, max: .45, color: '#ffb86b' });
    for (const enemy of enemies) if (enemy.hp > 0 && !enemy.escaped && Math.hypot(enemy.x - player.x, enemy.y - player.y) < radius + enemy.radius) {
      damage(enemy, power, '#fff', 0, { x: enemy.x - player.x, y: enemy.y - player.y, strength: 320 }, 'ultimate');
      if (enemy.hp > 0) enemy.burn = applyDot(enemy.burn, burn);
    }
  } else if (character === 'engineer') {
    engineerOverdrive = 4 + level;
  }
  if (character === 'engineer') {
    screenShake(4, .18);
    for (const turret of allTurrets()) effects.push({ kind: 'pulse', x: turret.x, y: turret.y, radius: 42, life: .7, max: .7, color: skillColors.engineering });
  } else {
    screenShake(10, .3);
    skillPulse(player.x, player.y, skillColors[ULTIMATES[character].category], character === 'scout' ? 230 : 250 + level * 45);
  }
  ultimateCooldown = ULTIMATE_COOLDOWN;
  updateAbilityHud();
}
function activateAbility(index) {
  if (phase !== 'battle') return;
  const weapon = run.weapons[index];
  if (!weapon || abilityCooldowns[weapon.uid] > 0) return;
  const { id, uid, level, evolved, merged } = weapon;
  const power = base => weaponPower(run, id, base, battleStats) * (merged ? 2.3 : 1);
  const shoot = (x, y, target, options) => projectile(x, y, target, { ...options, knockback: WEAPONS[id].knockback, visual: id, special: true, source: id });
  const pushFrom = (enemy, x, y) => ({ x: enemy.x - x, y: enemy.y - y, strength: WEAPONS[id].knockback });
  const radial = (count, options) => {
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count;
      shoot(player.x, player.y, { x: player.x + Math.cos(angle), y: player.y + Math.sin(angle) }, options);
    }
  };
  if (id === 'fireball') {
    const burn = { ...burnStats(run, level, battleStats), source: id }; if (merged) burn.damage *= 2.3;
    burn.chance = 1;
    radial(8, { damage: power(20 + level * 7) * (1 + (run.items.core || 0) * .15), radius: evolved ? 15 : 8, splash: evolved ? 85 : level >= 4 ? 45 : 0, burn, color: '#ffffff' });
  } else if (id === 'frost') {
    const radius = 180;
    effects.push({ kind: 'frost', x: player.x, y: player.y, radius, life: .4, max: .4, color: '#b7edff' });
    for (const enemy of enemies) if (Math.hypot(enemy.x - player.x, enemy.y - player.y) <= radius + enemy.radius) controlEnemy(enemy, 'frozen', 1.75);
  } else if (id === 'boomerang') {
    radial(6, { damage: power(16 + level * 5), speed: 270, life: 2, returnAt: 1, pierce: rangedPierce(id, level, merged), color: '#ffffff' });
    for (const drop of drops) if (Math.hypot(drop.x - player.x, drop.y - player.y) <= 250) { drop.x = player.x; drop.y = player.y; }
  } else if (id === 'acid') {
    const acid = { ...acidStats(run, level, battleStats), source: id }; if (merged) acid.damage *= 2.3;
    acid.sticky = true;
    radial(4, { damage: power(4 + level * 2), speed: 280, life: .65, acid, color: '#d9a8ff' });
  } else if (id === 'pistol' || id === 'machinegun' || id === 'turret') {
    abilityBuffs[uid] = id === 'turret' ? 3 : 2;
  } else if (id === 'mine') {
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5;
      mines.push({ owner: uid, source: id, special: true, stun: .75, x: player.x + Math.cos(angle) * 55, y: player.y + Math.sin(angle) * 55, life: 15, radius: 55 + level * 10, damage: power(35 + level * 15) });
    }
  } else if (id === 'sword' || id === 'blade') {
    const radius = id === 'sword' ? 150 : 130;
    if (id === 'blade') invulnerable = Math.max(invulnerable, .5);
    effects.push({ kind: 'pulse', x: player.x, y: player.y, radius, life: .3, max: .3, color: '#ffffff' });
    for (const enemy of enemies) if (enemy.hp > 0 && !enemy.escaped && Math.hypot(enemy.x - player.x, enemy.y - player.y) < radius + enemy.radius) {
      const push = pushFrom(enemy, player.x, player.y);
      if (id === 'sword') push.strength *= 1.6;
      damage(enemy, power(id === 'sword' ? 38 + level * 12 : 25 + level * 10), '#ffffff', 0, push, id);
    }
  } else {
    const range = id === 'dagger' ? 100 : id === 'spear' ? 260 : 850;
    const target = nearest(player.x, player.y, range);
    if (!target) return;
    if (id === 'sniper') {
      shoot(player.x, player.y, target, { damage: power((50 + level * 20 + (level >= 3 ? 25 : 0)) * 2), speed: 650, radius: 10, pierce: rangedPierce(id, level, merged) + 2, mark: 3, color: '#ffffff' });
    } else if (id === 'dagger') {
      effects.push({ kind: 'slash', x: player.x, y: player.y, x2: target.x, y2: target.y, life: .2, max: .2, color: '#ffffff' });
      damage(target, power(50 + level * 15), '#ffffff', .95, pushFrom(target, player.x, player.y), id);
      if (target.hp <= 0 && target.type !== 'sapling') evadeCooldown = 0;
    } else if (id === 'spear') {
      const angle = Math.atan2(target.y - player.y, target.x - player.x), hit = new Set();
      for (const offset of [-.3, 0, .3]) {
        effects.push({ kind: 'thrust', x: player.x, y: player.y, radius: range, angle: angle + offset, life: .22, max: .22, color: '#ffffff' });
        for (const enemy of enemies) if (enemy.hp > 0 && !enemy.escaped && !hit.has(enemy) && withinThrust(enemy.x - player.x, enemy.y - player.y, angle + offset, range, 8, enemy.radius)) {
          hit.add(enemy); damage(enemy, power(32 + level * 9), '#ffffff', 0, pushFrom(enemy, player.x, player.y), id); controlEnemy(enemy, 'stunned', .65);
        }
      }
    } else if (id === 'lightning') {
      const hit = [];
      let current = target;
      for (let i = 0; i < 5 && current; i++) {
        damage(current, power(22 + level * 9), '#fff', 0, null, id);
        controlEnemy(current, 'stunned', .8);
        effects.push({ kind: 'lightning', x: player.x, y: player.y, x2: current.x, y2: current.y, life: .2, max: .2, color: '#ffffff' });
        hit.push(current); current = nearest(player.x, player.y, 650, hit);
      }
    }
  }
  skillPulse(player.x, player.y, skillColor(id));
  abilityCooldowns[uid] = ACTIVE_SKILLS[id].cooldown;
  updateAbilityHud();
}
function setWeaponCooldown(key, duration) {
  cooldowns[key] = duration;
  cooldownDurations[key] = duration;
}
function fireWeapons(dt, attackHeld = true) {
  const stats = battleStats;
  const speed = 1 + stats.attackSpeed / 100;
  if (attackHeld) run.weapons.forEach((weapon, index) => {
    if (abilityCooldowns[weapon.uid] <= 0) {
      activateAbility(index);
      if (abilityCooldowns[weapon.uid] <= 0) abilityCooldowns[weapon.uid] = .5;
    }
  });
  const attacks = run.weapons.flatMap((weapon, index) => weapon.merged ? [{ weapon, index, lane: 0 }, { weapon, index, lane: 1 }] : [{ weapon, index, lane: 0 }]);
  for (const { weapon, index, lane } of attacks) {
    const { id, level, uid, evolved, merged } = weapon;
    const masteryBonus = id === 'turret' ? 0 : autoAttackMasteryBonus(run);
    const overdriveRate = id === 'turret' && run.character === 'engineer' && engineerOverdrive > 0 ? 2 : 1;
    const basicAttackSpeed = speed * autoAttackRateMultiplier(run);
    const weaponSpeed = id === 'turret' ? speed : basicAttackSpeed;
    const timerKey = lane ? 'merged:' + uid : uid;
    const power = base => id === 'turret'
      ? weaponPower(run, id, base, { ...battleStats, damage: battleStats.damage - (run.items.autoMastery || 0) * 3 }) * (merged ? 1.15 : 1)
      : autoAttackPower(run, id, base, battleStats) * (merged ? 1.15 : 1);
    const shoot = (x, y, target, options) => projectile(x, y, target, { ...options, knockback: WEAPONS[id].knockback * (id === 'machinegun' && abilityBuffs[uid] > 0 ? 3 : 1), visual: id, special: abilityBuffs[uid] > 0, source: id });
    const pushFrom = (enemy, x, y, strength = WEAPONS[id].knockback) => ({ x: enemy.x - x, y: enemy.y - y, strength });
    let turret = turrets[uid];
    if (id === 'turret') {
      if (!turret) {
        const angle = index * Math.PI / 2;
        turret = turrets[uid] = { x: player.x + Math.cos(angle) * 22, y: player.y + Math.sin(angle) * 22 };
      }
      if (evolved && !lane) {
        const prey = nearest(turret.x, turret.y, 600);
        if (prey) {
          const dx = prey.x - turret.x, dy = prey.y - turret.y, distance = Math.hypot(dx, dy) || 1;
          if (distance > 120) { turret.x += dx / distance * 100 * dt; turret.y += dy / distance * 100 * dt; }
        }
      }
      const wrenchKey = 'wrench:' + timerKey;
      cooldowns[wrenchKey] = Math.max(0, (cooldowns[wrenchKey] || 0) - dt * basicAttackSpeed);
      if (attackHeld && cooldowns[wrenchKey] <= 0) {
          setWeaponCooldown(wrenchKey, .9);
          const range = 105, angle = aimAngle(), halfAngle = Math.PI / 3;
          effects.push({ kind: 'arc', x: player.x, y: player.y, radius: range, angle, halfAngle, life: .22, max: .22, color: '#ffffff' });
          const wrenchPower = autoAttackPower(run, id, 23 + level * 7, battleStats, 'melee') * (merged ? 1.15 : 1);
          for (const enemy of enemies) if (enemy.hp > 0 && !enemy.escaped && withinArc(enemy.x - player.x, enemy.y - player.y, angle, range + enemy.radius, halfAngle)) damage(enemy, wrenchPower, '#ffffff', 0, pushFrom(enemy, player.x, player.y, WEAPONS[id].wrenchKnockback), id);
      }
    }
    const boost = abilityBuffs[uid] > 0 ? (id === 'pistol' ? 3 : 2) : 1;
    cooldowns[timerKey] = Math.max(0, (cooldowns[timerKey] || 0) - dt * weaponSpeed * boost * overdriveRate);
    if (id !== 'turret' && !attackHeld) continue;
    if (cooldowns[timerKey] > 0) continue;
    if (id === 'mine') {
      setWeaponCooldown(timerKey, level >= 3 ? 1.15 : 1.6);
      const aim = autoAimPoint();
      if (mines.filter(mine => mine.owner === uid).length < (merged ? 16 : 8)) mines.push({ owner: uid, source: id, x: Math.max(0, Math.min(W, aim.x)), y: Math.max(0, Math.min(H, aim.y)), life: 15, radius: 55 + level * 10, damage: power(35 + level * 15) });
      continue;
    }
    const origin = id === 'turret' ? turret : player;
    const range = id === 'blade' ? 110 + level * 10 : id === 'sword' ? 170 + (level - 1) * 15 : id === 'spear' ? (level >= 3 ? 235 : 200) : id === 'dagger' ? (level >= 3 ? 85 : 75) : id === 'turret' ? 400 + level * 25 + (merged ? 44 : 0) + (abilityBuffs[uid] > 0 ? 150 : 0) : id === 'sniper' ? 850 : 650;
    const target = id === 'turret' ? nearest(origin.x, origin.y, range) : aimPoint(origin.x, origin.y, range);
    if (id === 'turret' && !target) continue;
    if (id === 'fireball') {
      setWeaponCooldown(timerKey, .9); const count = (level >= 3 ? 2 : 1) + masteryBonus;
      const burn = { ...burnStats(run, level, battleStats), source: id }; burn.damage *= autoAttackMultiplier(run); if (merged) burn.damage *= 1.15;
      for (let i = 0; i < count; i++) shoot(player.x, player.y, target, { angle: (i - (count - 1) / 2) * .18, damage: power(20 + level * 7) * (1 + (run.items.core || 0) * .15), radius: evolved ? 15 : 8, splash: evolved ? 85 : level >= 4 ? 45 : 0, burn, color: '#ffffff' });
    } else if (id === 'lightning') {
      let current = aimedTarget(player.x, player.y, range, .035);
      if (!current) continue;
      setWeaponCooldown(timerKey, 1.4); const hit = [];
      const count = (evolved ? 7 : level >= 4 ? 4 : level >= 3 ? 3 : 1) + masteryBonus;
      let x = player.x, y = player.y;
      for (let i = 0; i < count && current; i++) {
        damage(current, power(22 + level * 9), '#fff', 0, null, id);
        effects.push({ kind: 'lightning', x, y, x2: current.x, y2: current.y, life: .16, max: .16, color: '#ffffff' });
        hit.push(current); x = current.x; y = current.y; current = nearest(x, y, evolved ? 260 : 170, hit);
      }
    } else if (id === 'boomerang') {
      setWeaponCooldown(timerKey, level >= 2 ? 1.2 : 1.7); const count = (level >= 3 ? 2 : 1) + masteryBonus;
      for (let i = 0; i < count; i++) shoot(player.x, player.y, target, { angle: (i - (count - 1) / 2) * .35, damage: power(16 + level * 5), speed: 270, life: 2, returnAt: 1, pierce: rangedPierce(id, level, merged), color: '#ffffff' });
    } else if (id === 'pistol') {
      setWeaponCooldown(timerKey, level >= 4 ? .42 : .6);
      const count = (level >= 3 ? 2 : 1) + masteryBonus;
      for (let i = 0; i < count; i++) shoot(player.x, player.y, target, { angle: (i - (count - 1) / 2) * .13, damage: power(16 + level * 6), speed: 490, pierce: rangedPierce(id, level, merged) + Number(abilityBuffs[uid] > 0), color: '#ffffff' });
    } else if (id === 'machinegun') {
      setWeaponCooldown(timerKey, level >= 3 ? .14 : .18);
      const count = 1 + masteryBonus;
      for (let i = 0; i < count; i++) shoot(player.x, player.y, target, { angle: (i - (count - 1) / 2) * .08, damage: power(6 + level * 2), speed: 490, radius: 5, pierce: rangedPierce(id, level, merged), color: '#ffffff' });
    } else if (id === 'sniper') {
      setWeaponCooldown(timerKey, level >= 4 ? 2 : 2.4);
      const count = 1 + masteryBonus;
      for (let i = 0; i < count; i++) shoot(player.x, player.y, target, { angle: (i - (count - 1) / 2) * .06, damage: power(50 + level * 20 + (level >= 3 ? 25 : 0)), speed: 550, radius: 8, pierce: rangedPierce(id, level, merged), color: '#ffffff' });
    } else if (id === 'turret') {
      setWeaponCooldown(timerKey, level >= 3 ? .55 : .85); const count = (level >= 4 ? 3 : 1) + masteryBonus;
      for (let i = 0; i < count; i++) shoot(turret.x, turret.y, target, { angle: (i - (count - 1) / 2) * .17, damage: power(16 + level * 6), speed: evolved ? 480 : 380, pierce: evolved ? 3 : 1, ricochets: overdriveRate > 1 ? 1 + run.ultimateLevel : 0, ricochetRange: 340 + run.ultimateLevel * 40, color: '#ffffff' });
      if (evolved) setWeaponCooldown(timerKey, cooldowns[timerKey] * .65);
    } else if (id === 'frost') {
      setWeaponCooldown(timerKey, 1.1); const count = (level >= 3 ? 2 : 1) + masteryBonus;
      for (let i = 0; i < count; i++) shoot(player.x, player.y, target, { angle: (i - (count - 1) / 2) * .2, damage: power(16 + level * 6), slow: level >= 4 ? 3 : 1.5, freezeChance: .25, freezeDuration: level >= 4 ? 1.5 : 1, color: '#ffffff' });
    } else if (id === 'acid') {
      setWeaponCooldown(timerKey, 1.8);
      const acid = { ...acidStats(run, level, battleStats), source: id }; acid.damage *= autoAttackMultiplier(run); if (merged) acid.damage *= 1.15;
      const count = 1 + masteryBonus;
      for (let i = 0; i < count; i++) shoot(player.x, player.y, target, { angle: (i - (count - 1) / 2) * .12, damage: power(4 + level * 2), speed: 280, acid, color: '#d9a8ff' });
    } else if (id === 'sword') {
      setWeaponCooldown(timerKey, .72 - (level - 1) * .07);
      const angle = aimAngle(), halfAngle = Math.PI / 3, strikes = 1 + masteryBonus;
      for (let strike = 0; strike < strikes; strike++) {
        const swingAngle = angle + (strike - (strikes - 1) / 2) * .1;
        effects.push({ kind: 'arc', x: player.x, y: player.y, radius: range, angle: swingAngle, halfAngle, life: .22, max: .22, color: strike ? '#ffe29a' : '#ffffff' });
        for (const enemy of enemies) if (enemy.hp > 0 && !enemy.escaped && withinArc(enemy.x - player.x, enemy.y - player.y, swingAngle, range + enemy.radius, halfAngle)) damage(enemy, power(38 + level * 12), '#ffffff', 0, pushFrom(enemy, player.x, player.y), id);
        if (level >= 3) for (const side of [-1, 1]) {
          const sideAngle = swingAngle + side * Math.PI * .4, sideRange = range * .68, sideHalfAngle = Math.PI / 7;
          effects.push({ kind: 'arc', x: player.x, y: player.y, radius: sideRange, angle: sideAngle, halfAngle: sideHalfAngle, life: .2, max: .2, color: '#ffcf7a' });
          for (const enemy of enemies) if (enemy.hp > 0 && !enemy.escaped && withinArc(enemy.x - player.x, enemy.y - player.y, sideAngle, sideRange + enemy.radius, sideHalfAngle)) {
            damage(enemy, power(38 + level * 12) * .4, '#ffcf7a', 0, pushFrom(enemy, player.x, player.y), id);
          }
        }
      }
    } else if (id === 'spear') {
      setWeaponCooldown(timerKey, level >= 4 ? .8 : 1);
      const angle = aimAngle(), strikes = 1 + masteryBonus;
      for (let strike = 0; strike < strikes; strike++) {
        const thrustAngle = angle + (strike - (strikes - 1) / 2) * .08;
        effects.push({ kind: 'thrust', x: player.x, y: player.y, radius: range, angle: thrustAngle, life: .18, max: .18, color: strike ? '#ffe29a' : '#ffffff' });
        for (const enemy of enemies) if (enemy.hp > 0 && !enemy.escaped && withinThrust(enemy.x - player.x, enemy.y - player.y, thrustAngle, range, 8, enemy.radius)) damage(enemy, power(32 + level * 9), '#ffffff', 0, pushFrom(enemy, player.x, player.y), id);
      }
    } else if (id === 'dagger') {
      setWeaponCooldown(timerKey, 1.05);
      const angle = aimAngle(), strikes = 1 + masteryBonus;
      for (let strike = 0; strike < strikes; strike++) {
        const thrustAngle = angle + (strike - (strikes - 1) / 2) * .08;
        effects.push({ kind: 'arc', x: player.x, y: player.y, radius: range, angle: thrustAngle, halfAngle: .35, life: .16, max: .16, color: strike ? '#ffe29a' : '#ffffff' });
        for (const enemy of enemies) if (enemy.hp > 0 && !enemy.escaped && withinThrust(enemy.x - player.x, enemy.y - player.y, thrustAngle, range, 10, enemy.radius)) {
          damage(enemy, power(20 + level * 5), '#ffffff', .35 + (level >= 2 ? .1 : 0) + (level >= 4 ? .15 : 0), pushFrom(enemy, player.x, player.y), id);
        }
      }
    } else if (id === 'blade') {
      setWeaponCooldown(timerKey, level >= 4 ? .55 : level >= 3 ? .65 : .8);
      const radius = 70 + level * 12;
      for (let strike = 0; strike <= masteryBonus; strike++) {
        effects.push({ kind: 'pulse', x: player.x, y: player.y, radius, life: .22, max: .22, color: strike ? '#ffe29a' : '#ffffff' });
        for (const enemy of enemies) if (enemy.hp > 0 && !enemy.escaped && Math.hypot(enemy.x - player.x, enemy.y - player.y) < radius + enemy.radius) damage(enemy, power(15 + level * 7), '#ffffff', 0, pushFrom(enemy, player.x, player.y), id);
      }
    }
  }
}
function update(dt) {
  if (phase !== 'battle') return;
  animationTime += dt;
  shakeTime = Math.max(0, shakeTime - dt);
  if (!shakeTime) shakeStrength = 0;
  time = Math.max(0, time - dt); invulnerable = Math.max(0, invulnerable - dt);
  evadeCooldown = Math.max(0, evadeCooldown - dt);
  heroSkillCooldown = Math.max(0, heroSkillCooldown - dt);
  secondarySkillCooldown = Math.max(0, secondarySkillCooldown - dt);
  ultimateCooldown = Math.max(0, ultimateCooldown - dt);
  engineerOverdrive = Math.max(0, engineerOverdrive - dt);
  const waiting = [];
  for (const spawn of pendingSpawns) {
    spawn.remaining -= dt;
    if (spawn.remaining <= 1e-9) spawnNow(spawn.type, spawn.x, spawn.y);
    else waiting.push(spawn);
  }
  pendingSpawns = waiting;
  for (const uid of Object.keys(abilityCooldowns)) abilityCooldowns[uid] = Math.max(0, abilityCooldowns[uid] - dt);
  for (const uid of Object.keys(abilityBuffs)) abilityBuffs[uid] = Math.max(0, abilityBuffs[uid] - dt);
  leechTimer += dt;
  if (leechTimer >= 1) { leechTimer -= 1; leechRemaining = 1.5; }
  const direction = movementDirection();
  if (direction && evadeTime <= 0) { facingX = direction.x; facingY = direction.y; }
  const movement = 185 * 1.15 * (1 + battleStats.speed / 100);
  const dashStep = Math.min(dt, evadeTime);
  if (dashStep > 0) invulnerable = Math.max(invulnerable, .001);
  evadeTime = Math.max(0, evadeTime - dt);
  const walkStep = dt - dashStep;
  player.x = Math.max(17, Math.min(W - 17, player.x + evadeX * EVADE.speed * 1.15 * dashStep + (direction?.x || 0) * movement * walkStep));
  player.y = Math.max(17, Math.min(H - 17, player.y + evadeY * EVADE.speed * 1.15 * dashStep + (direction?.y || 0) * movement * walkStep));
  updateGamepadAim();
  if (evadeImpact && evadeTime === 0) {
    const level = evadeImpact.level, radius = 65 + level * 14;
    effects.push({ kind: 'impact', x: player.x, y: player.y, radius, life: .35, max: .35, color: '#ffb1b8' });
    for (const enemy of enemies) if (enemy.hp > 0 && !enemy.escaped && Math.hypot(enemy.x - player.x, enemy.y - player.y) < radius + enemy.radius) {
      damage(enemy, weaponPower(run, 'sword', 32 + level * 14, battleStats), '#ffb1b8', 0,
        { x: enemy.x - player.x, y: enemy.y - player.y, strength: 150 }, 'strafe');
    }
    evadeImpact = null;
  }
  if (aimScreenX !== null) refreshAimFromScreen();
  const elapsed = waveDuration(run.wave) - time;
  while (time > 0 && goblinSchedule.length && goblinSchedule[0] <= elapsed) { goblinSchedule.shift(); spawn('goblin'); }
  saplingTimer -= dt;
  if (time > 0 && saplingTimer <= 0) {
    if (enemies.filter(enemy => enemy.type === 'sapling' && enemy.hp > 0).length < 4) spawn('sapling');
    saplingTimer = 12;
  }
  spawnTimer -= dt;
  if (spawnTimer <= 0 && time > 0) {
    spawnRandom();
    if (run.wave >= 4 && Math.random() < .8) spawnRandom();
    const activeCount = enemies.filter(enemy => enemy.type !== 'sapling').length + pendingSpawns.filter(spawn => spawn.type !== 'sapling').length;
    spawnTimer = adaptiveSpawnInterval(run.wave, elapsed, activeCount);
  }
  fireWeapons(dt, primaryHeld);
  for (const turret of [...placedTurrets, ...temporaryTurrets]) {
    if (Number.isFinite(turret.life)) turret.life -= dt;
    turret.cooldown -= dt * (run.character === 'engineer' && engineerOverdrive > 0 ? 2 : 1);
    if (turret.life > 0 && turret.cooldown <= 0) {
      const target = nearest(turret.x, turret.y, 360);
      if (target) {
        const source = turret.source || 'strafe';
        const base = source === 'heroSkill' ? 25 + turret.skillLevel * 12 : 12 + (run.items.strafe || 0) * 5;
        projectile(turret.x, turret.y, target, { damage: weaponPower(run, 'turret', base, battleStats), speed: 420, splash: source === 'heroSkill' ? 46 + turret.skillLevel * 6 : 0, stun: source === 'heroSkill' ? .18 : 0, ricochets: run.character === 'engineer' && engineerOverdrive > 0 ? 1 + run.ultimateLevel : 0, ricochetRange: 340 + run.ultimateLevel * 40, source, visual: 'turret', special: true, knockback: source === 'heroSkill' ? 95 : 30 });
        turret.cooldown = source === 'heroSkill' ? .65 : .5;
      }
    }
  }
  temporaryTurrets = temporaryTurrets.filter(turret => turret.life > 0);
  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    const disabled = Math.min(dt, Math.max(enemy.frozen, enemy.stunned));
    const actionDt = dt - disabled;
    enemy.attackWarning = false;
    enemy.hit = Math.max(0, enemy.hit - dt); enemy.slow = Math.max(0, enemy.slow - dt);
    enemy.acidSlow = Math.max(0, enemy.acidSlow - dt); enemy.marked = Math.max(0, enemy.marked - dt);
    enemy.frozen = Math.max(0, enemy.frozen - dt); enemy.stunned = Math.max(0, enemy.stunned - dt);
    enemy.controlImmunity = Math.max(0, enemy.controlImmunity - dt);
    enemy.cooldown -= actionDt;
    if (enemy.type === 'sapling') continue;
    const vx = player.x - enemy.x, vy = player.y - enemy.y, distance = Math.hypot(vx, vy) || 1;
    if (actionDt <= 0) {
      if (enemy.type === 'goblin') {
        enemy.life -= dt;
        if (enemy.life <= 0) enemy.escaped = true;
      }
      applyKnockback(enemy, dt); enemyContact(enemy);
      continue;
    }
    let speed = enemy.speed * (enemy.slow || enemy.acidSlow ? .55 : 1);
    if (enemy.type === 'goblin') {
      enemy.life -= dt;
      if (enemy.life <= 0) { enemy.escaped = true; continue; }
      enemy.wander += actionDt * 1.5;
      let gx = (distance < 300 ? -vx / distance : 0) + Math.cos(enemy.wander) * .55 + (W / 2 - enemy.x) / W;
      let gy = (distance < 300 ? -vy / distance : 0) + Math.sin(enemy.wander) * .55 + (H / 2 - enemy.y) / H;
      const length = Math.hypot(gx, gy) || 1;
      enemy.x = Math.max(14, Math.min(W - 14, enemy.x + gx / length * speed * actionDt));
      enemy.y = Math.max(14, Math.min(H - 14, enemy.y + gy / length * speed * actionDt));
      applyKnockback(enemy, dt);
      continue;
    }
    if (enemy.type === 'ranged' || enemy.type === 'summoner') speed *= distance < 210 ? -.5 : distance < 280 ? 0 : 1;
    if (enemy.type === 'charger') {
      if (enemy.cooldown <= 0 && !enemy.charge) { enemy.charge = .55; enemy.chargeX = vx / distance; enemy.chargeY = vy / distance; enemy.cooldown = 3; }
      if (enemy.charge > 0) { enemy.charge -= actionDt; enemy.x += enemy.chargeX * 240 * actionDt; enemy.y += enemy.chargeY * 240 * actionDt; speed = 0; }
    }
    if (enemy.type === 'bull') {
      if (enemy.bullState === 'approach' && distance < 220 && enemy.cooldown <= 0) {
        enemy.bullState = 'windup'; enemy.charge = .5; enemy.chargeX = vx / distance; enemy.chargeY = vy / distance;
      }
      if (enemy.bullState === 'windup') {
        speed = 0; enemy.charge -= actionDt;
        if (enemy.charge <= 0) { enemy.bullState = 'dash'; enemy.charge = .8; }
      } else if (enemy.bullState === 'dash') {
        speed = 0; enemy.charge -= actionDt; enemy.x += enemy.chargeX * 420 * actionDt; enemy.y += enemy.chargeY * 420 * actionDt;
        if (enemy.charge <= 0) { enemy.bullState = 'approach'; enemy.cooldown = 3; }
      }
    }
    enemy.x += vx / distance * speed * actionDt; enemy.y += vy / distance * speed * actionDt;
    enemy.x = Math.max(0, Math.min(W, enemy.x)); enemy.y = Math.max(0, Math.min(H, enemy.y));
    applyKnockback(enemy, dt);
    if ((enemy.type === 'ranged' || enemy.type === 'boss') && enemy.cooldown <= 0) {
      const count = enemy.type === 'boss' ? 8 : 1;
      for (let i = 0; i < count; i++) {
        const angle = Math.atan2(vy, vx) + (enemy.type === 'boss' ? i * Math.PI * 2 / count : 0);
        hostileShots.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * 175 * ENEMY_PROJECTILE_SPEED_MULTIPLIER, vy: Math.sin(angle) * 175 * ENEMY_PROJECTILE_SPEED_MULTIPLIER, life: 4, damage: enemyTypes[enemy.type].damage });
      }
      enemy.cooldown = enemy.type === 'boss' ? 2.2 : 2.8;
    } else if (enemy.type === 'ranged' || enemy.type === 'boss') {
      enemy.attackWarning = enemy.cooldown > 0 && enemy.cooldown <= ENEMY_SHOT_WARNING;
    }
    if (enemy.type === 'summoner' && enemy.cooldown <= 0) { spawn('swarm', enemy.x + 25, enemy.y); enemy.cooldown = 5; }
    enemyContact(enemy);
  }
  for (const wall of flameWalls) {
    wall.life -= dt;
    for (const enemy of enemies) {
      if (enemy.hp <= 0 || enemy.escaped) continue;
      const dx = enemy.x - wall.x, dy = enemy.y - wall.y;
      const along = Math.abs(dx * wall.dx + dy * wall.dy);
      const across = Math.abs(dx * wall.dy - dy * wall.dx);
      if (along <= wall.halfLength + enemy.radius && across <= wall.halfWidth + enemy.radius) {
        enemy.burn = applyDot(enemy.burn, { ...burnStats(run, wall.level, battleStats), source: 'heroSkill', chance: 1 });
      }
    }
  }
  flameWalls = flameWalls.filter(wall => wall.life > 0);
  for (const shot of shots) {
    shot.life -= dt;
    if (shot.homing) {
      const target = nearest(shot.x, shot.y, 250, shot.hit);
      if (target) {
        const angle = Math.atan2(target.y - shot.y, target.x - shot.x);
        shot.vx = Math.cos(angle) * 480 * PROJECTILE_SPEED_MULTIPLIER; shot.vy = Math.sin(angle) * 480 * PROJECTILE_SPEED_MULTIPLIER;
      }
    }
    if (shot.returnAt && shot.life < shot.returnAt) {
      const angle = Math.atan2(player.y - shot.y, player.x - shot.x);
      shot.vx = Math.cos(angle) * 320 * PROJECTILE_SPEED_MULTIPLIER; shot.vy = Math.sin(angle) * 320 * PROJECTILE_SPEED_MULTIPLIER;
      if (Math.hypot(player.x - shot.x, player.y - shot.y) < 15) shot.life = 0;
    }
    shot.x += shot.vx * dt; shot.y += shot.vy * dt;
    for (const enemy of enemies) {
      if (enemy.hp <= 0 || enemy.escaped || shot.hit.has(enemy) || Math.hypot(enemy.x - shot.x, enemy.y - shot.y) > enemy.radius + shot.radius) continue;
      shot.hit.add(enemy); damage(enemy, shot.damage, shot.color, 0, { x: shot.vx, y: shot.vy, strength: shot.knockback }, shot.source);
      if (shot.special && (shot.source === 'heroSkill' || shot.source === 'ultimate')) screenShake(2.2, .08);
      if (shot.stun && enemy.hp > 0) controlEnemy(enemy, 'stunned', shot.stun);
      if (effects.length < 100) effects.push({ kind: 'impact', x: shot.x, y: shot.y, radius: shot.special ? 25 : 12, life: .22, max: .22, color: shot.special ? skillColor(shot.visual) : '#d9f3ff' });
      if (shot.slow && enemy.hp > 0) enemy.slow = Math.max(enemy.slow, shot.slow);
      if (shot.freezeChance && enemy.hp > 0 && Math.random() < shot.freezeChance) controlEnemy(enemy, 'frozen', shot.freezeDuration);
      if (shot.mark && enemy.hp > 0 && enemy.type !== 'sapling') enemy.marked = Math.max(enemy.marked, shot.mark);
      if (shot.burn && enemy.hp > 0 && Math.random() < shot.burn.chance) enemy.burn = applyDot(enemy.burn, shot.burn);
      if (shot.acid) { puddles.push({ x: shot.x, y: shot.y, ...shot.acid, life: shot.acid.poolLife }); shot.acid = null; }
      if (shot.pierce > 1 && run.character === 'scout' && run.heroPassiveLevel === HERO_PASSIVE_MAX_LEVEL && WEAPONS[shot.visual]?.category === 'ranged') shot.damage *= 1.1;
      if (shot.splash) {
        effects.push({ kind: shot.visual === 'fireball' ? 'explosion' : 'impact', x: shot.x, y: shot.y, radius: shot.splash, life: .25, max: .25, color: shot.color });
        for (const other of enemies) if (other !== enemy && other.hp > 0 && !other.escaped && Math.hypot(other.x - shot.x, other.y - shot.y) < shot.splash) {
          damage(other, shot.damage * .6, shot.color, 0, { x: other.x - shot.x, y: other.y - shot.y, strength: shot.knockback }, shot.source);
          if (shot.stun && other.hp > 0) controlEnemy(other, 'stunned', shot.stun);
          if (shot.burn && other.hp > 0 && Math.random() < shot.burn.chance) other.burn = applyDot(other.burn, shot.burn);
        }
      }
      if (shot.ricochets > 0) {
        const next = nearest(shot.x, shot.y, shot.ricochetRange, shot.hit);
        if (next) {
          const dx = next.x - shot.x, dy = next.y - shot.y, distance = Math.hypot(dx, dy) || 1;
          const speed = Math.hypot(shot.vx, shot.vy);
          shot.vx = dx / distance * speed; shot.vy = dy / distance * speed;
          shot.ricochets--;
          if (run.character === 'engineer' && engineerOverdrive > 0 && run.heroPassiveLevel > 0 && WEAPONS[shot.visual]?.category === 'engineering') shot.damage *= 1 + run.heroPassiveLevel * .025;
          if (effects.length < 100) effects.push({ kind: 'ricochet', x: shot.x, y: shot.y, x2: next.x, y2: next.y, life: .18, max: .18, color: shot.color });
          break;
        }
      }
      if (--shot.pierce <= 0) { shot.life = 0; break; }
    }
    if (shot.life <= 0 && shot.acid) { puddles.push({ x: shot.x, y: shot.y, ...shot.acid, life: shot.acid.poolLife }); shot.acid = null; }
  }
  for (const shot of hostileShots) {
    shot.life -= dt; shot.x += shot.vx * dt; shot.y += shot.vy * dt;
    if (Math.hypot(player.x - shot.x, player.y - shot.y) < 18 && invulnerable <= 0) { hitPlayer(shot.damage); shot.life = 0; }
  }
  for (const mine of mines) {
    mine.life -= dt;
    if (nearest(mine.x, mine.y, 30)) {
      playSound('explosion', { minInterval: .12 });
      effects.push({ kind: mine.special ? 'pulse' : 'explosion', x: mine.x, y: mine.y, radius: mine.radius, life: .3, max: .3, color: mine.special ? skillColors.engineering : '#ffffff' });
      for (const enemy of enemies) if (enemy.hp > 0 && !enemy.escaped && Math.hypot(enemy.x - mine.x, enemy.y - mine.y) < mine.radius + enemy.radius) {
        damage(enemy, mine.damage, '#fff', 0, { x: enemy.x - mine.x, y: enemy.y - mine.y, strength: WEAPONS.mine.knockback }, mine.source);
        if (mine.stun) controlEnemy(enemy, 'stunned', mine.stun);
      }
      mine.life = 0;
    }
  }
  mines = mines.filter(mine => mine.life > 0);
  for (const puddle of puddles) {
    puddle.life -= dt;
    if (puddle.life <= 0) continue;
    for (const enemy of enemies) {
      if (enemy.hp > 0 && !enemy.escaped && Math.hypot(enemy.x - puddle.x, enemy.y - puddle.y) < puddle.radius + enemy.radius) {
        if (puddle.sticky && enemy.type !== 'sapling') enemy.acidSlow = Math.max(enemy.acidSlow, .1);
        if (enemy.acid?.remaining > 0) {
          if (puddle.damage > enemy.acid.damage) { enemy.acid.damage = puddle.damage; enemy.acid.source = puddle.source; }
          enemy.acid.remaining = Math.max(enemy.acid.remaining, puddle.remaining);
        } else enemy.acid = applyDot(enemy.acid, puddle);
      }
    }
  }
  puddles = puddles.filter(puddle => puddle.life > 0);
  for (const enemy of enemies) {
    if (enemy.hp <= 0 || enemy.escaped) continue;
    for (const type of ['burn', 'acid', 'bleed']) {
      const status = enemy[type];
      if (!status || status.remaining <= 0) continue;
      const dotDamage = advanceDot(status, dt);
      if (dotDamage > 0) { recordDamage(enemy, dotDamage, status.source); showDamage(enemy, dotDamage, false, type === 'acid' ? '#e4b7ff' : type === 'bleed' ? '#ff8b93' : '#ffd19b'); enemy.hit = .12; }
      enemy.hp -= dotDamage;
      if (type === 'burn' && dotDamage > 0 && enemy.hp <= 0) enemy.burnedAtDeath = true;
      if (type === 'burn' && dotDamage > 0) spreadBurn(enemy, enemies);
    }
  }
  for (const pickup of pickups) if (Math.hypot(player.x - pickup.x, player.y - pickup.y) < 24) {
    if (pickup.type === 'medkit') run.hp = run.maxHp;
    if (pickup.type === 'smallmedkit' && run.hp > 0) run.hp = Math.min(run.maxHp, run.hp + run.maxHp * .1);
    if (pickup.type === 'magnet') for (const drop of drops) { run.gold += drop.gold; drop.gold = 0; }
    if (pickup.type === 'bomb') {
      const radius = 240;
      effects.push({ kind: 'explosion', x: pickup.x, y: pickup.y, radius, life: .5, max: .5, color: '#ffffff' });
      for (const enemy of enemies) if (enemy.hp > 0 && !enemy.escaped && Math.hypot(enemy.x - pickup.x, enemy.y - pickup.y) < radius + enemy.radius) {
        const amount = 500 + run.wave * 75; recordDamage(enemy, amount, 'bomb'); showDamage(enemy, amount); enemy.hp -= amount; enemy.hit = .12;
        knockback(enemy, enemy.x - pickup.x, enemy.y - pickup.y, 240);
      }
    }
    pickup.collected = true;
  }
  pickups = pickups.filter(pickup => !pickup.collected);
  const resolvedDeaths = new Set();
  let resolvedDeath;
  do {
    resolvedDeath = false;
    for (const enemy of enemies) {
      if (enemy.hp > 0 || enemy.escaped || resolvedDeaths.has(enemy)) continue;
      resolvedDeaths.add(enemy); resolvedDeath = true;
      if (enemy.type === 'sapling') { pickups.push({ x: enemy.x, y: enemy.y, type: 'smallmedkit' }); continue; }
      if (run.items.volatile) {
        const radius = 100, amount = enemy.maxHp * .3;
        effects.push({ kind: 'explosion', x: enemy.x, y: enemy.y, radius, life: .35, max: .35, color: '#ff9c5c' });
        for (const nearby of enemies) {
          if (nearby === enemy || nearby.hp <= 0 || nearby.escaped || Math.hypot(nearby.x - enemy.x, nearby.y - enemy.y) >= radius + nearby.radius) continue;
          recordDamage(nearby, amount, 'volatile');
          showDamage(nearby, amount, false, '#ffb36b');
          nearby.hp -= amount; nearby.hit = .2;
          knockback(nearby, nearby.x - enemy.x, nearby.y - enemy.y, 210);
          applyScorch(nearby, 'volatile');
        }
      }
      const passiveLevel = run.heroPassiveLevel || 0;
      if (run.character === 'mage' && passiveLevel > 0 && (enemy.burn?.remaining > 0 || enemy.burnedAtDeath)) {
        const radius = 55 + passiveLevel * 12;
        const amount = weaponPower(run, 'fireball', 28 + passiveLevel * 14, battleStats);
        if (effects.length < 100) effects.push({ kind: 'explosion', x: enemy.x, y: enemy.y, radius, life: .4, max: .4, color: '#ff7542' });
        playSound('explosion', { minInterval: .12 });
        for (const nearby of enemies) {
          if (nearby === enemy || nearby.hp <= 0 || nearby.escaped || Math.hypot(nearby.x - enemy.x, nearby.y - enemy.y) >= radius + nearby.radius) continue;
          recordDamage(nearby, amount, 'heroPassive');
          showDamage(nearby, amount, false, '#ffad6e');
          nearby.hp -= amount; nearby.hit = .2;
          knockback(nearby, nearby.x - enemy.x, nearby.y - enemy.y, 120);
        }
      }
      run.kills++;
      if (run.items.harvest && run.hp > 0) run.hp = Math.min(run.maxHp, run.hp + 2 * run.items.harvest);
      if (enemy.type === 'boss') bossDefeated = true;
      if (enemy.type === 'goblin') {
        const types = ['bomb', 'magnet', 'medkit'];
        pickups.push({ x: enemy.x, y: enemy.y, type: types[Math.floor(Math.random() * types.length)] });
      } else drops.push({ x: enemy.x, y: enemy.y, xp: enemyTypes[enemy.type].reward, gold: Math.random() < .28 ? 1 : 0 });
    }
  } while (resolvedDeath);
  enemies = enemies.filter(e => e.hp > 0 && !e.escaped); shots = shots.filter(s => s.life > 0); hostileShots = hostileShots.filter(s => s.life > 0);
  for (const drop of drops) {
    const distance = Math.hypot(player.x - drop.x, player.y - drop.y);
    if (distance < PICKUP_RADIUS + (run.items.magnet || 0) * 35) {
      const step = Math.min(distance, 230 * dt);
      drop.x += (player.x - drop.x) / (distance || 1) * step; drop.y += (player.y - drop.y) / (distance || 1) * step;
      if (distance < 16) { awardXp(drop.xp); run.gold += drop.gold; drop.collected = true; }
    }
  }
  drops = drops.filter(d => !d.collected);
  effects.forEach(effect => effect.life -= dt); effects = effects.filter(effect => effect.life > 0);
  levelUpTimer = Math.max(0, levelUpTimer - dt);
  damageNumbers.forEach(number => { number.life -= dt; number.height += 30 * dt; }); damageNumbers = damageNumbers.filter(number => number.life > 0);
  if (run.hp <= 0) return gameOver();
  if (time <= 0 && (run.wave !== MAX_WAVE || bossDefeated)) endWave();
  updateHud();
  updateAbilityHud();
}
function enemyContact(enemy) {
  if (enemy.escaped || enemy.type === 'goblin' || Math.hypot(player.x - enemy.x, player.y - enemy.y) >= enemy.radius + 13 || invulnerable > 0) return;
  hitPlayer(enemyTypes[enemy.type].damage);
  if (enemy.type === 'exploder') { enemy.hp = 0; effects.push({ kind: 'explosion', x: enemy.x, y: enemy.y, radius: 55, life: .3, max: .3, color: '#f48f70' }); }
}
function hitPlayer(amount) {
  playSound('hurt', { minInterval: .3 });
  run.hp -= damageAfterArmor(run, amount, battleStats); invulnerable = .65;
  screenShake(3, .12);
}
function updateHud() {
  const setText = (selector, value) => {
    if (hudValues[selector] !== value) { $(selector).textContent = value; hudValues[selector] = value; }
  };
  setText('#wave', String(run.wave).padStart(2, '0') + ' / 10');
  const seconds = Math.ceil(time || (phase === 'start' ? waveDuration(1) : 0));
  setText('#timer', phase === 'battle' && time <= 0 && !bossDefeated ? 'BOSS!' : String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0'));
  setText('#gold', String(run.gold));
  setText('#xp-text', run.xp + ' / ' + xpRequired(run.level));
  const xpWidth = run.xp / xpRequired(run.level) * 100 + '%';
  if (hudValues.xpWidth !== xpWidth) { $('#xp-bar').style.width = xpWidth; hudValues.xpWidth = xpWidth; }
  setText('#level', 'LVL ' + run.level);
}
function circle(x, y, radius, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
}
function drawStatus(enemy, animation) {
  const statuses = [];
  if (enemy.burn?.remaining > 0) statuses.push('burn');
  if (enemy.acid?.remaining > 0) statuses.push('acid');
  if (enemy.slow > 0 || enemy.frozen > 0) statuses.push('frost');
  if (enemy.stunned > 0) statuses.push('stun');
  if (enemy.marked > 0) statuses.push('mark');
  for (const [index, status] of statuses.entries()) {
    const x = enemy.x + (index - (statuses.length - 1) / 2) * 15;
    const y = enemy.y + enemy.radius * .7;
    ctx.save(); ctx.translate(x, y); ctx.lineWidth = 1.5; ctx.strokeStyle = '#20243b';
    if (status === 'burn') {
      ctx.beginPath(); ctx.moveTo(0, -11 - animation);
      ctx.bezierCurveTo(2, -6, 8, -5, 6, 1); ctx.bezierCurveTo(5, 7, -5, 7, -6, 1);
      ctx.bezierCurveTo(-7, -3, -3, -5, -2, -8); ctx.lineTo(-1, -4); ctx.closePath();
      ctx.fillStyle = '#ff773f'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.quadraticCurveTo(5, 3, 0, 4); ctx.quadraticCurveTo(-4, 3, 0, -4); ctx.fillStyle = '#ffe78a'; ctx.fill();
    } else if (status === 'acid') {
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.bezierCurveTo(2, -6, 6, -2, 6, 1);
      ctx.bezierCurveTo(6, 8, -6, 8, -6, 1); ctx.bezierCurveTo(-6, -2, -2, -6, 0, -10);
      ctx.closePath(); ctx.fillStyle = '#ae6bdd'; ctx.fill(); ctx.stroke();
      circle(-2, 0, 1.5, '#f2ccff'); circle(2, 3, 1, '#f2ccff');
    } else if (status === 'frost') {
      if (enemy.frozen > 0) circle(0, 0, 10, '#a8e8ff88');
      ctx.strokeStyle = '#a8e8ff'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.save(); ctx.rotate(i * Math.PI / 3); ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0);
        ctx.moveTo(3, -3); ctx.lineTo(5, 0); ctx.lineTo(3, 3);
        ctx.moveTo(-3, -3); ctx.lineTo(-5, 0); ctx.lineTo(-3, 3); ctx.stroke(); ctx.restore();
      }
      circle(0, 0, 2, '#ecfaff');
    } else {
      ctx.strokeStyle = status === 'stun' ? '#ffe38c' : '#c8f7da'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.moveTo(0, -9); ctx.lineTo(0, 9); ctx.stroke();
    }
    ctx.restore();
  }
}
function draw() {
  const offset = camera();
  const animation = Math.floor(animationTime / .18) % 2;
  ctx.fillStyle = '#050607'; ctx.fillRect(0, 0, viewW, viewH);
  const shake = shakeTime > 0 ? shakeStrength * Math.min(1, shakeTime / .2) : 0;
  const shakeX = Math.sin(animationTime * 83) * shake, shakeY = Math.cos(animationTime * 97) * shake * .65;
  ctx.save(); ctx.translate(-offset.x + shakeX, -offset.y + shakeY);
  ctx.transform(ISO_X, ISO_Y, -ISO_X, ISO_Y, 0, 0);
  ctx.fillStyle = art.ground; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 36; i++) {
    const x = (i * 197 + 29) % W, y = (i * 137 + 41) % H;
    ctx.fillStyle = '#8095a250'; ctx.fillRect(x, y, 4, 2); ctx.fillRect(x + 6, y - 4, 2, 2);
  }
  ctx.strokeStyle = '#202f40'; ctx.lineWidth = 12; ctx.strokeRect(6, 6, W - 12, H - 12);
  ctx.strokeStyle = '#93a8b7'; ctx.lineWidth = 3; ctx.strokeRect(5, 5, W - 10, H - 10);
  for (const spawn of pendingSpawns) {
    if (!visible(spawn.x, spawn.y, 0, offset)) continue;
    const radius = Math.max(14, enemyRadius(spawn.type) * 1.2);
    const x = spawn.x, y = spawn.y;
    const progress = 1 - spawn.remaining / SPAWN_WARNING;
    circle(x, y, radius, spawn.type === 'goblin' ? '#e5ad4155' : '#c5834155');
    ctx.strokeStyle = spawn.type === 'goblin' ? '#ffe19a' : '#f1c48c'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress); ctx.stroke();
    upright(x, y, () => {
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('!', x, y);
    });
  }
  ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
  for (const puddle of puddles) {
    if (!visible(puddle.x, puddle.y, puddle.radius + 10)) continue;
    ctx.fillStyle = '#713a9b88'; ctx.strokeStyle = '#dda0ffbb'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 32; i++) {
      const angle = i * Math.PI / 16, radius = puddle.radius * (1 + .07 * Math.sin(angle * 5 + puddle.x) + .04 * Math.cos(angle * 3 + puddle.y));
      const x = puddle.x + Math.cos(angle) * radius, y = puddle.y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const angle = i * 2.4, distance = puddle.radius * (.2 + (i % 3) * .19);
      circle(puddle.x + Math.cos(angle) * distance, puddle.y + Math.sin(angle) * distance * .7, 2 + (i + animation) % 3, '#eabaff99');
    }
  }
  for (const drop of drops) {
    if (!visible(drop.x, drop.y, 8)) continue;
    upright(drop.x, drop.y, () => {
      circle(drop.x, drop.y, 6, '#203b52'); circle(drop.x, drop.y, 4.5, drop.gold ? '#ffc981' : '#81cfff');
      circle(drop.x - 1.5, drop.y - 2, 1.4, '#ffffff');
    });
  }
  for (const pickup of pickups) {
    if (!visible(pickup.x, pickup.y, 30)) continue;
    const label = { bomb: 'BOMB', magnet: 'GOLD', medkit: 'HEAL', smallmedkit: '+10% HP' }[pickup.type];
    upright(pickup.x, pickup.y, () => {
      circle(pickup.x, pickup.y, 14, '#18324b'); circle(pickup.x, pickup.y, 11, '#e8f7ff');
      ctx.fillStyle = '#1b3d58'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText({ bomb: '✹', magnet: '◆', medkit: '+', smallmedkit: '+' }[pickup.type], pickup.x, pickup.y);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 9px monospace'; ctx.fillText(label, pickup.x, pickup.y - 22);
    });
  }
  for (const mine of mines) if (visible(mine.x, mine.y, 12)) upright(mine.x, mine.y, () => {
    if (mine.special) { circle(mine.x, mine.y, 11, '#7dc9f588'); circle(mine.x, mine.y, 8, '#dff7ff'); }
    else circle(mine.x, mine.y, 8, '#e4f6ff');
    circle(mine.x, mine.y, 5, '#5c91b4');
    if (mine.special) circle(mine.x, mine.y, 2, '#ffffff');
  });
  for (const effect of effects) {
    const fade = effect.life / effect.max, progress = 1 - fade;
    ctx.globalAlpha = fade; ctx.strokeStyle = effect.color; ctx.lineWidth = effect.x2 === undefined ? 3 : 4; ctx.beginPath();
    if (effect.kind === 'hit') {
      const radius = effect.radius * (.45 + progress * .55);
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4 + progress * .25;
        ctx.moveTo(effect.x + Math.cos(angle) * radius * .55, effect.y + Math.sin(angle) * radius * .55);
        ctx.lineTo(effect.x + Math.cos(angle) * radius * (1.2 + .25 * fade), effect.y + Math.sin(angle) * radius * (1.2 + .25 * fade));
      }
      ctx.stroke(); ctx.globalAlpha = 1; continue;
    } else if (effect.kind === 'arc') {
      const start = effect.angle - effect.halfAngle, end = effect.angle + effect.halfAngle;
      ctx.beginPath(); ctx.moveTo(effect.x, effect.y); ctx.arc(effect.x, effect.y, effect.radius, start, end); ctx.closePath();
      ctx.globalAlpha = fade * .2; ctx.fillStyle = effect.color; ctx.fill();
      ctx.globalAlpha = fade; ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.arc(effect.x, effect.y, effect.radius * .72, start, end); ctx.lineWidth = 2; ctx.stroke();
      const sweep = start + (end - start) * progress;
      ctx.beginPath();
      ctx.moveTo(effect.x + Math.cos(sweep) * effect.radius * .42, effect.y + Math.sin(sweep) * effect.radius * .42);
      ctx.lineTo(effect.x + Math.cos(sweep) * effect.radius * 1.08, effect.y + Math.sin(sweep) * effect.radius * 1.08);
      ctx.lineWidth = 5; ctx.stroke(); ctx.globalAlpha = 1; continue;
    } else if (effect.kind === 'explosion') {
      const radius = effect.radius * (.12 + progress * .88);
      ctx.globalAlpha = fade * .12; ctx.fillStyle = effect.color;
      ctx.beginPath(); ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = fade; ctx.strokeStyle = effect.color; ctx.lineWidth = 3 + 4 * (1 - progress);
      ctx.beginPath(); ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = fade * .9; ctx.strokeStyle = '#ffe4a0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(effect.x, effect.y, radius * (.38 + progress * .22), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = fade * .8; ctx.fillStyle = '#ffd27a';
      ctx.beginPath(); ctx.arc(effect.x, effect.y, radius * .2 * (1 - progress * .45), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = fade; ctx.strokeStyle = '#fff0bd'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const angle = i * Math.PI * 2 / 10 + animationTime * 1.5;
        const inner = radius * (.48 + .08 * Math.sin(animationTime * 18 + i));
        const outer = radius * (1.05 + .12 * Math.sin(animationTime * 12 + i * 2));
        ctx.moveTo(effect.x + Math.cos(angle) * inner, effect.y + Math.sin(angle) * inner);
        ctx.lineTo(effect.x + Math.cos(angle) * outer, effect.y + Math.sin(angle) * outer);
      }
      ctx.stroke(); ctx.globalAlpha = 1; continue;
    } else if (effect.kind === 'frost') {
      const radius = effect.radius * (.2 + progress * .8);
      ctx.globalAlpha = fade * .1; ctx.fillStyle = effect.color;
      ctx.beginPath(); ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = fade; ctx.lineWidth = 3; ctx.strokeStyle = effect.color;
      ctx.beginPath(); ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = fade * .8; ctx.lineWidth = 1.5; ctx.strokeStyle = '#f2fcff';
      ctx.beginPath(); ctx.arc(effect.x, effect.y, radius * .68, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4 + progress * .2;
        ctx.moveTo(effect.x + Math.cos(angle) * radius * .42, effect.y + Math.sin(angle) * radius * .42);
        ctx.lineTo(effect.x + Math.cos(angle) * radius * 1.12, effect.y + Math.sin(angle) * radius * 1.12);
      }
      ctx.stroke(); ctx.globalAlpha = 1; continue;
    } else if (effect.kind === 'pulse' || effect.kind === 'impact') {
      const radius = effect.radius * (.2 + progress * .8);
      ctx.globalAlpha = fade * (effect.kind === 'pulse' ? .1 : .16);
      ctx.fillStyle = effect.color; ctx.beginPath(); ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = fade; ctx.lineWidth = effect.kind === 'pulse' ? 4 : 2;
      ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = fade * .65; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(effect.x, effect.y, radius * .62, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = fade; ctx.lineWidth = 2;
      ctx.beginPath();
      const count = effect.kind === 'pulse' ? 8 : 6;
      for (let i = 0; i < count; i++) {
        const angle = i * Math.PI * 2 / count + .2 + progress * .35, inner = radius * .58, outer = radius * (1.05 + .12 * fade);
        ctx.moveTo(effect.x + Math.cos(angle) * inner, effect.y + Math.sin(angle) * inner);
        ctx.lineTo(effect.x + Math.cos(angle) * outer, effect.y + Math.sin(angle) * outer);
      }
      ctx.stroke(); ctx.globalAlpha = 1; continue;
    } else if (effect.kind === 'thrust') {
      ctx.save(); ctx.translate(effect.x, effect.y); ctx.rotate(effect.angle);
      ctx.globalAlpha = fade * .16; ctx.fillStyle = effect.color;
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(effect.radius * .82, -4); ctx.lineTo(effect.radius, 0);
      ctx.lineTo(effect.radius * .82, 4); ctx.lineTo(0, 8); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = fade; ctx.strokeStyle = effect.color; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(effect.radius, 0); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(effect.radius * .92, 0); ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1; continue;
    } else if (effect.kind === 'lightning') {
      const dx = effect.x2 - effect.x, dy = effect.y2 - effect.y, length = Math.hypot(dx, dy) || 1;
      const segments = Math.min(8, Math.max(3, Math.ceil(length / 85))), perpX = -dy / length, perpY = dx / length;
      const points = [];
      for (let i = 0; i <= segments; i++) {
        const ratio = i / segments, jitter = i === 0 || i === segments ? 0 : Math.sin(animationTime * 48 + effect.x * .01 + i * 2.6) * Math.min(20, length * .045);
        points.push({ x: effect.x + dx * ratio + perpX * jitter, y: effect.y + dy * ratio + perpY * jitter });
      }
      const strokeBolt = () => {
        ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.stroke();
      };
      ctx.globalAlpha = fade * .28; ctx.strokeStyle = effect.color; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; strokeBolt();
      ctx.globalAlpha = fade; ctx.strokeStyle = '#e9fcff'; ctx.lineWidth = 3; strokeBolt();
      const branch = points[Math.floor(segments * .62)];
      ctx.globalAlpha = fade * .7; ctx.strokeStyle = effect.color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(branch.x, branch.y);
      ctx.lineTo(branch.x + perpX * 14 + dx / length * 10, branch.y + perpY * 14 + dy / length * 10);
      ctx.lineTo(branch.x + perpX * 27 + dx / length * 4, branch.y + perpY * 27 + dy / length * 4);
      ctx.stroke(); ctx.globalAlpha = 1; continue;
    } else if (effect.kind === 'ricochet') {
      const dx = effect.x2 - effect.x, dy = effect.y2 - effect.y, length = Math.hypot(dx, dy) || 1;
      const bend = Math.sin(animationTime * 24 + effect.x) * Math.min(12, length * .06);
      const midX = (effect.x + effect.x2) / 2 - dy / length * bend;
      const midY = (effect.y + effect.y2) / 2 + dx / length * bend;
      ctx.globalAlpha = fade * .35; ctx.strokeStyle = effect.color; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(effect.x, effect.y); ctx.quadraticCurveTo(midX, midY, effect.x2, effect.y2); ctx.stroke();
      ctx.globalAlpha = fade; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(effect.x, effect.y); ctx.quadraticCurveTo(midX, midY, effect.x2, effect.y2); ctx.stroke();
      ctx.globalAlpha = fade; ctx.fillStyle = effect.color;
      ctx.beginPath(); ctx.arc(effect.x2, effect.y2, 4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; continue;
    } else if (effect.kind === 'slash') {
      const dx = effect.x2 - effect.x, dy = effect.y2 - effect.y, length = Math.hypot(dx, dy);
      ctx.save(); ctx.translate(effect.x, effect.y); ctx.rotate(Math.atan2(dy, dx));
      ctx.globalAlpha = fade * .25; ctx.fillStyle = effect.color;
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(length * .75, -2); ctx.lineTo(length, 0);
      ctx.lineTo(length * .75, 2); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = fade; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(length, 0); ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1; continue;
    } else if (effect.x2 !== undefined) { ctx.moveTo(effect.x, effect.y); ctx.lineTo(effect.x2, effect.y2); }
    else ctx.arc(effect.x, effect.y, effect.radius * (1 - effect.life / effect.max * .3), 0, Math.PI * 2);
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  for (const wall of flameWalls) {
    const fade = Math.min(1, wall.life / .7);
    const x1 = wall.x - wall.dx * wall.halfLength, y1 = wall.y - wall.dy * wall.halfLength;
    const x2 = wall.x + wall.dx * wall.halfLength, y2 = wall.y + wall.dy * wall.halfLength;
    ctx.save(); ctx.globalAlpha = fade; ctx.lineCap = 'round';
    ctx.strokeStyle = '#64231d'; ctx.lineWidth = wall.halfWidth * 2.2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = '#e84a24'; ctx.lineWidth = wall.halfWidth * 1.45;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = '#ffad45'; ctx.lineWidth = wall.halfWidth * .62;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = '#fff0a0'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const flameCount = Math.ceil(wall.halfLength * 2 / 25);
    const drawFlame = (offset, width, height, phase) => {
      ctx.save(); ctx.translate(offset, 0);
      const tipX = Math.sin(phase) * width * .35;
      ctx.fillStyle = '#f24722'; ctx.beginPath();
      ctx.moveTo(-width, 5); ctx.quadraticCurveTo(-width * 1.25, -height * .2, -width * .2, -height * .55);
      ctx.quadraticCurveTo(-width * .18, -height * .8, tipX, -height);
      ctx.quadraticCurveTo(width * .32, -height * .72, width * .42, -height * .42);
      ctx.quadraticCurveTo(width * 1.15, -height * .17, width, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff9c36'; ctx.beginPath();
      ctx.moveTo(-width * .58, 4); ctx.quadraticCurveTo(-width * .62, -height * .22, -width * .12, -height * .45);
      ctx.quadraticCurveTo(tipX * .5, -height * .68, tipX * .55, -height * .72);
      ctx.quadraticCurveTo(width * .38, -height * .5, width * .58, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffe78a'; ctx.beginPath();
      ctx.moveTo(-width * .22, 3); ctx.quadraticCurveTo(-width * .25, -height * .19, tipX * .45, -height * .4);
      ctx.quadraticCurveTo(width * .26, -height * .23, width * .3, 3); ctx.closePath(); ctx.fill();
      ctx.restore();
    };
    for (let i = 0; i <= flameCount; i++) {
      const distance = -wall.halfLength + wall.halfLength * 2 * i / flameCount;
      const x = wall.x + wall.dx * distance, y = wall.y + wall.dy * distance;
      const phase = animationTime * 14 + i * 2.3 + wall.x * .01;
      const flicker = .5 + .5 * Math.sin(phase);
      const height = 22 + flicker * 24, width = 5 + flicker * 3;
      upright(x, y, () => {
        // Flame geometry is local; upright callbacks otherwise use world coordinates.
        ctx.translate(x, y);
        ctx.globalAlpha = fade * (.78 + flicker * .22);
        drawFlame(0, width, height, phase);
        if (i % 2 === 0) drawFlame(width * 1.1, width * .58, height * .64, phase + 1.7);
        if (i % 3 === 0) {
          ctx.globalAlpha = fade * .9;
          ctx.fillStyle = '#fff0a0'; ctx.beginPath();
          ctx.ellipse(Math.sin(phase * 1.4) * 2, -height * .78, 1.3, 2, 0, 0, Math.PI * 2); ctx.fill();
        }
      });
    }
    ctx.restore();
  }
  for (const shot of shots) if (visible(shot.x, shot.y, shot.radius + 20)) upright(shot.x, shot.y, () => {
    const radius = Math.max(3, shot.radius), direction = project(shot.vx, shot.vy);
    ctx.save(); ctx.translate(shot.x, shot.y); ctx.rotate(Math.atan2(direction.y, direction.x));
    if (shot.visual === 'fireball') {
      ctx.fillStyle = '#e94c23'; ctx.beginPath();
      ctx.moveTo(radius * 1.6, 0); ctx.quadraticCurveTo(radius * .15, -radius * 1.25, -radius * 1.8, -radius * .4);
      ctx.quadraticCurveTo(-radius * .9, 0, -radius * 1.8, radius * .4); ctx.quadraticCurveTo(radius * .15, radius * 1.25, radius * 1.6, 0); ctx.fill();
      circle(0, 0, radius * .7, '#ff9a32'); circle(radius * .22, -radius * .1, radius * .36, '#fff0a0');
    } else if (['pistol', 'machinegun', 'sniper'].includes(shot.visual)) {
      const length = Math.max(10, radius * 3), width = Math.max(2, radius * .55);
      ctx.strokeStyle = shot.special ? '#ffe29a' : '#a9dbf7'; ctx.lineWidth = shot.special ? 2.5 : 1.5;
      ctx.beginPath(); ctx.moveTo(-length * 1.35, 0); ctx.lineTo(-length * .5, 0); ctx.stroke();
      ctx.fillStyle = shot.special ? '#ffd777' : '#d8e6eb'; ctx.beginPath();
      ctx.moveTo(length * .65, 0); ctx.lineTo(length * .2, -width); ctx.lineTo(-length * .6, -width * .65);
      ctx.lineTo(-length, 0); ctx.lineTo(-length * .6, width * .65); ctx.lineTo(length * .2, width); ctx.closePath(); ctx.fill();
      circle(length * .15, 0, width * .42, '#ffffff');
    } else if (shot.visual === 'turret') {
      circle(0, 0, radius * 1.3, '#166083'); circle(0, 0, radius * .9, '#45c8ed');
      circle(-radius * .2, -radius * .2, radius * .36, '#e3fbff');
      ctx.strokeStyle = shot.special ? '#c1f7ff' : '#84e6ff'; ctx.lineWidth = shot.special ? 2 : 1;
      ctx.beginPath(); ctx.arc(0, 0, radius * 1.35, -.8, .8); ctx.stroke();
    } else if (shot.special) {
      ctx.strokeStyle = skillColor(shot.visual); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-radius * 2.5, 0); ctx.lineTo(-radius * .5, 0); ctx.stroke();
      ctx.fillStyle = skillColor(shot.visual); ctx.beginPath(); ctx.moveTo(radius * 1.5, 0); ctx.lineTo(0, -radius); ctx.lineTo(-radius, 0); ctx.lineTo(0, radius); ctx.closePath(); ctx.fill();
      circle(0, 0, Math.max(2, radius * .45), '#ffffff');
    } else {
      circle(0, 0, radius, shot.acid ? '#9c61c9' : '#a9dbf7');
      circle(0, 0, Math.max(2, radius - 2), shot.acid ? '#e5c4ff' : '#ffffff');
    }
    ctx.restore();
  });
  for (const shot of hostileShots) if (visible(shot.x, shot.y, 12)) upright(shot.x, shot.y, () => {
    circle(shot.x, shot.y, 10, '#ed405855'); circle(shot.x, shot.y, 8, '#ffb2b6'); circle(shot.x, shot.y, 5, '#ed4058');
  });
  const actors = [
    ...enemies.filter(enemy => !enemy.escaped && visible(enemy.x, enemy.y, enemy.radius * 2 + 20)).map(enemy => ({ kind: 'enemy', value: enemy })),
    ...placedTurrets.filter(turret => visible(turret.x, turret.y, 25)).map(turret => ({ kind: 'turret', value: turret })),
    ...temporaryTurrets.filter(turret => visible(turret.x, turret.y, 25)).map(turret => ({ kind: 'turret', value: turret })),
    ...Object.values(turrets).filter(turret => visible(turret.x, turret.y, 25)).map(turret => ({ kind: 'turret', value: turret })),
    { kind: 'player', value: player }
  ].sort((a, b) => a.value.x + a.value.y - b.value.x - b.value.y);
  for (const actor of actors) {
    const { x, y } = actor.value;
    upright(x, y, () => {
      if (actor.kind === 'turret') { art.draw('turret', x, y, 38); return; }
      if (actor.kind === 'enemy') {
        const enemy = actor.value;
        ctx.fillStyle = '#14203188'; ctx.beginPath(); ctx.ellipse(x, y + enemy.radius * .85, enemy.radius, Math.max(3, enemy.radius * .25), 0, 0, Math.PI * 2); ctx.fill();
        if (enemy.frozen > 0) {
          circle(x, y, enemy.radius * 1.25, '#8ddfff44');
          ctx.strokeStyle = '#b7edff'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, enemy.radius * 1.25, 0, Math.PI * 2); ctx.stroke();
        }
        const bob = enemy.type !== 'sapling' && enemy.bullState !== 'windup' && !enemy.frozen && !enemy.stunned ? animation * 2 : 0;
        art.draw(enemy.type, x, y - bob, enemy.radius * 2.6, 1, enemy.hit > 0 || enemy.attackWarning);
        if (enemy.type === 'goblin') { ctx.fillStyle = '#ffe5a0'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('◆', x, y - enemy.radius - 8); ctx.textAlign = 'start'; }
        drawStatus(enemy, animation);
        if (['boss', 'tank', 'summoner', 'goblin'].includes(enemy.type)) { ctx.fillStyle = '#1b231d'; ctx.fillRect(x - enemy.radius, y - enemy.radius - 10, enemy.radius * 2, 4); ctx.fillStyle = '#e6a079'; ctx.fillRect(x - enemy.radius, y - enemy.radius - 10, enemy.radius * 2 * enemy.hp / enemy.maxHp, 4); }
      } else {
        ctx.fillStyle = '#14203188'; ctx.beginPath(); ctx.ellipse(x, y + 16, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
        const moving = phase === 'battle' && keys.size > 0;
        art.draw('hero-' + run.character, x, y - (moving ? animation * 2 : 0), 48, invulnerable > 0 && Math.floor(invulnerable * 12) % 2 ? .5 : 1);
        if (levelUpTimer > 0) {
          ctx.globalAlpha = Math.min(1, levelUpTimer * 2);
          ctx.strokeStyle = '#ffe39b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 34 + (1.5 - levelUpTimer) * 16, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#fff0bd'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.fillText('LEVEL UP!', x, y - 45);
          ctx.globalAlpha = 1;
        }
        if (run.hp < run.maxHp) {
          ctx.fillStyle = '#172431'; ctx.fillRect(x - 25, y - 32, 50, 6);
          ctx.fillStyle = '#a9e3ff'; ctx.fillRect(x - 24, y - 31, 48 * Math.max(0, run.hp / run.maxHp), 4);
        }
      }
    });
  }
  const attackAim = previewSkill ? { x: aimX, y: aimY } : autoAimPoint();
  if (phase === 'battle' && lastInputMode === 'gamepad' && gamepadAiming && visible(attackAim.x, attackAim.y, 22, offset)) upright(attackAim.x, attackAim.y, () => {
    ctx.strokeStyle = gamepadAiming ? '#8df4ff' : '#fff2b0'; ctx.fillStyle = '#081321'; ctx.lineWidth = 2.5;
    ctx.globalAlpha = .72; ctx.beginPath(); ctx.arc(attackAim.x, attackAim.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = .98; ctx.beginPath(); ctx.arc(attackAim.x, attackAim.y, 11, 0, Math.PI * 2); ctx.stroke();
    if (gamepadAiming) { ctx.globalAlpha = .72; ctx.beginPath(); ctx.arc(attackAim.x, attackAim.y, 17, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = .98;
    ctx.beginPath(); ctx.moveTo(attackAim.x - 15, attackAim.y); ctx.lineTo(attackAim.x - 5, attackAim.y);
    ctx.moveTo(attackAim.x + 5, attackAim.y); ctx.lineTo(attackAim.x + 15, attackAim.y);
    ctx.moveTo(attackAim.x, attackAim.y - 15); ctx.lineTo(attackAim.x, attackAim.y - 5);
    ctx.moveTo(attackAim.x, attackAim.y + 5); ctx.lineTo(attackAim.x, attackAim.y + 15); ctx.stroke();
  });
  if (phase === 'battle' && previewSkill) {
    const color = previewSkill === 'q' ? skillColors[HERO_SECONDARY_SKILLS[run.character].category]
      : previewSkill === 'ultimate' ? skillColors[ULTIMATES[run.character].category]
        : skillColors[HERO_SKILLS[run.character].category];
    ctx.save(); ctx.globalAlpha = .92; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3;
    const drawCircle = (x, y, radius, alpha = .2) => {
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.globalAlpha = alpha; ctx.fill(); ctx.globalAlpha = .96; ctx.stroke();
    };
    const drawBand = (x, y, angle, length, width) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      ctx.globalAlpha = .2; ctx.fillRect(-length / 2, -width / 2, length, width);
      ctx.globalAlpha = .96; ctx.strokeRect(-length / 2, -width / 2, length, width);
      ctx.restore();
    };
    if (previewSkill === 'right') {
      if (run.character === 'mage' || run.character === 'engineer') {
        const radius = run.character === 'mage' ? 95 + run.heroSkillLevel * 12 : 100 + run.heroSkillLevel * 14;
        drawCircle(aimX, aimY, radius);
      } else if (run.character === 'warrior') {
        const dx = aimX - player.x, dy = aimY - player.y, angle = Math.atan2(dy, dx);
        const radius = 235 + run.heroSkillLevel * 15;
        ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.arc(player.x, player.y, radius, angle - Math.PI / 3, angle + Math.PI / 3); ctx.closePath();
        ctx.globalAlpha = .2; ctx.fill(); ctx.globalAlpha = .96; ctx.stroke();
      } else {
        const dx = aimX - player.x, dy = aimY - player.y, angle = Math.atan2(dy, dx);
        drawBand(player.x + Math.cos(angle) * 600, player.y + Math.sin(angle) * 600, angle, 1200, 42);
      }
    } else if (previewSkill === 'q' && run.character === 'mage') {
      const dx = aimX - player.x, dy = aimY - player.y, distance = Math.hypot(dx, dy) || 1;
      const length = 150 + run.heroSkills.w * 20;
      drawBand(aimX, aimY, Math.atan2(dy, dx) + Math.PI / 2, length * 2, 60);
    } else if (previewSkill === 'q' && run.character === 'warrior') {
      const dx = aimX - player.x, dy = aimY - player.y, distance = 230 + run.heroSkills.w * 20;
      drawBand(player.x + Math.cos(Math.atan2(dy, dx)) * distance / 2, player.y + Math.sin(Math.atan2(dy, dx)) * distance / 2, Math.atan2(dy, dx), distance, 72);
    } else if (previewSkill === 'q' && run.character === 'engineer') {
      drawCircle(aimX, aimY, 360, .08);
      drawCircle(aimX, aimY, 20, .35);
    } else if (previewSkill === 'q' && run.character === 'scout') {
      const angle = Math.atan2(aimY - player.y, aimX - player.x);
      drawBand(player.x + Math.cos(angle) * 600, player.y + Math.sin(angle) * 600, angle, 1200, 28);
      drawCircle(aimX, aimY, 28, .15);
    } else if (previewSkill === 'ultimate' && run.character === 'scout') {
      const count = 16 + run.ultimateLevel * 4;
      for (let i = 0; i < count; i++) {
        const angle = i * Math.PI * 2 / count;
        drawBand(player.x + Math.cos(angle) * 230, player.y + Math.sin(angle) * 230, angle, 460, 18);
      }
    } else if (previewSkill === 'ultimate' && run.character === 'engineer') {
      const turretTargets = allTurrets();
      for (const turret of turretTargets.length ? turretTargets : [player]) drawCircle(turret.x, turret.y, 44, .18);
    } else {
      const radius = previewSkill === 'ultimate'
        ? run.character === 'warrior' ? 240 + run.ultimateLevel * 45
          : run.character === 'mage' ? 250 + run.ultimateLevel * 45
            : 180
        : previewSkill === 'q'
          ? 125 + run.heroSkills.w * 12
          : 100 + run.heroSkillLevel * 14;
      const x = previewSkill === 'ultimate' ? player.x : aimX, y = previewSkill === 'ultimate' ? player.y : aimY;
      drawCircle(x, y, radius);
    }
    ctx.restore();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = '#182031';
  for (const number of damageNumbers) {
    if (!visible(number.x, number.y, 25)) continue;
    upright(number.x, number.y, () => {
      ctx.globalAlpha = Math.min(1, number.life * 3);
      ctx.font = (number.critical ? 'bold 22px' : 'bold 11px') + ' sans-serif';
      const text = String(number.value);
      ctx.strokeText(text, number.x, number.y - number.height); ctx.fillStyle = number.critical ? '#ffdb35' : number.color; ctx.fillText(text, number.x, number.y - number.height);
    });
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
  ctx.restore();
  drawLighting(offset, shakeX, shakeY);
}
function drawLighting(offset, shakeX, shakeY) {
  const hero = project(player.x, player.y);
  const heroX = hero.x - offset.x + shakeX, heroY = hero.y - offset.y + shakeY;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const vignette = ctx.createRadialGradient(heroX, heroY, 20, heroX, heroY, Math.hypot(viewW, viewH) * .75);
  vignette.addColorStop(0, 'rgba(255,255,255,.98)');
  vignette.addColorStop(.18, 'rgba(255,255,255,.92)');
  vignette.addColorStop(.42, 'rgba(48,42,34,.58)');
  vignette.addColorStop(.65, 'rgba(20,17,14,.68)');
  vignette.addColorStop(1, 'rgba(4,4,3,.84)');
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = vignette;
  ctx.beginPath(); ctx.rect(0, 0, viewW, viewH); ctx.fill();

  const heroLight = ctx.createRadialGradient(heroX, heroY, 8, heroX, heroY, 250);
  heroLight.addColorStop(0, 'rgba(255,209,139,.25)');
  heroLight.addColorStop(.3, 'rgba(255,187,115,.1)');
  heroLight.addColorStop(1, 'rgba(255,173,99,0)');
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = heroLight; ctx.fillRect(heroX - 250, heroY - 250, 500, 500);

  ctx.globalAlpha = .32;
  let litShots = 0;
  const lightShot = (shot, color) => {
    const point = project(shot.x, shot.y), x = point.x - offset.x + shakeX, y = point.y - offset.y + shakeY;
    const radius = shot.special ? 38 : 25;
    const glow = ctx.createRadialGradient(x, y, 1, x, y, radius);
    glow.addColorStop(0, color); glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };
  for (const shot of shots) { if (litShots++ >= 24) break; lightShot(shot, shot.color); }
  for (const shot of hostileShots) { if (litShots++ >= 24) break; lightShot(shot, '#ff5364'); }
  ctx.globalAlpha = 1; ctx.restore();
}
function startLoop() {
  previous = 0; accumulator = 0; lastDraw = 0;
  if (!framePending) { framePending = true; requestAnimationFrame(frame); }
}
function frame(timestamp) {
  framePending = false;
  if (phase !== 'battle') return;
  if (previous) accumulator += Math.min((timestamp - previous) / 1000, .05);
  previous = timestamp;
  while (accumulator >= 1 / 60 && phase === 'battle') {
    update(1 / 60); accumulator -= 1 / 60;
  }
  if (phase !== 'battle') return;
  if (!lastDraw || timestamp - lastDraw >= 1000 / 60 - .5) {
    draw(); lastDraw = lastDraw ? Math.max(lastDraw + 1000 / 60, timestamp - 1000 / 60) : timestamp;
  }
  framePending = true; requestAnimationFrame(frame);
}
$('#help').addEventListener('click', () => {
  playSound('menu');
  if (phase === 'help') return;
  const previousPhase = phase;
  const wasHidden = overlay.classList.contains('hidden');
  const previousContent = [...overlay.childNodes];
  phase = 'help'; keys.clear();
  const card = panel('HOW TO PLAY', 'Survive the arena.', 'The game is paused while this help screen is open.');
  const content = document.createElement('div'); content.className = 'help-content';
  for (const text of [
    'Move with WASD, arrow keys or touch controls. Hold LMB for Basic Attack in the exact cursor direction; attacks stop on release and aimed shots can miss. On gamepad, hold RT/R2. Weapon special attacks trigger automatically while you attack. The ability bar shows Basic Attack and three active class skills.',
    'Standard gamepad: left stick moves; right stick smoothly aims, and stick tilt controls aim distance. RT attacks, LT casts your signature skill, LB casts Q, A/Cross uses the ultimate, and B/Circle strafes. The D-pad navigates menus; A/Cross confirms a menu choice.',
    'Right-click is your first aimed class skill; Q unlocks at level 3. R is your ultimate. Hold right-click, Q or R to preview its impact zone, then release to cast. A fourth, passive class trait unlocks at level 5 and develops through later upgrades.',
    'Skills have distinct roles: Warrior charges through the frontline, Scout fans out pinning shots and chains attacks through its passive, Mage controls space with fire, and Engineer builds permanent sentries and mines. Engineer ricochets happen only during Turret Overclock; its passive strengthens those chained hits.',
    'Press Space to evade in your movement direction (or last direction), briefly avoiding damage; it recharges in 5 seconds. Class Strafe in the shop transforms Evade: Mage blinks and creates a nova, Warrior leaps and strikes on landing, Scout leaves an explosive trap, and Engineer leaves a temporary sentry.',
    'Each level restores 4 HP, adds 4 max HP and grants +2% damage. Level-ups offer available class-skill or passive unlocks and rank-ups. Choose attack speed, damage, critical hits and life steal to build a destroyer, or health and armor to build a tank.',
    'The shop sells items only. One offer is reserved for Basic Attack Mastery until rank 9; each rank adds 20% direct basic-attack damage and 4% firing speed, excluding Engineer turret shots, with another strike or projectile at ranks 3 and 6. Every item also grants +3% All Damage per level for every hero, and rare purchases grant bonus All Damage.',
    'Press R or tap the ultimate button for your hero’s special attack. Skills start each wave on cooldown; the ultimate recharges in 20 seconds. The Engineer’s Overclock makes every turret fire twice as fast and ricochet between enemies. Rare Epic-or-better level-up choices improve ultimates up to level 3.',
    'Batlike chasers are slightly slower and enemies gain speed as the run progresses. Enemies spawning onscreen show a warning at their spawn point for 0.8 seconds. Spawning adapts to the number of enemies alive: a crowded arena slows the spawn rate, while clearing enemies speeds it up.',
    'Press Esc or P, or use the pause button, to pause or resume. Cooldowns stop while paused. Choose END THE RUN from the pause menu to open the damage and build summary without waiting for defeat.',
    'White projectiles and purple acid are yours. Special attacks have bright colored trails and pulses. Brown-orange enemies and red projectiles are dangerous. Blue and gold drops can be collected.',
    'Melee is red, ranged is green, spells are yellow and engineering is blue. All Damage adds to every category, including burn and acid.',
    'Fireball has a 55% chance to ignite enemies. Burn ticks every half-second for 4 seconds and scales with spell damage. Flint increases ignition chance, Glowing Embers increases burn damage, and Wildfire spreads burns to nearby enemies for up to 3 generations.',
    'Golden loot goblins flee and drop a bomb, gold magnet or medkit. Bombs damage nearby enemies, magnets collect gold, and medkits restore full health.',
    'Destroy a green sapling to find a small medkit that restores 10% of max health.',
    'Wrench strikes scale with melee damage; turret shots scale with engineering.',
    'Attack speed affects all weapons. Armor reduces incoming damage, critical chance improves hit damage, movement speed improves movement and luck improves upgrade rarity. Powerful skills and magic can hurl most enemies several body lengths; heavy enemies resist knockback but can still be moved. Impact Bracer and Recoil Spring increase knockback.',
    'Item bonuses scale with item levels. Most penalties are fixed. Items add distinctive effects as well as stats; each effect is labeled.',
    'Life steal restores health from direct weapon damage, up to 1.5 HP per second. Burn, acid, bombs and saplings do not trigger life steal.',
    'Max health increases your HP limit. Damage numbers show damage dealt; large yellow numbers mark critical hits.',
    'The Warrior gains up to 30% melee damage as health decreases. The Scout gains 10% speed and 10% ranged damage. The Mage gains 15% spell damage, 15% All Damage, 10% attack speed and 6 armor. The Engineer gains 15% engineering, 15% All Damage and 6 armor.',
    'Frozen or stunned enemies cannot move or attack; bosses suffer half the duration and resist new freezes and stuns for 1.5 seconds after one is applied. Contact and existing projectiles still hurt.',
    'Buy and upgrade items in the shop. Lock useful offers or reroll for new ones; rerolls cost 2 × (wave number + previous rerolls in this shop).',
    'The Investor’s Purse grants 4 gold per level at the end of each wave, but reduces attack speed.',
    'Normal, Rare, Epic, Mythic and Legendary determine upgrade strength. Luck increases the chance of rarer upgrades but does not guarantee them. Most items have four levels; Basic Attack Mastery has nine.'
  ]) {
    const paragraph = document.createElement('p'); paragraph.textContent = text; content.append(paragraph);
  }
  card.append(content, button('BACK →', () => {
    phase = previousPhase;
    if (wasHidden) hide(); else { overlay.replaceChildren(...previousContent); overlay.classList.remove('hidden'); }
    if (phase === 'battle') startLoop();
  }));
  show(card);
});
$('#pause').addEventListener('click', togglePause);
$('#evade').addEventListener('click', evade);
$('#hero-skill').addEventListener('click', activateHeroSkill);
$('#hero-skill-w').addEventListener('click', activateSecondarySkill);
$('#ultimate').addEventListener('click', activateUltimate);
for (const [control, id] of [[$('#hero-skill'), 'right'], [$('#hero-skill-w'), 'q'], [$('#ultimate'), 'ultimate']]) {
  control.addEventListener('pointerdown', () => { if (phase === 'battle' && skillAvailable(id)) previewSkill = id; });
  control.addEventListener('pointerup', () => { if (previewSkill === id) previewSkill = ''; });
  control.addEventListener('pointercancel', () => { if (previewSkill === id) previewSkill = ''; });
}
function refreshAimFromScreen() {
  const offset = camera();
  const point = unproject(aimScreenX + offset.x, aimScreenY + offset.y);
  aimX = Math.max(0, Math.min(W, point.x));
  aimY = Math.max(0, Math.min(H, point.y));
}
function aimFromPointer(event) {
  setInputMode('keyboard');
  if (phase !== 'battle') return;
  gamepadAiming = false;
  const bounds = canvas.getBoundingClientRect();
  aimScreenX = (event.clientX - (bounds.left || 0)) * canvas.width / bounds.width;
  aimScreenY = (event.clientY - (bounds.top || 0)) * canvas.height / bounds.height;
  refreshAimFromScreen();
}
canvas.style.cursor = 'crosshair';
document.addEventListener('pointerdown', () => setInputMode('keyboard'));
canvas.addEventListener('pointermove', aimFromPointer);
canvas.addEventListener('pointerdown', event => {
  setInputMode('keyboard');
  if (phase !== 'battle') return;
  event.preventDefault();
  aimFromPointer(event);
  if (event.button === 0) {
    pointerPrimaryHeld = true;
    primaryHeld = true;
    canvas.setPointerCapture?.(event.pointerId);
  } else if (event.button === 2) {
    if (skillAvailable('right')) previewSkill = 'right';
    canvas.setPointerCapture?.(event.pointerId);
  }
});
canvas.addEventListener('pointerup', event => {
  if (event.button === 0) {
    pointerPrimaryHeld = false;
    primaryHeld = gamepadPrimaryHeld;
  }
  if (event.button === 2 && previewSkill === 'right') { activateHeroSkill(); previewSkill = ''; }
});
canvas.addEventListener('pointercancel', event => {
  pointerPrimaryHeld = false;
  primaryHeld = gamepadPrimaryHeld;
  if (previewSkill === 'right') previewSkill = '';
});
canvas.addEventListener('contextmenu', event => event.preventDefault());
arenaFrame.addEventListener('contextmenu', event => {
  if (phase === 'battle') event.preventDefault();
});
document.addEventListener('keydown', event => {
  setInputMode('keyboard');
  const key = event.key.toLowerCase();
  if (key === 'escape' && !audioMenu.hidden) { event.preventDefault(); closeAudioMenu(); return; }
  if (key === 'escape' || key === 'p') { event.preventDefault(); if (!event.repeat) togglePause(); return; }
  if (key === ' ' || event.code === 'Space') { event.preventDefault(); if (!event.repeat) evade(); return; }
  if (key === 'q' || key === 'r') {
    event.preventDefault();
    const skill = key === 'r' ? 'ultimate' : key;
    const unlocked = key === 'r' || run.heroSkills.w > 0;
    if (!event.repeat && phase === 'battle' && unlocked && skillAvailable(skill)) { keys.add(key); previewSkill = skill; }
    return;
  }
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) { event.preventDefault(); if (phase === 'battle') keys.add(key); }
});
document.addEventListener('keyup', event => {
  const key = event.key.toLowerCase();
  if (key === 'q' && keys.delete('q')) activateSecondarySkill();
  else if (key === 'r' && keys.delete('r')) activateUltimate();
  if (previewSkill === key || (key === 'r' && previewSkill === 'ultimate')) previewSkill = '';
  keys.delete(key);
});
window.addEventListener('blur', () => {
  keys.clear(); primaryHeld = false; pointerPrimaryHeld = false; gamepadPrimaryHeld = false; gamepadMoveX = gamepadMoveY = 0; previousGamepadButtons = []; previousGamepadDirections = []; previewSkill = '';
});
document.querySelectorAll('[data-move]').forEach(control => {
  control.addEventListener('pointerdown', event => { event.preventDefault(); if (phase === 'battle') { control.setPointerCapture(event.pointerId); keys.add(control.dataset.move); } });
  control.addEventListener('pointerup', () => keys.delete(control.dataset.move));
  control.addEventListener('pointercancel', () => keys.delete(control.dataset.move));
});
const audioButton = $('#audio');
const audioMenu = $('#audio-menu');
const musicVolume = $('#music-volume'), musicVolumeValue = $('#music-volume-value');
const sfxVolume = $('#sfx-volume'), sfxVolumeValue = $('#sfx-volume-value');
const muteAllButton = $('#audio-mute-all');
function refreshAudioSettings() {
  const musicPercent = Math.round(getMusicVolume() * 100), sfxPercent = Math.round(getSfxVolume() * 100);
  const enabled = isAudioEnabled();
  musicVolume.value = String(musicPercent); musicVolumeValue.textContent = musicPercent + '%';
  sfxVolume.value = String(sfxPercent); sfxVolumeValue.textContent = sfxPercent + '%';
  muteAllButton.textContent = enabled ? 'MUTE ALL' : 'UNMUTE ALL';
  muteAllButton.setAttribute('aria-pressed', String(!enabled));
  audioButton.textContent = enabled ? '♫' : '×';
  audioButton.setAttribute('aria-label', 'Audio settings');
  audioButton.setAttribute('aria-expanded', String(!audioMenu.hidden));
  audioButton.title = 'Audio settings';
}
function closeAudioMenu() {
  audioMenu.hidden = true;
  refreshAudioSettings();
}
audioButton.addEventListener('click', () => {
  audioMenu.hidden = !audioMenu.hidden;
  refreshAudioSettings();
  if (!audioMenu.hidden) musicVolume.focus();
});
$('#audio-close').addEventListener('click', closeAudioMenu);
musicVolume.addEventListener('input', () => {
  const percent = Math.round(setMusicVolume(Number(musicVolume.value) / 100) * 100);
  musicVolumeValue.textContent = percent + '%';
});
sfxVolume.addEventListener('input', () => {
  const percent = Math.round(setSfxVolume(Number(sfxVolume.value) / 100) * 100);
  sfxVolumeValue.textContent = percent + '%';
});
muteAllButton.addEventListener('click', () => {
  const enabled = setAudioEnabled(!isAudioEnabled());
  if (enabled) playSound('menu');
  refreshAudioSettings();
});
document.addEventListener('pointerdown', event => {
  if (!audioMenu.hidden && !audioMenu.contains(event.target) && event.target !== audioButton) closeAudioMenu();
});
audioMenu.hidden = true;
refreshAudioSettings();
document.addEventListener('pointerdown', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });
window.addEventListener('resize', () => { resizeArena(); if (phase !== 'battle') draw(); });
window.addEventListener('gamepadconnected', startGamepadLoop);
window.addEventListener('gamepaddisconnected', () => {
  if (!Array.from(globalThis.navigator?.getGamepads?.() || []).some(gamepad => gamepad?.connected)) releaseGamepad();
});
resizeArena(); startScreen();
if (Array.from(globalThis.navigator?.getGamepads?.() || []).some(gamepad => gamepad?.connected)) startGamepadLoop();
