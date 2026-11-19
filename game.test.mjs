import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getMusicVolume, getSfxVolume, isAudioEnabled, setAudioEnabled, setMusicVolume, setSfxVolume } from './audio.js';
import { ACTIVE_SKILLS, HERO_SKILLS, HERO_SECONDARY_SKILLS, HERO_PASSIVES, HERO_PASSIVE_MAX_LEVEL, HERO_SKILL_COOLDOWN, WEAPONS, CHARACTERS, ULTIMATE_COOLDOWN, buy, sellWeapon, combineWeapons } from './model.js';

class Element {
  constructor(tag = 'div') {
    this.tagName = tag;
    this.children = [];
    this.style = { setProperty(name, value) { this[name] = value; } };
    this.dataset = {};
    this.listeners = {};
    const classes = new Set();
    this.classList = {
      add: (...values) => values.forEach(value => classes.add(value)),
      remove: (...values) => values.forEach(value => classes.delete(value)),
      contains: value => classes.has(value),
      toggle: (value, force) => force ? classes.add(value) : classes.delete(value)
    };
    this.width = 1000; this.height = 620;
  }
  append(...children) { this.children.push(...children); }
  prepend(...children) { this.children.unshift(...children); }
  replaceChildren(...children) { this.children = children; }
  replaceWith() {}
  setAttribute() {}
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  click() { for (const callback of this.listeners.click || []) callback({ preventDefault() {} }); }
  focus() { globalThis.document.activeElement = this; }
  querySelectorAll(selector) {
    const matches = [];
    const visit = element => {
      for (const child of element.children) {
        if (selector.startsWith('button') && child.tagName === 'button' && !child.disabled && !child.hidden) matches.push(child);
        visit(child);
      }
    };
    visit(this);
    return matches;
  }
  querySelector(selector) {
    if (selector.startsWith('.')) return this.children.find(child => child.className === selector.slice(1)) || null;
    return this.children.find(child => child.tagName === selector) || null;
  }
  get childNodes() { return this.children; }
  get childElementCount() { return this.children.length; }
  getBoundingClientRect() { return this.bounds || { width: 1000, height: 620 }; }
  getContext() { return context; }
}

const gradient = { addColorStop() {} };
const context = new Proxy({}, {
  get(target, key) {
    if (!(key in target)) target[key] = key === 'createLinearGradient' || key === 'createRadialGradient' ? () => gradient : key === 'createPattern' ? () => 'pattern' : () => {};
    return target[key];
  }
});
const elements = new Map();
for (const selector of ['#arena', '#overlay', '.arena-frame', '#wave', '#timer', '#gold', '#xp-text', '#xp-bar', '#level', '#attack-control', '#hero-skill', '#hero-skill-w', '#ultimate', '#evade', '#weapon-skill-control', '#hero-passive-control', '#audio', '#audio-menu', '#audio-close', '#music-volume', '#music-volume-value', '#sfx-volume', '#sfx-volume-value', '#audio-mute-all', '#help', '#pause']) elements.set(selector, new Element());
elements.get('#evade').append(new Element('span'), new Element('strong'), new Element('span'), new Element('img'));
elements.get('#evade').children[0].className = 'ability-key';
elements.get('#evade').children[2].className = 'ability-status';
elements.get('#evade').children[3].className = 'ability-icon';
elements.get('#evade').children[3].src = 'assets/skill-icons/green-surge.png';
elements.get('#hero-skill').append(new Element('span'), new Element('strong'), new Element('span'), new Element('img'));
elements.get('#hero-skill').children[0].className = 'ability-key';
elements.get('#hero-skill').children[2].className = 'ability-status';
elements.get('#hero-skill').children[3].className = 'ability-icon';
elements.get('#hero-skill-w').append(new Element('span'), new Element('strong'), new Element('span'), new Element('img'));
elements.get('#hero-skill-w').children[0].className = 'ability-key';
elements.get('#hero-skill-w').children[2].className = 'ability-status';
elements.get('#hero-skill-w').children[3].className = 'ability-icon';
elements.get('#ultimate').append(new Element('span'), new Element('strong'), new Element('span'), new Element('img'));
elements.get('#ultimate').children[0].className = 'ability-key';
elements.get('#ultimate').children[2].className = 'ability-status';
elements.get('#ultimate').children[3].className = 'ability-icon';
elements.get('#attack-control').append(new Element('span'), new Element('strong'), new Element('span'), new Element('img'));
elements.get('#attack-control').children[0].className = 'ability-key';
elements.get('#attack-control').children[1].textContent = 'Basic Attack';
elements.get('#attack-control').children[2].className = 'ability-status';
elements.get('#attack-control').children[3].className = 'ability-icon';
for (const selector of ['#weapon-skill-control', '#hero-passive-control']) {
  elements.get(selector).append(new Element('span'), new Element('strong'), new Element('span'), new Element('img'));
  elements.get(selector).children[0].className = 'ability-key';
  elements.get(selector).children[2].className = 'ability-status';
  elements.get(selector).children[3].className = 'ability-icon';
}
const documentListeners = {};
const localRecords = new Map();
globalThis.document = {
  querySelector: selector => elements.get(selector),
  querySelectorAll: () => [],
  createElement: tag => new Element(tag),
  activeElement: null,
  addEventListener: (type, callback) => { (documentListeners[type] ||= []).push(callback); }
};
globalThis.localStorage = {
  getItem: key => localRecords.get(key) ?? null,
  setItem: (key, value) => localRecords.set(key, String(value))
};
globalThis.window = { addEventListener() {} };
let nextFrame;
globalThis.requestAnimationFrame = callback => { nextFrame = callback; };

const source = (await readFile(new URL('./game.js', import.meta.url), 'utf8'))
  .replace("'./model.js'", "'" + new URL('./model.js', import.meta.url).href + "'")
  .replace("'./pixel-art.js'", "'" + new URL('./pixel-art.js', import.meta.url).href + "'")
  .replace("'./audio.js'", "'" + new URL('./audio.js', import.meta.url).href + "'");
const game = await import('data:text/javascript;base64,' + Buffer.from(source + `
export { reset, startScreen, startWave, endWave, openShop, spawn, spawnNow, activateAbility, activateHeroSkill, activateSecondarySkill, activateUltimate, evade, update, togglePause, draw, damage, fireWeapons, projectile, resizeArena, camera, project, unproject, movementDirection, processGamepad, victory, gameOver, keys, autoAimPoint };
export function state() { return { run, phase, lastInputMode, time, player, enemies, pendingSpawns, shots, hostileShots, drops, puddles, mines, turrets, placedTurrets, temporaryTurrets, engineerOverdrive, flameWalls, pickups, effects, damageNumbers, cooldowns, cooldownDurations, abilityCooldowns, abilityBuffs, evadeCooldown, heroSkillCooldown, secondarySkillCooldown, ultimateCooldown, invulnerable, previewSkill, primaryHeld, aimX, aimY, gamepadAiming, levelUpTimer, battleStats, shakeTime, shakeStrength, lastWaveDamageBySource, waveDamageAtStart, viewW, viewH, W, H }; }
export function setPrimaryHeld(value) { primaryHeld = value; }
export function setSkillsReady() { evadeCooldown = heroSkillCooldown = secondarySkillCooldown = ultimateCooldown = 0; for (const id of Object.keys(abilityCooldowns)) abilityCooldowns[id] = 0; updateAbilityHud(); }
export function clearEnemies() { enemies = []; pendingSpawns = []; }
export function setInvulnerable(value) { invulnerable = value; }
export function expireUltimateCooldown() { ultimateCooldown = 0; updateAbilityHud(); }
`).toString('base64'));

function setup(ids) {
  game.reset('mage');
  game.state().run.weapons = ids.map((id, index) => ({ uid: index + 1, id, level: 1, evolved: false }));
  game.state().run.nextWeaponId = ids.length + 1;
  game.startWave();
  game.clearEnemies();
  readyCooldowns();
  game.setPrimaryHeld(true);
}
function readyCooldowns() {
  game.setSkillsReady();
  for (const weapon of game.state().run.weapons) game.state().abilityCooldowns[weapon.uid] = ACTIVE_SKILLS[weapon.id].cooldown;
}
function activateWeaponSkill(index) {
  const weapon = game.state().run.weapons[index];
  if (weapon) game.state().abilityCooldowns[weapon.uid] = 0;
  game.activateAbility(index);
}
function target(type = 'tank', distance = 75) {
  const { player } = game.state();
  game.spawnNow(type, player.x + distance, player.y);
}
function key(value, repeat = false) {
  keyDown(value, repeat);
  if (!repeat) keyUp(value);
}
function keyDown(value, repeat = false) {
  const event = { key: value, code: value === ' ' ? 'Space' : '', repeat, preventDefault() {} };
  for (const listener of documentListeners.keydown) listener(event);
}
function keyUp(value) {
  const event = { key: value, code: value === ' ' ? 'Space' : '', repeat: false, preventDefault() {} };
  for (const listener of documentListeners.keyup) listener(event);
}
function aimAt(x, y) {
  const point = game.project(x, y), offset = game.camera(), canvas = elements.get('#arena'), bounds = canvas.getBoundingClientRect();
  elements.get('#arena').listeners.pointermove[0]({
    clientX: (point.x - offset.x) * bounds.width / canvas.width,
    clientY: (point.y - offset.y) * bounds.height / canvas.height
  });
}
function pointer(button, x, y, type = 'pointerdown') {
  const point = game.project(x, y), offset = game.camera(), canvas = elements.get('#arena'), bounds = canvas.getBoundingClientRect();
  const event = {
    button, pointerId: 1,
    clientX: (point.x - offset.x) * bounds.width / canvas.width,
    clientY: (point.y - offset.y) * bounds.height / canvas.height,
    preventDefault() {}
  };
  for (const listener of canvas.listeners[type]) listener(event);
}

test('all weapon types attribute their actual attacks to the correct weapon', () => {
  const originalRandom = Math.random;
  Math.random = () => .1;
  try {
    for (const id of Object.keys(WEAPONS)) {
      setup([id]); game.setInvulnerable(100); target('tank', id === 'mine' ? 20 : 60);
      const { player } = game.state();
      aimAt(player.x + (id === 'mine' ? 20 : 200), player.y);
      const enemy = game.state().enemies[0]; enemy.speed = 0; enemy.hp = 100000;
      for (let i = 0; i < 100; i++) game.update(.02);
      assert.ok(game.state().run.damageBySource[id] > 0, id + ' did not record its attacks');
      assert.deepEqual(Object.keys(game.state().run.damageBySource), [id]);
    }
  } finally { Math.random = originalRandom; }
});

test('damage totals exclude overkill and saplings and survive sale and combining copies', () => {
  setup(['sword', 'sword', 'pistol']);
  const run = game.state().run;
  target(); const enemy = game.state().enemies.at(-1); enemy.hp = 20;
  game.damage(enemy, 200, '#fff', 0, null, 'sword');
  game.damage(enemy, 200, '#fff', 0, null, 'sword');
  target('sapling'); const sapling = game.state().enemies.at(-1);
  game.damage(sapling, 200, '#fff', 0, null, 'sword');
  assert.equal(run.damageBySource.sword, 20);
  assert.ok(sellWeapon(run, run.weapons[2].uid));
  run.gold = 100;
  assert.ok(buy(run, { type: 'weapon', id: 'sword', cost: 22 }));
  run.weapons[0].level = run.weapons[1].level = 4;
  assert.equal(combineWeapons(run, run.weapons[0].uid, run.weapons[1].uid), true);
  target(); const next = game.state().enemies.at(-1); next.hp = 15;
  game.damage(next, 100, '#fff', 0, null, 'sword');
  assert.equal(run.damageBySource.sword, 35);
});

test('burn, acid, ultimate and loot bombs record their own damage sources', () => {
  setup(['fireball']); game.setInvulnerable(100);
  game.state().cooldowns[1] = 100;
  target('tank', 60);
  let state = game.state(), enemy = state.enemies[0];
  enemy.speed = 0; enemy.hp = 1000;
  enemy.burn = { damage: 10, remaining: 2, tick: .5, source: 'fireball' };
  enemy.acid = { damage: 3, remaining: 2, tick: .5, source: 'acid' };
  state.puddles.push({ x: enemy.x, y: enemy.y, radius: 30, damage: 7, remaining: 2, life: 3, source: 'ultimate' });
  game.update(.5);
  assert.equal(state.run.damageBySource.fireball, 10);
  assert.equal(state.run.damageBySource.ultimate, 7);
  assert.equal(state.run.damageBySource.acid, undefined);
  assert.equal(enemy.acid.source, 'ultimate');
  enemy.hp = 25; enemy.burn = null; enemy.acid = null;
  game.state().pickups.push({ x: state.player.x, y: state.player.y, type: 'bomb' });
  game.update(.01);
  assert.equal(state.run.damageBySource.bomb, 25);
});

