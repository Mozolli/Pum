# Arena Survivors

A browser-based arena survival game. Run `npm install`, then `npm start`, and open <http://localhost:8000>. The game uses [Kontra.js](https://straker.github.io/kontra/) for sprites and includes its own original artwork. No external content service is needed after installation.

## Play online with GitHub Pages

The GitHub Actions workflow builds and publishes the game whenever changes are pushed to `main`. It installs the build dependency in CI and includes the required browser module in the published files, so players only need a browser.

To enable it for this repository:

1. Push the workflow and site files to GitHub.
2. In the repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.
3. Open the **Actions** tab and wait for **Deploy to GitHub Pages** to finish.
4. Open the Pages URL shown in the workflow run or under **Settings → Pages**. For this repository it will normally be <https://mozolli.github.io/Pum/>.

For local checks, run `npm ci`, `npm run build`, then `npm start` and open <http://localhost:8000>. The build output is generated in `dist/` and does not need to be committed.

Ability HUD icons use a small set of 32×32 pixel-art skills from [DeadKir on OpenGameArt](https://opengameart.org/content/pixelart-skills-icons), licensed CC0. Their black matte has been removed; the remaining class-specific icons are original local SVG pixel art. No credit is required by the license.

The game also includes an original, looping dark-fantasy soundtrack and synthesized combat, skill, impact, level-up and reward sounds. Audio is generated locally with the Web Audio API, so there are no third-party samples or licensing dependencies. Music is muted by default; use the speaker button in the HUD to adjust its volume or mute and restore sound effects. Playback begins after the first player interaction to comply with browser autoplay rules.

Move in screen directions with WASD, arrow keys or touch controls. The isometric view projects the square arena while keeping characters upright; combat distances and collisions use the underlying arena coordinates. Heroes move 15% faster than before. Player projectiles are 50% faster again; enemy projectile speed is unchanged. Hold LMB for Basic Attack in the exact cursor direction; aimed shots and melee swings can miss, and attacks stop on release. On gamepad, hold RT/R2 for Basic Attack. Weapon special attacks trigger automatically while attacking. The ability bar shows Basic Attack and three active class skills with their live cooldowns. Right-click casts your signature skill, Q unlocks a second class skill at level 3, and R is your ultimate. Skills start on cooldown at each wave; ultimates recharge in 20 seconds. Skills hit hard, control crowds with blasts, knockback and disabling effects, and create a brief impact shake. Hold right-click, Q or R to preview the target area, then release to cast. Press Space or tap Evade to dash in the current movement direction, or the last direction if stationary. Evade lasts 0.2 seconds, prevents damage during the dash and has a 5-second cooldown. Press Esc or P, or use the pause button, to pause and resume. The help button pauses the game and explains its mechanics. White projectiles and purple acid are friendly; special attacks have colored trails and pulses. Brown-orange enemies and red enemy projectiles are dangerous. The health bar appears when the hero is injured.

Standard Xbox and PlayStation-style gamepads are supported: the left stick moves, and the right stick smoothly aims with tilt controlling distance—light pressure aims nearby, while a full tilt can target toward the far edge of the visible arena. RT/R2 attacks, LT/L2 casts the first class skill, LB/L1 casts Q, A/Cross uses the ultimate, and B/Circle evades. Start pauses, Back/Select opens Help, and the D-pad navigates menus. The ability bar switches to the gamepad bindings after controller input and back to keyboard bindings after keyboard input.

The arena is larger than the visible area. The camera is zoomed in, and new enemies enter from outside the view; enemies summoned by a summoner appear beside it. Enemies start 10% faster than before and gain speed as the run progresses. Enemies and loot goblins wait 0.8 seconds before spawning; a warning appears at the spawn point only while that point is visible. The warning pauses with the game. The interface scales with the viewport. Survive ten waves and defeat the final boss. Enemies drop XP and sometimes gold; remaining drops are collected and some health is restored at the end of each wave. Spawn rate accelerates every five seconds and adapts to arena population: crowded arenas slow spawns, while clearing enemies increases pressure. Pursuers are fast, but powerful skills and magic can hurl most enemies several body lengths away; heavy enemies resist knockback.

## Hero skills and progression

Every hero starts with a distinct right-click skill. Q unlocks a second class skill at level 3, and R activates the class ultimate; strafe is a separate movement action. Regular skills scale with their damage category and can be upgraded through four ranks. Their crowd-clearing damage, knockback, burns, stuns and freezes make them a powerful way to turn a dangerous fight around. A class passive unlocks at level 5 and develops through four ranks in place of another active button. Level-up choices prioritize available skill and passive unlocks or rank-ups. Hold right-click, Q or R to preview an active skill's color-coded impact zone before release; the ultimate also shows its area while held.

| Hero | Right-click | Q (level 3) | Passive (level 5) |
| --- | --- | --- | --- |
| Warrior | Sundering Arc: close-range cleave that stuns and hurls a group back. | Iron Tempest: charge through an aimed line, damaging and knocking aside enemies in the path. | Open Wounds: melee hits cause bleed; higher ranks improve the bleed and finishers. |
| Scout | Deadeye Bolt: fast, precise piercing shot that marks targets for bonus damage. | Pinning Volley: three piercing shots in a narrow fan that briefly stun and mark each hit. | Ricochet Rounds: ranged shots pierce and ricochet; higher ranks add chained targets and damage. |
| Mage | Arcane Comet: large explosive fireball that ignites a group. | Firewall: long burning wall with an initial blast. | Cinderburst: burning enemies explode on death; higher ranks increase blast damage and radius, and explosions can chain. |
| Engineer | Siege Charge: heavy explosive shot with a stun. | Field Sentry: deploy permanent sentries that independently fire at nearby enemies until the wave ends; multiple sentries can be active. | Ricochet Circuit: engineering shots gain damage per ricochet during Turret Overclock; they do not ricochet outside the ultimate. |

These are deliberately different combat roles rather than reskinned projectiles: the Warrior moves through the frontline, the Scout marks and chains hits between targets, the Mage controls space with fire and precise ice, and the Engineer builds autonomous defenses and traps. The Engineer's starter turret picks the nearest enemy within its range on its own; its wrench strike still follows the player's aim.

The Warrior's sword basic attack gains range and recovers faster with each weapon level; at level 3 it adds two lighter side arcs after the main swing.

Each level also restores 4 HP, adds 4 max HP and grants +2% damage. The level-up is highlighted with a golden pulse and an on-screen label.

The pause menu includes **END THE RUN**, which stops the current run and opens the same damage and build summary shown after defeat. Current health is preserved in the summary, and the run's wave and kill records are saved.

Class Strafe is a shop item that transforms the evade into a class-specific move: Mage blinks farther and creates a damaging nova, Warrior leaps and strikes on landing, Scout leaves an explosive trap, and Engineer leaves a temporary sentry. Higher item levels improve the move's effect.

## Hero ultimates

Each hero has a level 1 ultimate independent of their Basic Attack. Press R to use it. It starts each wave on a 20-second cooldown and can be reused after it recharges; cooldowns pause with the game. Each ultimate now hits a wider area or more targets, with stronger damage and control. A level-up has an 8% chance to offer an ultimate upgrade in place of a stat choice. The offer is Epic, Mythic or Legendary; each raises the ultimate by one level, up to level 3.

| Hero | Ultimate |
| --- | --- |
| Warrior | Earthshaker damages and knocks back nearby enemies and grants one second of protection; scales with melee damage. |
| Scout | Bullet Storm fires piercing shots in all directions; scales with ranged damage. |
| Mage | Inferno damages and ignites nearby enemies; scales with spell damage and benefits from burn items including Wildfire. |
| Engineer | Turret Overclock makes every turret fire twice as fast for 5 seconds; turret shots ricochet between two additional enemies. Higher ultimate ranks increase the duration and ricochet count. |

Higher levels increase the damage and range, projectile count and pierce, or Overclock duration and ricochet count as described by the level-up choice.

Freeze and stun pause enemy movement, attack cooldowns, charges and attacks. Existing projectiles and contact remain dangerous, and knockback and damage over time still apply. Bosses suffer half the freeze and stun duration and resist further freeze or stun for 1.5 s after an application. Immobilization does not stack; a new application keeps the longer remaining duration.

The cooldown-based evade is an original adaptation of tactical ideas from [Diablo IV's evade mechanic](https://www.purediablo.com/diablo4/Evade).

## Builds and progression

Choose one of four heroes: the Warrior starts with a sword and gains up to 30% melee damage as health decreases; the Scout starts with a pistol and gains 10% movement speed and ranged damage; the Mage starts with a fireball and gains 15% spell damage, 15% All Damage, 10% attack speed and 6 armor; the Engineer starts with a wrench and gains 15% engineering, 15% All Damage and 6 armor.

Each hero has one Basic Attack, which fires toward the mouse only while LMB is held; on gamepad, hold RT/R2. The Engineer's turret fires independently at its nearest enemy; its wrench strike still requires the Basic Attack input and follows the mouse aim. Skills and stats improve at level-up; the shop is for items only. There are no weapon offers or weapon skill buttons. The shop shows current HP, armor, damage bonuses, attack speed and life steal to help decide whether to heal or buy an upgrade. XP needed for the next level is `16 + 9 × (current level − 1)`.

Shop offers can be locked between shops. Rerolls cost `(wave + previous rerolls in this shop) × 2`; the counter resets each wave. Basic Attack Mastery is reserved a shop slot until rank 9; each rank adds 20% direct basic-attack damage and 4% firing speed. Engineer turret projectiles are excluded from those bonuses, while wrench strikes still benefit; ranks 3 and 6 add another strike or projectile to other basic attacks. This keeps basic attacks upgradeable through the final wave. Most items can be upgraded to four levels; Scorch Rounds, Volatile Core and Blood Harvest are one-time effects. The Investor's Purse trades attack speed for 4 gold per item level at the end of each wave.

The four starter Basic Attacks are class-specific: the Warrior's sword covers a broad arc, the Scout's pistol fires aimed shots, the Mage's fireball can ignite, and the Engineer's wrench strikes nearby enemies and deploys a turret. Wrench strikes scale with melee damage; turret shots scale with engineering. Damage categories are melee (red), ranged (green), spell (yellow) and engineering (blue).

All Damage is a level-up stat that adds to every category's damage bonus, including burn and acid. Universal Catalyst provides All Damage in exchange for armor. For example, 10% All Damage and 20% spell damage increase spell damage by 30%, while a ranged weapon gains 10% unless it also has ranged bonuses. Category upgrades remain stronger for a single specialty.

Knockback launches enemies away from hits and explosions. Skillshots and magic can send most enemies several body lengths back; heavy enemies and bosses resist knockback but can still be displaced. The Knockback stat multiplies these effects; Impact Bracer and Recoil Spring increase it in exchange for a modest drawback. Saplings cannot be pushed.

Critical hits deal 70% extra damage and are displayed as larger yellow numbers. Critical chance is capped at 75% for most attacks and 95% for daggers. Life steal heals from direct weapon damage, capped at 1.5 HP per second; burn, acid, bombs and saplings do not trigger it. Armor reduces incoming damage. Luck improves upgrade rarity without guaranteeing any particular rarity.

After victory or defeat, the run summary shows the final build and damage dealt to enemies. All copies, levels and evolutions of each base weapon are combined, including damage dealt before a weapon was sold or combined. Wrench strikes and turret shots count for Wrench; weapon skills, burns, spread burns, mines and acid count for their originating weapon. Hero ultimates and loot bombs are listed separately. Damage is capped at each enemy's remaining health; saplings and overkill are excluded. When non-stacking damage-over-time effects overlap, the stronger effect owns the damage; ties keep the existing source.

## Damage over time

Fireball has a 55% base chance to ignite for four seconds. Burn deals base damage every half-second and scales with spell damage. Flint improves Fireball's ignition chance; Glowing Embers adds burn damage; Wildfire allows each burning enemy to ignite a nearby unburned enemy for up to three generations. Scorch Rounds gives every hero's attacks a 30% chance to ignite their target. Burns do not stack: the stronger damage and longer duration are retained.

## Items and encounters

Items are the only shop offers. Every item grants +3% All Damage per level, and each higher rarity tier adds another +2% All Damage when purchased; this shared bonus is stated once in the shop so each offer can focus on its defining effect. Stat items have one main bonus, with a small fixed drawback only on selected stronger items. Scorch Rounds ignites targets on hit, Volatile Core makes killed enemies explode for 30% of their max HP in a 100-unit radius (blast kills can chain), and Blood Harvest restores 2 HP per kill. Class Strafe changes Evade into a different signature move for each hero. Offers are colored by rarity.

Level-up stat upgrades roll Normal, Rare, Epic, Mythic or Legendary; rarer choices provide larger bonuses. Ultimate upgrades are Epic or higher.

Each wave can spawn up to two fleeing loot goblins. They may drop a bomb, a gold magnet or a full-heal medkit. Destroying a harmless sapling drops a small medkit that restores 10% of max HP.

The start screen saves each hero's best wave and highest kill count in browser storage. Heroes that have cleared all ten waves receive a gold border around their portrait.

Luck is an original five-tier adaptation of the principle described in the [Megabonk luck guide](https://www.megabonkinfo.org/player-stats/luck); probabilities differ. Burn's non-stacking spread is inspired by [Brotato's burning mechanic](https://brotato.wiki.spellsandguns.com/Burning), with different values and tick rate. The Investor's Purse is an original risk/reward item inspired by the economic decisions discussed in this [Brotato review](https://blog.hmpublishing.se/2026/08/brotato-review-how-much-game-can-you.html).

Run `npm test` for progression and combat-model tests.
