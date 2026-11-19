import { Sprite } from './node_modules/kontra/kontra.min.mjs';

const shapes = {
  mob: [
    '.....111111.....',
    '...1133333311...',
    '..133344443331..',
    '.13333333333331.',
    '.13373333373331.',
    '.13373333373331.',
    '.13333333333331.',
    '.13333555533331.',
    '.13333333333331.',
    '..133333333331..',
    '..133333333331..',
    '..133311113331..',
    '..1661....1661..',
    '..1111....1111..',
    '................',
    '................'
  ],
  bat: [
    '................',
    '..11........11..',
    '.1331..11..1331.',
    '1333311331133331',
    '1333333333333331',
    '1333314411333331',
    '1333177171333331',
    '.13317717133331.',
    '..131333313131..',
    '...113553311....',
    '....1333331.....',
    '.....11111......',
    '................',
    '................',
    '................',
    '................'
  ],
  eye: [
    '................',
    '.....111111.....',
    '...1134444311...',
    '..133333333331..',
    '.13311111113331.',
    '1331222222213331',
    '1331227112213331',
    '1331227112213331',
    '1331222222213331',
    '.13311111113331.',
    '..133333333331..',
    '...1133333311...',
    '.....111111.....',
    '......1..1......',
    '................',
    '................'
  ],
  beast: [
    '................',
    '..11........11..',
    '.13311....11331.',
    '.13333111133331.',
    '..133344443331..',
    '..133333333331..',
    '..137733337731..',
    '..133333333331..',
    '...1335225331...',
    '...1355555531...',
    '....13355331....',
    '....13333331....',
    '.....166661.....',
    '.....11..11.....',
    '................',
    '................'
  ],
  bomb: [
    '.......11.......',
    '.......171......',
    '......1131......',
    '..1..113331..1..',
    '.13113333331131.',
    '..133344443331..',
    '.13333333333331.',
    '1337333337333331',
    '1333335555333331',
    '1333354444533331',
    '1333354444533331',
    '.13333555533331.',
    '..133333333331..',
    '.13111111111131.',
    '..1..........1..',
    '................'
  ],
  armored: [
    '....11111111....',
    '..113344443311..',
    '.13344444444331.',
    '.13333111133331.',
    '1333317777133331',
    '1333317777133331',
    '1333331111333331',
    '1333555555553331',
    '1333553355333331',
    '1333333333333331',
    '.13333333333331.',
    '.13333311333331.',
    '..13331..13331..',
    '..1661....1661..',
    '..1111....1111..',
    '................'
  ],
  bull: [
    '.11..........11.',
    '1431........1341',
    '.14311111111341.',
    '..133344443331..',
    '..133333333331..',
    '.13373333373331.',
    '.13373333373331.',
    '.13333333333331.',
    '.13335555553331.',
    '..133522553331..',
    '..133555553331..',
    '..133333333331..',
    '..133311113331..',
    '..1661....1661..',
    '..1111....1111..',
    '................'
  ],
  hood: [
    '.....111111.....',
    '...1133333311...',
    '..133344443331..',
    '..133111111331..',
    '.13317222271331.',
    '.13317222271331.',
    '.13311222211331.',
    '..133111111331..',
    '..133335533331..',
    '.13333355333331.',
    '.13333355333331.',
    '.16633333333166.',
    '..133311113331..',
    '..1661....1661..',
    '..1111....1111..',
    '................'
  ],
  sapling: [
    '.......11.......',
    '......1331......',
    '.....133331.....',
    '....13443331....',
    '...1334333331...',
    '..133333433331..',
    '...1333333331...',
    '..133433333331..',
    '.13333333433331.',
    '..133333333331..',
    '...1111661111...',
    '......1661......',
    '......1661......',
    '.....116611.....',
    '.....111111.....',
    '................'
  ],
  turret: [
    '.....111111.....',
    '....13444431....',
    '...1333333331...',
    '..133311333331..',
    '..133177133331..',
    '..133311333331..',
    '..133333333331..',
    '...1333333331...',
    '....11111111....',
    '.....133331.....',
    '...1113333111...',
    '..133333333331..',
    '..134444444431..',
    '..111111111111..',
    '................',
    '................'
  ]
};

