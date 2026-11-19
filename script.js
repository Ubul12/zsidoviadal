(() => {
'use strict';

const S = 60, COLS = 16, ROWS = 10, W = COLS * S, H = ROWS * S;
const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d');
const dpr = Math.min(window.devicePixelRatio || 1, 2);
cv.width = W * dpr; cv.height = H * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

const rs = getComputedStyle(document.documentElement);
const tok = n => rs.getPropertyValue(n).trim();
const col = {
  grass: tok('--grass'), grassAlt: tok('--grass-alt'), road: tok('--road'), edge: tok('--road-edge'),
  accent: tok('--accent'), bad: tok('--bad'), good: tok('--good'), frost: tok('--frost')
};
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FONT = '700 15px "IBM Plex Sans Condensed", "Arial Narrow", sans-serif';

/* ---------- definitions (all 8 custom towers) ---------- */
const TYPES = {
  archer: { name: 'Archer',  key: '1', cost: 50,  range: 2.8, dmg: 10, rate: 0.40, desc: 'Fast & cheap crossbow bolts',       col: tok('--archer') },
  cannon: { name: 'Cannon',  key: '2', cost: 85,  range: 3.1, dmg: 32, rate: 1.35, splash: 0.85, desc: 'Heavy shells with area blast', col: tok('--cannon') },
  rocket: { name: 'Rocket',  key: '3', cost: 130, range: 4.2, dmg: 48, rate: 1.75, splash: 1.25, desc: 'Long-range salvo splash',      col: tok('--rocket') },
  laser:  { name: 'Laser',   key: '4', cost: 115, range: 5.5, dmg: 78, rate: 2.15, desc: 'Instant high-energy sniper beam',   col: tok('--laser')  },
  frost:  { name: 'Frost',   key: '5', cost: 75,  range: 2.4, dmg: 4,  rate: 0.90, splash: 0.95, slow: 0.5, desc: 'Slows groups; stronger in winter', col: tok('--frost') },
  poison: { name: 'Poison',  key: '6', cost: 95,  range: 2.6, dmg: 15, rate: 2.00, splash: 1.05, dur: 4, desc: 'Leaves a toxic gas cloud',   col: tok('--poison') },
  fire:   { name: 'Fire',    key: '7', cost: 110, range: 2.5, dmg: 18, rate: 1.45, splash: 1.15, dur: 2.8, desc: 'Scorches ground in flames', col: tok('--fire')   },
  winged: { name: 'Winged',  key: '8', cost: 220, range: 4.5, dmg: 8,  rate: 0.14, lane: 16, desc: 'Pierces every enemy in a line', col: tok('--winged') }
};
const DMG = [1, 1.6, 2.4], RNG = [1, 1.1, 1.2], RATE = [1, 0.92, 0.84], UP = [0.7, 1.1];

/* ---------- all 8 goblin/orc enemy sprites ---------- */
const ENEMIES = {
  grunt:      { hp: 32,  speed: 56,  reward: 6,   r: 12, color: '#9b3d2c', lives: 1 },
  archer:     { hp: 42,  speed: 66,  reward: 8,   r: 12, color: '#4d7c3f', lives: 1 },
  mage:       { hp: 55,  speed: 52,  reward: 11,  r: 13, color: '#2b6cb0', lives: 1 },
  runner:     { hp: 26,  speed: 106, reward: 8,   r: 11, color: '#d9cfa3', lives: 1 },
  bruiser:    { hp: 110, speed: 46,  reward: 14,  r: 14, color: '#7b341e', lives: 2 },
  tank:       { hp: 160, speed: 38,  reward: 20,  r: 16, color: '#5f6b73', lives: 2 },
  demolisher: { hp: 240, speed: 34,  reward: 28,  r: 17, color: '#9c4221', lives: 3 },
  boss:       { hp: 750, speed: 29,  reward: 130, r: 22, color: '#1e2023', lives: 5 }
};
const ENEMY_ORDER = ['grunt', 'archer', 'mage', 'runner', 'bruiser', 'tank', 'demolisher', 'boss'];

/* ---------- seasons: autumn (litter/leaves) & winter (snow) ---------- */
const WINTER = { speed: 0.75, frostSlow: 0.15, frostRange: 1.15, frostDur: 2.6 };
const isWinter = n => n >= 1 && ((n - 1) % 14) >= 7;

const LEAF_COLORS = ['#c45b28', '#d98a2b', '#9e3b24', '#b87728', '#7c4a24'];
const LITTER_ITEMS = [];
const DRIFT_LEAVES = [];
const SNOW = [];

function seedSeasonDecor() {
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  LITTER_ITEMS.length = 0;
  for (let i = 0; i < 220; i++) {
    LITTER_ITEMS.push({
      x: rnd() * W,
      y: rnd() * H,
      rx: 3.5 + rnd() * 5.5,
      ry: 2 + rnd() * 3,
      rot: rnd() * Math.PI * 2,
      color: LEAF_COLORS[Math.floor(rnd() * LEAF_COLORS.length)],
      kind: rnd() < 0.75 ? 'leaf' : 'twig',
      alpha: 0.55 + rnd() * 0.4
    });
  }
  DRIFT_LEAVES.length = 0;
  for (let i = 0; i < (reduce ? 14 : 42); i++) {
    DRIFT_LEAVES.push({
      x: rnd() * W,
      y: rnd() * H,
      vx: 14 + rnd() * 24,
      vy: 10 + rnd() * 18,
      sz: 3.5 + rnd() * 4,
      rot: rnd() * Math.PI * 2,
      spin: (rnd() - 0.5) * 3.5,
      p: rnd() * Math.PI * 2,
      color: LEAF_COLORS[Math.floor(rnd() * LEAF_COLORS.length)]
    });
  }
  SNOW.length = 0;
  for (let i = 0; i < (reduce ? 25 : 95); i++) {
    SNOW.push({
      x: rnd() * W,
      y: rnd() * H,
      s: 20 + rnd() * 40,
      r: 1.2 + rnd() * 2.2,
      p: rnd() * Math.PI * 2
    });
  }
}
seedSeasonDecor();

/* ---------- levels ---------- */
const LEVELS = [
  { id: 'switchback', name: 'Switchback', desc: 'A road that folds back on itself. Good for beginners.', lives: 20, gold: 200, hp: 1,
    wps: [[-1,1],[4,1],[4,4],[1,4],[1,7],[7,7],[7,2],[10,2],[10,6],[13,6],[13,1],[16,1]] },
  { id: 'longhaul', name: 'Long Haul', desc: 'A spiral that ends in the middle. Long road, tougher enemies.', lives: 15, gold: 220, hp: 1.15,
    wps: [[-1,1],[14,1],[14,8],[2,8],[2,3],[11,3],[11,5],[5,5]] },
  { id: 'crossroads', name: 'Crossroads', desc: 'The road crosses itself three times. Towers at the crossings hit every pass.', lives: 15, gold: 240, hp: 1.3,
    wps: [[-1,4],[12,4],[12,8],[3,8],[3,1],[8,1],[8,6],[16,6]] }
];

const BEST_KEY = 'switchback-best-v2';
let bests = {};
try { bests = JSON.parse(localStorage.getItem(BEST_KEY) || '{}') || {}; } catch (e) {}

/* ---------- sprites ---------- */
const SPRITES = {
  towers: {
    archer: 'assets/towers/archer.png',
    cannon: 'assets/towers/cannon.png',
    rocket: 'assets/towers/rocket.png',
    laser:  'assets/towers/laser.png',
    frost:  'assets/towers/frost.png',
    poison: 'assets/towers/poison.png',
    fire:   'assets/towers/fire.png',
    winged: 'assets/towers/winged.png'
  },
  enemies: {
    grunt:      'assets/enemies/goblin_1.png',
    tank:       'assets/enemies/goblin_2.png',
    archer:     'assets/enemies/goblin_3.png',
    mage:       'assets/enemies/goblin_4.png',
    bruiser:    'assets/enemies/goblin_5.png',
    runner:     'assets/enemies/goblin_6.png',
    boss:       'assets/enemies/goblin_7.jpg',
    demolisher: 'assets/enemies/goblin_8.png'
  }
};
const ROTATE_TOWER_SPRITES = false;
const ROTATE_ENEMY_SPRITES = false;
const towerImg = {}, enemyImg = {};
function loadSprites(map, out, onReady) {
  for (const k of Object.keys(map)) {
    const im = new Image();
    im.onload = () => { out[k] = im; if (onReady) onReady(); if (G) G.dirty = true; };
    im.src = map[k];
  }
}
const look = {};
for (const k of Object.keys(TYPES)) look[k] = { col: TYPES[k].col };

/* ---------- level geometry & seasonal backgrounds ---------- */
let L, pts, cum, total, road;
const bgAutumn = document.createElement('canvas');
bgAutumn.width = W * dpr; bgAutumn.height = H * dpr;
const bgxAutumn = bgAutumn.getContext('2d');

const bgWinter = document.createElement('canvas');
bgWinter.width = W * dpr; bgWinter.height = H * dpr;
const bgxWinter = bgWinter.getContext('2d');

function paintSeasonBoard(b, winterMode) {
  b.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g1 = winterMode ? '#a8bcc8' : '#6c5832';
  const g2 = winterMode ? '#b5c8d4' : '#745e36';
  const edgeCol = winterMode ? '#556c7a' : '#4a381d';
  const roadCol = winterMode ? '#dce8f0' : '#b89c68';

  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    b.fillStyle = (c + r) % 2 ? g2 : g1;
    b.fillRect(c * S, r * S, S, S);
  }

  /* Avaros talajréteg és hullott falevelek ősszel */
  if (!winterMode) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (!road.has(r * COLS + c)) {
        b.fillStyle = (c * 5 + r * 3) % 2 === 0 ? 'rgba(168, 92, 34, 0.22)' : 'rgba(196, 134, 42, 0.16)';
        b.fillRect(c * S + 3, r * S + 3, S - 6, S - 6);
      }
    }
    for (const item of LITTER_ITEMS) {
      b.save();
      b.translate(item.x, item.y);
      b.rotate(item.rot);
      b.globalAlpha = item.alpha;
      if (item.kind === 'leaf') {
        b.fillStyle = item.color;
        b.beginPath();
        b.ellipse(0, 0, item.rx, item.ry, 0, 0, Math.PI * 2);
        b.fill();
        b.strokeStyle = 'rgba(40, 20, 8, 0.45)';
        b.lineWidth = 0.9;
        b.beginPath();
        b.moveTo(-item.rx * 0.7, 0);
        b.lineTo(item.rx * 0.7, 0);
        b.stroke();
      } else {
        b.strokeStyle = '#4e351e';
        b.lineWidth = 1.6;
        b.beginPath();
        b.moveTo(-item.rx, 0);
        b.lineTo(item.rx, 0);
        b.stroke();
      }
      b.restore();
    }
  }

  b.strokeStyle = winterMode ? 'rgba(45, 70, 88, 0.18)' : 'rgba(20, 24, 12, 0.18)';
  b.lineWidth = 1;
  b.beginPath();
  for (let c = 1; c < COLS; c++) { b.moveTo(c * S + 0.5, 0); b.lineTo(c * S + 0.5, H); }
  for (let r = 1; r < ROWS; r++) { b.moveTo(0, r * S + 0.5); b.lineTo(W, r * S + 0.5); }
  b.stroke();

  const trace = () => { b.beginPath(); pts.forEach((p, i) => i ? b.lineTo(p.x, p.y) : b.moveTo(p.x, p.y)); };
  b.lineJoin = 'round'; b.lineCap = 'butt';
  trace(); b.lineWidth = S * 0.84; b.strokeStyle = edgeCol; b.stroke();
  trace(); b.lineWidth = S * 0.68; b.strokeStyle = roadCol; b.stroke();

  /* Út menti avar vagy hószegély */
  if (!winterMode) {
    for (const item of LITTER_ITEMS) {
      const c = Math.floor(item.x / S), r = Math.floor(item.y / S);
      if (road.has(r * COLS + c) && (Math.floor(item.x + item.y) % 3 === 0)) {
        b.save();
        b.translate(item.x, item.y);
        b.rotate(item.rot);
        b.globalAlpha = 0.55;
        b.fillStyle = item.color;
        b.beginPath();
        b.ellipse(0, 0, item.rx * 0.9, item.ry * 0.9, 0, 0, Math.PI * 2);
        b.fill();
        b.restore();
      }
    }
  } else {
    b.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (!road.has(r * COLS + c) && (c * 7 + r * 3) % 2 === 0) {
        b.beginPath();
        b.ellipse(c * S + S * 0.5, r * S + S * 0.5, S * 0.34, S * 0.24, 0, 0, Math.PI * 2);
        b.fill();
      }
    }
  }

  trace(); b.lineWidth = 2; b.setLineDash([6, 12]);
  b.strokeStyle = winterMode ? 'rgba(52, 82, 105, 0.32)' : 'rgba(60, 45, 20, 0.32)';
  b.stroke();
  b.setLineDash([]);

  b.fillStyle = winterMode ? '#29485e' : '#3a2410';
  b.font = '700 13px "Stardos Stencil", "Courier New", serif';
  b.textBaseline = 'middle';
  b.textAlign = 'left'; b.fillText('IN', 8, pts[0].y);
  const e = pts[pts.length - 1];
  if (e.x >= W) { b.textAlign = 'right'; b.fillText('OUT', W - 8, e.y); }
  else {
    b.beginPath(); b.arc(e.x, e.y, 17, 0, 7); b.fillStyle = '#2f1d14'; b.fill();
    b.fillStyle = '#e6d9b8'; b.font = '700 11px "Stardos Stencil", "Courier New", serif'; b.textAlign = 'center'; b.fillText('OUT', e.x, e.y);
  }
}