test('Scorch Rounds can ignite hits from every hero and attribute the burn to the item', () => {
  const originalRandom = Math.random;
  Math.random = () => .1;
  try {
    for (const [character, definition] of Object.entries(CHARACTERS)) {
      game.reset(character); game.state().run.items.scorchRounds = 1; game.startWave(); game.clearEnemies();
      const { player } = game.state();
      game.spawnNow('tank', player.x + 100, player.y);
      const enemy = game.state().enemies[0]; enemy.speed = 0; enemy.hp = 100000;
      game.damage(enemy, 10, '#fff', 0, null, definition.weapon);
      assert.equal(enemy.burn.source, 'scorchRounds', character);
      assert.equal(enemy.burn.remaining, 4, character);
      game.setInvulnerable(100); game.update(.5);
      assert.ok(game.state().run.damageBySource.scorchRounds > 0, character);
    }
    Math.random = () => .31;
    game.reset('mage'); game.state().run.items.scorchRounds = 1; game.startWave(); game.clearEnemies();
    const { player } = game.state();
    game.spawnNow('tank', player.x + 100, player.y);
    game.damage(game.state().enemies[0], 10, '#fff', 0, null, 'fireball');
    assert.equal(game.state().enemies[0].burn, undefined);
  } finally { Math.random = originalRandom; }
});

test('Volatile Core blasts nearby enemies for 30% of the dead enemy max HP; Blood Harvest heals per kill', () => {
  const originalRandom = Math.random;
  Math.random = () => .99;
  try {
    setup(['sword']);
    const state = game.state(), { player, run } = state;
    run.weapons = []; run.items.volatile = 1; run.items.harvest = 1; run.hp = 50;
    game.setPrimaryHeld(false); game.setInvulnerable(100);
    game.spawnNow('tank', player.x + 250, player.y);
    game.spawnNow('swarm', player.x + 300, player.y);
    game.spawnNow('swarm', player.x + 400, player.y);
    const [source, nearby, distant] = state.enemies;
    for (const enemy of state.enemies) enemy.speed = 0;
    nearby.hp = 1000;
    distant.hp = 1000;
    const expectedBlast = source.maxHp * .3;
    game.damage(source, source.hp + 1, '#fff', 0, null, 'sword');
    game.update(.01);
    assert.ok(Math.abs(nearby.hp - (1000 - expectedBlast)) < 1e-9);
    assert.equal(distant.hp, 1000);
    assert.equal(run.damageBySource.volatile, expectedBlast);
    assert.equal(run.hp, 52);
    assert.equal(run.kills, 1);
  } finally { Math.random = originalRandom; }
});

test('all hero ultimates record damage separately from weapons', () => {
  const originalRandom = Math.random;
  Math.random = () => .1;
  try {
    for (const character of ['warrior', 'scout', 'mage', 'engineer']) {
      game.reset(character); game.state().run.weapons = [];
      game.startWave(); game.clearEnemies(); game.setInvulnerable(100); readyCooldowns(); target('tank', 55);
      const enemy = game.state().enemies[0]; enemy.speed = 0; enemy.hp = 100000;
      game.activateUltimate();
      for (let i = 0; i < 80; i++) game.update(.02);
      if (character === 'engineer') {
        assert.ok(game.state().engineerOverdrive > 0, character);
        assert.deepEqual(Object.keys(game.state().run.damageBySource), []);
      } else {
        assert.ok(game.state().run.damageBySource.ultimate > 0, character);
        assert.deepEqual(Object.keys(game.state().run.damageBySource), ['ultimate']);
      }
    }
  } finally { Math.random = originalRandom; }
});

test('weapon special attacks retain their damage source', () => {
  const originalRandom = Math.random;
  Math.random = () => .1;
  try {
    for (const id of ['fireball', 'lightning', 'boomerang', 'sniper', 'sword', 'spear', 'dagger', 'blade', 'mine', 'acid']) {
      setup([id]); game.setInvulnerable(100); game.state().cooldowns[1] = 100; target('tank', 55);
      const enemy = game.state().enemies[0]; enemy.speed = 0; enemy.hp = 100000;
      activateWeaponSkill(0);
      for (let i = 0; i < 80; i++) game.update(.02);
      assert.ok(game.state().run.damageBySource[id] > 0, id);
      assert.deepEqual(Object.keys(game.state().run.damageBySource), [id]);
    }
  } finally { Math.random = originalRandom; }
});

test('end screens show damage grouped by weapon, separate sources, and the final build', () => {
  const allText = element => [element.textContent || '', ...element.children.flatMap(allText)];
  for (const end of [game.victory, game.gameOver]) {
    setup(['sword', 'sword', 'pistol']);
    const run = game.state().run;
    run.damageBySource.sword = 125;
    run.damageBySource.fireball = 50;
    run.damageBySource.ultimate = 25;
    run.damageBySource.bomb = 10;
    run.damageBySource.heroSkill = 15;
    run.damageBySource.heroPassive = 8;
    run.damageBySource.strafe = 5;
    run.damageBySource.volatile = 3;
    run.damageBySource.scorchRounds = 2;
    run.damageBySource.futureSource = 1;
    end();
    const card = elements.get('#overlay').children[0];
    const text = allText(card).join(' ');
    assert.match(text, /DAMAGE DEALT/);
    assert.match(text, /Total: 244/);
    assert.match(text, /Sword/);
    assert.match(text, /Fireball/);
    assert.match(text, /Hero ultimate/);
    assert.match(text, /Loot bomb/);
    assert.match(text, new RegExp(HERO_SKILLS[run.character].name));
    assert.match(text, new RegExp(HERO_PASSIVES[run.character].name));
    assert.match(text, /Class Strafe/);
    assert.match(text, /Volatile Core/);
    assert.match(text, /Scorch Rounds/);
    assert.match(text, /Other \(futureSource\)/);
    assert.doesNotMatch(text, /undefined/);
    assert.match(text, /BASIC ATTACK/);
    const summary = card.children.find(child => child.className === 'damage-summary');
    const rows = summary.children.find(child => child.className === 'damage-list').children;
    assert.equal(rows.filter(row => row.children[0].textContent.includes('Sword')).length, 1);
    assert.ok(rows.some(row => row.children[0].textContent.includes('Pistol') && row.children[1].textContent === '0'));
  }
  setup(['pistol']); game.gameOver();
  assert.match(allText(elements.get('#overlay').children[0]).join(' '), /Total: 0/);
});

test('ending a paused run shows the full summary and preserves current health', () => {
  localRecords.clear();
  setup(['sword', 'pistol']);
  const run = game.state().run;
  run.wave = 4;
  run.kills = 12;
  run.hp = 53;
  run.damageBySource.sword = 125;

  game.togglePause();
  const pauseCard = elements.get('#overlay').children[0];
  const actions = pauseCard.children.find(child => child.className === 'pause-actions');
  assert.ok(actions);
  const pauseButtons = actions.children.filter(child => child.tagName === 'button');
  assert.deepEqual(pauseButtons.map(child => child.textContent), ['RESUME →', 'END THE RUN →']);
  pauseButtons[1].click();

  assert.equal(game.state().phase, 'gameover');
  assert.equal(run.hp, 53);
  const summary = elements.get('#overlay').children[0];
  const allText = element => [element.textContent || '', ...element.children.flatMap(allText)];
  const text = allText(summary).join(' ');
  assert.match(text, /RUN ENDED \/ WAVE 4/);
  assert.match(text, /You ended the run after defeating 12 enemies/);
  assert.match(text, /DAMAGE DEALT/);
  assert.ok(summary.children.some(child => child.className === 'damage-summary'));
  assert.ok(summary.children.some(child => child.className === 'build'));
  assert.equal(summary.children.at(-1).textContent, 'PLAY AGAIN →');
  assert.deepEqual(JSON.parse(localRecords.get('arena-survivors-records-v1')).mage, {
    bestWave: 4, maxKills: 12, cleared: false
  });
});

test('per-hero best wave and kill records persist, and cleared heroes get a gold portrait border', () => {
  localRecords.clear();
  game.reset('warrior'); game.state().run.wave = 4; game.state().run.kills = 17; game.gameOver();
  game.reset('warrior'); game.state().run.wave = 10; game.state().run.kills = 42; game.victory();
  game.reset('warrior'); game.state().run.wave = 2; game.state().run.kills = 30; game.gameOver();
  const records = JSON.parse(localRecords.get('arena-survivors-records-v1'));
  assert.deepEqual(records.warrior, { bestWave: 10, maxKills: 42, cleared: true });

  game.startScreen();
  const cards = elements.get('#overlay').children[0].children.find(child => typeof child.className === 'string' && child.className.startsWith('choices'));
  const hasText = (element, text) => element.textContent === text || element.children.some(child => hasText(child, text));
  const warrior = cards.children.find(choice => hasText(choice, 'Warrior'));
  const scout = cards.children.find(choice => hasText(choice, 'Scout'));
  assert.ok(warrior.classList.contains('character-cleared'));
  assert.ok(warrior.children.some(child => child.textContent === 'CLEARED'));
  assert.equal(scout.classList.contains('character-cleared'), false);
  assert.ok(warrior.children.some(child => child.textContent === 'BEST WAVE 10 · MAX KILLS 42'));
});

test('arena remains square and enemy spawns remain offscreen across viewport sizes', () => {
  const canvas = elements.get('#arena');
  try {
    for (const [width, height] of [[1000, 620], [1920, 500], [390, 844]]) {
      canvas.bounds = { width, height };
      game.resizeArena(); setup(['fireball']);
      const state = game.state(), baseWidth = width < 700 ? 700 : 1000;
      assert.equal(state.viewW, Math.round(baseWidth / 1.15));
      assert.equal(state.W, Math.round(baseWidth * Math.SQRT2));
      assert.equal(state.H, state.W);
      for (const [x, y] of [[state.W / 2, state.H / 2], [17, 17], [state.W - 17, state.H - 17]]) {
        state.player.x = x; state.player.y = y;
        game.clearEnemies();
        const offset = game.camera();
        for (let i = 0; i < 50; i++) {
          game.spawn(i % 2 ? 'boss' : 'swarm');
          const enemy = game.state().pendingSpawns.at(-1), radius = (enemy.type === 'boss' ? 39 : 11 * 1.2) * 1.3;
          assert.ok(enemy.x >= 0 && enemy.x <= state.W && enemy.y >= 0 && enemy.y <= state.H);
          const point = game.project(enemy.x, enemy.y);
          assert.ok(point.x + radius < offset.x || point.x - radius > offset.x + state.viewW || point.y + radius < offset.y || point.y - radius > offset.y + state.viewH, `${width}x${height}: enemy spawned on screen`);
        }
      }
      game.clearEnemies();
      game.spawn('swarm', 50, 60);
      assert.equal(game.state().pendingSpawns[0].x, 50);
      assert.equal(game.state().pendingSpawns[0].y, 60);
    }
  } finally { delete canvas.bounds; game.resizeArena(); }
});

test('ordinary enemies have larger aim and collision radii while boss and sapling sizes stay unchanged', () => {
  setup(['pistol']);
  for (const [type, base] of [['swarm', 11], ['chaser', 14], ['tank', 21], ['bull', 19], ['goblin', 14], ['boss', 39], ['sapling', 14]]) {
    game.clearEnemies(); game.spawnNow(type, 200, 200);
    const expected = ['boss', 'sapling'].includes(type) ? base : base * 1.2;
    assert.equal(game.state().enemies[0].radius, expected, type);
  }
});

test('isometric projection round-trips and movement follows screen directions', () => {
  setup(['pistol']);
  const point = game.unproject(...Object.values(game.project(123, 456)));
  assert.ok(Math.abs(point.x - 123) < 1e-9 && Math.abs(point.y - 456) < 1e-9);
  for (const [direction, axis, sign] of [['w', 'y', -1], ['s', 'y', 1], ['a', 'x', -1], ['d', 'x', 1]]) {
    game.keys.clear(); game.keys.add(direction);
    const vector = game.movementDirection(), screen = game.project(vector.x, vector.y);
    assert.ok(screen[axis] * sign > 0);
    assert.ok(Math.abs(screen[axis === 'x' ? 'y' : 'x']) < 1e-9);
    assert.ok(Math.abs(Math.hypot(vector.x, vector.y) - 1) < 1e-9);
  }
  game.keys.clear();
});