const palettes = {
  swarm: ['#28201d', '#b69778', '#66462e', '#926640', '#513827', '#3a2b23', '#e2d0b4'],
  chaser: ['#28201d', '#b69778', '#5a3d2c', '#805a3b', '#493126', '#3a2b23', '#e2d0b4'],
  charger: ['#28201d', '#b69778', '#69462b', '#93663d', '#523522', '#3a2b23', '#e2d0b4'],
  ranged: ['#28201d', '#b39b7e', '#59432f', '#80674a', '#453328', '#3a2b23', '#e2d0b4'],
  tank: ['#211d19', '#b39b7e', '#4f3a2b', '#76563a', '#886d4d', '#382a22', '#e4d3b8'],
  bull: ['#211d19', '#b39b7e', '#573a28', '#80593a', '#8a6947', '#382a22', '#e4d3b8'],
  summoner: ['#211d19', '#b39b7e', '#51402f', '#796046', '#887255', '#382a22', '#e4d3b8'],
  exploder: ['#28201d', '#b69778', '#74472a', '#a16b3a', '#b18449', '#3a2b23', '#e2d0b4'],
  boss: ['#1e1a17', '#ae8d6d', '#4d3325', '#795236', '#94734f', '#362820', '#dfc9aa'],
  goblin: ['#342719', '#d3b887', '#79552d', '#ad8142', '#ddc17b', '#4d3823', '#f0d9a8'],
  sapling: ['#22413d', '#bddfb1', '#4b957d', '#9ad9ac', '#d0e6b0', '#947456', '#d1f6c6'],
  turret: ['#182c42', '#e4f6ff', '#5485ac', '#b9e8ff', '#e2c67b', '#263c61', '#d8f6ff']
};
const shapeFor = { swarm: 'mob', chaser: 'bat', charger: 'beast', ranged: 'eye', tank: 'armored', bull: 'bull', summoner: 'hood', exploder: 'bomb', boss: 'armored', goblin: 'hood', sapling: 'sapling', turret: 'turret' };

function bitmap(shape, palette, id) {
  const image = document.createElement('canvas');
  image.width = image.height = 32;
  const context = image.getContext('2d');
  shape.forEach((row, y) => [...row].forEach((pixel, x) => {
    if (pixel !== '.') {
      context.fillStyle = palette[Number(pixel) - 1]; context.fillRect(x * 2, y * 2, 2, 2);
      if (pixel === '3' && (x + y * 3) % 7 === 0) { context.fillStyle = palette[3]; context.fillRect(x * 2, y * 2, 1, 1); }
    }
  }));
  const rect = (color, x, y, width, height) => { context.fillStyle = color; context.fillRect(x, y, width, height); };
  if (id === 'swarm') {
    rect('#ffe4bd', 12, 16, 2, 2); rect('#ffe4bd', 18, 16, 2, 2);
    rect('#704b32', 14, 18, 4, 2);
  } else if (id === 'charger') {
    rect('#edc99b', 8, 7, 5, 1); rect('#edc99b', 20, 7, 4, 1);
    rect('#704b32', 7, 20, 18, 2); rect('#cc9e68', 10, 21, 12, 1);
    rect('#ffd0b5', 9, 17, 3, 2); rect('#ffd0b5', 20, 17, 3, 2);
  } else if (id === 'tank' || id === 'boss') {
    rect('#d6b38a', 8, 7, 16, 2); rect('#604331', 8, 19, 16, 6);
    rect('#b38a63', 9, 20, 14, 1); rect('#e7cba4', 10, 23, 3, 1); rect('#e7cba4', 19, 23, 3, 1);
    if (id === 'boss') {
      rect('#392b23', 5, 1, 4, 6); rect('#392b23', 23, 1, 4, 6);
      rect('#db9b83', 6, 1, 2, 5); rect('#db9b83', 24, 1, 2, 5);
      rect('#f4d0ab', 14, 4, 4, 2); rect('#f0b592', 15, 20, 2, 4);
    }
  } else if (id === 'bull') {
    rect('#f8c5ac', 3, 3, 2, 5); rect('#f8c5ac', 27, 3, 2, 5);
    rect('#dfb68a', 12, 20, 8, 2); rect('#604331', 13, 22, 2, 2); rect('#604331', 18, 22, 2, 2);
  } else if (id === 'summoner') {
    rect('#e9c79c', 10, 9, 12, 1); rect('#604331', 11, 18, 10, 6);
    rect('#c5a17b', 12, 19, 8, 1);
    rect('#4c3729', 27, 8, 2, 20); rect('#e6bd8c', 26, 5, 4, 4); rect('#fff0cd', 27, 6, 2, 2);
  } else if (id === 'goblin') {
    rect('#79532f', 4, 18, 7, 8); rect('#f3c878', 5, 19, 5, 1); rect('#fff2c0', 13, 7, 6, 1);
  } else if (id === 'sapling') {
    rect('#d5edba', 14, 7, 2, 2); rect('#9edab0', 8, 16, 3, 1); rect('#9edab0', 20, 20, 3, 1);
    rect('#caa27b', 15, 24, 2, 3);
  } else if (id === 'turret') {
    rect('#263f56', 13, 12, 6, 3); rect('#ecfaff', 14, 12, 4, 1);
    rect('#d5eaf0', 8, 23, 3, 2); rect('#d5eaf0', 21, 23, 3, 2);
  }
  return image;
}

