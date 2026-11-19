import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS, CHARACTERS, HERO_SKILLS, HERO_SECONDARY_SKILLS, HERO_PASSIVES, HERO_PASSIVE_MAX_LEVEL, HERO_SKILL_MAX_LEVEL, ITEMS, newRun, gainXp, upgrade, upgradeOptions, evolve, combineWeapons, makeOffers, buy, sellWeapon, effectiveStats, itemDescription, burnStats, acidStats, applyDot, advanceDot, spreadBurn, spawnInterval, adaptiveSpawnInterval, chaserSpeed, enemySpeedScale, enemyHealthScale, bossHealth, rerollPrice, rangedPierce, waveIncome, weaponPower, autoAttackPower, autoAttackMultiplier, autoAttackMasteryBonus, autoAttackRateMultiplier, itemMaxLevel, lifeLeechHeal, withinArc, withinThrust, damageAfterArmor, rarityWeights, rollRarity, makeUpgradeChoices, statUpgradeAmount, waveDuration } from './model.js';

test('knockback items provide scaling bonuses with fixed tradeoffs', () => {
  const run = newRun('scout'); run.gold = 100;
  assert.equal(buy(run, { type: 'item', id: 'impact', level: 1, cost: 18 }), true);
  assert.equal(buy(run, { type: 'item', id: 'impact', level: 2, cost: 24 }), true);
  assert.equal(effectiveStats(run).knockback, 70);
  assert.equal(effectiveStats(run).attackSpeed, -4);
  assert.match(itemDescription('impact'), /\+35% knockback \/ level/);
});

test('XP carries over and queues every earned level', () => {
  const run = newRun();
  const startingDamage = run.stats.damage;
  gainXp(run, 43);
  assert.equal(run.level, 3); assert.equal(run.pending, 2); assert.equal(run.xp, 2);
  assert.equal(run.maxHp, 108); assert.equal(run.hp, 108); assert.equal(run.stats.damage, startingDamage + 4);
});

test('weapon upgrades stop at four and evolution requires the matching item', () => {
  const run = newRun();
  const option = { type: 'weapon', id: 'fireball', weaponId: run.weapons[0].uid };
  for (let i = 0; i < 3; i++) assert.equal(upgrade(run, option), true);
  assert.equal(upgrade(run, option), false);
  assert.deepEqual(evolve(run), []);
  run.items.core = 1;
  assert.deepEqual(evolve(run), ['Meteor Storm']);
  assert.deepEqual(evolve(run), []);
  assert.equal(upgradeOptions(run).some(o => o.id === 'fireball'), false);
});

test('four copies have independent upgrades, evolution, sale and repurchase', () => {
  const run = newRun(); run.gold = 200;
  assert.equal(sellWeapon(run, run.weapons[0].uid), false);
  for (let i = 0; i < 3; i++) assert.equal(buy(run, { type: 'weapon', id: 'fireball', cost: 28 }), true);
  assert.equal(buy(run, { type: 'weapon', id: 'fireball', cost: 28 }), false);
  assert.equal(new Set(run.weapons.map(weapon => weapon.uid)).size, 4);
  const first = run.weapons[0], second = run.weapons[1];
  const options = upgradeOptions(run).filter(option => option.id === 'fireball');
  assert.equal(options.length, 4);
  assert.equal(upgrade(run, options[1]), true);
  assert.equal(first.level, 1); assert.equal(second.level, 2);
  first.level = 4; run.items.core = 1; evolve(run);
  assert.equal(first.evolved, true); assert.equal(second.evolved, false);
  assert.equal(sellWeapon(run, first.uid), 17);
  assert.equal(sellWeapon(run, first.uid), false);
  assert.equal(buy(run, { type: 'weapon', id: 'fireball', cost: 28 }), true);
  assert.equal(run.weapons.at(-1).level, 1);
  assert.equal(run.weapons.at(-1).evolved, false);
  assert.equal(second.level, 2);
  assert.deepEqual(evolve(run), []);
});