test('hero skills hit groups hard and keep distinct class effects', () => {
  for (const character of ['warrior', 'scout', 'mage', 'engineer']) {
    game.reset(character); game.startWave(); game.clearEnemies();
    readyCooldowns();
    const { player } = game.state();
    const offsets = character === 'scout' ? [-10, 0, 10] : [-24, 0, 24];
    for (const offset of offsets) {
      game.spawnNow('swarm', player.x + 140, player.y + offset);
      game.state().enemies.at(-1).speed = 0;
    }
    aimAt(player.x + 250, player.y);
    game.activateHeroSkill();
    const shot = game.state().shots[0];
    if (character === 'warrior') {
      assert.equal(shot, undefined);
      assert.ok(game.state().enemies.filter(enemy => enemy.hp > 0).length <= 1, 'Warrior cleave should clear nearby weak enemies');
    } else {
      assert.ok(shot, character + ' did not fire');
      assert.equal(shot.source, 'heroSkill');
      assert.ok(shot.vx > 0 && Math.abs(shot.vy) < 1e-8, character + ' ignored the mouse aim');
      if (character === 'scout') assert.ok(shot.damage >= 120 && shot.pierce >= 5 && shot.mark > 0 && shot.splash === 0);
      if (character === 'mage') assert.ok(shot.damage >= 100 && shot.splash >= 100 && shot.burn.chance === 1);
      if (character === 'engineer') assert.ok(shot.damage >= 100 && shot.splash >= 100 && shot.stun >= .7);
      game.update(character === 'scout' ? .067 : .15);
      assert.ok(game.state().run.damageBySource.heroSkill > 0, character + ' skill failed to hit the group');
    }
    assert.ok(game.state().shakeStrength > 0, character + ' cast should feel impactful');
    assert.ok(game.state().heroSkillCooldown > 0 && game.state().heroSkillCooldown <= HERO_SKILL_COOLDOWN);
    const shotsBeforeCooldownAttempt = game.state().shots.length;
    game.activateHeroSkill();
    assert.equal(game.state().shots.length, shotsBeforeCooldownAttempt, 'skill should respect its cooldown');
  }
});

test('Basic Attacks only fire into the mouse aim direction', () => {
  setup(['pistol']);
  const { player } = game.state();
  game.setPrimaryHeld(false);
  game.spawnNow('boss', player.x - 250, player.y); game.state().enemies[0].speed = 0;
  const boss = game.state().enemies[0];
  aimAt(player.x + 200, player.y);
  game.update(.02);
  assert.equal(game.state().shots.length, 0);
  aimAt(player.x + 500, player.y);
  assert.ok(Math.hypot(game.state().aimX - player.x, game.state().aimY - player.y) <= 500);
  assert.ok(Math.hypot(game.state().aimX - player.x, game.state().aimY - player.y) > 200);
  assert.ok(Math.hypot(game.autoAimPoint().x - player.x, game.autoAimPoint().y - player.y) <= 200);
  pointer(0, player.x + 200, player.y);
  assert.equal(game.state().primaryHeld, true);
  game.update(.02);
  assert.ok(game.state().shots.length > 0);
  assert.ok(game.state().shots[0].vx > 0, 'shot should travel toward the cursor, not snap to the boss');
  const bossHp = boss.hp;
  game.update(.5);
  assert.equal(boss.hp, bossHp, 'an aimed shot must be able to miss an off-axis enemy');
  const fired = game.state().shots.length;
  pointer(0, player.x + 200, player.y, 'pointerup');
  game.update(.02);
  assert.equal(game.state().primaryHeld, false);
  assert.equal(game.state().shots.length, fired);
});

test('standard gamepad moves, aims nearby, fires and uses the updated class-skill mapping', () => {
  setup(['pistol']);
  const gamepad = {
    connected: true,
    index: 0,
    axes: [1, 0, 1, 0],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }))
  };
  gamepad.buttons[7] = { pressed: true, value: 1 };
  game.processGamepad(gamepad);
  assert.equal(game.state().primaryHeld, true);
  assert.ok(game.movementDirection());
  assert.ok(game.state().aimX > game.state().player.x && game.state().aimY < game.state().player.y);
  assert.ok(Math.hypot(game.state().aimX - game.state().player.x, game.state().aimY - game.state().player.y) <= 850);
  assert.ok(Math.hypot(game.state().aimX - game.state().player.x, game.state().aimY - game.state().player.y) > 200);
  assert.ok(Math.hypot(game.autoAimPoint().x - game.state().player.x, game.autoAimPoint().y - game.state().player.y) <= 200.01);
  for (let frame = 0; frame < 60; frame++) game.processGamepad(gamepad, 1 / 60);
  assert.ok(Math.hypot(game.state().aimX - game.state().player.x, game.state().aimY - game.state().player.y) <= 850);
  assert.ok(Math.hypot(game.autoAimPoint().x - game.state().player.x, game.autoAimPoint().y - game.state().player.y) <= 200.01);
  game.update(1 / 60);
  assert.ok(game.state().shots.length > 0);
  const aimScreen = game.project(game.state().aimX, game.state().aimY), offset = game.camera();
  assert.ok(aimScreen.x >= offset.x && aimScreen.x <= offset.x + game.state().viewW);
  assert.ok(aimScreen.y >= offset.y && aimScreen.y <= offset.y + game.state().viewH);

  gamepad.buttons[7] = { pressed: false, value: 0 };
  gamepad.axes[2] = 0;
  game.update(1 / 60);
  assert.ok(Math.hypot(game.state().aimX - game.state().player.x, game.state().aimY - game.state().player.y) <= 850);
  gamepad.buttons[6] = { pressed: true, value: 1 };
  game.processGamepad(gamepad);
  assert.equal(game.state().previewSkill, 'right');
  gamepad.buttons[6] = { pressed: false, value: 0 };
  game.processGamepad(gamepad);
  assert.ok(game.state().heroSkillCooldown > 0);
  assert.equal(game.state().previewSkill, '');

  game.state().run.heroSkills.w = 1;
  for (const [button, preview, cooldown] of [[4, 'q', 'secondarySkillCooldown'], [0, 'ultimate', 'ultimateCooldown']]) {
    gamepad.buttons[button] = { pressed: true, value: 1 };
    game.processGamepad(gamepad);
    assert.equal(game.state().previewSkill, preview);
    gamepad.buttons[button] = { pressed: false, value: 0 };
    game.processGamepad(gamepad);
    assert.equal(game.state().previewSkill, '');
    assert.ok(game.state()[cooldown], preview + ' should cast on release');
  }
  gamepad.buttons[2] = { pressed: true, value: 1 };
  game.processGamepad(gamepad);
  assert.equal(game.state().previewSkill, '', 'X/Square no longer has a class-skill binding');
  gamepad.buttons[2] = { pressed: false, value: 0 };
  game.processGamepad(gamepad);
  gamepad.buttons[1] = { pressed: true, value: 1 };
  game.processGamepad(gamepad);
  assert.ok(game.state().evadeCooldown > 0, 'B/Circle should evade');
  gamepad.buttons[1] = { pressed: false, value: 0 };
  game.processGamepad(gamepad);
  gamepad.axes[0] = gamepad.axes[2] = 0;
  game.processGamepad(gamepad);
});

test('gamepad reticle eases toward the right-stick direction while adjusting its distance', () => {
  setup(['pistol']);
  const gamepad = {
    connected: true,
    index: 0,
    axes: [0, 0, 1, 0],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }))
  };
  game.processGamepad(gamepad, 1 / 60);
  const { player } = game.state();
  const desired = game.unproject(1, 0), desiredLength = Math.hypot(desired.x, desired.y);
  let dx = game.state().aimX - player.x, dy = game.state().aimY - player.y;
  let dot = (dx * desired.x + dy * desired.y) / (Math.hypot(dx, dy) * desiredLength);
  assert.ok(dot < .99, 'first reticle movement should ease instead of snapping');
  assert.ok(Math.hypot(dx, dy) <= 850);
  assert.ok(Math.hypot(dx, dy) > 200, 'full stick pressure should preserve long-range skill aiming');
  assert.ok(Math.hypot(game.autoAimPoint().x - player.x, game.autoAimPoint().y - player.y) <= 200.01);
  for (let frame = 0; frame < 60; frame++) game.processGamepad(gamepad, 1 / 60);
  dx = game.state().aimX - player.x; dy = game.state().aimY - player.y;
  dot = (dx * desired.x + dy * desired.y) / (Math.hypot(dx, dy) * desiredLength);
  assert.ok(dot > .999, 'reticle should settle at the indicated direction');
  assert.ok(Math.hypot(dx, dy) <= 850);
  assert.ok(Math.hypot(game.autoAimPoint().x - player.x, game.autoAimPoint().y - player.y) <= 200.01);
  gamepad.axes[2] = .21;
  for (let frame = 0; frame < 60; frame++) game.processGamepad(gamepad, 1 / 60);
  dx = game.state().aimX - player.x; dy = game.state().aimY - player.y;
  assert.ok(Math.hypot(dx, dy) < 90, 'light stick pressure should put the reticle close to the hero');
  assert.ok(Math.hypot(game.autoAimPoint().x - player.x, game.autoAimPoint().y - player.y) <= 200.01);
});

test('mouse aiming hides the gamepad-only Basic Attack cursor', () => {
  setup(['pistol']);
  const gamepad = {
    connected: true,
    index: 0,
    axes: [0, 0, 1, 0],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }))
  };
  game.processGamepad(gamepad);
  assert.equal(game.state().gamepadAiming, true);
  const { player } = game.state();
  aimAt(player.x + 120, player.y);
  assert.equal(game.state().lastInputMode, 'keyboard');
  assert.equal(game.state().gamepadAiming, false);
});

test('standard gamepad d-pad navigates hero selection and A confirms', () => {
  key('z');
  game.startScreen();
  globalThis.document.activeElement = null;
  const gamepad = {
    connected: true,
    index: 0,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }))
  };
  game.processGamepad(gamepad);
  gamepad.buttons[15] = { pressed: true, value: 1 };
  game.processGamepad(gamepad);
  const hint = elements.get('#overlay').children[0].children.find(child => child.className === 'input-hint');
  assert.equal(hint.children[0].textContent, 'D-PAD / A');
  gamepad.buttons[15] = { pressed: false, value: 0 };
  game.processGamepad(gamepad);
  gamepad.buttons[15] = { pressed: true, value: 1 };
  game.processGamepad(gamepad);
  const activeText = element => [element.textContent || '', ...element.children.flatMap(activeText)].join(' ');
  assert.match(activeText(globalThis.document.activeElement), /Scout/);
  gamepad.buttons[15] = { pressed: false, value: 0 };
  game.processGamepad(gamepad);
  gamepad.buttons[0] = { pressed: true, value: 1 };
  game.processGamepad(gamepad);
  assert.equal(game.state().run.character, 'scout');
  assert.equal(game.state().phase, 'battle');
  assert.equal(game.state().ultimateCooldown, ULTIMATE_COOLDOWN);
  assert.equal(game.state().shots.length, 0, 'the menu-confirm button must not fire the ultimate');
  gamepad.buttons[0] = { pressed: false, value: 0 };
  game.processGamepad(gamepad);
});

test('gamepad menus skip informational skill tiles and confirm menu actions', () => {
  game.reset('mage'); game.startWave(); game.gameOver();
  globalThis.document.activeElement = null;
  const gamepad = {
    connected: true,
    index: 0,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }))
  };
  game.processGamepad(gamepad);
  gamepad.buttons[13] = { pressed: true, value: 1 };
  game.processGamepad(gamepad);
  assert.notEqual(globalThis.document.activeElement.className, 'skill-tile');

  gamepad.buttons[13] = { pressed: false, value: 0 };
  game.processGamepad(gamepad);
  gamepad.buttons[0] = { pressed: true, value: 1 };
  game.processGamepad(gamepad);
  assert.equal(game.state().phase, 'start');
});

test('shop shows current HP and compact core stats without the full build panel', () => {
  setup(['pistol']);
  const run = game.state().run;
  run.hp = 37; run.maxHp = 120; run.gold = 100;
  run.stats.armor = 12; run.stats.damage = 10; run.stats.spell = 20;
  run.stats.attackSpeed = 15; run.stats.lifeLeech = 5;
  game.openShop();
  const shopPanel = elements.get('#overlay').children[0];
  const statsPanel = shopPanel.children.find(child => child.className === 'shop-stats');
  const text = element => [element.textContent || '', ...element.children.map(text)].join(' ');
  assert.ok(statsPanel);
  assert.match(text(statsPanel), /HP 37 \/ 120/);
  for (const label of ['ARMOR', 'ALL DAMAGE', 'SPELL DAMAGE', 'ATTACK SPEED', 'LIFE STEAL']) assert.match(text(statsPanel), new RegExp(label));
  assert.equal(shopPanel.children.some(child => child.className === 'build'), false);

  const heal = shopPanel.querySelectorAll('button').find(control => control.dataset.shopFocus === 'heal');
  assert.equal(heal.disabled, false);
  heal.click();
  assert.equal(run.hp, 67, 'healing action should match the visible current-HP value');
  assert.match(text(elements.get('#overlay').children[0].children.find(child => child.className === 'shop-stats')), /HP 67 \/ 120/);
});