function heroBitmap(id) {
  const image = document.createElement('canvas');
  image.width = image.height = 32;
  const ctx = image.getContext('2d');
  const rect = (color, x, y, width, height) => { ctx.fillStyle = color; ctx.fillRect(x, y, width, height); };
  const poly = (color, points) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.closePath(); ctx.fill();
  };
  const ink = '#18243c', steel = '#8daac0', shine = '#d7e8ee', skin = '#e5b69a', skinShadow = '#bb826f';
  if (id === 'warrior') {
    poly(ink, [[8, 15], [23, 15], [26, 19], [25, 28], [21, 31], [17, 30], [15, 28], [13, 30], [8, 31], [6, 27], [6, 19]]);
    rect('#405d7b', 8, 17, 15, 9); rect('#6c8fab', 10, 17, 11, 5);
    rect('#b3cbd6', 11, 18, 9, 2); rect('#d9b670', 14, 23, 4, 3);
    rect('#263e5c', 8, 26, 6, 4); rect('#263e5c', 17, 26, 6, 4);
    rect('#a9c4d2', 9, 27, 4, 1); rect('#a9c4d2', 18, 27, 4, 1);
    rect(ink, 9, 4, 14, 13); rect('#5c7894', 10, 5, 12, 11);
    rect(steel, 11, 3, 10, 5); rect(shine, 13, 4, 6, 1);
    rect(skin, 12, 9, 8, 6); rect(skinShadow, 13, 14, 6, 2);
    rect(ink, 13, 10, 1, 2); rect(ink, 18, 10, 1, 2);
    rect('#bcd5df', 9, 8, 14, 2); rect('#d4b775', 15, 7, 2, 4);
    poly(ink, [[1, 15], [8, 14], [10, 18], [9, 25], [5, 28], [1, 25]]);
    poly('#7293ac', [[2, 16], [7, 15], [9, 18], [8, 24], [5, 26], [2, 24]]);
    rect('#cce0e5', 4, 17, 2, 7); rect('#cce0e5', 3, 19, 4, 2);
    rect(ink, 26, 2, 4, 21); rect('#a9c7d7', 27, 3, 2, 15); rect(shine, 27, 3, 1, 13);
    rect('#d4ac69', 24, 18, 7, 2); rect('#8c684b', 27, 20, 2, 4);
  } else if (id === 'scout') {
    poly(ink, [[7, 14], [23, 13], [26, 20], [25, 29], [20, 31], [15, 28], [9, 31], [5, 27]]);
    poly('#345d60', [[7, 17], [13, 15], [12, 27], [7, 29], [5, 26]]);
    rect('#466e72', 11, 16, 11, 11); rect('#79a49c', 12, 17, 9, 3);
    rect('#997b58', 14, 16, 2, 11); rect('#d6bd82', 12, 24, 9, 2);
    rect('#263b50', 10, 27, 5, 3); rect('#263b50', 18, 27, 5, 3);
    poly(ink, [[9, 5], [12, 2], [20, 2], [23, 6], [23, 15], [19, 17], [11, 16], [8, 13]]);
    poly('#547e7b', [[10, 6], [13, 3], [20, 3], [22, 7], [21, 13], [19, 15], [11, 14], [9, 12]]);
    rect(skin, 11, 8, 9, 6); rect(skinShadow, 12, 13, 7, 2);
    rect(ink, 12, 9, 1, 2); rect(ink, 18, 9, 1, 2); rect('#a5ccc0', 11, 6, 9, 2);
    rect(ink, 3, 14, 5, 11); rect('#806e54', 4, 15, 3, 9); rect('#c2a678', 4, 16, 3, 2);
    rect(ink, 23, 15, 8, 4); rect('#91afbb', 24, 16, 6, 2); rect(shine, 25, 16, 4, 1);
    rect(ink, 25, 18, 3, 5); rect('#997b58', 26, 19, 1, 3);
  } else if (id === 'mage') {
    poly(ink, [[8, 15], [22, 15], [26, 28], [23, 31], [6, 31], [4, 28]]);
    poly('#5c5c92', [[9, 16], [21, 16], [24, 28], [22, 29], [7, 29], [6, 28]]);
    rect('#8884b7', 11, 17, 8, 2); rect('#a8a2cd', 8, 27, 15, 1);
    rect('#e3c67d', 14, 18, 3, 3); rect('#ddd6b4', 15, 19, 1, 1);
    rect(ink, 10, 9, 11, 9); rect(skin, 11, 10, 9, 6);
    rect(ink, 12, 11, 1, 2); rect(ink, 18, 11, 1, 2);
    poly('#dfd7c6', [[11, 14], [20, 14], [19, 17], [16, 20], [13, 18]]);
    rect('#b8b2ab', 14, 17, 4, 1);
    poly(ink, [[3, 10], [10, 8], [14, 1], [19, 2], [23, 8], [27, 10], [26, 12], [3, 12]]);
    poly('#55518c', [[6, 9], [11, 8], [15, 2], [18, 3], [21, 9], [25, 10], [5, 10]]);
    rect('#aca8d0', 12, 7, 8, 1); rect('#e8cd80', 17, 5, 2, 2);
    rect(ink, 27, 7, 3, 23); rect('#a47d55', 28, 8, 1, 21);
    rect(ink, 25, 3, 7, 7); rect('#5da1bb', 26, 4, 5, 5); rect('#d6f5f2', 27, 4, 2, 2);
  } else if (id === 'engineer') {
    poly(ink, [[8, 15], [23, 15], [26, 19], [25, 28], [21, 31], [17, 30], [15, 28], [13, 30], [8, 31], [6, 27], [6, 19]]);
    rect('#456b8a', 8, 17, 15, 10); rect('#83a8bb', 9, 17, 13, 3);
    rect('#aa825d', 12, 17, 2, 10); rect('#aa825d', 19, 17, 2, 10);
    rect('#c99f67', 9, 24, 14, 2); rect('#f1d387', 15, 24, 3, 2);
    rect('#253d59', 8, 27, 6, 3); rect('#253d59', 17, 27, 6, 3);
    rect(ink, 10, 5, 12, 11); rect(skin, 11, 8, 10, 7); rect(skinShadow, 12, 14, 8, 2);
    rect(ink, 8, 4, 16, 7); rect('#6388a0', 9, 4, 14, 5); rect('#b8d5df', 12, 3, 8, 2);
    rect('#a77c51', 9, 8, 14, 3); rect('#e4c078', 10, 8, 5, 3); rect('#e4c078', 17, 8, 5, 3);
    rect('#34536e', 11, 9, 3, 1); rect('#34536e', 18, 9, 3, 1);
    rect(ink, 2, 14, 6, 13); rect('#6e8792', 3, 15, 5, 10); rect('#b7cbd0', 4, 16, 3, 2);
    rect(ink, 26, 7, 4, 20); rect('#a4c1ce', 27, 9, 2, 16);
    rect(ink, 24, 4, 8, 7); rect('#bcd5dc', 25, 5, 6, 5); rect(ink, 27, 4, 2, 4);
    rect('#dec17f', 26, 22, 4, 2);
  } else {
    throw new Error('Unknown hero graphic: ' + id);
  }
  return image;
}

