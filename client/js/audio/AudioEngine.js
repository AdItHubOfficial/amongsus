// =============================================================
// AMONGSUS client — 100% procedural WebAudio: UI sounds, footsteps,
// alarms, ambient ship hum, and a generative music loop.
// No audio files anywhere in the project.
// =============================================================

import { App } from '../state.js';

let ctx = null;
let master, musicGain, sfxGain;
let noiseBuffer = null;
let ambientNodes = null;
let alarmNodes = null;
let musicTimer = null;
let musicStep = 0;
let footAlt = false;

function ensureCtx() {
  if (ctx) return true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch { return false; }
  master = ctx.createGain();
  musicGain = ctx.createGain();
  sfxGain = ctx.createGain();
  musicGain.connect(master);
  sfxGain.connect(master);
  master.connect(ctx.destination);
  // white noise buffer for percussive sounds
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuffer.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  applyVolumes();
  return true;
}

export function primeAudio() {
  if (ensureCtx() && ctx.state === 'suspended') ctx.resume();
}

export function applyVolumes() {
  if (!ctx) return;
  const s = App.settings;
  master.gain.value = s.volMaster;
  musicGain.gain.value = s.volMusic * 0.5;
  sfxGain.gain.value = s.volSfx;
}

// ---- synth building blocks -------------------------------------------------

function tone({ freq = 440, type = 'sine', dur = 0.15, vol = 0.3, slide = 0, delay = 0, dest = null }) {
  if (!ensureCtx()) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(dest || sfxGain);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.1, vol = 0.3, freq = 1000, q = 1, delay = 0, type = 'bandpass', dest = null }) {
  if (!ensureCtx()) return;
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(dest || sfxGain);
  src.start(t0); src.stop(t0 + dur + 0.02);
}

// ---- public SFX ------------------------------------------------------------

const SFX = {
  click:     () => tone({ freq: 700, type: 'square', dur: 0.05, vol: 0.12 }),
  hover:     () => tone({ freq: 900, type: 'sine', dur: 0.03, vol: 0.05 }),
  footstep:  (vol = 0.12) => {
    footAlt = !footAlt;
    noise({ dur: 0.07, vol, freq: footAlt ? 500 : 380, q: 2 });
  },
  door:      () => { tone({ freq: 300, type: 'sawtooth', dur: 0.25, vol: 0.15, slide: -180 }); noise({ dur: 0.2, vol: 0.1, freq: 250 }); },
  task:      () => tone({ freq: 520, type: 'triangle', dur: 0.08, vol: 0.15 }),
  taskDone:  () => { [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.18, vol: 0.18, delay: i * 0.07 })); },
  kill:      () => { tone({ freq: 120, type: 'sawtooth', dur: 0.3, vol: 0.4, slide: -70 }); noise({ dur: 0.25, vol: 0.3, freq: 200, q: 0.7 }); },
  meeting:   () => { [440, 440, 587].forEach((f, i) => tone({ freq: f, type: 'square', dur: 0.22, vol: 0.25, delay: i * 0.22 })); },
  vote:      () => { noise({ dur: 0.06, vol: 0.2, freq: 2400, q: 3 }); tone({ freq: 880, dur: 0.06, vol: 0.1 }); },
  eject:     () => noise({ dur: 1.4, vol: 0.25, freq: 600, q: 0.5, type: 'lowpass' }),
  win:       () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.35, vol: 0.2, delay: i * 0.13 })); },
  lose:      () => { [400, 350, 300, 233].forEach((f, i) => tone({ freq: f, type: 'sawtooth', dur: 0.4, vol: 0.15, delay: i * 0.25 })); },
  shield:    () => tone({ freq: 660, type: 'sine', dur: 0.3, vol: 0.2, slide: 440 }),
  sabotage:  () => { tone({ freq: 220, type: 'square', dur: 0.4, vol: 0.25, slide: -80 }); },
  whoosh:    () => noise({ dur: 0.3, vol: 0.2, freq: 900, q: 0.6, type: 'lowpass' }),
  vent:      () => { noise({ dur: 0.18, vol: 0.25, freq: 300, q: 1 }); tone({ freq: 180, dur: 0.15, vol: 0.15, slide: 120 }); },
  emote:     () => tone({ freq: 1050, type: 'sine', dur: 0.1, vol: 0.12, slide: 200 }),
  levelup:   () => { [392, 523, 659, 784].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.3, vol: 0.2, delay: i * 0.1 })); },
  error:     () => tone({ freq: 180, type: 'square', dur: 0.15, vol: 0.15 }),
};