test('shop preserves locked offers and rejects stale equipment level offers', () => {
  const run = newRun(); run.gold = 30;
  const locked = { type: 'item', id: 'core', cost: 24, locked: true };
  const offers = makeOffers(run, [locked], () => 0.5);
  assert.equal(offers[0], locked);
  assert.equal(offers.filter(o => o?.id === 'core').length, 1);
  const lockedWeapon = { type: 'weapon', id: 'fireball', cost: 22, locked: true };
  assert.ok(makeOffers(run, [lockedWeapon], () => .5).filter(Boolean).every(offer => offer.type === 'item'));
  const duplicateShop = newRun();
  for (const id of Object.keys(ITEMS)) duplicateShop.items[id] = itemMaxLevel(id);
  assert.deepEqual(makeOffers(duplicateShop, [], () => 0), [null, null, null, null]);
  assert.equal(buy(run, locked), true); assert.equal(run.gold, 6);
  assert.equal(buy(run, locked), false); assert.equal(run.gold, 6);
  const next = makeOffers(run, [locked], () => .5).find(o => o?.id === 'core');
  if (next) assert.equal(next.level, 2);
});

test('shop offers only distinct items and retains locked item offers', () => {
  const run = newRun('engineer');
  let seed = 193;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  let itemsSeen = 0;
  const locked = { type: 'item', id: 'core', level: 1, cost: 24, locked: true };
  for (let i = 0; i < 10000; i++) {
    const offers = makeOffers(run, [locked], random);
    assert.equal(offers[0], locked);
    assert.equal(new Set(offers.filter(Boolean).map(offer => offer.type + ':' + offer.id)).size, offers.filter(Boolean).length);
    assert.ok(offers.filter(Boolean).every(offer => offer.type === 'item'));
    itemsSeen += offers.filter(Boolean).length;
  }
  assert.ok(itemsSeen > 10000);
});

test('shop guarantees Basic Attack upgrades through the final wave and caps their power path at rank nine', () => {
  const run = newRun('scout');
  run.gold = 10000;
  for (let rank = 1; rank <= 9; rank++) {
    const offers = makeOffers(run, [], () => .5);
    const mastery = offers.find(offer => offer?.id === 'autoMastery');
    assert.ok(mastery, `missing Basic Attack Mastery rank ${rank}`);
    assert.equal(mastery.level, rank);
    assert.equal(buy(run, mastery), true);
    assert.equal(itemMaxLevel('autoMastery'), 9);
  }
  assert.equal(makeOffers(run, [], () => .5).some(offer => offer?.id === 'autoMastery'), false);
  assert.equal(buy(run, { type: 'item', id: 'autoMastery', level: 10, cost: 1 }), false);
  assert.match(itemDescription('autoMastery'), /\+20% basic-attack damage/);
  assert.match(itemDescription('autoMastery'), /\+4% firing speed/);
  assert.match(itemDescription('autoMastery'), /ranks 3 and 6/);
});

test('Basic Attack Mastery adds dedicated damage and rate multipliers', () => {
  const run = newRun('scout');
  run.items.autoMastery = 5;
  assert.equal(autoAttackPower(run, 'pistol', 100), weaponPower(run, 'pistol', 100) * 2);
  assert.equal(effectiveStats(run).attackSpeed, 0);
  assert.equal(autoAttackRateMultiplier(run), 1.2);
});

test('Basic Attack Mastery adds a projectile or strike at ranks three and six', () => {
  const run = newRun('scout');
  assert.equal(autoAttackMasteryBonus(run), 0);
  run.items.autoMastery = 3;
  assert.equal(autoAttackMasteryBonus(run), 1);
  run.items.autoMastery = 6;
  assert.equal(autoAttackMasteryBonus(run), 2);
  run.items.autoMastery = 9;
  assert.equal(autoAttackMasteryBonus(run), 2);
  assert.match(itemDescription('autoMastery'), /strike\/projectile/);
});

test('damage-over-time attribution follows the stronger application and its spread', () => {
  let status = applyDot(null, { damage: 10, remaining: 3, source: 'fireball', spread: 1, spreadLimit: 1, spreadDepth: 3 });
  status = applyDot(status, { damage: 8, remaining: 5, source: 'ultimate' });
  assert.equal(status.source, 'fireball');
  assert.equal(status.remaining, 5);
  status = applyDot(status, { damage: 10, remaining: 2, source: 'ultimate' });
  assert.equal(status.source, 'fireball');
  status = applyDot(status, { damage: 12, remaining: 2, source: 'ultimate' });
  assert.equal(status.source, 'ultimate');
  const source = { x: 0, y: 0, hp: 100, burn: status };
  const target = { x: 10, y: 0, hp: 100 };
  assert.equal(spreadBurn(source, [source, target]), 1);
  assert.equal(target.burn.source, 'ultimate');
  assert.equal(target.burn.damage, 12);
  assert.equal(applyDot({ ...status, remaining: 0 }, { damage: 2, remaining: 1, source: 'fireball' }).source, 'fireball');
});