function loadLevel(lv) {
  L = lv;
  pts = lv.wps.map(([c, r]) => ({ x: (c + 0.5) * S, y: (r + 0.5) * S }));
  cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  total = cum[cum.length - 1];
  road = new Set();
  for (let i = 1; i < lv.wps.length; i++) {
    const [c0, r0] = lv.wps[i - 1], [c1, r1] = lv.wps[i];
    const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0);
    let c = c0, r = r0;
    for (;;) {
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS) road.add(r * COLS + c);
      if (c === c1 && r === r1) break;
      c += dc; r += dr;
    }
  }
  paintSeasonBoard(bgxAutumn, false);
  paintSeasonBoard(bgxWinter, true);
}

function setPos(e) {
  const d = Math.min(e.d, total);
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const a = pts[i - 1], b = pts[i], t = (d - cum[i - 1]) / (cum[i] - cum[i - 1]);
  e.x = a.x + (b.x - a.x) * t; e.y = a.y + (b.y - a.y) * t;
}

/* ---------- state ---------- */
let G;
const ui = { g: -1, l: -1, w: -1, c: -2 };
const FIRST_DELAY = 15, BREAK = 4;
const countdown = () => (G.active || G.over) ? -1 : Math.max(0, Math.ceil(G.nextT));

function init() {
  G = {
    gold: L.gold, lives: L.lives, wave: 0, queue: [], spawnT: 0, active: false, winter: false, nextT: FIRST_DELAY,
    enemies: [], towers: [], bullets: [], fx: [], clouds: [],
    type: 'archer', sel: null, speed: 1, paused: false, over: false, menu: false, started: false,
    hover: null, dirty: true, msgT: 0
  };
  $('over').hidden = true;
  $('msg').classList.remove('on');
}
function addTower(type, c, r) {
  const d = TYPES[type];
  G.gold -= d.cost;
  G.started = true;
  const t = { type, c, r, x: (c + 0.5) * S, y: (r + 0.5) * S, level: 0, cd: 0.4, angle: -Math.PI / 2, spent: d.cost };
  G.towers.push(t);
  return t;
}
const towerAt = (c, r) => G.towers.find(t => t.c === c && t.r === r);
const canBuild = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS && !road.has(r * COLS + c) && !towerAt(c, r);
function stats(t) {
  const d = TYPES[t.type], k = t.level, w = G && G.winter && t.type === 'frost';
  return {
    dmg: d.dmg * DMG[k],
    range: d.range * RNG[k] * (w ? WINTER.frostRange : 1) * S,
    rate: d.rate * RATE[k],
    splash: (d.splash || 0) * S,
    slow: (d.slow || 0) + (w ? WINTER.frostSlow : 0)
  };
}
const upCost = t => t.level >= 2 ? null : Math.round(TYPES[t.type].cost * UP[t.level]);
const sellVal = t => Math.floor(t.spent * 0.65);

