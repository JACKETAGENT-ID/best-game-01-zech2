// main.js — bootstrap: wire the canvas, the game, input and the loop.
// One job: start everything and keep the frame loop running.
import { Game } from './game.js';
import { draw } from './render.js';
import { attachInput } from './input.js';
import { applyShot } from './shots.js';
import { CANVAS_W, CANVAS_H } from './config.js';

const canvas = document.getElementById('game');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
const ctx = canvas.getContext('2d');

const game = new Game();
window.__game = game; // play-test hook: state, update(dt), sendWave(), tryPlace()
attachInput(canvas, game);

const params = new URLSearchParams(location.search);
const shotMode = params.has('shot');
if (shotMode) {
  applyShot(game, location.search);
  draw(ctx, game);
  window.__shotReady = true;
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    game.update(dt);
    draw(ctx, game);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