test('shop discards a locked legacy weapon offer rather than showing it again', () => {
  const run = newRun();
  const locked = { type: 'weapon', id: 'fireball', cost: 22, locked: true };
  const offers = makeOffers(run, [locked], () => .5);
  assert.ok(offers.filter(Boolean).every(offer => offer.type === 'item'));
  assert.equal(offers.includes(locked), false);
});

test('combining consumes exactly two matching max-level copies and preserves existing evolutions', () => {
  const run = newRun(); run.gold = 200;
  buy(run, { type: 'weapon', id: 'fireball', cost: 22 });
  buy(run, { type: 'weapon', id: 'pistol', cost: 22 });
  const [first, second, different] = run.weapons;
  first.level = second.level = 4;
  assert.equal(combineWeapons(run, first.uid, first.uid), false);
  assert.equal(combineWeapons(run, first.uid, different.uid), false);
  second.level = 3; assert.equal(combineWeapons(run, first.uid, second.uid), false);
  second.level = 4; second.evolved = true;
  assert.equal(combineWeapons(run, first.uid, second.uid), true);
  assert.equal(run.weapons.length, 2);
  assert.equal(first.merged, true); assert.equal(first.evolved, true);
  assert.equal(run.weapons.includes(second), false);
  assert.equal(combineWeapons(run, first.uid, second.uid), false);
  assert.equal(combineWeapons(run, first.uid, different.uid), false);
  assert.equal(buy(run, { type: 'weapon', id: 'fireball', cost: 22 }), true);
  assert.equal(run.weapons.at(-1).level, 1);
  assert.equal(run.weapons.at(-1).merged, undefined);
});

test('merged weapons can still receive their item evolution and cannot be merged again', () => {
  const run = newRun(); run.gold = 200;
  buy(run, { type: 'weapon', id: 'fireball', cost: 22 });
  run.weapons[0].level = run.weapons[1].level = 4;
  assert.equal(combineWeapons(run, run.weapons[0].uid, run.weapons[1].uid), true);
  run.items.core = 1;
  assert.deepEqual(evolve(run), ['Meteor Storm']);
  assert.equal(run.weapons[0].evolved, true);
  buy(run, { type: 'weapon', id: 'fireball', cost: 22 });
  run.weapons[1].level = 4;
  assert.equal(combineWeapons(run, run.weapons[0].uid, run.weapons[1].uid), false);
});

test('every weapon category has at least three weapons and each can be combined', () => {
  for (const category of ['melee', 'ranged', 'spell', 'engineering']) {
    const weapons = Object.entries(WEAPONS).filter(([, weapon]) => weapon.category === category);
    assert.ok(weapons.length >= 3, category);
    for (const [id, weapon] of weapons) {
      const run = newRun();
      run.weapons = [{ uid: 1, id, level: 4, evolved: false }, { uid: 2, id, level: 4, evolved: false }];
      assert.ok(weapon.ultimate);
      assert.equal(combineWeapons(run, 1, 2), true, id);
      assert.equal(run.weapons.length, 1);
    }
  }
});

test('luck shifts weighted rarity probabilities without guaranteeing the highest rarity', () => {
  const probability = (luck, index) => {
    const weights = rarityWeights(luck);
    return weights[index] / weights.reduce((sum, weight) => sum + weight, 0);
  };
  assert.equal(rollRarity(0, () => 0), 'normal');
  assert.equal(rollRarity(0, () => .9999), 'legendary');
  assert.ok(probability(100, 4) > probability(0, 4));
  assert.ok(probability(100, 0) < probability(0, 0));
  assert.ok(probability(10000, 4) < 1);
  assert.ok(rarityWeights(10000).every(weight => weight > 0));
});

