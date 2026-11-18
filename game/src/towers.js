// towers.js — the three defences the player builds and upgrades.
// One job: tower shape, targeting (furthest along the path), firing.
import { TOWER_TYPES, towerStats, MAX_TOWER_LEVEL } from './config.js';
import { tileCenter } from './path.js';

let nextId = 1;

export class Tower {
  constructor(typeKey, col, row) {
    const def = TOWER_TYPES[typeKey];
    this.id = nextId++;
    this.type = typeKey;
    this.name = def.name;
    this.col = col;
    this.row = row;
    const c = tileCenter(col, row);
    this.x = c.x;
    this.y = c.y;
    this.level = 1;
    this.invested = def.cost;
    this.cooldown = 0;
    this.angle = -Math.PI / 2;
    this.muzzle = 0; // muzzle-flash timer
    this.color = def.color;
    this.dark = def.dark;
  }

  get stats() {
    return towerStats(this.type, this.level);
  }

  get upgradeCost() {
    if (this.level >= MAX_TOWER_LEVEL) return null;
    return Math.round(TOWER_TYPES[this.type].cost * 0.9 * this.level);
  }

  get sellValue() {
    return Math.floor(this.invested * 0.7);
  }

  // Furthest-along-path enemy inside range.
  acquire(enemies) {
    const s = this.stats;
    let best = null;
    for (const e of enemies) {
      if (e.dead || e.leaked) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d <= s.range + e.radius && (!best || e.dist > best.dist)) best = e;
    }
    return best;
  }

  update(dt, enemies, fire) {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.muzzle > 0) this.muzzle -= dt;
    const target = this.acquire(enemies);
    if (target) {
      this.angle = Math.atan2(target.y - this.y, target.x - this.x);
      if (this.cooldown <= 0) {
        this.cooldown = 1 / this.stats.rate;
        this.muzzle = 0.08;
        fire(this, target);
      }
    }
  }
}

export function makeTower(typeKey, col, row) {
  return new Tower(typeKey, col, row);
}