test('gamepad shop focus stays on the action after locking and buying offers', () => {
  setup(['pistol']);
  game.state().run.gold = 10000;
  game.openShop();
  const shopPanel = elements.get('#overlay').children[0];
  assert.equal(shopPanel.children.some(child => child.className === 'build'), false, 'shop should not include the full build and skill descriptions');
  const gamepad = {
    connected: true,
    index: 0,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }))
  };
  game.processGamepad(gamepad);
  gamepad.buttons[15] = { pressed: true, value: 1 };
  game.processGamepad(gamepad);
  gamepad.buttons[15] = { pressed: false, value: 0 };
  game.processGamepad(gamepad);
  gamepad.buttons[0] = { pressed: true, value: 1 };
  game.processGamepad(gamepad);
  assert.equal(globalThis.document.activeElement.dataset.shopFocus, 'lock:0');
  gamepad.buttons[0] = { pressed: false, value: 0 };
  game.processGamepad(gamepad);
  gamepad.buttons[15] = { pressed: true, value: 1 };
  game.processGamepad(gamepad);
  gamepad.buttons[15] = { pressed: false, value: 0 };
  game.processGamepad(gamepad);
  assert.equal(globalThis.document.activeElement.dataset.shopFocus, 'offer:1');
  gamepad.buttons[0] = { pressed: true, value: 1 };
  game.processGamepad(gamepad);
  assert.notEqual(globalThis.document.activeElement.dataset.shopFocus, 'offer:0');
  assert.ok(globalThis.document.activeElement.dataset.shopFocus, 'focus should remain on a shop action after a purchase');
});

test('audio settings adjust music and effects separately and mute all together', () => {
  const audioButton = elements.get('#audio'), audioMenu = elements.get('#audio-menu');
  const music = elements.get('#music-volume'), sfx = elements.get('#sfx-volume');
  const muteAll = elements.get('#audio-mute-all');
  try {
    setMusicVolume(1); setSfxVolume(1); setAudioEnabled(true);
    audioButton.click();
    assert.equal(audioMenu.hidden, false);
    assert.equal(music.value, '100');
    assert.equal(sfx.value, '100');
    music.value = '37'; music.listeners.input[0]({ target: music });
    sfx.value = '64'; sfx.listeners.input[0]({ target: sfx });
    assert.equal(getMusicVolume(), .37);
    assert.equal(getSfxVolume(), .64);
    assert.equal(elements.get('#music-volume-value').textContent, '37%');
    assert.equal(elements.get('#sfx-volume-value').textContent, '64%');
    muteAll.click();
    assert.equal(isAudioEnabled(), false);
    assert.equal(muteAll.textContent, 'UNMUTE ALL');
    muteAll.click();
    assert.equal(isAudioEnabled(), true);
    elements.get('#audio-close').click();
    assert.equal(audioMenu.hidden, true);
  } finally {
    setMusicVolume(1); setSfxVolume(1); setAudioEnabled(true);
    globalThis.document.activeElement = null;
  }
});

test('battle mouse controls suppress browser defaults and context menus', () => {
  setup([]);
  let pointerDefaultPrevented = false, contextMenuPrevented = false;
  for (const listener of elements.get('#arena').listeners.pointerdown) {
    listener({
      button: 0, pointerId: 1, clientX: 100, clientY: 100,
      preventDefault() { pointerDefaultPrevented = true; }
    });
  }
  for (const listener of elements.get('.arena-frame').listeners.contextmenu) {
    listener({ preventDefault() { contextMenuPrevented = true; } });
  }
  assert.equal(pointerDefaultPrevented, true);
  assert.equal(contextMenuPrevented, true);
});

test('three active skill controls switch between keyboard and gamepad bindings', () => {
  game.reset('mage');
  game.state().run.heroSkills.w = 1;
  key('z');
  game.startWave();
  for (const [selector, label] of [['#attack-control', 'LMB'], ['#hero-skill', 'RMB'], ['#hero-skill-w', 'Q'], ['#ultimate', 'R'], ['#evade', 'SPACE']]) {
    assert.equal(elements.get(selector).children[0].textContent, label, selector);
  }
  assert.equal(elements.get('#attack-control').children[1].textContent, 'Basic Attack');
  assert.match(elements.get('#attack-control').title, /hold for Basic Attack/);
  const gamepad = {
    connected: true,
    index: 0,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }))
  };
  gamepad.buttons[7] = { pressed: true, value: 1 };
  game.processGamepad(gamepad);
  assert.equal(game.state().lastInputMode, 'gamepad');
  for (const [selector, label] of [['#attack-control', 'RT / R2'], ['#hero-skill', 'LT / L2'], ['#hero-skill-w', 'LB / L1'], ['#ultimate', 'A / ×'], ['#evade', 'B / ○']]) {
    assert.equal(elements.get(selector).children[0].textContent, label, selector);
  }
  assert.match(elements.get('#attack-control').title, /^RT \/ R2: hold for Basic Attack/);
  key('z');
  assert.equal(game.state().lastInputMode, 'keyboard');
  assert.equal(elements.get('#attack-control').children[0].textContent, 'LMB');
  assert.equal(elements.get('#ultimate').querySelector('.ability-status').textContent, ULTIMATE_COOLDOWN.toFixed(1) + 's');
  assert.equal(elements.get('#hero-skill').querySelector('.ability-status').textContent, HERO_SKILL_COOLDOWN.toFixed(1) + 's');
});

test('ability HUD uses clear class-specific icon images and keeps image paths local', async () => {
  for (const [character, skillImage, secondaryImage, ultimateImage, passiveImage, categoryImage] of [
    ['warrior', 'sword-cleave.png', 'whirlwind.png', 'explosion.png', 'sword-cleave.png', 'sword-cleave.png'],
    ['scout', 'blue-bolt.png', 'burst-volley.png', 'arrow-volley.png', 'arrow-volley.png', 'arrow-volley.png'],
    ['mage', 'fireball.png', 'arcane-strike.png', 'fireball.png', 'skull.png', 'fireball.png'],
    ['engineer', 'explosion.png', 'explosion.png', 'green-surge.png', 'arcane-strike.png', 'explosion.png']
  ]) {
    game.reset(character);
    game.startWave();
    assert.equal(elements.get('#attack-control').querySelector('.ability-icon').src, 'assets/skill-icons/' + categoryImage);
    assert.equal(elements.get('#hero-skill').querySelector('.ability-icon').src, 'assets/skill-icons/' + skillImage);
    assert.equal(elements.get('#hero-skill-w').querySelector('.ability-icon').src, 'assets/skill-icons/' + secondaryImage);
    assert.equal(elements.get('#ultimate').querySelector('.ability-icon').src, 'assets/skill-icons/' + ultimateImage);
    assert.equal(elements.get('#hero-passive-control').querySelector('.ability-icon').src, 'assets/skill-icons/' + passiveImage);
    assert.equal(elements.get('#evade').querySelector('.ability-icon').src, 'assets/skill-icons/green-surge.png');
    for (const selector of ['#attack-control', '#hero-skill', '#hero-skill-w', '#ultimate', '#evade', '#hero-passive-control']) {
      await readFile(new URL(elements.get(selector).querySelector('.ability-icon').src, import.meta.url));
    }
  }
});

test('shop skill icons reveal descriptions and damage from the last wave', () => {
  setup(['fireball']);
  const { run } = game.state();
  run.damageBySource.heroSkill = 80;
  run.damageBySource.heroSecondarySkill = 25;
  run.damageBySource.heroPassive = 12;
  run.damageBySource.ultimate = 140;
  game.endWave();

  assert.deepEqual(game.state().lastWaveDamageBySource, {
    heroSkill: 80, heroSecondarySkill: 25, heroPassive: 12, ultimate: 140
  });
  const tiles = elements.get('#overlay').querySelectorAll('button:not(:disabled)').filter(element => element.className === 'skill-tile');
  assert.equal(tiles.length, 4);
  assert.ok(tiles.some(tile => tile.title.includes('Arcane Comet') && tile.title.includes('Last wave: 80 damage.')));
  assert.ok(tiles.some(tile => tile.title.includes('Firewall') && tile.title.includes('Last wave: 25 damage.')));
  assert.ok(tiles.some(tile => tile.title.includes('Cinderburst') && tile.title.includes('Last wave: 12 damage.')));

  run.wave++;
  game.startWave();
  run.damageBySource.heroSkill += 15;
  game.endWave();
  assert.equal(game.state().lastWaveDamageBySource.heroSkill, 15);
});

test('the locked Q slot stays visible while passives do not add active controls', () => {
  game.reset('mage');
  key('z');
  game.startWave();
  const control = elements.get('#hero-skill-w');
  assert.equal(control.hidden, false, 'Q should preserve its gamepad position');
  assert.equal(control.disabled, true, 'Q should not activate before unlock');
  assert.equal(control.querySelector('.ability-status').textContent, 'LVL 3');
  assert.equal(game.state().run.heroPassiveLevel, 0);
  game.state().run.heroSkills.w = 1;
  game.update(0.016);
  assert.equal(control.disabled, false);
  game.state().run.level = HERO_PASSIVES.mage.unlockLevel;
  game.state().run.heroPassiveLevel = 1;
  game.update(0.016);
  assert.equal(elements.get('#hero-skill-w').disabled, false, 'passive rank should not alter the active controls');
});

test('all abilities start cooling down, and Basic Attack shows its live cooldown', () => {
  game.reset('scout'); game.startWave(); game.clearEnemies();
  const state = game.state();
  assert.equal(state.evadeCooldown, 5);
  assert.equal(state.heroSkillCooldown, HERO_SKILL_COOLDOWN);
  assert.equal(state.secondarySkillCooldown, HERO_SECONDARY_SKILLS.scout.cooldown);
  assert.equal(state.ultimateCooldown, ULTIMATE_COOLDOWN);
  assert.equal(state.abilityCooldowns[state.run.weapons[0].uid], ACTIVE_SKILLS.pistol.cooldown);

  readyCooldowns(); game.setPrimaryHeld(true); game.update(1 / 60);
  const status = elements.get('#attack-control').querySelector('.ability-status');
  assert.match(status.textContent, /^\d+\.\ds$/);
  game.setPrimaryHeld(false); game.update(.7);
  assert.equal(status.textContent, 'READY');
});

test('sword swings show their aimed area and mark the enemies actually hit', () => {
  setup(['sword']);
  const { player } = game.state();
  game.spawnNow('swarm', player.x + 80, player.y);
  const hit = game.state().enemies.at(-1);
  game.spawnNow('swarm', player.x + 50, player.y + 105);
  const miss = game.state().enemies.at(-1);
  hit.speed = miss.speed = 0;
  game.fireWeapons(1 / 60);
  assert.ok(game.state().effects.some(effect => effect.kind === 'arc' && effect.angle === 0));
  assert.ok(game.state().effects.some(effect => effect.kind === 'hit' && effect.x === hit.x && effect.y === hit.y));
  assert.equal(game.state().effects.some(effect => effect.kind === 'hit' && effect.x === miss.x && effect.y === miss.y), false);
});

test('Basic Attack Mastery strengthens the live projectile', () => {
  const shotDamage = level => {
    game.reset('scout');
    game.state().run.items.autoMastery = level;
    game.startWave(); game.clearEnemies(); target('boss', 250);
    game.fireWeapons(1 / 60);
    return game.state().shots[0].damage;
  };
  assert.ok(shotDamage(4) > shotDamage(0) * 1.6);
});

test('Basic Attack Mastery adds multi-hit attacks except to the Engineer turret', () => {
  for (const [character, weapon] of Object.entries({ warrior: 'sword', scout: 'pistol', mage: 'fireball', engineer: 'turret' })) {
    game.reset(character);
    game.state().run.items.autoMastery = 6;
    game.startWave(); game.clearEnemies(); target('boss', 75);
    game.fireWeapons(1 / 60);
    if (weapon === 'sword') {
      assert.equal(game.state().effects.filter(effect => effect.kind === 'arc').length, 3, character);
    } else if (weapon === 'turret') {
      assert.equal(game.state().shots.length, 1, character);
    } else {
      assert.equal(game.state().shots.length, 3, character);
    }
  }
});

test('Engineer turret damage scales with its weapon level, not Basic Attack Mastery', () => {
  const fire = (mastery, weaponLevel) => {
    game.reset('engineer');
    game.state().run.items.autoMastery = mastery;
    game.state().run.weapons[0].level = weaponLevel;
    game.startWave(); game.clearEnemies(); target('boss', 75);
    game.fireWeapons(1 / 60, false);
    return { damage: game.state().shots[0].damage, count: game.state().shots.length };
  };
  const base = fire(0, 1), mastered = fire(6, 1), upgraded = fire(0, 3);
  assert.deepEqual(mastered, base);
  assert.equal(base.count, 1);
  assert.ok(upgraded.damage > base.damage);
});

test('Basic Attack Mastery increases the firing rate of basic attacks', () => {
  const remainingCooldown = mastery => {
    setup(['pistol']); game.state().run.items.autoMastery = mastery;
    game.setPrimaryHeld(false); game.state().cooldowns[1] = .6;
    game.fireWeapons(.2, false);
    return game.state().cooldowns[1];
  };
  assert.ok(remainingCooldown(5) < remainingCooldown(0));
});

