// game.js — the heart of Lumenhold: state machine, economy, combat,
// projectiles, particles and floating text. Rendering lives in render.js,
// input in input.js; this file owns the rules.
import {
  START_COINS, START_LIVES, TOTAL_WAVES, SELL_RATE,
  INTEREST_RATE, INTEREST_CAP, MAX_TOWER_LEVEL,
  TOWER_TYPES, CANVAS_W, CANVAS_H,
} from './config.js';
import { pathWaypoints, canBuild } from './path.js';
import { makeEnemy } from './enemies.js';
import { makeTower } from './towers.js';
import { waveComposition, waveSpawnGap, waveBonus, isBossWave } from './waves.js';
import { sfx } from './audio.js';

export const BEST_KEY = 'lumenhold-best-score';

export function loadBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}
export function saveBest(score) {
  try {
    if (score > loadBest()) localStorage.setItem(BEST_KEY, String(score));
  } catch { /* storage unavailable; score just isn't kept */ }
}

export class Game {
  constructor() {
    this.waypoints = pathWaypoints();
    this.reset();
  }

  reset() {
    this.state = 'title'; // title | playing | paused | gameover | victory
    this.coins = START_COINS;
    this.lives = START_LIVES;
    this.wave = 0; // wave in progress (0 = none sent yet)
    this.score = 0;
    this.kills = 0;
    this.leaks = 0;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.texts = [];
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawnGap = 0.8;
    this.waveActive = false;
    this.waveIncoming = false;
    this.time = 0;
    this.speed = 1; // 1x or 2x
    this.shake = 0;
    this.buildType = 'spark'; // tower type chosen in the shop
    this.selected = null; // placed tower selected for upgrade/sell
    this.hover = null; // {col,row} tile under the mouse
    this.message = '';
    this.messageUntil = 0;
    this.best = loadBest();
    this.stats = { earned: 0, spent: 0, leaked: 0 };
    this.endStats = null;
  }

  start() {
    this.reset();
    this.state = 'playing';
    sfx.wave();
  }

  // ---- economy -------------------------------------------------------
  get interestPreview() {
    return Math.min(INTEREST_CAP, Math.floor(this.coins * INTEREST_RATE));
  }

  earn(amount, x, y, label) {
    this.coins += amount;
    this.stats.earned += amount;
    if (x !== undefined) this.addText(x, y, '+' + amount + 'g', '#ffd166');
    if (label) this.flash(label);
  }

  // ---- building ------------------------------------------------------
  tryPlace(col, row) {
    const def = TOWER_TYPES[this.buildType];
    if (!canBuild(col, row, this.towers)) { sfx.error(); return 'blocked'; }
    if (this.coins < def.cost) {
      this.flash('Not enough gold — need ' + def.cost + 'g');
      sfx.error();
      return 'poor';
    }
    this.coins -= def.cost;
    this.stats.spent += def.cost;
    const t = makeTower(this.buildType, col, row);
    this.towers.push(t);
    this.selected = t;
    sfx.place();
    this.burst(t.x, t.y, def.color, 10);
    return 'ok';
  }

  tryUpgrade() {
    const t = this.selected;
    if (!t || t.level >= MAX_TOWER_LEVEL) return;
    const cost = t.upgradeCost;
    if (this.coins < cost) {
      this.flash('Need ' + cost + 'g to upgrade');
      sfx.error();
      return;
    }
    this.coins -= cost;
    this.stats.spent += cost;
    t.level++;
    t.invested += cost;
    sfx.upgrade();
    this.burst(t.x, t.y, '#ffffff', 14);
    this.addText(t.x, t.y - 26, 'LEVEL ' + t.level + '!', '#4ade80');
  }

  trySell() {
    const t = this.selected;
    if (!t) return;
    const value = Math.floor(t.invested * SELL_RATE);
    this.coins += value;
    this.towers = this.towers.filter((o) => o !== t);
    this.selected = null;
    sfx.sell();
    this.flash('Sold for ' + value + 'g');
  }

  // ---- waves ---------------------------------------------------------
  sendWave() {
    if (this.state !== 'playing' || this.waveActive) return false;
    if (this.wave >= TOTAL_WAVES) return false;
    this.wave++;
    this.spawnQueue = waveComposition(this.wave);
    this.spawnGap = waveSpawnGap(this.wave);
    this.spawnTimer = 0.4;
    this.waveActive = true;
    this.waveIncoming = false;
    sfx.wave();
    this.flash(
      isBossWave(this.wave)
        ? 'WAVE ' + this.wave + ' — the DREADMAW approaches!'
        : 'Wave ' + this.wave + ' of ' + TOTAL_WAVES,
    );
    return true;
  }

  waveCleared() {
    const bonus = waveBonus(this.wave);
    const interest = this.interestPreview;
    this.coins += bonus + interest;
    this.stats.earned += bonus + interest;
    this.score += 100 * this.wave;
    this.addText(CANVAS_W / 2, 200, 'WAVE CLEAR  +' + bonus + 'g  (interest +' + interest + 'g)', '#4ade80');
    sfx.coin();
    if (this.wave >= TOTAL_WAVES) {
      this.win();
    } else {
      this.flash('Wave ' + this.wave + ' cleared!  +' + (bonus + interest) + 'g');
    }
  }