test('rarity affects stat strength while level-up choices focus on class skills and stats', () => {
  const run = newRun('warrior');
  assert.equal(statUpgradeAmount('ranged', 'legendary'), 40);
  assert.equal(upgrade(run, { type: 'stat', id: 'ranged', rarity: 'rare' }), true);
  assert.equal(run.stats.ranged, 16);
  assert.equal(run.stats.melee, 0);
  assert.equal(upgrade(run, { type: 'weapon', id: 'sword', weaponId: run.weapons[0].uid, rarity: 'epic' }), true);
  assert.equal(run.stats.melee, 4);
  assert.equal(run.stats.spell, 0);
  const choices = makeUpgradeChoices(run, () => .2);
  assert.equal(choices.length, 3);
  assert.ok(choices.every(choice => choice.type !== 'weapon'));
  assert.ok(choices.every(choice => choice.rarity));
});

test('ultimate upgrades are rare, at least Epic, and stop at level three', () => {
  const run = newRun('mage');
  let seed = 123456789, offered = 0;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let i = 0; i < 10000; i++) {
    const choices = makeUpgradeChoices(run, random);
    const ultimate = choices.find(choice => choice.type === 'ultimate');
    assert.equal(choices.length, 3);
    if (ultimate) {
      offered++;
      assert.ok(['epic', 'mythic', 'legendary'].includes(ultimate.rarity));
    }
  }
  assert.ok(offered >= 700 && offered <= 900, `ultimate appeared ${offered} times`);
  assert.equal(upgrade(run, { type: 'ultimate', id: 'mage', rarity: 'rare' }), false);
  assert.equal(upgrade(run, { type: 'ultimate', id: 'warrior', rarity: 'epic' }), false);
  assert.equal(upgrade(run, { type: 'ultimate', id: 'mage', rarity: 'epic' }), true);
  assert.equal(upgrade(run, { type: 'ultimate', id: 'mage', rarity: 'legendary' }), true);
  assert.equal(run.ultimateLevel, 3);
  assert.equal(upgrade(run, { type: 'ultimate', id: 'mage', rarity: 'epic' }), false);
  assert.ok(makeUpgradeChoices(run, () => 0).every(option => option.type !== 'ultimate'));
});

test('equipment contributes stats and life bonuses; waves scale', () => {
  const run = newRun(); run.gold = 100;
  assert.equal(buy(run, { type: 'item', id: 'life', cost: 24 }), true);
  assert.equal(run.maxHp, 115); assert.equal(run.hp, 115);
  assert.equal(upgrade(run, { type: 'item', id: 'life' }), false);
  assert.equal(buy(run, { type: 'item', id: 'life', level: 2, cost: 24 }), true);
  assert.equal(run.hp, 130);
  assert.equal(waveDuration(10), 57);
});

test('slower XP progression preserves carryover and yields fewer upgrades across a run', () => {
  const run = newRun();
  gainXp(run, 1000);
  let oldLevel = 1, remaining = 1000;
  while (remaining >= 8 + (oldLevel - 1) * 5) { remaining -= 8 + (oldLevel - 1) * 5; oldLevel++; }
  assert.ok(run.level >= 10 && run.level <= oldLevel * .8);
  assert.equal(run.pending, run.level - 1);
});

test('penetration belongs to each ranged weapon and increases at levels two and four', () => {
  const run = newRun('scout');
  assert.ok(upgradeOptions(run).every(option => option.id !== 'penetration'));
  assert.equal('penetration' in effectiveStats(run), false);
  assert.equal('piercing' in ITEMS, false);
  assert.deepEqual([1, 2, 3, 4].map(level => rangedPierce('pistol', level)), [1, 2, 2, 3]);
  assert.deepEqual([1, 2, 3, 4].map(level => rangedPierce('boomerang', level)), [2, 3, 3, 4]);
  assert.deepEqual([1, 2, 3, 4].map(level => rangedPierce('sniper', level)), [3, 4, 4, 5]);
  assert.equal(rangedPierce('sniper', 4, true), 7);
  assert.throws(() => rangedPierce('fireball', 4));
  run.gold = 100; buy(run, { type: 'weapon', id: 'pistol', cost: 22 });
  upgrade(run, { type: 'weapon', id: 'pistol', weaponId: run.weapons[0].uid });
  assert.equal(rangedPierce('pistol', run.weapons[0].level), 2);
  assert.equal(rangedPierce('pistol', run.weapons[1].level), 1);
});

