// input.js — mouse and keyboard.
// One job: translate clicks and keys into game actions (build, select,
// upgrade, sell, wave, pause, speed, mute).
import { TILE, GRID_Y, ROWS, COLS, TOWER_TYPES } from './config.js';
import { ui } from './render.js';
import { isPathTile, isLanternTile } from './path.js';
import { sfx, unlockAudio, setMuted, isMuted, startPad } from './audio.js';

function hit(list, x, y) {
  return list.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
}

export function attachInput(canvas, game) {
  function pos(ev) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) * (canvas.width / r.width),
      y: (ev.clientY - r.top) * (canvas.height / r.height),
    };
  }

  function gridAt(p) {
    const col = Math.floor(p.x / TILE);
    const row = Math.floor((p.y - GRID_Y) / TILE);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return { col, row };
  }

  canvas.addEventListener('mousemove', (ev) => {
    game.hover = gridAt(pos(ev));
  });

  canvas.addEventListener('mouseleave', () => { game.hover = null; });

  canvas.addEventListener('click', (ev) => {
    unlockAudio();
    const p = pos(ev);
    // Panel buttons first (upgrade / sell).
    if (game.selected) {
      const pb = hit(ui.panelButtons, p.x, p.y);
      if (pb) {
        if (pb.id === 'upgrade') game.tryUpgrade();
        if (pb.id === 'sell') game.trySell();
        return;
      }
    }
    // HUD buttons (start / restart / wave / speed / pause / mute).
    const b = hit(ui.buttons, p.x, p.y);
    if (b) {
      sfx.click();
      if (b.id === 'start') { game.start(); startPad(); }
      else if (b.id === 'restart') { game.start(); }
      else if (b.id === 'wave') game.sendWave();
      else if (b.id === 'speed') game.speed = game.speed === 1 ? 2 : 1;
      else if (b.id === 'pause') {
        if (game.state === 'playing') game.state = 'paused';
        else if (game.state === 'paused') game.state = 'playing';
      } else if (b.id === 'mute') setMuted(!isMuted());
      return;
    }
    // Shop cards.
    const card = hit(ui.shopCards, p.x, p.y);
    if (card) {
      game.buildType = card.type;
      game.selected = null;
      sfx.click();
      return;
    }
    // Grid: select a built tower, or build on free grass.
    const g = gridAt(p);
    if (!g) return;
    const placed = game.towers.find((t) => t.col === g.col && t.row === g.row);
    if (placed) {
      game.selected = placed;
      sfx.click();
      return;
    }
    if (game.state !== 'playing') return;
    if (isPathTile(g.col, g.row) || isLanternTile(g.col, g.row)) {
      game.flash('The road is for shades — build on the grass');
      sfx.error();
      return;
    }
    game.tryPlace(g.col, g.row);
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.repeat) return;
    const k = ev.key.toLowerCase();
    if (game.state === 'title' && (k === ' ' || k === 'enter')) {
      unlockAudio(); game.start(); startPad(); return;
    }
    if ((game.state === 'gameover' || game.state === 'victory') && (k === ' ' || k === 'enter' || k === 'r')) {
      game.start(); return;
    }
    if (k === '1' || k === '2' || k === '3') {
      const type = Object.keys(TOWER_TYPES).find((t) => TOWER_TYPES[t].hotkey === k);
      if (type) { game.buildType = type; game.selected = null; sfx.click(); }
      return;
    }
    if (k === ' ') { ev.preventDefault(); game.sendWave(); }
    if (k === 'p') {
      if (game.state === 'playing') game.state = 'paused';
      else if (game.state === 'paused') game.state = 'playing';
    }
    if (k === 'f') game.speed = game.speed === 1 ? 2 : 1;
    if (k === 'm') setMuted(!isMuted());
    if (k === 'u') game.tryUpgrade();
    if (k === 'escape') game.selected = null;
  });
}
