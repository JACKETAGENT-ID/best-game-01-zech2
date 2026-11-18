// shots.js — deterministic screenshot scenes for the dossier.
// One job: given ?shot=start|play|end&seed=N, drive the game to a fixed,
// seeded moment and render it, then set window.__shotReady. No wall clock,
// no audio, no randomness outside the seed.
import { Game } from './game.js';
import { makeTower } from './towers.js';
import { makeEnemy } from './enemies.js';
import { waveComposition } from './waves.js';
import { mulberry32 } from './random.js';

function fixedTowers(game) {
  // A believable mid-game defence, hugging the road's bends.
  const spots = [
    ['spark', 11, 2], ['spark', 10, 0], ['frost', 11, 3], ['ember', 3, 3],
    ['spark', 3, 5], ['frost', 11, 5], ['ember', 3, 6], ['spark', 10, 6],
    ['frost', 11, 8], ['ember', 5, 8],
  ];
  for (const [type, col, row] of spots) {
    const t = makeTower(type, col, row);
    if (col % 3 === 0) { t.level = 2; t.invested += t.upgradeCost || 0; }
    game.towers.push(t);
  }
}

export function applyShot(game, query) {
  const params = new URLSearchParams(query);
  const scene = params.get('shot') || 'start';
  const seed = Number(params.get('seed') || 7);
  const rng = mulberry32(seed);
  // Deterministic stand-in for Math.random during the staged scene.
  const realRandom = Math.random;
  Math.random = rng;

  if (scene === 'start') {
    game.state = 'title';
    game.coins = 140;
    game.best = 2450;
    // A quiet preview defence behind the title card.
    fixedTowers(game);
    game.time = 3.2;
  } else if (scene === 'play') {
    game.state = 'playing';
    game.coins = 263;
    game.lives = 17;
    game.score = 1840;
    game.wave = 6;
    game.kills = 148;
    fixedTowers(game);
    // Mid-wave: spawn wave 6 and step it forward a fixed amount.
    game.spawnQueue = waveComposition(6);
    game.waveActive = true;
    game.spawnGap = 0.6;
    game.spawnTimer = 0;
    const dt = 1 / 60;
    for (let i = 0; i < 60 * 14; i++) game.update(dt);
    // Keep a few shades on screen for the shot.
    if (game.enemies.length === 0) {
      game.enemies.push(makeEnemy('bulwark', 6, game.waypoints));
      game.enemies.push(makeEnemy('dart', 6, game.waypoints));
      game.enemies[0].x = 420; game.enemies[0].y = 200;
      game.enemies[1].x = 300; game.enemies[1].y = 200;
    }
    game.time = 14;
    game.flash('Wave 6 of 15 — hold the lantern!');
    game.messageUntil = game.time + 2.6;
  } else if (scene === 'end') {
    game.state = 'victory';
    game.coins = 412;
    game.lives = 14;
    game.score = 12840;
    game.wave = 15;
    game.kills = 512;
    game.best = 12840;
    fixedTowers(game);
    game.endStats = {
      score: 12840, wave: 15, kills: 512,
      earned: 2140, spent: 1728, leaked: 6, lives: 14, best: 12840,
    };
    game.time = 5;
  }
  Math.random = realRandom;
  return scene;
}