test('investment equipment trades attack speed for repeatable end-of-wave income', () => {
  const run = newRun('scout'); run.wave = 3; run.gold = 100;
  assert.equal(waveIncome(run), 12);
  assert.equal(buy(run, { type: 'item', id: 'investment', cost: 18 }), true);
  assert.equal(waveIncome(run), 16);
  assert.equal(effectiveStats(run).attackSpeed, -5);
  assert.equal(buy(run, { type: 'item', id: 'investment', level: 2, cost: 24 }), true);
  assert.equal(waveIncome(run), 20);
  assert.equal(effectiveStats(run).attackSpeed, -5);
});

test('all damage supports mixed weapons while category bonuses remain specialized', () => {
  const run = newRun('scout');
  run.stats.ranged = 50; run.stats.melee = 25; run.stats.spell = 10; run.stats.engineering = 80;
  run.stats.damage = 10;
  assert.equal(weaponPower(run, 'pistol', 100), 160);
  assert.equal(weaponPower(run, 'sword', 100), 135);
  assert.equal(weaponPower(run, 'fireball', 100), 120);
  assert.equal(weaponPower(run, 'mine', 100), 190);
  run.items.catalyst = 2;
  assert.ok(Math.abs(weaponPower(run, 'pistol', 100) - 182) < 1e-9);
  assert.ok(Math.abs(weaponPower(run, 'mine', 100) - 212) < 1e-9);
  assert.ok(Math.abs(burnStats(run, 1).damage - 14.2) < 1e-9);
  assert.ok(Math.abs(acidStats(run, 1).damage - 21.2) < 1e-9);
  assert.equal(upgrade(run, { type: 'stat', id: 'damage', rarity: 'normal' }), true);
  assert.equal(run.stats.damage, 15);
  delete run.items.catalyst;
  assert.equal(damageAfterArmor(run, 30), 30);
  run.items.armor = 1;
  assert.equal(damageAfterArmor(run, 30), 25);
});

test('ordinary equipment keeps one focused bonus and fixed drawbacks', () => {
  const run = newRun('scout');
  run.items.whetstone = 2; run.items.clover = 1;
  const stats = effectiveStats(run);
  assert.equal(stats.melee, 32); assert.equal(stats.ranged, 10);
  assert.equal(stats.luck, 20); assert.equal(stats.attackSpeed, -4);
  assert.match(itemDescription('whetstone'), /\+16% melee damage \/ level/);
  assert.doesNotMatch(itemDescription('whetstone'), /ranged damage/);
  run.items.whetstone = 4;
  assert.equal(effectiveStats(run).melee, 64);
  assert.equal(effectiveStats(run).ranged, 10);
  assert.ok(Object.keys(ITEMS).length > Object.keys(WEAPONS).length * 2);
});

test('rare items have one strong bonus and a fixed drawback', () => {
  const run = newRun('scout'); run.items.rage = 3;
  assert.equal(effectiveStats(run).armor, -3);
  assert.equal(effectiveStats(run).melee, 36);
  delete run.items.rage; run.items.battery = 2;
  assert.equal(effectiveStats(run).armor, -3);
  assert.match(itemDescription('rage'), /-3 armor \(fixed\)/);
  assert.ok(ITEMS.rage.rare && ITEMS.battery.rare);
});

test('functional items are clearly described and single-purchase effects cannot stack', () => {
  assert.equal(itemMaxLevel('scorchRounds'), 1);
  assert.equal(itemMaxLevel('volatile'), 1);
  assert.equal(itemMaxLevel('harvest'), 1);
  assert.match(itemDescription('scorchRounds'), /30% chance to ignite/);
  assert.match(itemDescription('volatile'), /30% of their max HP/);
  assert.match(itemDescription('harvest'), /Restore 2 HP whenever you kill/);
  for (const id of Object.keys(ITEMS)) {
    const description = itemDescription(id);
    assert.ok(description.length < 120, id + ' description is too long');
    assert.ok(description.split(' · ').length <= 3, id + ' has too many effects');
  }
});

test('shop continues offering items when weapon slots are full', () => {
  const run = newRun(); run.gold = 100;
  for (let i = 0; i < 3; i++) assert.equal(buy(run, { type: 'weapon', id: 'pistol', cost: 22 }), true);
  const offers = makeOffers(run, [], () => .5);
  assert.equal(offers.length, 4);
  assert.ok(offers.every(offer => offer && offer.type === 'item'));
});

