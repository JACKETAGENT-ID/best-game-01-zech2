// audio.js — all sound is synthesized with WebAudio. No audio files, no
// network. Created lazily on the first user gesture; safe to call before
// that (calls become no-ops) and in headless screenshot mode.
let ctx = null;
let master = null;
let muted = false;
let padNodes = null;

function ensure() {
  if (ctx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    return true;
  } catch {
    return false;
  }
}

export function unlockAudio() {
  if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
}
export function isMuted() { return muted; }

function tone(freq, dur, type, vol, slideTo) {
  if (!ensure() || muted) return;
  try {
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch { /* audio is cosmetic; never break the game */ }
}

function chord(freqs, dur, type, vol) {
  freqs.forEach((f, i) => setTimeout(() => tone(f, dur, type, vol), i * 90));
}

export const sfx = {
  shoot() { tone(880 + Math.random() * 120, 0.06, 'square', 0.05, 520); },
  frost() { tone(1320, 0.09, 'sine', 0.06, 990); },
  boom() { tone(160, 0.18, 'triangle', 0.12, 55); },
  kill() { tone(520, 0.1, 'sine', 0.09, 940); },
  coin() { tone(1240, 0.07, 'sine', 0.07, 1560); },
  place() { tone(220, 0.12, 'triangle', 0.14, 330); },
  upgrade() { tone(440, 0.1, 'sine', 0.1, 660); setTimeout(() => tone(660, 0.12, 'sine', 0.1, 880), 80); },
  sell() { tone(660, 0.1, 'sine', 0.08, 330); },
  leak() { tone(180, 0.3, 'sawtooth', 0.14, 70); },
  wave() { chord([523, 659, 784], 0.16, 'triangle', 0.1); },
  victory() { chord([523, 659, 784, 1047, 1319], 0.3, 'triangle', 0.11); },
  defeat() { chord([392, 330, 262, 196], 0.35, 'sawtooth', 0.09); },
  click() { tone(700, 0.05, 'sine', 0.06); },
  error() { tone(140, 0.15, 'square', 0.08, 110); },
};

// A very quiet two-oscillator night pad, started once during play.
export function startPad() {
  if (!ensure() || padNodes) return;
  try {
    const g = ctx.createGain(); g.gain.value = 0.035;
    const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 110;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 164.8;
    const o3 = ctx.createOscillator(); o3.type = 'triangle'; o3.frequency.value = 55;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    o1.connect(f); o2.connect(f); o3.connect(f); f.connect(g); g.connect(master);
    o1.start(); o2.start(); o3.start();
    padNodes = { o1, o2, o3, g };
  } catch { /* ignore */ }
}

export function stopPad() {
  if (!padNodes) return;
  try { padNodes.o1.stop(); padNodes.o2.stop(); padNodes.o3.stop(); } catch { /* ignore */ }
  padNodes = null;
}