test('Basic Attack Mastery scales fireball and acid status damage', () => {
  for (const id of ['fireball', 'acid']) {
    const statusDamage = level => {
      setup([id]); game.state().run.items.autoMastery = level; target('boss', 250);
      game.fireWeapons(1 / 60);
      const shot = game.state().shots[0];
      return { direct: shot.damage, status: (shot.burn || shot.acid).damage };
    };
    const base = statusDamage(0), mastered = statusDamage(2);
    assert.ok(mastered.direct > base.direct);
    assert.ok(Math.abs(mastered.status / base.status - 1.4) < 1e-9, id);
  }
});

test('secondary class skills unlock at level three and have distinct effects', () => {
  for (const character of Object.keys(HERO_SECONDARY_SKILLS)) {
    game.reset(character);
    game.state().run.level = HERO_SECONDARY_SKILLS[character].unlockLevel;
    game.state().run.heroSkills.w = 1;
    game.startWave(); game.clearEnemies();
    readyCooldowns();
    const { player } = game.state();
    aimAt(player.x + 120, player.y);
    target('boss', 120);
    game.state().enemies[0].speed = 0;
    if (character === 'engineer') aimAt(player.x + 280, player.y);
    const startX = player.x;
    game.activateSecondarySkill();
    const state = game.state();
    assert.equal(state.secondarySkillCooldown, HERO_SECONDARY_SKILLS[character].cooldown);
    if (character === 'warrior') {
      assert.ok(state.player.x > startX, 'Warrior should charge in the aimed direction');
      assert.ok(state.run.damageBySource.heroSecondarySkill > 0, 'Charge should hit enemies in its path');
    } else if (character === 'mage') {
      assert.equal(state.flameWalls.length, 1);
      assert.ok(state.flameWalls[0].life > 0);
      const wall = state.flameWalls[0];
      game.spawnNow('tank', wall.x, wall.y); game.state().enemies.at(-1).speed = 0;
      game.update(.02);
      assert.ok(game.state().enemies.at(-1).burn?.remaining > 0, 'Firewall should ignite enemies that cross it');
    } else if (character === 'engineer') {
      assert.equal(state.placedTurrets.length, 1);
      assert.equal(state.placedTurrets[0].source, 'heroSecondarySkill');
      assert.equal(state.placedTurrets[0].life, Infinity);
      assert.equal(state.run.damageBySource.heroSecondarySkill || 0, 0, 'Sentry placement should not also cause a blast');
      game.update(.02);
      assert.ok(game.state().shots.some(shot => shot.source === 'heroSecondarySkill'), 'Sentry should fire without player attacks');
      game.setInvulnerable(100);
      game.update(7);
      game.activateSecondarySkill();
      assert.equal(game.state().placedTurrets.length, 2, 'Sentries should stack and persist through the wave');
    } else if (character === 'scout') {
      assert.equal(state.shots.length, 3, 'Pinning Volley should fan out three shots');
      assert.ok(state.shots.every(shot => shot.source === 'heroSecondarySkill' && shot.stun > 0 && shot.mark > 0));
      game.update(.067);
      assert.ok(game.state().run.damageBySource.heroSecondarySkill > 0);
      assert.ok(game.state().enemies[0].marked > 0);
    } else {
      game.update(.067);
      assert.ok(game.state().run.damageBySource.heroSecondarySkill > 0);
      assert.ok(game.state().enemies[0].marked > 0);
    }
  }
});

test('right-click, Q and R show held previews and cast on release', () => {
  setup(['fireball']);
  const press = value => {
    const event = { key: value, code: '', repeat: false, preventDefault() {} };
    for (const listener of documentListeners.keydown) listener(event);
    return event;
  };
  const release = event => {
    for (const listener of documentListeners.keyup) listener(event);
  };
  game.state().primaryHeld = false;
  const { player } = game.state();
  pointer(2, player.x + 200, player.y);
  assert.equal(game.state().previewSkill, 'right');
  pointer(2, player.x + 200, player.y, 'pointerup');
  assert.equal(game.state().previewSkill, '');
  assert.ok(game.state().heroSkillCooldown > 0);

  game.state().run.level = 3; game.state().run.heroSkills.w = 1;
  const q = press('q');
  assert.equal(game.state().previewSkill, 'q');
  release(q);
  assert.equal(game.state().previewSkill, '');
  assert.ok(game.state().secondarySkillCooldown > 0);

  const passiveLevel = game.state().run.heroPassiveLevel;
  const e = press('e');
  assert.equal(game.state().previewSkill, '');
  release(e);
  assert.equal(game.state().run.heroPassiveLevel, passiveLevel, 'E is not an active skill binding');
  const r = press('r');
  assert.equal(game.state().previewSkill, 'ultimate');
  release(r);
  assert.equal(game.state().previewSkill, '');
  assert.equal(game.state().ultimateCooldown, ULTIMATE_COOLDOWN);
});

test('Warrior bleed and Scout piercing passives do not grant Engineer a passive ricochet', () => {
  const originalRandom = Math.random;
  try {
    Math.random = () => 0;
    game.reset('warrior'); game.state().run.heroPassiveLevel = 1; game.startWave(); game.clearEnemies();
    target('boss', 100);
    const warriorTarget = game.state().enemies[0]; warriorTarget.speed = 0;
    game.damage(warriorTarget, 100, '#fff', 0, null, 'sword');
    assert.equal(warriorTarget.bleed.source, 'heroPassive');
    assert.ok(warriorTarget.bleed.damage > 0);

    game.reset('scout'); game.state().run.heroPassiveLevel = 1; game.startWave(); game.clearEnemies();
    game.projectile(game.state().player.x, game.state().player.y, { x: 1000, y: 1000 }, { visual: 'pistol', source: 'pistol', pierce: 1 });
    assert.equal(game.state().shots[0].pierce, 2);
    assert.equal(game.state().shots[0].ricochets, 1);

    game.reset('engineer'); game.state().run.heroPassiveLevel = 3; game.startWave(); game.clearEnemies();
    game.projectile(game.state().player.x, game.state().player.y, { x: 1000, y: 1000 }, { visual: 'turret', source: 'turret' });
    assert.equal(game.state().shots[0].ricochets, 0);
  } finally { Math.random = originalRandom; }
});

test('Mage Cinderburst chains explosions from burned enemy deaths', () => {
  setup(['fireball']); game.setPrimaryHeld(false);
  game.state().run.heroPassiveLevel = 1;
  const { player } = game.state();
  const burningEnemy = (distance, hp) => {
    game.spawnNow('swarm', player.x + distance, player.y);
    const enemy = game.state().enemies.at(-1);
    enemy.speed = 0; enemy.hp = hp;
    enemy.burn = { damage: 1, remaining: 3, tick: .5, source: 'fireball' };
    return enemy;
  };
  const first = burningEnemy(100, 1);
  const second = burningEnemy(175, 20);
  const third = burningEnemy(250, 100);
  game.damage(first, 10, '#fff', 0, null, 'fireball');
  game.update(.01);
  assert.ok(second.hp <= 0, 'the first blast should kill a nearby burning enemy');
  assert.ok(third.hp < 100, 'the second burning death should continue the chain');
  assert.ok(game.state().run.damageBySource.heroPassive > 0);
});

test('Mage Cinderburst does not trigger on an unburned death', () => {
  setup(['fireball']); game.setPrimaryHeld(false);
  game.state().run.heroPassiveLevel = 1;
  const { player } = game.state();
  game.spawnNow('swarm', player.x + 100, player.y);
  const dead = game.state().enemies.at(-1); dead.speed = 0; dead.hp = 1;
  game.spawnNow('swarm', player.x + 125, player.y);
  const nearby = game.state().enemies.at(-1); nearby.speed = 0;
  const hp = nearby.hp;
  game.damage(dead, 10, '#fff', 0, null, 'fireball');
  game.update(.01);
  assert.equal(nearby.hp, hp);
  assert.equal(game.state().run.damageBySource.heroPassive, undefined);
});

test('Mage Cinderburst also triggers when burn damage itself kills', () => {
  setup(['fireball']); game.setPrimaryHeld(false);
  game.state().run.heroPassiveLevel = 1;
  const { player } = game.state();
  game.spawnNow('swarm', player.x + 100, player.y);
  const dead = game.state().enemies.at(-1); dead.speed = 0; dead.hp = 1;
  dead.burn = { damage: 2, remaining: 1, tick: .5, source: 'fireball' };
  game.spawnNow('swarm', player.x + 125, player.y);
  const nearby = game.state().enemies.at(-1); nearby.speed = 0;
  const hp = nearby.hp;
  game.update(.5);
  assert.ok(dead.hp <= 0);
  assert.ok(nearby.hp < hp);
});

test('Warrior sword gains range and speed with levels and adds side strikes at level three', () => {
  const swing = level => {
    game.reset('warrior'); game.state().run.weapons[0].level = level;
    game.startWave(); game.clearEnemies(); readyCooldowns();
    const { player } = game.state();
    aimAt(player.x + 200, player.y);
    const angle = Math.PI * 80 / 180;
    game.spawnNow('swarm', player.x + Math.cos(angle) * 80, player.y + Math.sin(angle) * 80);
    const sideEnemy = game.state().enemies.at(-1); sideEnemy.speed = 0;
    game.fireWeapons(1 / 60);
    return {
      arcs: game.state().effects.filter(effect => effect.kind === 'arc'),
      cooldown: game.state().cooldowns[1],
      sideEnemyHp: sideEnemy.hp,
      sideEnemyMaxHp: sideEnemy.maxHp
    };
  };
  const levelOne = swing(1), levelThree = swing(3);
  assert.equal(levelOne.arcs.length, 1);
  assert.equal(levelThree.arcs.length, 3);
  assert.ok(levelThree.arcs[0].radius > levelOne.arcs[0].radius);
  assert.ok(levelThree.cooldown < levelOne.cooldown);
  assert.equal(levelOne.sideEnemyHp, levelOne.sideEnemyMaxHp);
  assert.ok(levelThree.sideEnemyHp < levelThree.sideEnemyMaxHp, 'the side strike should deal damage');
});

test('Scout Deadeye Bolt pierces a wider off-center enemy line', () => {
  const originalRandom = Math.random;
  Math.random = () => .99;
  try {
    for (const [character, skill] of [['scout', 'hero']]) {
      game.reset(character);
      game.startWave(); game.clearEnemies(); readyCooldowns();
      const { player } = game.state();
      for (let i = 0; i < 6; i++) {
        game.spawnNow('swarm', player.x + 70 + i * 55, player.y + (i % 2 ? 26 : -26));
        game.state().enemies.at(-1).speed = 0;
      }
      aimAt(player.x + 1200, player.y);
      game.activateHeroSkill();
      const shot = game.state().shots[0];
      assert.ok(shot.radius >= 17, `${character} ${skill} bolt should have a forgiving hitbox`);
      assert.ok(shot.pierce >= 7, `${character} ${skill} bolt should pierce the line`);
      for (let frame = 0; frame < 20; frame++) game.update(1 / 60);
      const state = game.state();
      assert.equal(state.run.kills, 6, `${character} ${skill} missed part of the line: ${state.enemies.map((enemy, index) => enemy.hp > 0 ? `${index}@${Math.round(enemy.x)},${Math.round(enemy.y)}` : '').filter(Boolean).join(' ')}`);
    }
  } finally { Math.random = originalRandom; game.keys.clear(); }
});

test('level-ups heal, increase max health and damage, and show a visible level-up effect', () => {
  setup(['fireball']); game.state().run.hp = 70;
  const { player } = game.state();
  game.state().drops.push({ x: player.x, y: player.y, xp: 16, gold: 0 });
  game.update(.02);
  const run = game.state().run;
  assert.equal(run.level, 2);
  assert.equal(run.maxHp, 104);
  assert.equal(run.hp, 74);
  assert.equal(run.stats.damage, 17);
  assert.ok(game.state().levelUpTimer > 0);
  const labels = [], original = context.fillText;
  context.fillText = text => labels.push(text);
  try { game.draw(); } finally { context.fillText = original; }
  assert.ok(labels.includes('LEVEL UP!'));
});

test('default pickup radius pulls drops in from farther away', () => {
  setup(['pistol']);
  const { player, drops } = game.state();
  const inside = { x: player.x + 55, y: player.y, xp: 1, gold: 0 };
  const outside = { x: player.x + 61, y: player.y, xp: 1, gold: 0 };
  drops.push(inside, outside);
  game.update(1 / 60);
  assert.ok(inside.x < player.x + 55);
  assert.equal(outside.x, player.x + 61);
});

