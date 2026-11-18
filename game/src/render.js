// render.js — every pixel of Lumenhold.
// One job: draw the current game state on the canvas (world, HUD, shop,
// menus). No game logic here; it only reads the Game object.
import {
  TILE, COLS, ROWS, GRID_Y, HUD_H, SHOP_H, CANVAS_W, CANVAS_H,
  TOWER_TYPES, MAX_TOWER_LEVEL, PALETTE, TOTAL_WAVES, LANTERN_TILE,
} from './config.js';
import { tileCenter, isPathTile, isLanternTile, gardenDecor, skyStars } from './path.js';

const DECOR = gardenDecor();
const STARS = skyStars();

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align = 'left', weight = '700') {
  ctx.fillStyle = color;
  ctx.font = weight + ' ' + size + 'px system-ui, "Segoe UI", sans-serif';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

// Rectangles the input layer hit-tests. Filled by drawHud/drawShop so the
// two modules agree on button geometry.
export const ui = { buttons: [], shopCards: [], panelButtons: [] };

export function draw(ctx, game) {
  ctx.save();
  if (game.shake > 0) {
    const m = game.shake * 14;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }
  drawBackground(ctx, game);
  drawPath(ctx);
  drawLantern(ctx, game);
  drawTowers(ctx, game);
  drawEnemies(ctx, game);
  drawProjectiles(ctx, game);
  drawParticles(ctx, game);
  drawTexts(ctx, game);
  drawPlacement(ctx, game);
  ctx.restore();
  drawHud(ctx, game);
  drawShop(ctx, game);
  if (game.selected) drawTowerPanel(ctx, game);
  if (game.state === 'title') drawTitle(ctx, game);
  if (game.state === 'gameover') drawEnd(ctx, game, false);
  if (game.state === 'victory') drawEnd(ctx, game, true);
  if (game.state === 'paused') drawPaused(ctx, game);
  if (game.time < game.messageUntil && game.message) {
    text(ctx, game.message, CANVAS_W / 2, HUD_H + 26, 17, '#fef3c7', 'center');
  }
}

function drawBackground(ctx, game) {
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  g.addColorStop(0, PALETTE.bgTop);
  g.addColorStop(1, PALETTE.bgBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // Stars in the HUD strip.
  for (const s of STARS) {
    const a = 0.35 + 0.4 * Math.abs(Math.sin(game.time * 0.7 + s.tw));
    ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
  }
  // Grass checker.
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      ctx.fillStyle = (col + row) % 2 === 0 ? PALETTE.grassA : PALETTE.grassB;
      ctx.fillRect(col * TILE, GRID_Y + row * TILE, TILE, TILE);
    }
  }
  // Garden decoration.
  for (const d of DECOR) {
    if (d.kind === 'flower') {
      ctx.fillStyle = d.hue < 0.5 ? '#f472b6' : '#facc15';
      ctx.beginPath(); ctx.arc(d.x, d.y, 3.4, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(d.x - 1, d.y - 1, 1.2, 0, 6.283); ctx.fill();
    } else if (d.kind === 'tuft') {
      ctx.strokeStyle = '#2f6b4a'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(d.x - 4, d.y + 3); ctx.lineTo(d.x - 2, d.y - 4);
      ctx.moveTo(d.x, d.y + 3); ctx.lineTo(d.x, d.y - 5);
      ctx.moveTo(d.x + 4, d.y + 3); ctx.lineTo(d.x + 2, d.y - 4);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#3d4a5c';
      ctx.beginPath(); ctx.arc(d.x, d.y, 3, 0, 6.283); ctx.fill();
    }
  }
}

function drawPath(ctx) {
  ctx.strokeStyle = PALETTE.pathEdge;
  ctx.lineWidth = TILE - 6;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  const pts = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (isPathTile(col, row)) pts.push(tileCenter(col, row));
    }
  }
  // Walk the path in waypoint order instead of scan order.
  ctx.beginPath();
  ctx.moveTo(-TILE / 2, tileCenter(0, 1).y);
  const wp = [[12, 1], [12, 4], [2, 4], [2, 7], [12, 7], [12, 8], [13, 8]];
  for (const [c, r] of wp) { const p = tileCenter(c, r); ctx.lineTo(p.x, p.y); }
  ctx.stroke();
  ctx.strokeStyle = PALETTE.path;
  ctx.lineWidth = TILE - 16;
  ctx.stroke();
  // Dashed centre line.
  ctx.strokeStyle = 'rgba(214, 182, 130, 0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 14]);
  ctx.beginPath();
  ctx.moveTo(-TILE / 2, tileCenter(0, 1).y);
  for (const [c, r] of wp) { const p = tileCenter(c, r); ctx.lineTo(p.x, p.y); }
  ctx.stroke();
  ctx.setLineDash([]);
  void pts;
}

