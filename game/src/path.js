// path.js — the winding road the shades walk, and the buildable grid.
// One job: turn PATH_TILES into pixel waypoints and answer "can I build here?"
import { TILE, COLS, ROWS, GRID_Y, PATH_TILES, LANTERN_TILE } from './config.js';
import { mulberry32 } from './random.js';

export function tileCenter(col, row) {
  return { x: col * TILE + TILE / 2, y: GRID_Y + row * TILE + TILE / 2 };
}

export function pathWaypoints() {
  return PATH_TILES.map(([c, r]) => tileCenter(c, r));
}

const pathSet = new Set(PATH_TILES.map(([c, r]) => c + ',' + r));

export function isPathTile(col, row) {
  return pathSet.has(col + ',' + row);
}

export function isLanternTile(col, row) {
  return col === LANTERN_TILE.col && row === LANTERN_TILE.row;
}

export function inGrid(col, row) {
  return col >= 0 && col < COLS && row >= 0 && row < ROWS;
}

export function canBuild(col, row, towers) {
  if (!inGrid(col, row)) return false;
  if (isPathTile(col, row) || isLanternTile(col, row)) return false;
  return !towers.some((t) => t.col === col && t.row === row);
}

// Deterministic garden decoration: flowers, pebbles and tufts per tile,
// seeded once so every render (and every screenshot) looks the same.
export function gardenDecor() {
  const rng = mulberry32(20261118);
  const spots = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (isPathTile(col, row) || isLanternTile(col, row)) continue;
      const roll = rng();
      if (roll < 0.22) {
        spots.push({
          kind: roll < 0.1 ? 'flower' : 'tuft',
          x: col * TILE + 10 + rng() * (TILE - 20),
          y: GRID_Y + row * TILE + 10 + rng() * (TILE - 20),
          hue: rng(),
        });
      } else if (roll < 0.28) {
        spots.push({
          kind: 'pebble',
          x: col * TILE + 12 + rng() * (TILE - 24),
          y: GRID_Y + row * TILE + 12 + rng() * (TILE - 24),
          hue: rng(),
        });
      }
    }
  }
  return spots;
}

// Stars for the night sky strip above the garden.
export function skyStars() {
  const rng = mulberry32(77);
  const stars = [];
  for (let i = 0; i < 46; i++) {
    stars.push({ x: rng() * COLS * TILE, y: 6 + rng() * (GRID_Y - 14), r: 0.6 + rng() * 1.3, tw: rng() * 6.28 });
  }
  return stars;
}