test('strafe item transforms Evade into a different signature move for every hero', () => {
  game.reset('mage'); game.startWave(); game.clearEnemies(); readyCooldowns();
  let state = game.state(), start = { x: state.player.x, y: state.player.y };
  state.run.items.strafe = 1; game.evade();
  assert.ok(Math.hypot(state.player.x - start.x, state.player.y - start.y) > 180);
  assert.ok(state.effects.some(effect => effect.color === '#b7edff'));
  assert.ok(state.run.damageBySource.strafe === undefined);

  game.reset('warrior'); game.startWave(); game.clearEnemies(); readyCooldowns(); target('tank', 210);
  game.state().enemies[0].speed = 0; game.state().run.items.strafe = 1; game.evade(); game.update(.2);
  assert.ok(game.state().run.damageBySource.strafe > 0, 'Warrior leap should strike on landing');

  game.reset('scout'); game.startWave(); game.clearEnemies(); readyCooldowns(); game.state().run.items.strafe = 1;
  game.evade();
  assert.equal(game.state().mines[0].source, 'strafe', 'Scout should leave a trap behind');

  game.reset('engineer'); game.startWave(); game.clearEnemies(); readyCooldowns(); game.state().run.items.strafe = 1;
  game.evade();
  assert.equal(game.state().temporaryTurrets.length, 1, 'Engineer should leave a temporary sentry');
  target('tank', 75); game.state().enemies[0].speed = 0; game.update(.6);
  assert.ok(game.state().shots.some(shot => shot.source === 'strafe'));
});

test('movement is 15 percent faster and player projectiles are 50 percent faster again', () => {
  setup(['pistol']);
  const { player } = game.state(), start = { x: player.x, y: player.y };
  game.keys.add('d'); game.update(.1);
  assert.ok(Math.abs(Math.hypot(player.x - start.x, player.y - start.y) - 185 * 1.15 * .1) < 1e-8);
  game.keys.clear();
  game.projectile(player.x, player.y, { x: player.x + 1, y: player.y }, { speed: 320 });
  assert.ok(Math.abs(Math.hypot(game.state().shots.at(-1).vx, game.state().shots.at(-1).vy) - 672) < 1e-9);
  game.setPrimaryHeld(false);
  game.spawnNow('ranged', player.x + 300, player.y);
  const enemy = game.state().enemies[0]; enemy.speed = 0; enemy.cooldown = 0;
  game.update(.02);
  assert.ok(Math.abs(Math.hypot(game.state().hostileShots[0].vx, game.state().hostileShots[0].vy) - 245) < 1e-9);
});

test('enemy and summoned spawns show a visible warning for 800ms and pause with the game', () => {
  setup(['pistol']);
  const { player } = game.state();
  game.state().cooldowns[1] = 100;
  game.spawn('boss', player.x + 800, player.y);
  game.spawn('swarm', player.x + 80, player.y);
  assert.equal(game.state().enemies.length, 0);
  assert.equal(game.state().pendingSpawns.length, 2);
  const warnings = [], original = context.fillText;
  context.fillText = (text, x, y) => { if (text === '!') warnings.push({ x, y }); };
  try { game.draw(); } finally { context.fillText = original; }
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].x, player.x + 80);
  assert.equal(warnings[0].y, player.y);
  game.update(.79);
  assert.equal(game.state().enemies.length, 0);
  game.togglePause(); game.update(5);
  assert.ok(Math.abs(game.state().pendingSpawns[0].remaining - .01) < 1e-8);
  game.togglePause(); game.update(.01);
  assert.ok(game.state().enemies.some(enemy => enemy.type === 'boss'));
  assert.ok(game.state().enemies.some(enemy => enemy.type === 'swarm'));
  assert.equal(game.state().pendingSpawns.some(spawn => spawn.type === 'boss'), false);
});

test('class ultimates have distinct level-scaled effects and work independently of weapons', () => {
  const activate = (character, level, stat) => {
    game.reset(character);
    game.state().run.ultimateLevel = level;
    game.state().run.weapons = [{ uid: 1, id: 'lightning', level: 1, evolved: false }];
    game.state().run.stats[stat] = 100;
    if (character === 'mage') game.state().run.items.wildfire = 1;
    game.startWave(); game.clearEnemies(); game.setInvulnerable(0); readyCooldowns();
    target('boss', 75); key('r');
    return game.state();
  };
  let state = activate('warrior', 2, 'melee');
  assert.equal(state.enemies[0].maxHp - state.enemies[0].hp, 720);
  assert.equal(state.invulnerable, 1.2);
  assert.ok(state.enemies[0].pushX > 0);
  state = activate('scout', 2, 'ranged');
  assert.equal(state.shots.length, 24);
  assert.equal(state.shots[0].damage, 310);
  assert.equal(state.shots[0].pierce, 6);
  state = activate('mage', 2, 'spell');
  assert.ok(Math.abs(state.enemies[0].maxHp - state.enemies[0].hp - 610.4) < 1e-8);
  assert.ok(Math.abs(state.enemies[0].burn.damage - 28.34) < 1e-8);
  assert.equal(state.enemies[0].burn.spread, 1);
  state = activate('engineer', 2, 'engineering');
  assert.equal(state.mines.length, 0);
  assert.equal(state.engineerOverdrive, 6);
});

test('ultimate starts cooling down, pauses, and can be reused after twenty seconds', () => {
  game.reset('scout'); game.state().run.wave = 8; game.startWave(); game.clearEnemies(); game.setInvulnerable(100);
  const control = elements.get('#ultimate');
  keyDown('r');
  assert.equal(game.state().ultimateCooldown, ULTIMATE_COOLDOWN);
  assert.equal(game.state().previewSkill, '');
  keyUp('r');
  assert.equal(game.state().shots.length, 0);
  game.update(20);
  assert.equal(game.state().ultimateCooldown, 0);
  assert.equal(control.querySelector('.ability-status').textContent, 'READY');
  game.clearEnemies();
  keyDown('r');
  assert.equal(game.state().previewSkill, 'ultimate');
  keyUp('r');
  assert.equal(game.state().shots.length, 20);
  assert.equal(game.state().ultimateCooldown, ULTIMATE_COOLDOWN);
  assert.equal(control.style['--remaining'], 1);
  key('r');
  assert.equal(game.state().shots.length, 20);
  game.togglePause(); game.update(5); key('r');
  assert.equal(game.state().ultimateCooldown, ULTIMATE_COOLDOWN);
  game.togglePause(); game.update(1);
  assert.equal(game.state().ultimateCooldown, ULTIMATE_COOLDOWN - 1);
  game.update(19);
  assert.equal(game.state().ultimateCooldown, 0);
  assert.equal(control.querySelector('.ability-status').textContent, 'READY');
  keyDown('r');
  assert.equal(game.state().previewSkill, 'ultimate');
  keyUp('r');
  assert.equal(game.state().shots.length, 20);
  assert.equal(game.state().ultimateCooldown, ULTIMATE_COOLDOWN);
  assert.equal(control.classList.contains('cooling'), true);
});

test('ultimate upgrades improve the actual attacks through level three', () => {
  const result = (character, level) => {
    game.reset(character); game.state().run.ultimateLevel = level;
    game.startWave(); game.clearEnemies(); readyCooldowns(); target('boss', 75); key('r');
    const state = game.state();
    return { damage: state.enemies[0].maxHp - state.enemies[0].hp, shots: state.shots.length, shotDamage: state.shots[0]?.damage, pierce: state.shots[0]?.pierce, overdrive: state.engineerOverdrive, burnDamage: state.enemies[0].burn?.damage };
  };
  const warrior1 = result('warrior', 1), warrior3 = result('warrior', 3);
  assert.ok(warrior3.damage > warrior1.damage);
  const scout1 = result('scout', 1), scout3 = result('scout', 3);
  assert.ok(scout3.shots > scout1.shots && scout3.shotDamage > scout1.shotDamage && scout3.pierce > scout1.pierce);
  const mage1 = result('mage', 1), mage3 = result('mage', 3);
  assert.ok(mage3.damage > mage1.damage && mage3.burnDamage > mage1.burnDamage);
  const engineer1 = result('engineer', 1), engineer3 = result('engineer', 3);
  assert.ok(engineer3.overdrive > engineer1.overdrive);
});

test('engineer overclock speeds up every sentry and grants two chained ricochets', () => {
  game.reset('engineer');
  game.state().run.level = 3; game.state().run.heroSkills.w = 1;
  game.startWave(); game.clearEnemies(); readyCooldowns(); game.setInvulnerable(100);
  target('boss', 160);
  const { player } = game.state();
  aimAt(player.x + 250, player.y);
  game.activateSecondarySkill();
  game.fireWeapons(1 / 60, false);
  assert.equal(game.state().placedTurrets.length, 1);
  assert.ok(game.state().cooldowns[1] > 0);

  game.activateUltimate();
  assert.equal(game.state().engineerOverdrive, 5);
  game.fireWeapons(.4, false);
  assert.ok(game.state().cooldowns[1] < .1, 'starter turret should fire twice as often during Overclock');
  game.fireWeapons(.03, false);
  assert.equal(game.state().shots.find(shot => shot.source === 'turret' && shot.ricochets === 2)?.ricochets, 2);

  game.state().placedTurrets[0].cooldown = .5;
  game.update(.26);
  assert.ok(game.state().shots.some(shot => shot.source === 'heroSecondarySkill' && shot.ricochets === 2), 'placed sentries should also fire ricocheting shots');
});

test('ricocheting projectiles hit two additional enemies', () => {
  setup(['pistol']); game.setPrimaryHeld(false); game.setInvulnerable(100);
  const { player } = game.state();
  for (const distance of [100, 200, 300]) {
    game.spawnNow('boss', player.x + distance, player.y);
    game.state().enemies.at(-1).speed = 0;
  }
  game.projectile(player.x, player.y, { x: player.x + 1, y: player.y }, {
    damage: 20, speed: 320, ricochets: 2, ricochetRange: 150, source: 'ultimate', special: true, visual: 'turret'
  });
  for (let frame = 0; frame < 60; frame++) game.update(1 / 60);
  assert.equal(game.state().run.damageBySource.ultimate, 60);
});

test('Scout passive projectiles chain to nearby targets without an active ricochet skill', () => {
  game.reset('scout'); game.startWave(); game.clearEnemies(); readyCooldowns();
  game.setPrimaryHeld(false); game.setInvulnerable(100);
  game.state().run.heroPassiveLevel = 3;
  const { player } = game.state();
  for (const [dx, dy] of [[100, 0], [180, 40], [260, 90]]) {
    game.spawnNow('boss', player.x + dx, player.y + dy);
    game.state().enemies.at(-1).speed = 0;
  }
  game.projectile(player.x, player.y, { x: player.x + 1, y: player.y }, {
    damage: 20, speed: 320, ricochetRange: 200, source: 'pistol', visual: 'pistol'
  });
  for (let frame = 0; frame < 60; frame++) game.update(1 / 60);
  assert.ok(game.state().enemies.every(enemy => enemy.hp < enemy.maxHp));
});

test('every weapon special has a distinct effect and observes its cooldown', () => {
  const outcomes = {
    fireball: state => state.shots.length === 8,
    lightning: state => state.effects.length > 0,
    frost: state => state.enemies[0].frozen > 0,
    pistol: state => state.abilityBuffs[1] === 2,
    machinegun: state => state.abilityBuffs[1] === 2,
    sniper: state => state.shots.length === 1,
    boomerang: state => state.shots.length === 6,
    blade: state => state.effects.length > 0,
    sword: state => state.effects.length > 0,
    spear: state => state.effects.filter(effect => effect.kind === 'thrust').length === 3,
    dagger: state => state.effects.length > 0,
    turret: state => state.abilityBuffs[1] === 3,
    mine: state => state.mines.length === 5,
    acid: state => state.shots.length === 4
  };
  assert.deepEqual(Object.keys(outcomes).sort(), Object.keys(WEAPONS).sort());
  for (const [id, check] of Object.entries(outcomes)) {
    setup([id]); target(); activateWeaponSkill(0);
    let state = game.state();
    assert.ok(check(state), id);
    assert.equal(state.abilityCooldowns[1], ACTIVE_SKILLS[id].cooldown, id);
    const before = [state.shots.length, state.mines.length, state.effects.length, state.enemies[0].hp];
    game.activateAbility(0); state = game.state();
    assert.deepEqual([state.shots.length, state.mines.length, state.effects.length, state.enemies[0].hp], before, id);
  }
});

test('weapon specials auto-trigger while attacking and no number key activates them', () => {
  setup(['fireball']); target('boss', 250);
  const { run, abilityCooldowns, shots } = game.state();
  abilityCooldowns[run.weapons[0].uid] = 0;
  game.setPrimaryHeld(false);
  game.fireWeapons(1 / 60, false);
  key('1');
  assert.equal(shots.length, 0, 'weapon specials no longer have a number-key binding');
  game.fireWeapons(1 / 60, true);
  assert.equal(game.state().shots.filter(shot => shot.special).length, 8);
  assert.equal(game.state().abilityCooldowns[run.weapons[0].uid], ACTIVE_SKILLS.fireball.cooldown);
});

test('duplicate skills are independent, and targeted skills need a target', () => {
  setup(['sniper']); activateWeaponSkill(0);
  assert.equal(game.state().abilityCooldowns[1], 0);
  setup(['fireball', 'fireball']); activateWeaponSkill(0);
  assert.equal(game.state().shots.length, 8);
  assert.equal(game.state().abilityCooldowns[2], ACTIVE_SKILLS.fireball.cooldown);
  activateWeaponSkill(1);
  assert.equal(game.state().shots.length, 16);
  assert.equal(game.state().abilityCooldowns[2], ACTIVE_SKILLS.fireball.cooldown);
  
  assert.equal(game.state().shots.length, 16);
  game.startWave();
  assert.equal(game.state().abilityCooldowns[1], ACTIVE_SKILLS.fireball.cooldown);
  assert.equal(game.state().abilityCooldowns[2], ACTIVE_SKILLS.fireball.cooldown);
});