test('difficulty ramps every five seconds and late boss has substantially more health', () => {
  for (const wave of [1, 5, 10]) {
    let previous = spawnInterval(wave, 0);
    for (let elapsed = 5; elapsed < waveDuration(wave); elapsed += 5) {
      const current = spawnInterval(wave, elapsed);
      const oldInterval = Math.max(.08, Math.max(.24, .52 - wave * .025) / (1 + Math.floor(elapsed / 5) * .12));
      assert.ok(Math.abs(current / oldInterval - (1.2 + Math.max(0, 4 - wave) * .14)) < 1e-9);
      assert.ok(current < previous); previous = current;
    }
  }
  assert.ok(bossHealth(10) >= 10000);
  assert.equal(enemyHealthScale(1), 1);
  assert.equal(enemyHealthScale(2), 1);
  assert.equal(enemyHealthScale(10), 1.2);
  assert.equal(bossHealth(10), 21225);
});

test('early waves give new characters breathing room while chasers become a threat', () => {
  assert.ok(spawnInterval(1, 0) > spawnInterval(4, 0));
  assert.ok(spawnInterval(2, 0) > spawnInterval(4, 0));
  assert.ok(enemySpeedScale(1) >= 1.1);
  assert.ok(chaserSpeed(1) > 160 && chaserSpeed(1) < 165);
  assert.ok(chaserSpeed(4) > 210);
  assert.ok(chaserSpeed(10) > chaserSpeed(4));
});

test('adaptive spawning increases pressure when the arena is clear and eases off when crowded', () => {
  const baseline = spawnInterval(4, 20);
  assert.ok(adaptiveSpawnInterval(4, 20, 0) < baseline);
  assert.equal(adaptiveSpawnInterval(4, 20, 20), baseline);
  assert.ok(adaptiveSpawnInterval(4, 20, 48) > baseline);
  assert.ok(adaptiveSpawnInterval(4, 20, 100) <= baseline * 3);
});

test('each hero has two active class skills and a level-five passive with four development ranks', () => {
  assert.equal(new Set(Object.values(HERO_SKILLS).map(skill => skill.name)).size, Object.keys(CHARACTERS).length);
  assert.equal(new Set(Object.values(HERO_SECONDARY_SKILLS).map(skill => skill.name)).size, Object.keys(CHARACTERS).length);
  assert.equal(new Set(Object.values(HERO_PASSIVES).map(skill => skill.name)).size, Object.keys(CHARACTERS).length);
  assert.equal(HERO_SECONDARY_SKILLS.scout.name, 'Pinning Volley');
  assert.match(HERO_PASSIVES.scout.detail(1), /pierce and ricochet/);
  assert.equal(HERO_PASSIVES.mage.name, 'Cinderburst');
  assert.match(HERO_PASSIVES.mage.detail(1), /Burning enemies explode on death/);
  assert.equal(newRun('scout').stats.ranged, 10);
  for (const id of Object.keys(CHARACTERS)) {
    const run = newRun(id);
    assert.ok(upgradeOptions(run).every(option => option.skillId !== 'w'), id + ' unlocked its secondary skill too early');
    assert.ok(upgradeOptions(run).every(option => option.type !== 'heroPassive'), id + ' unlocked its passive too early');
    for (let level = 2; level <= HERO_SKILL_MAX_LEVEL; level++) {
      const option = makeUpgradeChoices(run, () => .5).find(choice => choice.type === 'heroSkill');
      assert.equal(option.id, id);
      assert.equal(option.skillId, 'q');
      assert.match(option.rarity, /normal|rare|epic|mythic|legendary/);
      assert.equal(upgrade(run, option), true);
      assert.equal(run.heroSkills.q, level);
    }
    run.level = HERO_SECONDARY_SKILLS[id].unlockLevel;
    for (let level = 1; level <= HERO_SKILL_MAX_LEVEL; level++) {
      const option = makeUpgradeChoices(run, () => .5).find(choice => choice.type === 'heroSkill');
      assert.equal(option.skillId, 'w');
      assert.equal(upgrade(run, option), true);
      assert.equal(run.heroSkills.w, level);
    }
    run.level = HERO_PASSIVES[id].unlockLevel;
    for (let level = 1; level <= HERO_PASSIVE_MAX_LEVEL; level++) {
      const option = makeUpgradeChoices(run, () => .5).find(choice => choice.type === 'heroPassive');
      assert.equal(option.id, id);
      assert.equal(upgrade(run, option), true);
      assert.equal(run.heroPassiveLevel, level);
    }
    assert.ok(upgradeOptions(run).every(option => option.type !== 'heroPassive'));
    assert.ok(upgradeOptions(run).filter(option => option.type === 'heroSkill').every(option => ['q', 'w'].includes(option.skillId)));
  }
});