  win() {
    this.state = 'victory';
    this.score += this.lives * 50;
    this.endStats = this.finishStats();
    saveBest(this.score);
    sfx.victory();
  }

  lose() {
    this.state = 'gameover';
    this.endStats = this.finishStats();
    saveBest(this.score);
    sfx.defeat();
  }

  finishStats() {
    return {
      score: this.score, wave: this.wave, kills: this.kills,
      earned: this.stats.earned, spent: this.stats.spent,
      leaked: this.leaks, lives: this.lives, best: Math.max(this.best, this.score),
    };
  }

  // ---- combat --------------------------------------------------------
  fireTower(tower, target) {
    const s = tower.stats;
    this.projectiles.push({
      x: tower.x, y: tower.y,
      target, tx: target.x, ty: target.y,
      speed: s.projSpeed, damage: s.damage,
      type: tower.type, slowFactor: s.slowFactor, slowSecs: s.slowSecs,
      splash: s.splash, color: tower.color,
    });
    if (tower.type === 'ember') sfx.boom();
    else if (tower.type === 'frost') sfx.frost();
    else sfx.shoot();
  }

  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const v = 40 + Math.random() * 120;
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: 0.35 + Math.random() * 0.35, max: 0.7, color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  addText(x, y, text, color) {
    this.texts.push({ x, y, text, color, life: 1.1 });
  }

  flash(msg) {
    this.message = msg;
    this.messageUntil = this.time + 2.6;
  }

  killEnemy(e) {
    e.dead = true;
    this.kills++;
    this.score += 10;
    this.earn(e.bounty, e.x, e.y - 14);
    this.burst(e.x, e.y, e.color, e.type === 'boss' ? 30 : 12);
    sfx.kill();
  }

  leakEnemy(e) {
    e.leaked = true;
    this.leaks++;
    this.lives -= e.livesCost;
    this.stats.leaked += e.livesCost;
    this.shake = 0.35;
    sfx.leak();
    this.addText(e.x - 10, e.y - 30, '-' + e.livesCost + ' ❤', '#f87171');
    if (this.lives <= 0) {
      this.lives = 0;
      this.lose();
    }
  }

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      if (p.target && !p.target.dead && !p.target.leaked) {
        p.tx = p.target.x; p.ty = p.target.y;
      }
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (d <= step + 6) {
        // Impact.
        if (p.splash > 0) {
          for (const e of this.enemies) {
            if (e.dead || e.leaked) continue;
            if (Math.hypot(e.x - p.tx, e.y - p.ty) <= p.splash + e.radius) {
              const dealt = e.takeDamage(p.damage, this.time);
              if (e.hp <= 0) this.killEnemy(e);
            }
          }
          this.burst(p.tx, p.ty, p.color, 10);
        } else if (p.target && !p.target.dead && !p.target.leaked) {
          const e = p.target;
          e.takeDamage(p.damage, this.time);
          if (p.slowFactor) e.applySlow(p.slowFactor, p.slowSecs, this.time);
          if (e.hp <= 0) this.killEnemy(e);
        }
        p.done = true;
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.done);
  }

  // ---- main step -----------------------------------------------------
  update(rawDt) {
    const dt = Math.min(rawDt, 0.05) * this.speed;
    if (this.state !== 'playing') {
      // Idle animation on menus: keep particles/texts drifting.
      this.time += dt;
      this.updateFx(dt);
      return;
    }
    this.time += dt;
    if (this.shake > 0) this.shake -= dt;

    // Spawning.
    if (this.waveActive && this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = this.spawnGap;
        const type = this.spawnQueue.shift();
        this.enemies.push(makeEnemy(type, this.wave, this.waypoints));
      }
    }

    // Towers fire.
    for (const t of this.towers) t.update(dt, this.enemies, (tw, tg) => this.fireTower(tw, tg));
    this.updateProjectiles(dt);

    // Enemies walk.
    for (const e of this.enemies) e.update(dt, this.time);
    for (const e of this.enemies) {
      if (e.leaked) this.leakEnemy(e);
    }
    this.enemies = this.enemies.filter((e) => !e.dead && !e.leaked);

    // Wave cleared?
    if (this.waveActive && this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.waveActive = false;
      this.waveCleared();
    }
    this.updateFx(dt);
  }

  updateFx(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.92; p.vy *= 0.92;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const t of this.texts) { t.y -= 26 * dt; t.life -= dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
  }

  // ---- helpers for UI -------------------------------------------------
  get waveLabel() {
    return this.wave === 0 ? '—' : this.wave + '/' + TOTAL_WAVES;
  }
  get enemiesLeft() {
    return this.spawnQueue.length + this.enemies.length;
  }
  get canSendWave() {
    return this.state === 'playing' && !this.waveActive && this.wave < TOTAL_WAVES;
  }
}