export function sfx(name, ...args) {
  if (!ensureCtx()) return;
  const fn = SFX[name];
  if (fn) fn(...args);
}

// ---- alarm loop (critical sabotage) ----------------------------------------

export function startAlarm() {
  if (!ensureCtx() || alarmNodes) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  o.type = 'square'; o.frequency.value = 440;
  lfo.type = 'square'; lfo.frequency.value = 1.6;
  lfoG.gain.value = 120;
  lfo.connect(lfoG); lfoG.connect(o.frequency);
  g.gain.value = 0.05;
  o.connect(g); g.connect(sfxGain);
  o.start(); lfo.start();
  alarmNodes = { o, g, lfo };
}

export function stopAlarm() {
  if (!alarmNodes) return;
  try { alarmNodes.o.stop(); alarmNodes.lfo.stop(); } catch { /* already stopped */ }
  alarmNodes = null;
}

// ---- ambient ship hum -------------------------------------------------------

export function startAmbient() {
  if (!ensureCtx() || ambientNodes) return;
  const hum = ctx.createOscillator();
  const humG = ctx.createGain();
  hum.type = 'sine'; hum.frequency.value = 55;
  humG.gain.value = 0.03;
  hum.connect(humG); humG.connect(sfxGain);

  const air = ctx.createBufferSource();
  air.buffer = noiseBuffer; air.loop = true;
  const airF = ctx.createBiquadFilter();
  airF.type = 'lowpass'; airF.frequency.value = 240;
  const airG = ctx.createGain();
  airG.gain.value = 0.02;
  air.connect(airF); airF.connect(airG); airG.connect(sfxGain);

  hum.start(); air.start();
  ambientNodes = { hum, air };
}

export function stopAmbient() {
  if (!ambientNodes) return;
  try { ambientNodes.hum.stop(); ambientNodes.air.stop(); } catch { /* ok */ }
  ambientNodes = null;
}

// ---- generative music (menu / lobby / meetings) ------------------------------

const CHORDS = [
  [220.0, 261.6, 329.6],   // Am
  [174.6, 220.0, 261.6],   // F
  [196.0, 246.9, 293.7],   // G
  [164.8, 196.0, 246.9],   // Em
];

export function startMusic() {
  if (!ensureCtx() || musicTimer) return;
  musicStep = 0;
  const stepDur = 0.28;
  musicTimer = setInterval(() => {
    if (ctx.state !== 'running') return;
    const bar = Math.floor(musicStep / 8) % CHORDS.length;
    const chord = CHORDS[bar];
    const s = musicStep % 8;
    // soft pad at bar start
    if (s === 0) {
      for (const f of chord) tone({ freq: f / 2, type: 'sine', dur: stepDur * 8, vol: 0.05, dest: musicGain });
    }
    // sparkly arp
    const note = chord[(s * 2) % chord.length] * (s % 3 === 2 ? 2 : 1);
    tone({ freq: note * 2, type: 'triangle', dur: 0.22, vol: s % 2 === 0 ? 0.07 : 0.045, dest: musicGain });
    // heartbeat bass
    if (s % 4 === 0) tone({ freq: chord[0] / 4, type: 'sine', dur: 0.3, vol: 0.12, dest: musicGain });
    musicStep++;
  }, 280);
}

export function stopMusic() {
  clearInterval(musicTimer);
  musicTimer = null;
}