test('every shop item improves all heroes and higher offer rarity grants a purchase bonus', () => {
  for (const character of Object.keys(CHARACTERS)) {
    for (const id of Object.keys(ITEMS)) {
      const run = newRun(character), baseline = effectiveStats(run).damage;
      run.items[id] = 1;
      assert.ok(effectiveStats(run).damage >= baseline + 3, character + '/' + id);
    }
  }
  const run = newRun('warrior'); run.gold = 100;
  assert.equal(buy(run, { type: 'item', id: 'armor', level: 1, cost: 18, rarity: 'legendary' }), true);
  assert.equal(effectiveStats(run).damage, 11);
  assert.ok(makeOffers(run, [], () => .5).filter(Boolean).every(offer => ['normal', 'rare', 'epic', 'mythic', 'legendary'].includes(offer.rarity)));
});

test('burn and acid scale separately, and status refresh does not stack damage', () => {
  const run = newRun();
  const basicStats = effectiveStats(run);
  const basic = burnStats(run, 1, basicStats);
  run.items.flint = 2; run.items.embers = 1; run.items.wildfire = 1;
  const improved = burnStats(run, 1);
  assert.ok(improved.damage > basic.damage);
  assert.ok(Math.abs(improved.chance - (basic.chance + .3)) < 1e-9);
  assert.equal(basic.damage, weaponPower(run, 'fireball', 10, basicStats));
  assert.equal(improved.damage, weaponPower(run, 'fireball', 17));
  assert.equal(improved.spread, 1);
  run.items.flint = 4;
  assert.equal(burnStats(run, 1).chance, 1);
  const low = acidStats(run, 1), high = acidStats(run, 4);
  assert.equal(low.damage, weaponPower(run, 'acid', 10));
  assert.ok(high.damage > low.damage && high.radius > low.radius && high.poolLife > low.poolLife);
  run.stats.engineering = 50;
  assert.equal(acidStats(run, 1).damage, low.damage + 5);
  assert.ok(burnStats(run, 1).damage > improved.damage);
  let status = applyDot(null, { damage: 5, remaining: 2, spread: 1 });
  assert.equal(advanceDot(status, .5), 5);
  status = applyDot(status, { damage: 3, remaining: 3, spread: 0 });
  assert.equal(status.damage, 5); assert.equal(status.remaining, 3); assert.equal(status.spread, 1);
  assert.equal(advanceDot(status, .5), 5);
  const acid = applyDot(null, low);
  assert.equal(advanceDot(status, .5), 5);
  assert.equal(advanceDot(acid, .5), low.damage);
});

test('wildfire branches by item level and stops after three generations', () => {
  const run = newRun(); run.items.wildfire = 2;
  const source = { x: 0, y: 0, hp: 100, burn: applyDot(null, burnStats(run, 1)) };
  const a = { x: 30, y: 0, hp: 100 }, b = { x: 60, y: 0, hp: 100 };
  const c = { x: 180, y: 0, hp: 100 }, d = { x: 300, y: 0, hp: 100 }, e = { x: 420, y: 0, hp: 100 };
  const dead = { x: 10, y: 0, hp: 0 };
  const escaped = { x: 15, y: 0, hp: 100, escaped: true };
  const enemies = [source, a, b, c, d, e, dead, escaped];
  assert.equal(spreadBurn(source, enemies), 2);
  assert.equal(source.burn.spread, 0);
  assert.equal(dead.burn, undefined);
  assert.equal(escaped.burn, undefined);
  source.burn = applyDot(source.burn, burnStats(run, 1));
  assert.equal(spreadBurn(source, enemies), 0);
  assert.equal(a.burn.spreadDepth, 2);
  assert.equal(b.burn.spreadDepth, 2);
  assert.equal(spreadBurn(b, enemies), 1);
  assert.equal(c.burn.spreadDepth, 1);
  assert.equal(spreadBurn(c, enemies), 1);
  assert.equal(d.burn.spreadDepth, 0);
  assert.equal(spreadBurn(d, enemies), 0);
  assert.equal(e.burn, undefined);
  assert.equal(d.burn.damage, source.burn.damage);
});

