// config.js — every tunable number for Lumenhold lives here.
// One job: constants, tower definitions, enemy definitions, palette.
export const TILE = 64;
export const COLS = 15;
export const ROWS = 9;
export const HUD_H = 64;
export const SHOP_H = 64;
export const GRID_Y = HUD_H;
export const CANVAS_W = COLS * TILE; // 960
export const CANVAS_H = HUD_H + ROWS * TILE + SHOP_H; // 704

export const START_COINS = 140;
export const START_LIVES = 20;
export const TOTAL_WAVES = 15;
export const SELL_RATE = 0.7;
export const WAVE_BONUS_BASE = 25;
export const INTEREST_RATE = 0.05;
export const INTEREST_CAP = 30;
export const MAX_TOWER_LEVEL = 3;

// The lantern (goal) sits on this tile; enemies that reach it cost lives.
export const LANTERN_TILE = { col: 13, row: 8 };

// Path waypoints in tile coordinates (centres). Enters from the left edge.
export const PATH_TILES = [
  [-1, 1], [12, 1], [12, 4], [2, 4], [2, 7], [12, 7], [12, 8], [13, 8],
];

export const TOWER_TYPES = {
  spark: {
    key: 'spark', name: 'Spark Spire', hotkey: '1', cost: 50,
    range: 2.4 * TILE, damage: 9, rate: 2.2, projSpeed: 560,
    color: '#ffd166', dark: '#b8860b',
    blurb: 'Fast bolts. Cheap and reliable.', shop: '9 dmg · 2.2/s',
  },
  frost: {
    key: 'frost', name: 'Frost Obelisk', hotkey: '2', cost: 70,
    range: 2.1 * TILE, damage: 4, rate: 1.1, projSpeed: 480,
    slowFactor: 0.55, slowSecs: 1.6,
    color: '#7dd3fc', dark: '#0369a1',
    blurb: 'Chills foes, slowing them down.', shop: '4 dmg · slows 45%',
  },
  ember: {
    key: 'ember', name: 'Ember Cannon', hotkey: '3', cost: 110,
    range: 2.7 * TILE, damage: 30, rate: 0.55, projSpeed: 380,
    splash: 58,
    color: '#fb923c', dark: '#9a3412',
    blurb: 'Slow shells that burst and splash.', shop: '30 dmg · splash',
  },
};

// Multipliers applied per upgrade level (level 1 = base).
export function towerStats(type, level) {
  const t = TOWER_TYPES[type];
  const l = level - 1;
  return {
    range: t.range * (1 + 0.12 * l),
    damage: t.damage * Math.pow(1.6, l),
    rate: t.rate * (1 + 0.1 * l),
    projSpeed: t.projSpeed,
    slowFactor: t.slowFactor,
    slowSecs: t.slowSecs,
    splash: t.splash ? t.splash * (1 + 0.15 * l) : 0,
  };
}

export const ENEMY_TYPES = {
  mote: {
    key: 'mote', name: 'Mote', hp: 26, speed: 64, bounty: 6, lives: 1,
    radius: 11, color: '#c084fc', dark: '#7e22ce', armor: 0,
  },
  gloom: {
    key: 'gloom', name: 'Gloom', hp: 48, speed: 43, bounty: 9, lives: 1,
    radius: 13, color: '#a3e635', dark: '#4d7c0f', armor: 0,
  },
  dart: {
    key: 'dart', name: 'Dart', hp: 32, speed: 98, bounty: 10, lives: 1,
    radius: 10, color: '#f472b6', dark: '#be185d', armor: 0,
  },
  bulwark: {
    key: 'bulwark', name: 'Bulwark', hp: 165, speed: 29, bounty: 18, lives: 2,
    radius: 16, color: '#94a3b8', dark: '#475569', armor: 2,
  },
  boss: {
    key: 'boss', name: 'Dreadmaw', hp: 1500, speed: 25, bounty: 150, lives: 5,
    radius: 25, color: '#ef4444', dark: '#7f1d1d', armor: 3,
  },
};

// Enemy HP grows with the wave number.
export function enemyHpScale(wave) {
  return (1 + 0.22 * (wave - 1)) * Math.pow(1.12, wave - 1);
}

export const PALETTE = {
  bgTop: '#0b1026',
  bgBottom: '#131a33',
  grassA: '#16281f',
  grassB: '#12241c',
  path: '#4a3823',
  pathEdge: '#6b543a',
  hudBg: 'rgba(8, 12, 28, 0.92)',
  hudLine: '#2b3a67',
  text: '#e8ecf8',
  muted: '#9aa7c7',
  gold: '#ffd166',
  heart: '#f87171',
  panel: 'rgba(10, 15, 34, 0.94)',
  panelLine: '#33477e',
  button: '#22315e',
  buttonHot: '#2f4480',
  danger: '#ef4444',
  good: '#4ade80',
};
