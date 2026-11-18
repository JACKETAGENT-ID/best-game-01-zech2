// enemies.js — the shades that march on the lantern.
// One job: enemy shape, movement along the path, slowing, damage, death.
import { ENEMY_TYPES, enemyHpScale } from './config.js';

let nextId = 1;

export class Enemy {
  constructor(typeKey, wave, waypoints) {
    const def = ENEMY_TYPES[typeKey];
    this.id = nextId++;
    this.type = typeKey;
    this.name = def.name;
    this.maxHp = Math.round(def.hp * enemyHpScale(wave));
    this.hp = this.maxHp;
    this.baseSpeed = def.speed;
    this.bounty = def.bounty;
    this.livesCost = def.lives;
    this.radius = def.radius;
    this.color = def.color;
    this.dark = def.dark;
    this.armor = def.armor;
    this.waypoints = waypoints;
    this.wp = 1; // heading for waypoint 1 (waypoint 0 is off-screen)
    this.x = waypoints[0].x;
    this.y = waypoints[0].y;
    this.slowUntil = 0;
    this.slowFactor = 1;
    this.flash = 0; // hit flash timer
    this.dead = false;
    this.leaked = false;
    this.dist = 0; // distance travelled, for "first" targeting
    this.wobble = Math.random() * 6.28;
  }

  get speed() {
    return this.baseSpeed * this.slowFactor;
  }

  get slowed() {
    return this.slowFactor < 1;
  }

  applySlow(factor, secs, now) {
    // Strongest (smallest factor) slow wins; refresh duration.
    if (factor < this.slowFactor || this.slowUntil <= now) this.slowFactor = factor;
    this.slowUntil = now + secs;
  }

  takeDamage(raw, now) {
    const dmg = Math.max(1, raw - this.armor);
    this.hp -= dmg;
    this.flash = 0.09;
    if (this.hp <= 0) this.dead = true;
    return dmg;
  }

  update(dt, now) {
    if (this.slowUntil <= now) this.slowFactor = 1;
    if (this.flash > 0) this.flash -= dt;
    if (this.wp >= this.waypoints.length) {
      this.leaked = true;
      return;
    }
    const target = this.waypoints[this.wp];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const d = Math.hypot(dx, dy);
    const step = this.speed * dt;
    if (d <= step) {
      this.x = target.x; this.y = target.y;
      this.dist += d;
      this.wp++;
    } else {
      this.x += (dx / d) * step;
      this.y += (dy / d) * step;
      this.dist += step;
    }
    this.wobble += dt * 6;
  }
}

export function makeEnemy(typeKey, wave, waypoints) {
  return new Enemy(typeKey, wave, waypoints);
}