test('characters have distinct starting weapons and warrior scales with missing health', () => {
  for (const [id, character] of Object.entries(CHARACTERS)) {
    const run = newRun(id);
    assert.deepEqual(run.weapons.map(weapon => [weapon.id, weapon.level]), [[character.weapon, 1]]);
    for (const [stat, value] of Object.entries(character.stats || {})) assert.equal(run.stats[stat], value);
  }
  assert.throws(() => newRun('sword'));
  const run = newRun('warrior');
  assert.equal(weaponPower(run, 'sword', 100), 100);
  run.hp = 50; assert.ok(Math.abs(weaponPower(run, 'sword', 100) - 115) < 1e-9);
  run.hp = 0; assert.equal(weaponPower(run, 'sword', 100), 130);
});

test('level choices exclude equipment while shop can offer and buy each equipment level', () => {
  const run = newRun('scout'); run.gold = 1000;
  assert.equal(buy(run, { type: 'item', id: 'armor', cost: 18 }), true);
  assert.ok(upgradeOptions(run).every(option => option.type !== 'item'));
  assert.ok(makeUpgradeChoices(run, () => .5).every(option => option.type !== 'item'));
  const locked = { type: 'item', id: 'armor', level: 2, cost: 24, locked: true };
  assert.equal(makeOffers(run, [locked], () => .5)[0], locked);
  assert.equal(buy(run, locked), true);
  assert.equal(buy(run, locked), false);
  assert.notEqual(makeOffers(run, [locked], () => .5)[0], locked);
  const limited = newRun(); limited.gold = 100;
  for (let i = 0; i < 3; i++) assert.equal(buy(limited, { type: 'weapon', id: 'pistol', cost: 22 }), true);
  for (const id of Object.keys(ITEMS)) limited.items[id] = itemMaxLevel(id);
  limited.items.autoMastery = 4;
  limited.items.armor = 2;
  assert.deepEqual(makeOffers(limited, [], () => .5).filter(Boolean), [
    { type: 'item', id: 'autoMastery', level: 5, cost: 34, rarity: 'normal' },
    { type: 'item', id: 'armor', level: 3, cost: 30, rarity: 'normal' }
  ]);
  assert.equal(buy(run, { type: 'item', id: 'armor', level: 3, cost: 30 }), true);
  assert.equal(buy(run, { type: 'item', id: 'armor', level: 4, cost: 36 }), true);
  assert.equal(buy(run, { type: 'item', id: 'armor', level: 5, cost: 42 }), false);
  assert.equal(effectiveStats(run).armor, 16);
});

test('reroll price scales by wave and successful rerolls', () => {
  assert.deepEqual([rerollPrice(1, 0), rerollPrice(1, 1), rerollPrice(7, 0), rerollPrice(7, 2)], [2, 4, 14, 18]);
});

test('melee hit regions match sword arc and narrow long spear thrust', () => {
  assert.equal(withinArc(100, 0, 0, 120, Math.PI / 3), true);
  assert.equal(withinArc(-10, 0, 0, 120, Math.PI / 3), false);
  assert.equal(withinArc(130, 0, 0, 120, Math.PI / 3), false);
  assert.equal(withinThrust(180, 8, 0, 200, 8, 5), true);
  assert.equal(withinThrust(180, 20, 0, 200, 8, 5), false);
  assert.equal(withinThrust(-1, 0, 0, 200, 8, 5), false);
  assert.equal(withinThrust(201, 0, 0, 200, 8, 5), false);
});

test('life leech respects damage, available budget and missing health', () => {
  const run = newRun(); run.items.siphon = 1; run.hp = 50;
  assert.equal(lifeLeechHeal(run, 10, 1.5), .4);
  assert.equal(lifeLeechHeal(run, 1000, 1.5), 1.5);
  assert.equal(lifeLeechHeal(run, 1000, 0), 0);
  run.hp = 99.5; assert.equal(lifeLeechHeal(run, 1000, 1.5), .5);
});