export function createPixelArt(context) {
  const images = {};
  for (const id of ['warrior', 'scout', 'mage', 'engineer']) images['hero-' + id] = heroBitmap(id);
  for (const [id, palette] of Object.entries(palettes)) images[id] = bitmap(shapes[shapeFor[id]], palette, id);
  const sprites = Object.fromEntries(Object.entries(images).map(([id, image]) => [id, Sprite({ image, context, anchor: { x: .5, y: .5 } })]));
  const hitSprites = {};
  for (const [id, image] of Object.entries(images)) {
    const tinted = document.createElement('canvas');
    tinted.width = image.width; tinted.height = image.height;
    const tintContext = tinted.getContext('2d');
    tintContext.drawImage(image, 0, 0);
    tintContext.globalCompositeOperation = 'source-atop';
    tintContext.fillStyle = '#ff344d66'; tintContext.fillRect(0, 0, tinted.width, tinted.height);
    hitSprites[id] = Sprite({ image: tinted, context, anchor: { x: .5, y: .5 } });
  }
  const tile = document.createElement('canvas');
  tile.width = tile.height = 96;
  const ground = tile.getContext('2d');
  ground.fillStyle = '#10110f'; ground.fillRect(0, 0, 96, 96);
  const stones = ['#191a17', '#1d1e1a', '#171815', '#1b1c18'];
  for (let row = 0; row < 4; row++) {
    for (let column = -1; column < 4; column++) {
      const x = column * 24 + row % 2 * 12, y = row * 24;
      ground.fillStyle = stones[((column + 4) * 3 + row * 5) % stones.length]; ground.fillRect(x + 2, y + 2, 22, 21);
      ground.fillStyle = '#272720'; ground.fillRect(x + 3, y + 3, 18, 1); ground.fillRect(x + 3, y + 4, 1, 15);
      ground.fillStyle = '#11120f'; ground.fillRect(x + 4, y + 21, 19, 1); ground.fillRect(x + 22, y + 5, 1, 16);
      const chipX = x + 7 + ((column + 4) * 5 + row * 3) % 8, chipY = y + 8 + (row * 7 + column + 4) % 8;
      ground.fillStyle = '#121310'; ground.fillRect(chipX, chipY, 4, 1); ground.fillRect(chipX + 3, chipY + 1, 1, 2);
      ground.fillStyle = '#2c2b24'; ground.fillRect(chipX - 1, chipY + 3, 2, 1);
    }
  }
  return {
    ground: context.createPattern(tile, 'repeat'),
    draw(id, x, y, size, opacity = 1, hit = false) {
      const sprite = hit ? hitSprites[id] : sprites[id];
      if (!sprite) throw new Error('Unknown sprite: ' + id);
      sprite.x = Math.round(x); sprite.y = Math.round(y);
      sprite.scaleX = sprite.scaleY = size / sprite.image.width; sprite.opacity = opacity;
      sprite.render();
    },
    portrait(id) {
      const element = document.createElement('canvas');
      element.width = element.height = 48;
      element.className = 'pixel-portrait';
      const portraitContext = element.getContext('2d');
      portraitContext.imageSmoothingEnabled = false;
      portraitContext.drawImage(images['hero-' + id], 0, 0, 48, 48);
      return element;
    }
  };
}