test('active and ultimate projectiles have distinct visuals without changing their collision size', () => {
  setup(['fireball']); target('boss', 250); game.fireWeapons(1 / 60);
  const normal = game.state().shots[0];
  activateWeaponSkill(0);
  const special = game.state().shots.slice(1);
  assert.equal(normal.special, false);
  assert.ok(special.every(shot => shot.special && shot.visual === 'fireball' && shot.radius === normal.radius));
  assert.ok(game.state().effects.some(effect => effect.kind === 'pulse'));

  setup(['pistol']); target('boss', 250); game.fireWeapons(1 / 60);
  assert.equal(game.state().shots[0].special, false);
  activateWeaponSkill(0); game.fireWeapons(.3);
  assert.ok(game.state().shots.some(shot => shot.special && shot.visual === 'pistol'));
  game.reset('scout'); game.startWave(); game.clearEnemies(); readyCooldowns(); key('r');
  assert.ok(game.state().shots.every(shot => shot.special && shot.visual === 'pistol'));
});

test('skill pulses are temporary and pause with gameplay', () => {
  setup(['mine']); activateWeaponSkill(0);
  assert.ok(game.state().mines.every(mine => mine.special));
  const pulse = game.state().effects.find(effect => effect.kind === 'pulse');
  game.togglePause(); game.update(1);
  assert.equal(pulse.life, pulse.max);
  game.togglePause(); game.update(.5);
  assert.ok(!game.state().effects.includes(pulse));
});

test('active fire and acid retain their scaling and damage-over-time effects', () => {
  setup(['fireball']); activateWeaponSkill(0);
  const normalBurn = game.state().shots[0].burn.damage;
  assert.ok(normalBurn > 0);
  setup(['fireball']); game.state().run.weapons[0].merged = true; activateWeaponSkill(0);
  assert.ok(Math.abs(game.state().shots[0].burn.damage / normalBurn - 2.3) < 1e-9);
  setup(['acid']); activateWeaponSkill(0);
  assert.ok(game.state().shots.every(shot => shot.acid.damage > 0 && shot.acid.poolLife > 0));
});

test('Frost Nova freezes nearby enemies, pauses their attacks and dash, and bosses resist', () => {
  setup(['frost']); const { player } = game.state();
  game.spawnNow('bull', player.x + 100, player.y);
  game.spawnNow('boss', player.x - 100, player.y);
  game.spawnNow('ranged', player.x, player.y + 100);
  game.spawnNow('swarm', player.x + 250, player.y);
  const [bull, boss, ranged, outside] = game.state().enemies;
  bull.bullState = 'dash'; bull.charge = .8; bull.chargeX = 1; bull.chargeY = 0;
  boss.cooldown = ranged.cooldown = 0;
  bull.burn = { remaining: 2, tick: .5, damage: 1, spread: 0 };
  game.state().cooldowns[1] = 100;
  activateWeaponSkill(0);
  assert.equal(bull.frozen, 1.75); assert.equal(boss.frozen, .875);
  assert.equal(ranged.frozen, 1.75); assert.equal(outside.frozen, 0);
  const position = bull.x, hp = bull.hp;
  game.togglePause(); game.update(5); assert.equal(bull.frozen, 1.75); game.togglePause();
  game.update(.5);
  assert.equal(bull.x, position); assert.equal(bull.charge, .8);
  assert.equal(bull.hp, hp - 1);
  assert.equal(game.state().hostileShots.length, 0);
  game.update(.4);
  assert.ok(game.state().hostileShots.length > 0);
  assert.equal(bull.x, position);
  game.update(1);
  assert.ok(bull.x > position);
});

test('bulls wind up shorter and dash faster', () => {
  setup(['pistol']);
  const { player } = game.state();
  game.spawnNow('bull', player.x + 100, player.y);
  const bull = game.state().enemies[0];
  bull.cooldown = 0;
  game.update(.49);
  assert.equal(bull.bullState, 'windup');
  assert.ok(bull.charge > 0 && bull.charge <= .02);
  game.update(.02);
  assert.equal(bull.bullState, 'dash');
  const x = bull.x;
  game.update(.1);
  assert.ok(Math.abs((x - bull.x) - 42) < 1e-9);
});

test('ranged enemies flash red during the warning before shooting', () => {
  setup(['pistol']);
  const { player } = game.state();
  game.spawnNow('ranged', player.x + 300, player.y);
  const ranged = game.state().enemies[0];
  ranged.cooldown = .5;
  game.update(.1);
  assert.equal(ranged.attackWarning, true);
  assert.equal(game.state().hostileShots.length, 0);
  game.update(.41);
  assert.equal(ranged.attackWarning, false);
  assert.equal(game.state().hostileShots.length, 1);
});

test('Frost Spike freezes probabilistically and longer at level four', () => {
  const random = Math.random;
  try {
    for (const [level, roll, expected] of [[1, .1, 1], [1, .9, 0], [4, .1, 1.5]]) {
      setup(['frost']); game.state().run.weapons[0].level = level;
      target('tank', 55); const enemy = game.state().enemies[0]; enemy.speed = 0;
      Math.random = () => roll;
      game.fireWeapons(1 / 60); game.state().cooldowns[1] = 100; game.update(.1);
      assert.equal(enemy.frozen, expected);
      assert.ok(enemy.slow > 0);
    }
  } finally { Math.random = random; }
});

test('bosses cannot be locked down by repeated freeze and stun', () => {
  setup(['frost', 'lightning', 'lightning']); target('boss', 100);
  const boss = game.state().enemies[0]; boss.speed = 0; boss.cooldown = 100;
  game.state().cooldowns[1] = game.state().cooldowns[2] = game.state().cooldowns[3] = 100;
  activateWeaponSkill(0); activateWeaponSkill(1);
  assert.equal(boss.frozen, .875); assert.equal(boss.stunned, 0);
  game.update(1.5); assert.equal(boss.controlImmunity, 0);
  activateWeaponSkill(2); assert.equal(boss.stunned, .4);
});

test('skill effects provide distinct control, protection and resource utility', () => {
  setup(['fireball']); activateWeaponSkill(0); assert.ok(game.state().shots.every(shot => shot.burn.chance === 1));
  setup(['lightning']); target('tank'); activateWeaponSkill(0); assert.equal(game.state().enemies[0].stunned, .8);
  setup(['spear']); target('boss'); activateWeaponSkill(0); assert.equal(game.state().enemies[0].stunned, .325);
  setup(['blade']); game.setInvulnerable(0); activateWeaponSkill(0); assert.equal(game.state().invulnerable, .5);
  setup(['boomerang']); const { player, drops } = game.state();
  drops.push({ x: player.x + 200, y: player.y, gold: 2, xp: 3 }, { x: player.x + 300, y: player.y, gold: 1, xp: 1 });
  activateWeaponSkill(0); assert.equal(drops[0].x, player.x); assert.equal(drops[1].x, player.x + 300);
  game.update(1 / 60); assert.equal(game.state().run.gold, 2); assert.equal(game.state().run.xp, 3);
  setup(['dagger']); target('swarm', 40); game.state().enemies[0].hp = 1;
  game.evade(); assert.ok(game.state().evadeCooldown > 0); activateWeaponSkill(0); assert.equal(game.state().evadeCooldown, 0);
  setup(['dagger']); target('boss', 40); game.evade(); activateWeaponSkill(0); assert.ok(game.state().evadeCooldown > 0);
});

test('Warrior sword skill pushes harder than its normal strike', () => {
  const push = special => {
    setup(['sword']); target('tank', 75);
    if (special) activateWeaponSkill(0); else game.fireWeapons(1 / 60);
    return game.state().enemies[0].pushX;
  };
  assert.ok(Math.abs(push(true) / push(false) - 1.6) < 1e-9);
});

test('buffed shots gain the advertised pierce and knockback, and turret gains range', () => {
  setup(['pistol']); target('boss', 250); activateWeaponSkill(0); game.fireWeapons(1 / 60);
  assert.equal(game.state().shots[0].pierce, 2);
  setup(['machinegun']); target('boss', 250); activateWeaponSkill(0); game.fireWeapons(1 / 60);
  assert.equal(game.state().shots[0].knockback, WEAPONS.machinegun.knockback * 3);
  setup(['turret']); target('boss', 150); game.fireWeapons(1 / 60);
  assert.equal(game.state().shots.length, 1, 'turret should fire at a nearby enemy');
  activateWeaponSkill(0); game.state().cooldowns[1] = 0; game.fireWeapons(1 / 60);
  assert.equal(game.state().shots.length, 2);
});

test('engineer turret autonomously targets its nearest enemy instead of the cursor', () => {
  setup(['turret']);
  const { player } = game.state();
  game.spawnNow('boss', player.x - 300, player.y); game.state().enemies[0].speed = 0;
  game.spawnNow('tank', player.x + 155, player.y); game.state().enemies[1].speed = 0;
  aimAt(player.x - 500, player.y);
  game.setPrimaryHeld(false);
  game.update(.02);
  const shot = game.state().shots[0];
  assert.ok(shot, 'turret should choose a target within its range');
  assert.ok(shot.vx > 0, 'turret should choose the closer enemy even when the cursor points left');
  assert.equal(game.state().run.damageBySource.turret || 0, 0, 'wrench strikes should still require the attack button');
});

test('Power Shot marks survivors for subsequent direct hits, then expires', () => {
  const random = Math.random;
  try {
    Math.random = () => .9;
    setup(['sniper']); target('boss', 100); const enemy = game.state().enemies[0]; enemy.speed = 0;
    activateWeaponSkill(0); game.state().cooldowns[1] = 100; game.update(.05);
    assert.equal(enemy.marked, 3);
    const hp = enemy.hp; game.damage(enemy, 100); assert.equal(hp - enemy.hp, 125);
    game.update(3); assert.equal(enemy.marked, 0);
    const after = enemy.hp; game.damage(enemy, 100); assert.equal(after - enemy.hp, 100);
  } finally { Math.random = random; }
});

test('special mines stun survivors and special acid pools slow enemies', () => {
  setup(['mine']); activateWeaponSkill(0);
  const mine = game.state().mines[0];
  game.spawnNow('tank', mine.x + 15, mine.y);
  const enemy = game.state().enemies[0]; enemy.speed = 0; game.state().cooldowns[1] = 100;
  game.update(1 / 60); assert.equal(enemy.stunned, .75);

  setup(['acid']); activateWeaponSkill(0); game.state().cooldowns[1] = 100;
  game.update(.7);
  assert.ok(game.state().puddles.some(puddle => puddle.sticky));
  const pool = game.state().puddles[0];
  game.spawnNow('tank', pool.x, pool.y);
  const tank = game.state().enemies[0]; tank.speed = 0;
  game.update(1 / 60); assert.ok(tank.acidSlow > 0);
});

test('pistol rapid fire produces three shots in the time it normally fires one', () => {
  const count = boost => {
    setup(['pistol']); target('boss', 600);
    if (boost) activateWeaponSkill(0);
    for (let i = 0; i < 30; i++) game.update(1 / 60);
    return game.state().shots.length;
  };
  assert.equal(count(false), 1);
  assert.equal(count(true), 3);
});

test('weapon burst and passive trait states are visible in the ability HUD', () => {
  setup(['pistol']);
  const weaponControl = elements.get('#weapon-skill-control');
  assert.equal(weaponControl.querySelector('strong').textContent, 'Rapid Fire');
  assert.equal(weaponControl.querySelector('.ability-status').textContent, 'READY');

  activateWeaponSkill(0);
  assert.ok(weaponControl.classList.contains('buff-active'));
  assert.equal(weaponControl.querySelector('.ability-status').textContent, 'ACTIVE 2.0s');
  game.update(.5);
  assert.equal(weaponControl.querySelector('.ability-status').textContent, 'ACTIVE 1.5s');
  game.update(2);
  assert.ok(weaponControl.classList.contains('cooling'));
  assert.equal(weaponControl.classList.contains('buff-active'), false);

  game.reset('scout');
  game.state().run.heroPassiveLevel = 1;
  game.startWave();
  const passiveControl = elements.get('#hero-passive-control');
  assert.equal(passiveControl.querySelector('strong').textContent, 'Ricochet Rounds');
  assert.equal(passiveControl.querySelector('.ability-status').textContent, 'LVL 1');
  assert.ok(passiveControl.classList.contains('passive-active'));
  assert.match(passiveControl.title, /pierce and ricochet/);
});

test('Mage attack speed bonus improves sustained starter weapon firing', () => {
  const attacks = bonus => {
    game.reset('mage'); game.state().run.stats.attackSpeed = bonus;
    game.startWave(); game.clearEnemies(); target('boss', 300);
    for (let i = 0; i < 360; i++) game.fireWeapons(1 / 60);
    return game.state().shots.length;
  };
  assert.ok(attacks(10) > attacks(0));
});