/* ---------- waves ---------- */
const hpMul = n => (1 + 0.14 * (n - 1) + 0.01 * (n - 1) * (n - 1)) * L.hp;
function waveCounts(n) {
  return {
    grunt:      5 + Math.floor(n * 1.4),
    archer:     n >= 2 ? Math.floor(n * 0.7) : 0,
    mage:       n >= 3 ? Math.floor((n - 1) * 0.6) : 0,
    runner:     n >= 3 ? Math.floor(n * 0.75) : 0,
    bruiser:    n >= 4 ? Math.floor((n - 2) * 0.5) : 0,
    tank:       n >= 5 ? Math.floor((n - 3) / 2) : 0,
    demolisher: n >= 7 ? Math.floor((n - 5) / 2) : 0,
    boss:       n % 10 === 0 ? n / 10 : 0
  };
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function sendWave() {
  if (G.over || G.menu) return;
  G.wave++; G.started = true;
  const n = G.wave, c = waveCounts(n), list = [];
  const w = isWinter(n);
  if (w !== G.winter) {
    G.winter = w;
    say(w ? 'Winter has come! Snow covers the road, enemies slow down and Frost towers are stronger.' : 'Autumn has returned! Fallen leaves cover the ground.');
  }
  for (const k of ['grunt', 'archer', 'mage', 'runner', 'bruiser', 'tank', 'demolisher']) {
    for (let i = 0; i < c[k]; i++) list.push(k);
  }
  shuffle(list);
  for (let i = 0; i < c.boss; i++) list.push('boss');
  for (const type of list) G.queue.push({ type, wave: n });
  G.active = true;
  G.dirty = true;
}
function spawn(q) {
  const d = ENEMIES[q.type], hp = Math.round(d.hp * hpMul(q.wave));
  G.enemies.push({
    type: q.type, d: 0, hp, max: hp, speed: d.speed * (1 + Math.min(0.35, q.wave * 0.01)),
    reward: d.reward + Math.floor(q.wave / 5), r: d.r, color: d.color, lives: d.lives,
    slow: 0, slowF: 0, flash: 0, x: pts[0].x, y: pts[0].y, dead: false, escaped: false
  });
}

/* ---------- effects ---------- */
function burst(x, y, color, n) {
  n = reduce ? Math.min(n, 2) : n;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, s = 40 + Math.random() * 100, life = 0.3 + Math.random() * 0.3;
    G.fx.push({ k: 'p', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, t: life, color, size: 2 + Math.random() * 2.5 });
  }
}
const ring = (x, y, max, color) => G.fx.push({ k: 'r', x, y, max, life: 0.35, t: 0.35, color });
const beam = (x1, y1, x2, y2, color) => G.fx.push({ k: 'l', x1, y1, x2, y2, life: 0.14, t: 0.14, color });
const floatText = (x, y, txt) => G.fx.push({ k: 't', x, y, txt, life: 0.8, t: 0.8 });