function drawLantern(ctx, game) {
  const c = tileCenter(LANTERN_TILE.col, LANTERN_TILE.row);
  const pulse = 0.75 + 0.25 * Math.sin(game.time * 2.2);
  const glow = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, 74 * pulse);
  glow.addColorStop(0, 'rgba(255, 214, 120, 0.85)');
  glow.addColorStop(0.5, 'rgba(255, 170, 60, 0.28)');
  glow.addColorStop(1, 'rgba(255, 170, 60, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(c.x, c.y, 74 * pulse, 0, 6.283); ctx.fill();
  // Stone base.
  ctx.fillStyle = '#3b4256';
  rr(ctx, c.x - 22, c.y + 8, 44, 14, 5); ctx.fill();
  // Crystal.
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.moveTo(c.x, c.y - 26); ctx.lineTo(c.x + 15, c.y - 4);
  ctx.lineTo(c.x + 9, c.y + 12); ctx.lineTo(c.x - 9, c.y + 12);
  ctx.lineTo(c.x - 15, c.y - 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff7cc';
  ctx.beginPath();
  ctx.moveTo(c.x, c.y - 26); ctx.lineTo(c.x + 7, c.y - 4);
  ctx.lineTo(c.x, c.y + 12); ctx.lineTo(c.x - 7, c.y - 4);
  ctx.closePath(); ctx.fill();
}

function drawTowers(ctx, game) {
  for (const t of game.towers) {
    // Base.
    ctx.fillStyle = '#232c47';
    ctx.beginPath(); ctx.arc(t.x, t.y + 4, 22, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#313d63';
    ctx.beginPath(); ctx.arc(t.x, t.y, 20, 0, 6.283); ctx.fill();
    if (t.type === 'spark') {
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y - 20); ctx.lineTo(t.x + 12, t.y + 8);
      ctx.lineTo(t.x - 12, t.y + 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(t.x, t.y - 2, 4.5, 0, 6.283); ctx.fill();
    } else if (t.type === 'frost') {
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y - 22); ctx.lineTo(t.x + 10, t.y - 6);
      ctx.lineTo(t.x + 7, t.y + 12); ctx.lineTo(t.x - 7, t.y + 12);
      ctx.lineTo(t.x - 10, t.y - 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(t.x, t.y - 4, 3.5, 0, 6.283); ctx.fill();
    } else {
      // Ember cannon: barrel aims at the target.
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.angle);
      ctx.fillStyle = '#4b3a2a';
      rr(ctx, 0, -6, 26, 12, 5); ctx.fill();
      ctx.restore();
      ctx.fillStyle = t.color;
      ctx.beginPath(); ctx.arc(t.x, t.y, 13, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath(); ctx.arc(t.x, t.y, 6, 0, 6.283); ctx.fill();
    }
    if (t.muzzle > 0) {
      ctx.fillStyle = 'rgba(255,255,200,0.9)';
      ctx.beginPath(); ctx.arc(t.x, t.y - 8, 8, 0, 6.283); ctx.fill();
    }
    // Level pips.
    for (let i = 0; i < t.level; i++) {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.arc(t.x - 10 + i * 10, t.y + 24, 3, 0, 6.283); ctx.fill();
    }
    // Range ring when selected.
    if (game.selected === t) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.stats.range, 0, 6.283); ctx.stroke();
    }
  }
}