test('evade follows movement, prevents contact damage, and cooldowns pause', () => {
  setup(['fireball']); game.setInvulnerable(0);
  game.keys.add('d'); const start = game.project(game.state().player.x, game.state().player.y);
  key(' '); target('chaser', 0);
  game.update(1 / 60);
  assert.equal(game.state().run.hp, 100);
  for (let i = 1; i < 12; i++) game.update(1 / 60);
  const end = game.project(game.state().player.x, game.state().player.y);
  assert.ok(Math.abs(end.x - start.x - 149.5) < .001);
  assert.ok(Math.abs(end.y - start.y) < .001);
  assert.ok(game.state().evadeCooldown > 4.7);
  activateWeaponSkill(0); game.togglePause();
  const cooldown = game.state().abilityCooldowns[1], evadeCooldown = game.state().evadeCooldown;
  game.update(1);
  assert.equal(game.state().abilityCooldowns[1], cooldown);
  assert.equal(game.state().evadeCooldown, evadeCooldown);
  game.togglePause();
  assert.equal(game.state().phase, 'battle');
});

test('taking damage uses a restrained camera shake', () => {
  setup(['pistol']); game.setInvulnerable(0); game.setPrimaryHeld(false);
  const { player } = game.state();
  game.spawnNow('swarm', player.x + 5, player.y);
  game.state().enemies[0].speed = 0;
  game.update(1 / 60);
  assert.ok(game.state().run.hp < 100);
  assert.equal(game.state().shakeStrength, 3);
  assert.equal(game.state().shakeTime, .12);
});

test('render loop stops when paused and limits rendering on fast displays', () => {
  setup(['fireball']);
  let draws = 0;
  const original = context.fillRect;
  context.fillRect = (...args) => { if (args[0] === 0 && args[1] === 0 && args[2] === game.state().viewW) draws++; };
  for (let i = 1; i <= 120; i++) nextFrame(i * 1000 / 120);
  assert.ok(draws >= 59 && draws <= 61, `rendered ${draws} frames`);
  game.togglePause();
  const queued = nextFrame;
  queued(1100);
  assert.equal(nextFrame, queued);
  context.fillRect = original;
});

test('render pacing remains close to 60 FPS on a 144 Hz display', () => {
  setup(['fireball']);
  let draws = 0;
  const original = context.fillRect;
  context.fillRect = (...args) => { if (args[0] === 0 && args[1] === 0 && args[2] === game.state().viewW) draws++; };
  try {
    for (let i = 1; i <= 144; i++) nextFrame(i * 1000 / 144);
    assert.ok(draws >= 59 && draws <= 61, `rendered ${draws} frames`);
  } finally { context.fillRect = original; }
});

test('active skill cooldowns show progress and flash once when ready', () => {
  setup(['fireball']);
  game.setInvulnerable(100);
  const skill = elements.get('#hero-skill'), evade = elements.get('#evade');
  game.activateHeroSkill(); game.evade();
  assert.equal(skill.style['--remaining'], 1);
  assert.equal(skill.style['--cooldown-angle'], '360deg');
  assert.equal(evade.style['--remaining'], 1);
  game.update(1);
  assert.ok(skill.style['--remaining'] < 1 && skill.style['--remaining'] > 0);
  const remaining = skill.style['--remaining'];
  game.togglePause(); game.update(5);
  assert.equal(skill.style['--remaining'], remaining);
  game.togglePause();
  for (let i = 0; i < 10; i++) game.update(1);
  assert.equal(skill.style['--remaining'], 0);
  assert.equal(skill.classList.contains('ready-flash'), true);
  assert.equal(evade.classList.contains('ready-flash'), true);
  game.startWave();
  assert.equal(skill.classList.contains('ready-flash'), false);
  assert.equal(evade.classList.contains('ready-flash'), false);
});

test('wrench strikes and turret fire scale independently, including duplicates and ultimate lanes', () => {
  const attack = (melee, engineering, merged = false, evolved = false) => {
    setup(['turret']);
    const state = game.state();
    state.run.weapons[0].merged = merged; state.run.weapons[0].evolved = evolved;
    state.battleStats.melee = melee; state.battleStats.engineering = engineering; state.battleStats.damage = 0;
    target('boss', 75);
    game.fireWeapons(1 / 60);
    return { state: game.state(), damage: game.state().enemies[0].maxHp - game.state().enemies[0].hp };
  };
  const base = attack(0, 0), melee = attack(100, 0), engineering = attack(0, 100);
  assert.equal(base.damage, 30);
  assert.equal(melee.damage, 60);
  assert.equal(engineering.damage, 30);
  assert.equal(melee.state.shots[0].damage, base.state.shots[0].damage);
  assert.equal(engineering.state.shots[0].damage, base.state.shots[0].damage * 2);
  const ultimate = attack(0, 0, true, true);
  assert.ok(Math.abs(ultimate.damage - 69) < 1e-8);
  assert.equal(ultimate.state.shots.length, 2);
  assert.equal(ultimate.state.shots[0].homing, false);
  assert.equal(Object.keys(ultimate.state.turrets).length, 1);
  setup(['turret', 'turret']); target('boss', 75); game.fireWeapons(1 / 60);
  assert.equal(Object.keys(game.state().turrets).length, 2);
  assert.equal(game.state().shots.length, 2);
  const original = { ...game.state().turrets[1] };
  game.keys.add('d'); game.update(.1);
  assert.deepEqual(game.state().turrets[1], original);
  setup(['turret']); target('boss', 250);
  game.state().run.weapons[0].evolved = true;
  game.fireWeapons(1 / 60);
  const hunterPosition = { ...game.state().turrets[1] };
  game.fireWeapons(.1);
  assert.ok(game.state().turrets[1].x > hunterPosition.x);
});

test('turret overdrive accelerates turret shots but not wrench strikes', () => {
  const timers = boost => {
    setup(['turret']); target('boss', 75); game.fireWeapons(1 / 60);
    if (boost) activateWeaponSkill(0);
    game.fireWeapons(.2);
    return { turret: game.state().cooldowns[1], wrench: game.state().cooldowns['wrench:1'] };
  };
  const normal = timers(false), boosted = timers(true);
  assert.equal(boosted.wrench, normal.wrench);
  assert.ok(boosted.turret < normal.turret);
});

test('knockback varies by weapon, scales with items and resists heavy enemies', () => {
  const strength = (weapon, type, bonus = 0) => {
    setup([weapon]);
    game.state().battleStats.knockback = bonus;
    target(type, 50); game.fireWeapons(1 / 60);
    return game.state().enemies[0].pushX;
  };
  const sword = strength('sword', 'tank');
  assert.ok(sword > strength('dagger', 'tank') * 10);
  assert.ok(Math.abs(strength('sword', 'tank', 35) / sword - 1.35) < 1e-9);
  assert.ok(strength('sword', 'boss') < sword);
  assert.ok(strength('sword', 'tank') > 0);
  setup(['sword']);
  const { player } = game.state();
  game.spawn('sapling', player.x + 40, player.y);
  game.fireWeapons(1 / 60);
  assert.equal(game.state().enemies[0].pushX, 0);
});

test('projectile knockback follows shot direction and hit sprites return to normal', () => {
  setup(['pistol']); target('boss', 45);
  const enemy = game.state().enemies[0];
  const { player } = game.state();
  game.projectile(player.x, player.y, { x: player.x + 1, y: player.y }, { speed: 320, damage: 1, knockback: 100 });
  game.update(1 / 60);
  assert.ok(enemy.pushX > 0);
  assert.ok(enemy.hit > 0);
  const images = [], original = context.drawImage;
  context.drawImage = image => images.push(image);
  try {
    game.draw(); const hitImage = images.at(-1); images.length = 0;
    enemy.hit = 0; game.draw();
    assert.notEqual(hitImage, images.at(-1));
  } finally { context.drawImage = original; }
});

test('knockback moves over time before contact checks and stops at arena bounds', () => {
  setup(['sword']); game.setInvulnerable(0);
  const { player } = game.state();
  game.spawnNow('swarm', player.x + 23, player.y);
  const enemy = game.state().enemies[0];
  enemy.speed = 0; game.state().cooldowns[1] = 100;
  game.damage(enemy, 1, '#fff', 0, { x: 1, y: 0, strength: 190 });
  game.update(.2);
  assert.ok(enemy.x > player.x + 100);
  assert.equal(game.state().run.hp, 100);
  enemy.x = player.x * 2 - 1; enemy.pushX = 450;
  game.update(.2);
  assert.ok(enemy.x <= player.x * 2);
});

test('damage-over-time and bombs trigger hit feedback', () => {
  setup(['lightning']);
  const { player } = game.state();
  game.spawnNow('boss', player.x + 800, player.y);
  const enemy = game.state().enemies[0];
  enemy.speed = 0;
  enemy.burn = { remaining: 1, tick: .5, damage: 1, spread: 0 };
  game.update(.5);
  assert.equal(enemy.hit, .12);
  enemy.hit = 0; enemy.x = player.x + 20;
  game.state().pickups.push({ x: player.x, y: player.y, type: 'bomb' });
  game.state().cooldowns[1] = 100;
  game.update(1 / 60);
  assert.equal(enemy.hit, .12);
  assert.ok(enemy.pushX > 0);
});
test('critical damage numbers stay large and yellow without punctuation', () => {
  setup(['sword']); target();
  game.state().battleStats.crit = 100;
  const originalRandom = Math.random, originalStrokeText = context.strokeText;
  const labels = [];
  Math.random = () => 0;
  try {
    game.damage(game.state().enemies[0], 10);
    context.strokeText = text => labels.push(String(text));
    game.draw();
    assert.ok(game.state().damageNumbers[0].critical);
    assert.ok(labels.includes('17'));
    assert.ok(labels.every(label => !label.includes('!')));
  } finally {
    Math.random = originalRandom;
    context.strokeText = originalStrokeText;
  }
});

test('starter classes survive repeatable first-wave combat scenarios', () => {
  const originalRandom = Math.random, results = {};
  try {
    for (const character of ['warrior', 'scout', 'mage', 'engineer']) {
      let survivors = 0;
      for (let seed = 1; seed <= 10; seed++) {
        let value = seed;
        Math.random = () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 2 ** 32; };
        game.reset(character); game.startWave(); game.setPrimaryHeld(true);
        for (let frame = 0; frame < 1801 && game.state().phase === 'battle'; frame++) {
          if (frame % 180 === 0) {
            game.keys.clear(); game.keys.add(['d', 's', 'a', 'w'][Math.floor(frame / 180) % 4]);
          }
          if (frame % 300 === 0) game.evade();
          if (frame % 600 === 300) activateWeaponSkill(0);
          if (frame === 900) game.activateUltimate();
          const { player, enemies } = game.state();
          const target = enemies.filter(enemy => enemy.hp > 0 && !enemy.escaped)
            .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0];
          if (target) aimAt(target.x, target.y);
          game.update(1 / 60);
        }
        if (game.state().phase !== 'gameover') survivors++;
      }
      results[character] = survivors;
    }
  } finally { Math.random = originalRandom; game.keys.clear(); }
  assert.ok(Math.min(...Object.values(results)) >= 9, JSON.stringify(results));
  assert.ok(Math.max(...Object.values(results)) - Math.min(...Object.values(results)) <= 1, JSON.stringify(results));
});

test('Basic Attack Mastery builds survive first-wave playtests without active-skill damage', () => {
  const originalRandom = Math.random, results = {};
  try {
    for (const character of ['warrior', 'scout', 'mage', 'engineer']) {
      let survivors = 0, totalKills = 0;
      for (let seed = 1; seed <= 10; seed++) {
        let value = seed;
        Math.random = () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 2 ** 32; };
        game.reset(character); game.state().run.items.autoMastery = 3;
        game.startWave(); game.setPrimaryHeld(true);
        for (let frame = 0; frame < 1801 && game.state().phase === 'battle'; frame++) {
          if (frame % 180 === 0) {
            game.keys.clear(); game.keys.add(['d', 's', 'a', 'w'][Math.floor(frame / 180) % 4]);
          }
          if (frame % 300 === 0) game.evade();
          const { player, enemies } = game.state();
          const target = enemies.filter(enemy => enemy.hp > 0 && !enemy.escaped)
            .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0];
          if (target) aimAt(target.x, target.y);
          game.update(1 / 60);
        }
        const run = game.state().run;
        if (game.state().phase !== 'gameover') survivors++;
        totalKills += run.kills;
      }
      results[character] = { survivors, avgKills: totalKills / 10 };
    }
  } finally { Math.random = originalRandom; game.keys.clear(); }
  assert.ok(Object.values(results).every(result => result.survivors >= 9), JSON.stringify(results));
  const kills = Object.values(results).map(result => result.avgKills);
  assert.ok(Math.min(...kills) >= Math.max(...kills) * .7, JSON.stringify(results));
});