function say(text) {
  const m = $('msg');
  m.textContent = text; m.classList.add('on');
  if (G) G.msgT = 3;
}

/* ---------- combat ---------- */
function hit(e, amt, quiet) {
  if (e.dead || e.escaped) return;
  e.hp -= amt; if (!quiet) e.flash = 0.08;
  if (e.hp <= 0) {
    e.dead = true; G.gold += e.reward;
    floatText(e.x, e.y - 10, '+' + e.reward);
    burst(e.x, e.y, e.color, 8);
  }
}
function fire(t, st, target) {
  const c = look[t.type].col;
  if (t.type === 'laser') {
    beam(t.x, t.y - 10, target.x, target.y, c);
    hit(target, st.dmg);
    burst(target.x, target.y, c, 4);
    return;
  }
  if (t.type === 'winged') {
    const dx = Math.cos(t.angle), dy = Math.sin(t.angle), len = st.range;
    beam(t.x + dx * 14, t.y - 10 + dy * 14, t.x + dx * len, t.y + dy * len, c);
    for (const e of G.enemies) {
      if (e.dead || e.escaped) continue;
      const px = e.x - t.x, py = e.y - t.y, along = px * dx + py * dy;
      if (along < 0 || along > len + e.r) continue;
      if (Math.abs(px * dy - py * dx) <= e.r + TYPES.winged.lane / 2) hit(e, st.dmg);
    }
    return;
  }
  const sp = t.type === 'archer' ? 580 : (t.type === 'poison' || t.type === 'fire') ? 270 : t.type === 'rocket' ? 360 : 410;
  G.bullets.push({
    x: t.x, y: t.y - 8, tg: target, lx: target.x, ly: target.y,
    sp, dmg: st.dmg, kind: t.type, splash: st.splash, slow: st.slow,
    dur: TYPES[t.type].dur || 0, d0: Math.max(1, Math.hypot(target.x - t.x, target.y - t.y)), color: c
  });
}
function impact(b) {
  if (b.kind === 'archer') {
    if (b.tg && !b.tg.dead && !b.tg.escaped) { hit(b.tg, b.dmg); burst(b.lx, b.ly, b.color, 3); }
    return;
  }
  if (b.kind === 'poison' || b.kind === 'fire') {
    G.clouds.push({ x: b.lx, y: b.ly, r: b.splash, dps: b.dmg, life: b.dur, t: b.dur, tick: 0, seed: Math.random() * 6.283, color: b.color });
    burst(b.lx, b.ly, b.color, 8);
    return;
  }
  for (const e of G.enemies) {
    if (e.dead || e.escaped) continue;
    if (Math.hypot(e.x - b.lx, e.y - b.ly) <= b.splash + e.r) {
      hit(e, b.dmg);
      if (b.kind === 'frost') { e.slow = G.winter ? WINTER.frostDur : 1.8; e.slowF = b.slow; }
    }
  }
  ring(b.lx, b.ly, b.splash, b.color);
  burst(b.lx, b.ly, b.color, b.kind === 'rocket' ? 10 : 6);
}