function drawEnemies(ctx, game) {
  for (const e of game.enemies) {
    const wob = Math.sin(e.wobble) * 2;
    ctx.save();
    ctx.translate(e.x, e.y + wob * 0.4);
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.color;
    if (e.type === 'dart') {
      ctx.rotate(Math.atan2(0, 1));
      ctx.beginPath();
      ctx.moveTo(e.radius + 4, 0); ctx.lineTo(-e.radius, -e.radius * 0.7);
      ctx.lineTo(-e.radius, e.radius * 0.7); ctx.closePath(); ctx.fill();
    } else if (e.type === 'bulwark') {
      rr(ctx, -e.radius, -e.radius, e.radius * 2, e.radius * 2, 5); ctx.fill();
      ctx.fillStyle = e.dark;
      rr(ctx, -e.radius + 4, -e.radius + 4, e.radius * 2 - 8, 7, 3); ctx.fill();
    } else if (e.type === 'boss') {
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, 6.283); ctx.fill();
      ctx.fillStyle = e.dark;
      ctx.beginPath();
      ctx.moveTo(-e.radius + 2, -e.radius + 8); ctx.lineTo(-e.radius - 8, -e.radius - 8);
      ctx.lineTo(-e.radius + 10, -e.radius + 2); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(e.radius - 2, -e.radius + 8); ctx.lineTo(e.radius + 8, -e.radius - 8);
      ctx.lineTo(e.radius - 10, -e.radius + 2); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, 6.283); ctx.fill();
    }
    // Eyes.
    ctx.fillStyle = '#0f172a';
    const ex = e.type === 'boss' ? 9 : 4.5;
    const ey = e.type === 'boss' ? -3 : -2;
    ctx.beginPath(); ctx.arc(-ex, ey, e.type === 'boss' ? 3.4 : 2.2, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(ex, ey, e.type === 'boss' ? 3.4 : 2.2, 0, 6.283); ctx.fill();
    // Slow tint.
    if (e.slowed) {
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 2.5, 0, 6.283); ctx.stroke();
    }
    ctx.restore();
    // HP bar.
    if (e.hp < e.maxHp) {
      const w = Math.max(26, e.radius * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 11, w, 5);
      ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#4ade80' : e.hp / e.maxHp > 0.25 ? '#facc15' : '#ef4444';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 11, w * Math.max(0, e.hp / e.maxHp), 5);
    }
  }
}

function drawProjectiles(ctx, game) {
  for (const p of game.projectiles) {
    if (p.type === 'ember') {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fff7ed';
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 6.283); ctx.fill();
    } else {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.type === 'frost' ? 3 : 3.5;
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const d = Math.hypot(dx, dy) || 1;
      ctx.lineTo(p.x - (dx / d) * 14, p.y - (dy / d) * 14);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, 6.283); ctx.fill();
    }
  }
}

