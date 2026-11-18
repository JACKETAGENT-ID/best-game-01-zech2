// waves.js — what marches in each wave.
// One job: build the spawn queue for a wave number (15 waves, a boss
// every 5th), interleaved so the mix stays interesting.
import { TOTAL_WAVES } from './config.js';

export function waveComposition(n) {
  const counts = {
    mote: 4 + n,
    gloom: 2 + Math.floor(n * 1.2),
    dart: n >= 4 ? Math.floor(n * 0.8) : 0,
    bulwark: n >= 3 ? Math.floor(n * 0.7) : 0,
  };
  const order = ['mote', 'gloom', 'dart', 'bulwark'];
  const queue = [];
  let guard = 0;
  while (guard++ < 400) {
    let added = false;
    for (const t of order) {
      if (counts[t] > 0) { queue.push(t); counts[t]--; added = true; }
    }
    if (!added) break;
  }
  // Boss waves: the Dreadmaw lumbers in about 40% through the queue.
  if (n % 5 === 0) {
    const at = Math.floor(queue.length * 0.4);
    queue.splice(at, 0, 'boss');
  }
  return queue;
}

export function waveSpawnGap(n) {
  return Math.max(0.34, 0.85 - n * 0.03);
}

export function waveBonus(n) {
  return 25 + n * 3;
}

export function isBossWave(n) {
  return n % 5 === 0;
}

export function totalWaves() {
  return TOTAL_WAVES;
}