function endGame() {
  G.over = true;
  if (G.wave > (bests[L.id] || 0)) {
    bests[L.id] = G.wave;
    try { localStorage.setItem(BEST_KEY, JSON.stringify(bests)); } catch (e) {}
  }
  $('overText').textContent = 'You held out to wave ' + G.wave + ' on ' + L.name + '. Best: ' + (bests[L.id] || 0) + '.';
  $('over').hidden = false;
  G.dirty = true;
}

function update(dt) {
  if (G.queue.length) {
    G.spawnT -= dt;
    if (G.spawnT <= 0) {
      const q = G.queue.shift();
      spawn(q);
      G.spawnT = Math.max(0.35, 0.85 - 0.015 * q.wave);
    }
  }
  const season = G.winter ? WINTER.speed : 1;
  for (const e of G.enemies) {
    if (e.slow > 0) e.slow -= dt;
    if (e.flash > 0) e.flash -= dt;
    e.d += e.speed * season * (e.slow > 0 ? 1 - e.slowF : 1) * dt;
    if (e.d >= total) { e.escaped = true; G.lives -= e.lives; burst(e.x, e.y, col.bad, 6); }
    else { const px = e.x, py = e.y; setPos(e); if (e.x !== px || e.y !== py) e.ang = Math.atan2(e.y - py, e.x - px); }
  }
  if (G.lives <= 0) { G.lives = 0; G.enemies = G.enemies.filter(e => !e.escaped); endGame(); return; }

  for (const t of G.towers) {
    t.cd -= dt;
    const st = stats(t);
    let target = null;
    for (const e of G.enemies) {
      if (e.dead || e.escaped) continue;
      const dx = e.x - t.x, dy = e.y - t.y;
      if (dx * dx + dy * dy <= st.range * st.range && (!target || e.d > target.d)) target = e;
    }
    if (target) {
      t.angle = Math.atan2(target.y - t.y, target.x - t.x);
      if (t.cd <= 0) { fire(t, st, target); t.cd = st.rate; }
    }
  }

  for (const b of G.bullets) {
    if (b.tg && !b.tg.dead && !b.tg.escaped) { b.lx = b.tg.x; b.ly = b.tg.y; }
    else if (b.kind === 'archer') { b.done = true; continue; }
    const dx = b.lx - b.x, dy = b.ly - b.y, dist = Math.hypot(dx, dy), step = b.sp * dt;
    if (dist <= step + 4) { impact(b); b.done = true; }
    else { b.x += dx / dist * step; b.y += dy / dist * step; }
  }
  for (const c of G.clouds) {
    c.life -= dt; c.tick -= dt;
    if (c.tick <= 0) {
      c.tick += 0.25;
      for (const e of G.enemies) {
        if (e.dead || e.escaped) continue;
        if (Math.hypot(e.x - c.x, e.y - c.y) <= c.r + e.r) hit(e, c.dps * 0.25, true);
      }
    }
  }
  G.clouds = G.clouds.filter(c => c.life > 0);
  G.bullets = G.bullets.filter(b => !b.done);
  G.enemies = G.enemies.filter(e => !e.dead && !e.escaped);

  for (const f of G.fx) {
    f.life -= dt;
    if (f.k === 'p') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.96; f.vy *= 0.96; }
  }
  G.fx = G.fx.filter(f => f.life > 0);

  if (G.active && !G.queue.length && !G.enemies.length) {
    G.active = false;
    const bonus = 15 + 2 * G.wave;
    G.gold += bonus;
    G.nextT = BREAK;
    say('Wave ' + G.wave + ' cleared. +' + bonus + ' gold');
  } else if (!G.active && !G.queue.length) {
    G.nextT -= dt;
    if (G.nextT <= 0) sendWave();
  }
}