function drawParticles(ctx, game) {
  for (const p of game.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.283); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTexts(ctx, game) {
  for (const t of game.texts) {
    ctx.globalAlpha = Math.min(1, t.life);
    text(ctx, t.text, t.x, t.y, 14, t.color, 'center');
  }
  ctx.globalAlpha = 1;
}

function drawPlacement(ctx, game) {
  if (game.state !== 'playing' || !game.hover) return;
  const { col, row } = game.hover;
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
  const c = tileCenter(col, row);
  const def = TOWER_TYPES[game.buildType];
  const ok = game.towers.every((t) => !(t.col === col && t.row === row))
    && !isPathTile(col, row) && !isLanternTile(col, row);
  const occupied = game.towers.some((t) => t.col === col && t.row === row);
  if (occupied) return;
  ctx.fillStyle = ok ? 'rgba(255,255,255,0.10)' : 'rgba(239,68,68,0.25)';
  ctx.fillRect(col * TILE + 2, GRID_Y + row * TILE + 2, TILE - 4, TILE - 4);
  if (ok) {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(c.x, c.y, def.range, 0, 6.283); ctx.stroke();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(c.x, c.y, 12, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawHud(ctx, game) {
  ui.buttons = [];
  ctx.fillStyle = PALETTE.hudBg;
  ctx.fillRect(0, 0, CANVAS_W, HUD_H);
  ctx.fillStyle = PALETTE.hudLine;
  ctx.fillRect(0, HUD_H - 2, CANVAS_W, 2);
  text(ctx, '⬢ LUMENHOLD', 14, 20, 18, '#fde68a');
  text(ctx, 'Defend the Last Lantern', 14, 44, 12, PALETTE.muted, 'left', '400');
  text(ctx, '🪙 ' + game.coins + 'g', 222, 32, 18, PALETTE.gold);
  text(ctx, '❤ ' + game.lives, 308, 32, 18, PALETTE.heart);
  text(ctx, 'WAVE ' + game.waveLabel, 372, 24, 15, PALETTE.text);
  if (game.waveActive) text(ctx, '👾 ' + game.enemiesLeft + ' left', 372, 47, 12, '#c084fc', 'left', '400');
  text(ctx, 'SCORE ' + game.score, 468, 32, 15, PALETTE.text);

  const btn = (x, label, enabled, id) => {
    const w = 90, h = 34, y = (HUD_H - h) / 2;
    ctx.fillStyle = enabled ? PALETTE.buttonHot : PALETTE.button;
    rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = enabled ? '#5b74b8' : PALETTE.hudLine;
    ctx.lineWidth = 1.5; rr(ctx, x, y, w, h, 8); ctx.stroke();
    text(ctx, label, x + w / 2, y + h / 2 + 1, 12, enabled ? '#fff' : PALETTE.muted, 'center');
    ui.buttons.push({ id, x, y, w, h });
  };
  // Right-aligned buttons, 90px wide with 6px gaps.
  btn(582, game.canSendWave ? '▶ Send Wave' : (game.waveActive ? 'Wave ' + game.wave + '…' : 'Done'), game.canSendWave, 'wave');
  btn(678, game.speed === 1 ? 'Speed 1×' : 'Speed 2×', true, 'speed');
  btn(774, game.state === 'paused' ? 'Resume' : 'Pause', true, 'pause');
  btn(870, '🔊', true, 'mute');
}

function drawShop(ctx, game) {
  ui.shopCards = [];
  const y = GRID_Y + ROWS * TILE;
  ctx.fillStyle = PALETTE.hudBg;
  ctx.fillRect(0, y, CANVAS_W, SHOP_H);
  ctx.fillStyle = PALETTE.hudLine;
  ctx.fillRect(0, y, CANVAS_W, 2);
  text(ctx, 'BUILD [1/2/3] — click tower, then grass:', 14, y + SHOP_H / 2, 13, PALETTE.muted, 'left', '400');
  const keys = ['spark', 'frost', 'ember'];
  keys.forEach((k, i) => {
    const def = TOWER_TYPES[k];
    const x = 300 + i * 200;
    const w = 186, h = 48, cy = y + 8;
    const active = game.buildType === k && !game.selected;
    ctx.fillStyle = active ? '#2f4480' : PALETTE.button;
    rr(ctx, x, cy, w, h, 9); ctx.fill();
    ctx.strokeStyle = active ? def.color : PALETTE.hudLine;
    ctx.lineWidth = active ? 2.5 : 1.5;
    rr(ctx, x, cy, w, h, 9); ctx.stroke();
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(x + 24, cy + h / 2, 10, 0, 6.283); ctx.fill();
    text(ctx, def.name + '  [' + def.hotkey + ']', x + 42, cy + 17, 13, '#fff');
    text(ctx, def.cost + 'g  ·  ' + def.shop, x + 42, cy + 35, 11, PALETTE.muted, 'left', '400');
    ui.shopCards.push({ type: k, x, y: cy, w, h });
  });
}

function drawTowerPanel(ctx, game) {
  ui.panelButtons = [];
  const t = game.selected;
  if (!t) return;
  const w = 300, h = 118;
  const x = CANVAS_W - w - 12, y = GRID_Y + 8;
  ctx.fillStyle = PALETTE.panel;
  rr(ctx, x, y, w, h, 10); ctx.fill();
  ctx.strokeStyle = PALETTE.panelLine;
  ctx.lineWidth = 1.5; rr(ctx, x, y, w, h, 10); ctx.stroke();
  const s = t.stats;
  text(ctx, t.name + '  ·  Lv ' + t.level, x + 14, y + 20, 15, t.color);
  text(ctx, 'DMG ' + Math.round(s.damage) + '   ·   RNG ' + Math.round(s.range / TILE * 10) / 10 + '   ·   ' + s.rate.toFixed(1) + '/s', x + 14, y + 44, 12, PALETTE.text, 'left', '400');
  if (t.type === 'frost') text(ctx, 'Slows foes by ' + Math.round((1 - s.slowFactor) * 100) + '% for ' + s.slowSecs + 's', x + 14, y + 62, 12, '#7dd3fc', 'left', '400');
  if (t.type === 'ember') text(ctx, 'Splash radius ' + Math.round(s.splash) + 'px', x + 14, y + 62, 12, '#fb923c', 'left', '400');
  const bw = 128, bh = 32, by = y + h - 42;
  const up = t.upgradeCost;
  ctx.fillStyle = up ? PALETTE.buttonHot : PALETTE.button;
  rr(ctx, x + 14, by, bw, bh, 7); ctx.fill();
  text(ctx, up ? '⬆ Upgrade ' + up + 'g' : 'MAX LEVEL', x + 14 + bw / 2, by + bh / 2, 12, up ? '#fff' : PALETTE.muted, 'center');
  ui.panelButtons.push({ id: 'upgrade', x: x + 14, y: by, w: bw, h: bh });
  ctx.fillStyle = PALETTE.button;
  rr(ctx, x + 14 + bw + 10, by, bw, bh, 7); ctx.fill();
  text(ctx, 'Sell +' + t.sellValue + 'g', x + 14 + bw + 10 + bw / 2, by + bh / 2, 12, '#fff', 'center');
  ui.panelButtons.push({ id: 'sell', x: x + 14 + bw + 10, y: by, w: bw, h: bh });
}

function overlay(ctx) {
  ctx.fillStyle = 'rgba(5, 8, 20, 0.72)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawTitle(ctx, game) {
  overlay(ctx);
  const cx = CANVAS_W / 2;
  text(ctx, '✦  LUMENHOLD  ✦', cx, 150, 54, '#fde68a', 'center');
  text(ctx, 'A tower-defence tale of the Last Lantern', cx, 196, 18, PALETTE.text, 'center', '400');
  text(ctx, 'Shades march down the road at dusk. Build spires, obelisks and', cx, 252, 16, PALETTE.muted, 'center', '400');
  text(ctx, 'cannons on the grass, spend the gold they drop, and hold the', cx, 276, 16, PALETTE.muted, 'center', '400');
  text(ctx, 'lantern through all 15 waves — a Dreadmaw boss waits every 5th.', cx, 300, 16, PALETTE.muted, 'center', '400');
  // Tower legend.
  const cards = [
    ['#ffd166', 'Spark Spire — 50g', 'Fast bolts, 2.2/s'],
    ['#7dd3fc', 'Frost Obelisk — 70g', 'Slows foes 45%'],
    ['#fb923c', 'Ember Cannon — 110g', 'Splash shells'],
  ];
  cards.forEach(([c, name, desc], i) => {
    const x = cx - 300 + i * 200;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    rr(ctx, x, 330, 190, 64, 10); ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(x + 24, 362, 11, 0, 6.283); ctx.fill();
    text(ctx, name, x + 44, 352, 13, '#fff');
    text(ctx, desc, x + 44, 372, 12, PALETTE.muted, 'left', '400');
  });
  // Start button.
  ctx.fillStyle = '#b45309';
  rr(ctx, cx - 130, 430, 260, 56, 12); ctx.fill();
  ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2;
  rr(ctx, cx - 130, 430, 260, 56, 12); ctx.stroke();
  text(ctx, '▶  START DEFENCE', cx, 459, 20, '#fff', 'center');
  text(ctx, 'Click a tower card (or press 1 / 2 / 3), click grass to build · Space sends the wave', cx, 516, 13, PALETTE.muted, 'center', '400');
  text(ctx, 'P pause · F speed · M sound · Esc deselect · Click a built tower to upgrade or sell', cx, 538, 13, PALETTE.muted, 'center', '400');
  if (game.best > 0) text(ctx, 'Best score: ' + game.best, cx, 580, 15, PALETTE.gold, 'center');
  ui.buttons.push({ id: 'start', x: cx - 130, y: 430, w: 260, h: 56 });
}

function drawEnd(ctx, game, won) {
  overlay(ctx);
  const cx = CANVAS_W / 2;
  const st = game.endStats || game.finishStats();
  if (won) {
    const stars = game.lives >= 18 ? '★★★' : game.lives >= 12 ? '★★☆' : '★☆☆';
    text(ctx, '🏆  THE LANTERN ENDURES!', cx, 150, 42, '#fde68a', 'center');
    text(ctx, stars, cx, 200, 34, '#ffd166', 'center');
    text(ctx, 'All 15 waves held. The night garden is safe — for now.', cx, 238, 16, PALETTE.text, 'center', '400');
  } else {
    text(ctx, '🌑  THE LANTERN FADES…', cx, 150, 42, '#f87171', 'center');
    text(ctx, 'The shades overran the garden on wave ' + st.wave + ' of ' + TOTAL_WAVES + '.', cx, 200, 16, PALETTE.text, 'center', '400');
  }
  const rows = [
    ['Final score', st.score], ['Best score', st.best], ['Waves held', st.wave + ' / ' + TOTAL_WAVES],
    ['Shades banished', st.kills], ['Gold earned', st.earned + 'g'], ['Lives left', st.lives],
  ];
  rows.forEach(([label, value], i) => {
    const y = 280 + i * 32;
    text(ctx, label, cx - 150, y, 16, PALETTE.muted, 'left', '400');
    text(ctx, String(value), cx + 150, y, 16, '#fff', 'right');
  });
  ctx.fillStyle = '#b45309';
  rr(ctx, cx - 130, 500, 260, 56, 12); ctx.fill();
  ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2;
  rr(ctx, cx - 130, 500, 260, 56, 12); ctx.stroke();
  text(ctx, '↻  PLAY AGAIN', cx, 529, 20, '#fff', 'center');
  ui.buttons.push({ id: 'restart', x: cx - 130, y: 500, w: 260, h: 56 });
}

function drawPaused(ctx, game) {
  overlay(ctx);
  text(ctx, '❚❚  PAUSED', CANVAS_W / 2, CANVAS_H / 2 - 10, 40, '#fff', 'center');
  text(ctx, 'Press P or click Resume to keep defending', CANVAS_W / 2, CANVAS_H / 2 + 36, 15, PALETTE.muted, 'center', '400');
}