/* ---------- drawing ---------- */
function rangeCircle(x, y, r) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.stroke();
}
function drawTower(c, t, alpha, bare) {
  const k = look[t.type], tc = k.col;
  c.save();
  c.translate(t.x, t.y);
  c.globalAlpha = alpha || 1;
  const img = towerImg[t.type];
  if (img) {
    c.fillStyle = 'rgba(15, 17, 10, 0.35)';
    c.beginPath();
    c.ellipse(0, S * 0.32, S * 0.36, S * 0.16, 0, 0, 7);
    c.fill();
    c.save();
    if (ROTATE_TOWER_SPRITES) c.rotate(t.angle + Math.PI / 2);
    const sz = bare ? S * 0.94 : S * 1.12;
    const yOff = bare ? -sz * 0.5 : -sz * 0.62;
    c.drawImage(img, -sz * 0.5, yOff, sz, sz);
    c.restore();
  } else {
    c.fillStyle = '#1a1c16';
    c.beginPath(); c.arc(0, 0, S * 0.36, 0, 7); c.fill();
    c.lineWidth = 3; c.strokeStyle = tc; c.stroke();
    c.rotate(t.angle);
    c.fillStyle = tc;
    c.fillRect(2, -3.5, S * 0.34, 7);
    c.beginPath(); c.arc(0, 0, 9, 0, 7); c.fill();
  }
  c.restore();
  if (!alpha && !bare) {
    const n = t.level + 1;
    c.fillStyle = col.accent;
    c.strokeStyle = '#1a1c16';
    c.lineWidth = 1.5;
    for (let i = 0; i < n; i++) {
      c.beginPath();
      c.arc(t.x + (i - (n - 1) / 2) * 8, t.y + S * 0.43, 2.8, 0, 7);
      c.fill();
      c.stroke();
    }
  }
}
function drawEnemy(e) {
  const img = enemyImg[e.type];
  if (img) {
    const sz = e.r * 2.85;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = 'rgba(15, 17, 10, 0.32)';
    ctx.beginPath();
    ctx.ellipse(0, sz * 0.36, sz * 0.32, sz * 0.12, 0, 0, 7);
    ctx.fill();
    if (ROTATE_ENEMY_SPRITES) ctx.rotate(e.ang || 0);
    if (e.flash > 0) ctx.filter = 'brightness(2.2)';
    ctx.drawImage(img, -sz * 0.5, -sz * 0.56, sz, sz);
    ctx.filter = 'none';
    if (e.slow > 0) {
      ctx.beginPath(); ctx.arc(0, 0, sz * 0.45, 0, 7);
      ctx.lineWidth = 2.5; ctx.strokeStyle = col.frost; ctx.stroke();
    }
    ctx.restore();
  } else {
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 7);
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.color; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = e.slow > 0 ? col.frost : '#1b1410'; ctx.stroke();
    if (e.type === 'boss') { ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 0.5, 0, 7); ctx.fillStyle = col.bad; ctx.fill(); }
    if (e.type === 'tank') { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(e.x - e.r * 0.5, e.y - 2, e.r, 4); }
  }
  if (e.hp < e.max) {
    const w = e.r * 2.2, y = e.y - e.r * 1.55;
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(e.x - w * 0.5, y, w, 4);
    ctx.fillStyle = col.good; ctx.fillRect(e.x - w * 0.5, y, w * Math.max(0, e.hp / e.max), 4);
  }
}
function drawAutumnLeaves(now) {
  const t = reduce ? 0 : now / 1000;
  for (const lf of DRIFT_LEAVES) {
    const x = (lf.x + t * lf.vx + Math.sin(t * 1.4 + lf.p) * 16 + W) % W;
    const y = (lf.y + t * lf.vy + H) % H;
    const rot = lf.rot + t * lf.spin;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = lf.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, lf.sz, lf.sz * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
function drawSnow(now) {
  const t = reduce ? 0 : now / 1000;
  ctx.fillStyle = '#f4f9ff';
  for (const f of SNOW) {
    const x = (f.x + Math.sin(t * 0.8 + f.p) * 14 + W) % W, y = (f.y + t * f.s) % H;
    ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(x, y, f.r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function draw(now) {
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(G.winter ? bgWinter : bgAutumn, 0, 0, W, H);

  const hv = G.hover;
  if (hv && !G.over && !G.menu && hv.c >= 0 && hv.c < COLS && hv.r >= 0 && hv.r < ROWS) {
    const t = towerAt(hv.c, hv.r);
    if (G.type && !t) {
      const ok = canBuild(hv.c, hv.r);
      ctx.fillStyle = ok ? 'rgba(255,255,255,0.14)' : 'rgba(229,99,77,0.3)';
      ctx.fillRect(hv.c * S, hv.r * S, S, S);
      if (ok) {
        const ghost = { type: G.type, x: (hv.c + 0.5) * S, y: (hv.r + 0.5) * S, level: 0, angle: -Math.PI / 2 };
        rangeCircle(ghost.x, ghost.y, stats(ghost).range);
        drawTower(ctx, ghost, 0.65);
      }
    } else if (t) {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(hv.c * S, hv.r * S, S, S);
    }
  }
  if (G.sel) {
    rangeCircle(G.sel.x, G.sel.y, stats(G.sel).range);
    ctx.lineWidth = 2; ctx.strokeStyle = col.accent;
    ctx.strokeRect(G.sel.c * S + 2, G.sel.r * S + 2, S - 4, S - 4);
  }

  for (const c of G.clouds) {
    const a = Math.min(1, c.life / 0.8), age = c.t - c.life;
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    g.addColorStop(0, c.color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.38 * a; ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 7); ctx.fill();
    ctx.fillStyle = c.color; ctx.globalAlpha = 0.16 * a;
    for (let i = 0; i < 5; i++) {
      const ang = c.seed + i * 1.2566 + (reduce ? 0 : age * 0.7);
      ctx.beginPath(); ctx.arc(c.x + Math.cos(ang) * c.r * 0.5, c.y + Math.sin(ang) * c.r * 0.5, c.r * 0.38, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 0.5 * a; ctx.lineWidth = 1.5; ctx.strokeStyle = c.color;
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 7); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const sortedTowers = G.towers.slice().sort((a, b) => a.y - b.y);
  for (const t of sortedTowers) drawTower(ctx, t);
  for (const e of G.enemies) drawEnemy(e);

  for (const b of G.bullets) {
    if (b.kind === 'poison' || b.kind === 'fire' || b.kind === 'cannon') {
      const p = Math.min(1, Math.max(0, 1 - Math.hypot(b.lx - b.x, b.ly - b.y) / b.d0)), h = Math.sin(p * Math.PI) * 30;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(b.x, b.y, 5, 3, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(b.x, b.y - h, b.kind === 'cannon' ? 4.5 : 5.5, 0, 7);
      ctx.fillStyle = b.kind === 'cannon' ? '#242424' : '#2a2d1f'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = b.color; ctx.stroke();
      continue;
    }
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.kind === 'frost' ? 5 : b.kind === 'rocket' ? 4.5 : 3.5, 0, 7);
    ctx.fillStyle = b.color; ctx.fill();
  }

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = FONT;
  for (const f of G.fx) {
    const a = Math.max(0, f.life / f.t);
    if (f.k === 'p') { ctx.globalAlpha = a; ctx.fillStyle = f.color; ctx.fillRect(f.x, f.y, f.size, f.size); }
    else if (f.k === 'r') {
      ctx.globalAlpha = a; ctx.lineWidth = 3; ctx.strokeStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.max * (1 - a), 0, 7); ctx.stroke();
    } else if (f.k === 'l') {
      ctx.globalAlpha = a; ctx.lineWidth = 3; ctx.strokeStyle = f.color;
      ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
    } else {
      ctx.globalAlpha = a; ctx.fillStyle = col.accent;
      ctx.fillText(f.txt, f.x, f.y - (1 - a) * 18);
    }
  }
  ctx.globalAlpha = 1;

  if (G.winter) drawSnow(now);
  else drawAutumnLeaves(now);

  if (G.paused && !G.over) {
    ctx.fillStyle = 'rgba(24,26,20,0.6)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e8eef2'; ctx.font = '700 30px "Stardos Stencil", "Courier New", serif';
    ctx.fillText('Paused', W / 2, H / 2);
  }
}

/* ---------- thumbnails ---------- */
const thumbs = [];
function makeThumb(k, cls) {
  const c = document.createElement('canvas');
  c.width = 60; c.height = 60; c.className = cls;
  c.setAttribute('aria-hidden', 'true');
  thumbs.push({ k, c });
  return c;
}
function renderThumbs() {
  for (const { k, c } of thumbs) {
    const x = c.getContext('2d');
    x.clearRect(0, 0, 60, 60);
    drawTower(x, { type: k, x: 30, y: 30, level: 0, angle: -Math.PI / 2 }, 1, true);
  }
  if (G) G.dirty = true;
}

/* ---------- interface ---------- */
const btns = {};
for (const [k, d] of Object.entries(TYPES)) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'tbtn'; b.style.setProperty('--c', d.col);
  const nm = document.createElement('span');
  nm.className = 'nm';
  nm.appendChild(makeThumb(k, 'mini'));
  nm.appendChild(document.createTextNode(d.name));
  const kb = document.createElement('kbd'); kb.textContent = d.key; nm.appendChild(kb);
  const cost = document.createElement('span'); cost.className = 'cost'; cost.textContent = d.cost;
  const ds = document.createElement('span'); ds.className = 'ds'; ds.textContent = d.desc;
  b.append(nm, cost, ds);
  b.addEventListener('click', () => { G.type = G.type === k ? null : k; G.sel = null; G.dirty = true; });
  $('towers').appendChild(b);
  btns[k] = b;
}

const plural = (k, n) => n + ' ' + (n === 1 ? k : k === 'boss' ? 'bosses' : k + 's');

function refreshUI() {
  $('lvlName').textContent = L.name;
  $('lives').textContent = G.lives;
  $('gold').textContent = G.gold;
  $('wave').textContent = G.wave;
  $('best').textContent = bests[L.id] || 0;
  $('season').textContent = G.winter ? 'Winter' : 'Autumn';
  $('seasonChip').classList.toggle('winter', G.winter);
  $('seasonChip').classList.toggle('autumn', !G.winter);
  $('winterNote').hidden = !G.winter;
  for (const [k, b] of Object.entries(btns)) {
    b.setAttribute('aria-pressed', G.type === k ? 'true' : 'false');
    b.classList.toggle('poor', G.gold < TYPES[k].cost);
  }
  const t = G.sel;
  $('selEmpty').hidden = !!t;
  $('selBody').hidden = !t;
  $('selTitle').textContent = t ? TYPES[t.type].name + ' tower' : 'Selected tower';
  if (t) {
    const st = stats(t), uc = upCost(t), fr = t.type === 'frost';
    const isDot = t.type === 'poison' || t.type === 'fire';
    $('sDmg').textContent = isDot ? Math.round(st.dmg) + ' / s (area)' : Math.round(st.dmg) + (st.splash ? ' (area)' : '');
    $('sRng').textContent = (st.range / S).toFixed(1) + ' tiles';
    $('sRate').textContent = (1 / st.rate).toFixed(1) + ' / s';
    $('sSlowT').hidden = $('sSlow').hidden = !fr;
    if (fr) $('sSlow').textContent = Math.round(st.slow * 100) + '%' + (G.winter ? ' (winter)' : '');
    $('sLvl').textContent = (t.level + 1) + ' / 3';
    $('upBtn').textContent = uc === null ? 'Max level' : 'Upgrade · ' + uc;
    $('upBtn').disabled = uc === null || G.gold < uc;
    $('sellBtn').textContent = 'Sell +' + sellVal(t);
  }
  const n = G.wave + 1, c = waveCounts(n), parts = [];
  for (const k of ENEMY_ORDER) if (c[k]) parts.push(plural(k, c[k]));
  const cd = countdown();
  $('preview').textContent = 'Wave ' + n + (isWinter(n) ? ' (winter)' : ' (autumn)') + (cd >= 0 ? ' starts in ' + cd + 's' : ' is next') + ': ' + parts.join(', ') + '.';
  $('pauseBtn').textContent = G.paused ? 'Resume' : 'Pause';
  $('pauseBtn').setAttribute('aria-pressed', G.paused ? 'true' : 'false');
  $('speedBtn').textContent = G.speed + '×';
  ui.g = G.gold; ui.l = G.lives; ui.w = G.wave; ui.c = cd;
  G.dirty = false;
}

function upgrade() {
  const t = G.sel;
  if (!t || G.over) return;
  const c = upCost(t);
  if (c === null) return;
  if (G.gold < c) { say('Not enough gold to upgrade'); return; }
  G.gold -= c; t.spent += c; t.level++;
  ring(t.x, t.y, S * 0.6, look[t.type].col);
  G.dirty = true;
}
function sell() {
  const t = G.sel;
  if (!t || G.over) return;
  G.gold += sellVal(t);
  G.towers = G.towers.filter(x => x !== t);
  G.sel = null; G.dirty = true;
}
function togglePause() { if (!G.over && !G.menu) { G.paused = !G.paused; G.dirty = true; } }

/* level select */
function previewLevel(c, lv) {
  const x = c.getContext('2d'), u = c.width / COLS;
  for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) {
    x.fillStyle = (q + r) % 2 ? '#745e36' : '#6c5832'; x.fillRect(q * u, r * u, u, u);
  }
  const trace = () => { x.beginPath(); lv.wps.forEach(([a, b], i) => i ? x.lineTo((a + 0.5) * u, (b + 0.5) * u) : x.moveTo((a + 0.5) * u, (b + 0.5) * u)); };
  x.lineJoin = 'round';
  trace(); x.lineWidth = u * 0.84; x.strokeStyle = '#4a381d'; x.stroke();
  trace(); x.lineWidth = u * 0.66; x.strokeStyle = '#b89c68'; x.stroke();
  const e = lv.wps[lv.wps.length - 1];
  if (e[0] < COLS) { x.beginPath(); x.arc((e[0] + 0.5) * u, (e[1] + 0.5) * u, u * 0.6, 0, 7); x.fillStyle = '#2f1d14'; x.fill(); }
}
function buildMenu() {
  const box = $('levels');
  box.textContent = '';
  LEVELS.forEach((lv, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'lvl';
    const c = document.createElement('canvas'); c.width = 320; c.height = 200;
    previewLevel(c, lv);
    const nm = document.createElement('b'); nm.textContent = lv.name;
    const d = document.createElement('span'); d.className = 'd'; d.textContent = lv.desc;
    const m = document.createElement('span'); m.className = 'm';
    const a = document.createElement('span'); a.textContent = lv.lives + ' lives · ' + lv.gold + ' gold';
    const bw = document.createElement('span'); bw.className = 'bw'; bw.textContent = bests[lv.id] ? 'Best: wave ' + bests[lv.id] : 'Not played';
    m.append(a, bw);
    b.append(c, nm, d, m);
    b.addEventListener('click', () => startLevel(i));
    box.appendChild(b);
  });
}
function showMenu() {
  G.menu = true;
  buildMenu();
  $('menu').hidden = false; $('stage').hidden = true;
  $('backBtn').hidden = !(G.started && !G.over);
  $('menuBtn').hidden = true;
  $('hud').hidden = true;
}
function showGame() {
  G.menu = false;
  $('menu').hidden = true; $('stage').hidden = false; $('menuBtn').hidden = false; $('hud').hidden = false;
  G.dirty = true;
  renderThumbs();
}
function startLevel(i) {
  loadLevel(LEVELS[i]);
  init();
  showGame();
  say('Pick a tower, then click a tile to build.');
}

$('upBtn').addEventListener('click', upgrade);
$('sellBtn').addEventListener('click', sell);
$('pauseBtn').addEventListener('click', togglePause);
$('speedBtn').addEventListener('click', () => { G.speed = G.speed === 1 ? 2 : 1; G.dirty = true; });
$('again').addEventListener('click', () => { init(); say('Pick a tower, then click a tile to build.'); });
$('overMenu').addEventListener('click', showMenu);
$('menuBtn').addEventListener('click', showMenu);
$('backBtn').addEventListener('click', showGame);

function cellAt(e) {
  const r = cv.getBoundingClientRect();
  return { c: Math.floor((e.clientX - r.left) / r.width * COLS), r: Math.floor((e.clientY - r.top) / r.height * ROWS) };
}
cv.addEventListener('pointermove', e => { G.hover = cellAt(e); });
cv.addEventListener('pointerdown', e => { G.hover = cellAt(e); });
cv.addEventListener('pointerleave', () => { G.hover = null; });
cv.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') G.hover = null; });
cv.addEventListener('contextmenu', e => { e.preventDefault(); G.type = null; G.sel = null; G.dirty = true; });
cv.addEventListener('click', e => {
  if (G.over || G.menu) return;
  const { c, r } = cellAt(e);
  const t = towerAt(c, r);
  if (t) { G.sel = t; G.type = null; G.dirty = true; return; }
  if (G.type) {
    const d = TYPES[G.type];
    if (!canBuild(c, r)) { if (c >= 0 && c < COLS && r >= 0 && r < ROWS) say(road.has(r * COLS + c) ? 'Towers can’t go on the road' : 'That tile is taken'); return; }
    if (G.gold < d.cost) { say('Need ' + d.cost + ' gold for a ' + d.name); return; }
    const nt = addTower(G.type, c, r);
    ring(nt.x, nt.y, S * 0.6, look[G.type].col);
    G.dirty = true;
  } else {
    G.sel = null; G.dirty = true;
  }
});
addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || G.menu) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  const k = e.key.toLowerCase();
  const keys = Object.keys(TYPES);
  if (k >= '1' && k <= String(keys.length)) { G.type = keys[+k - 1]; G.sel = null; G.dirty = true; }
  else if (k === 'p') togglePause();
  else if (k === 'u') upgrade();
  else if (k === 's') sell();
  else if (k === 'escape') { G.type = null; G.sel = null; G.dirty = true; }
});

/* ---------- loop ---------- */
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!G.menu) {
    if (!G.paused && !G.over) for (let i = 0; i < G.speed; i++) update(dt);
    if (G.msgT > 0) { G.msgT -= dt; if (G.msgT <= 0) $('msg').classList.remove('on'); }
    if (G.dirty || G.gold !== ui.g || G.lives !== ui.l || G.wave !== ui.w || countdown() !== ui.c) refreshUI();
    draw(now);
  }
  requestAnimationFrame(frame);
}
loadLevel(LEVELS[0]);
init();
loadSprites(SPRITES.towers, towerImg, renderThumbs);
loadSprites(SPRITES.enemies, enemyImg);
renderThumbs();
refreshUI();
showMenu();
requestAnimationFrame(frame);
})();