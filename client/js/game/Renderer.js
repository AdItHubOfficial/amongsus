// =============================================================
// AMONGSUS client — canvas renderer. Prerenders each map to an
// offscreen layer (cached per map id), draws themed room props,
// entities, dynamic lighting/vision, the minimap and camera feeds.
// =============================================================

import { App } from '../state.js';
import { BASE_VISION, SABOTAGES, ROLES } from '/shared/constants.js';
import { drawCrewmate, drawPet, drawDeadBody, colorHex } from './CharacterRenderer.js';
import { drawParticles } from './Particles.js';

let canvas, ctx, W = 0, H = 0, dpr = 1;
let lightCanvas = null, lightCtx = null;
const layers = new Map(); // map.id -> prerendered offscreen canvas

export function initRenderer(cv) {
  canvas = cv;
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  lightCanvas = document.createElement('canvas');
  lightCanvas.width = W; lightCanvas.height = H;
  lightCtx = lightCanvas.getContext('2d');
}

function getMapLayer(map) {
  if (!layers.has(map.id)) layers.set(map.id, prerenderMap(map));
  return layers.get(map.id);
}

// ------------------------------------------------------------ map layer -----

function prerenderMap(map) {
  const layer = document.createElement('canvas');
  layer.width = map.width; layer.height = map.height;
  const m = layer.getContext('2d');
  const pal = map.palette;

  drawEnvironment(m, map);

  // Walls — floor fills cover the strokes at junctions.
  m.lineJoin = 'round';
  for (const r of map.walkable) { m.strokeStyle = pal.wallEdge; m.lineWidth = 40; m.strokeRect(r.x, r.y, r.w, r.h); }
  for (const r of map.walkable) { m.strokeStyle = pal.wall; m.lineWidth = 22; m.strokeRect(r.x, r.y, r.w, r.h); }

  // Floors, with a per-map treatment
  for (const c of map.corridors) {
    m.fillStyle = pal.corridor;
    m.fillRect(c.x, c.y, c.w, c.h);
    drawFloor(m, map, c, false);
  }
  for (const r of map.rooms) {
    m.fillStyle = r.color;
    m.fillRect(r.x, r.y, r.w, r.h);
    drawFloor(m, map, r, true);
  }
  drawWallAccents(m, map);

  for (const r of map.rooms) drawTheme(m, r);
  drawClutter(m, map);
  drawConsoles(m, map);

  // Task consoles
  for (const t of map.tasks) {
    m.fillStyle = '#0d1526';
    m.strokeStyle = '#3c4f74'; m.lineWidth = 3;
    m.beginPath(); m.roundRect(t.x - 22, t.y - 16, 44, 32, 6); m.fill(); m.stroke();
    m.fillStyle = '#1c3a56';
    m.fillRect(t.x - 15, t.y - 9, 30, 18);
    m.fillStyle = 'rgba(90,220,255,0.5)';
    m.fillRect(t.x - 15, t.y - 9, 30, 4);
  }

  // Vents
  for (const v of map.vents) {
    m.fillStyle = '#101722';
    m.beginPath(); m.roundRect(v.x - 24, v.y - 16, 48, 32, 8); m.fill();
    m.strokeStyle = '#2c3a52'; m.lineWidth = 3; m.stroke();
    m.strokeStyle = '#465a7d'; m.lineWidth = 4;
    for (let i = -1; i <= 1; i++) {
      m.beginPath(); m.moveTo(v.x - 16, v.y + i * 8); m.lineTo(v.x + 16, v.y + i * 8); m.stroke();
    }
  }

  // Cameras
  for (const c of map.cameras) {
    m.fillStyle = '#151d2e';
    m.beginPath(); m.roundRect(c.x - 10, c.y - 26, 20, 16, 4); m.fill();
    m.fillStyle = '#4b5f85';
    m.beginPath(); m.arc(c.x, c.y - 18, 5, 0, Math.PI * 2); m.fill();
  }

  // Room labels
  m.font = '900 44px "Segoe UI", sans-serif';
  m.textAlign = 'center';
  m.fillStyle = 'rgba(255,255,255,0.10)';
  for (const r of map.rooms) {
    m.fillText(r.name.toUpperCase(), r.x + r.w / 2, r.y + r.h / 2 + 14);
  }
  return layer;
}

function grid(m, r, color, step = 64) {
  m.strokeStyle = color; m.lineWidth = 1;
  for (let gx = r.x + step; gx < r.x + r.w; gx += step) {
    m.beginPath(); m.moveTo(gx, r.y); m.lineTo(gx, r.y + r.h); m.stroke();
  }
  for (let gy = r.y + step; gy < r.y + r.h; gy += step) {
    m.beginPath(); m.moveTo(r.x, gy); m.lineTo(r.x + r.w, gy); m.stroke();
  }
}

// deterministic pseudo-random (stable across frames/reloads)
const hh = (i, k) => Math.abs(Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1;

/** Full-layer backdrop behind the station — each world looks different. */
function drawEnvironment(m, map) {
  const w = map.width, h = map.height;
  if (map.id === 'Kepler') {
    // frozen plain
    m.fillStyle = '#1b2836'; m.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      const x = hh(i, 1) * w, y = hh(i, 2) * h, r = 24 + hh(i, 3) * 110;
      m.fillStyle = `rgba(195,220,240,${0.025 + hh(i, 4) * 0.05})`;
      m.beginPath(); m.ellipse(x, y, r, r * 0.35, 0, 0, Math.PI * 2); m.fill();
    }
    m.strokeStyle = 'rgba(130,190,230,0.14)'; m.lineWidth = 3;
    for (let i = 0; i < 30; i++) {
      let x = hh(i, 5) * w, y = hh(i, 6) * h;
      m.beginPath(); m.moveTo(x, y);
      for (let s = 0; s < 5; s++) {
        x += 40 + hh(i, 7 + s) * 120; y += (hh(i, 12 + s) - 0.5) * 90;
        m.lineTo(x, y);
      }
      m.stroke();
    }
  } else if (map.id === 'Hive') {
    // raw asteroid rock
    m.fillStyle = '#191009'; m.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = hh(i, 1) * w, y = hh(i, 2) * h, r = 26 + hh(i, 3) * 120;
      m.fillStyle = 'rgba(0,0,0,0.35)';
      m.beginPath(); m.ellipse(x, y, r, r * 0.75, hh(i, 4) * 3, 0, Math.PI * 2); m.fill();
      m.strokeStyle = 'rgba(160,115,70,0.18)'; m.lineWidth = 4;
      m.beginPath(); m.arc(x, y, r, Math.PI * 0.9, Math.PI * 1.7); m.stroke();
    }
    m.fillStyle = 'rgba(150,105,65,0.25)';
    for (let i = 0; i < 500; i++) {
      m.fillRect(hh(i, 5) * w, hh(i, 6) * h, 3 + hh(i, 7) * 5, 3 + hh(i, 8) * 5);
    }
  } else if (map.id === 'Abyss') {
    // open ocean
    const gr = m.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#052335'); gr.addColorStop(1, '#02101c');
    m.fillStyle = gr; m.fillRect(0, 0, w, h);
    // light shafts from above
    for (let i = 0; i < 8; i++) {
      const x = hh(i, 1) * w;
      m.fillStyle = `rgba(90,190,230,${0.02 + hh(i, 2) * 0.025})`;
      m.beginPath();
      m.moveTo(x, 0); m.lineTo(x + 130, 0); m.lineTo(x + 380, h); m.lineTo(x + 130, h);
      m.closePath(); m.fill();
    }
    // kelp strands
    for (let i = 0; i < 46; i++) {
      const x = hh(i, 3) * w, base = h - hh(i, 4) * 140;
      const tall = 200 + hh(i, 5) * 420;
      m.strokeStyle = `rgba(40,120,90,${0.25 + hh(i, 6) * 0.25})`;
      m.lineWidth = 5 + hh(i, 7) * 5;
      m.beginPath(); m.moveTo(x, base);
      for (let s = 1; s <= 5; s++) {
        m.quadraticCurveTo(
          x + Math.sin(s * 2 + i) * 26, base - tall * (s - 0.5) / 5,
          x + Math.sin(s * 2.7 + i) * 14, base - tall * s / 5);
      }
      m.stroke();
    }
    // sea-floor mounds
    for (let i = 0; i < 26; i++) {
      const x = hh(i, 8) * w, r = 40 + hh(i, 9) * 130;
      m.fillStyle = 'rgba(8,30,44,0.9)';
      m.beginPath(); m.ellipse(x, h + 20, r, r * 0.4, 0, Math.PI, 0); m.fill();
    }
  } else if (map.id === 'Aurora') {
    // glamorous orbit: stars, a ringed planet and aurora ribbons
    m.fillStyle = '#070612'; m.fillRect(0, 0, w, h);
    m.fillStyle = '#fff';
    for (let i = 0; i < 320; i++) {
      m.globalAlpha = 0.15 + hh(i, 1) * 0.6;
      m.fillRect(hh(i, 2) * w, hh(i, 3) * h, hh(i, 4) > 0.85 ? 3 : 1.6, hh(i, 4) > 0.85 ? 3 : 1.6);
    }
    m.globalAlpha = 1;
    const px = w * 0.86, py = h * 0.82, pr = 260;
    m.fillStyle = '#3a2a55';
    m.beginPath(); m.arc(px, py, pr, 0, Math.PI * 2); m.fill();
    m.fillStyle = 'rgba(255,170,120,0.25)';
    m.beginPath(); m.arc(px - pr * 0.3, py - pr * 0.3, pr * 0.85, 0, Math.PI * 2); m.fill();
    m.strokeStyle = 'rgba(230,190,255,0.4)'; m.lineWidth = 16;
    m.beginPath(); m.ellipse(px, py, pr * 1.55, pr * 0.4, -0.35, 0, Math.PI * 2); m.stroke();
    for (let i = 0; i < 3; i++) {
      m.strokeStyle = `rgba(${i === 1 ? '120,255,190' : '160,120,255'},0.10)`;
      m.lineWidth = 60 + i * 30;
      m.beginPath();
      m.moveTo(-100, h * (0.15 + i * 0.1));
      m.bezierCurveTo(w * 0.3, h * (0.02 + i * 0.12), w * 0.6, h * (0.3 + i * 0.08), w + 100, h * (0.1 + i * 0.1));
      m.stroke();
    }
  } else {
    // Meridian — deep space
    m.fillStyle = '#050a14'; m.fillRect(0, 0, w, h);
    m.fillStyle = '#fff';
    for (let i = 0; i < 260; i++) {
      m.globalAlpha = 0.12 + hh(i, 1) * 0.5;
      m.fillRect(hh(i, 2) * w, hh(i, 3) * h, hh(i, 4) > 0.9 ? 2.6 : 1.5, hh(i, 4) > 0.9 ? 2.6 : 1.5);
    }
    m.globalAlpha = 1;
  }
}

/** Per-map floor treatment, clipped to the rect. */
function drawFloor(m, map, r, isRoom) {
  m.save();
  m.beginPath(); m.rect(r.x, r.y, r.w, r.h); m.clip();
  const seed = Math.floor(r.x * 7 + r.y * 13);

  if (map.id === 'Kepler') {
    grid(m, r, 'rgba(190,225,255,0.03)', 96);
    for (let i = 0; i < Math.max(3, (r.w * r.h) / 45000); i++) {
      m.fillStyle = `rgba(200,235,255,${0.03 + hh(seed + i, 1) * 0.04})`;
      m.beginPath();
      m.ellipse(r.x + hh(seed + i, 2) * r.w, r.y + hh(seed + i, 3) * r.h,
        26 + hh(seed + i, 4) * 60, 10 + hh(seed + i, 5) * 18, hh(seed + i, 6), 0, Math.PI * 2);
      m.fill();
    }
  } else if (map.id === 'Hive') {
    m.fillStyle = 'rgba(0,0,0,0.16)';
    for (let i = 0; i < (r.w * r.h) / 6000; i++) {
      m.fillRect(r.x + hh(seed + i, 1) * r.w, r.y + hh(seed + i, 2) * r.h, 3 + hh(seed + i, 3) * 4, 3 + hh(seed + i, 3) * 4);
    }
    m.fillStyle = 'rgba(255,190,110,0.06)';
    for (let i = 0; i < (r.w * r.h) / 20000; i++) {
      m.fillRect(r.x + hh(seed + i, 4) * r.w, r.y + hh(seed + i, 5) * r.h, 5, 5);
    }
    m.strokeStyle = 'rgba(0,0,0,0.25)'; m.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      let x = r.x + hh(seed + i, 6) * r.w, y = r.y + hh(seed + i, 7) * r.h;
      m.beginPath(); m.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        x += (hh(seed + i, 8 + s) - 0.4) * 90; y += (hh(seed + i, 12 + s) - 0.5) * 80;
        m.lineTo(x, y);
      }
      m.stroke();
    }
  } else if (map.id === 'Abyss') {
    m.strokeStyle = 'rgba(255,255,255,0.03)'; m.lineWidth = 1;
    for (let gy = r.y + 46; gy < r.y + r.h; gy += 46) {
      m.beginPath(); m.moveTo(r.x, gy); m.lineTo(r.x + r.w, gy); m.stroke();
    }
    for (let i = 0; i < Math.max(3, (r.w * r.h) / 50000); i++) {
      const cx = r.x + hh(seed + i, 1) * r.w, cy = r.y + hh(seed + i, 2) * r.h;
      m.strokeStyle = `rgba(120,220,255,${0.04 + hh(seed + i, 3) * 0.04})`;
      m.lineWidth = 3;
      m.beginPath(); m.arc(cx, cy, 18 + hh(seed + i, 4) * 30, 0.3, 2.4); m.stroke();
      m.beginPath(); m.arc(cx + 14, cy + 8, 10 + hh(seed + i, 5) * 18, 3.4, 5.6); m.stroke();
    }
  } else if (map.id === 'Aurora') {
    m.strokeStyle = 'rgba(255,255,255,0.035)'; m.lineWidth = 1;
    const step = 56;
    for (let d = -r.h; d < r.w; d += step) {
      m.beginPath(); m.moveTo(r.x + d, r.y); m.lineTo(r.x + d + r.h, r.y + r.h); m.stroke();
      m.beginPath(); m.moveTo(r.x + d + r.h, r.y); m.lineTo(r.x + d, r.y + r.h); m.stroke();
    }
    if (!isRoom) {
      // red carpet down the promenade
      const horiz = r.w >= r.h;
      m.fillStyle = 'rgba(150,35,60,0.4)';
      if (horiz) m.fillRect(r.x, r.y + r.h * 0.3, r.w, r.h * 0.4);
      else m.fillRect(r.x + r.w * 0.3, r.y, r.w * 0.4, r.h);
      m.fillStyle = 'rgba(255,205,90,0.35)';
      if (horiz) { m.fillRect(r.x, r.y + r.h * 0.3 - 3, r.w, 3); m.fillRect(r.x, r.y + r.h * 0.7, r.w, 3); }
      else { m.fillRect(r.x + r.w * 0.3 - 3, r.y, 3, r.h); m.fillRect(r.x + r.w * 0.7, r.y, 3, r.h); }
    }
  } else {
    grid(m, r, isRoom ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.03)');
  }
  m.restore();
}

/** Distinct wall styling per map (rooms only, subtle). */
function drawWallAccents(m, map) {
  for (const r of map.rooms) {
    if (map.id === 'Kepler') {
      m.strokeStyle = 'rgba(170,225,255,0.18)'; m.lineWidth = 4;
      m.strokeRect(r.x + 5, r.y + 5, r.w - 10, r.h - 10);
    } else if (map.id === 'Hive') {
      m.strokeStyle = 'rgba(150,105,65,0.30)'; m.lineWidth = 8;
      m.setLineDash([26, 20]);
      m.strokeRect(r.x + 7, r.y + 7, r.w - 14, r.h - 14);
      m.setLineDash([]);
    } else if (map.id === 'Abyss') {
      m.fillStyle = 'rgba(150,205,235,0.28)';
      for (let x = r.x + 30; x < r.x + r.w - 12; x += 100) {
        m.beginPath(); m.arc(x, r.y + 12, 3, 0, Math.PI * 2); m.fill();
        m.beginPath(); m.arc(x, r.y + r.h - 12, 3, 0, Math.PI * 2); m.fill();
      }
    } else if (map.id === 'Aurora') {
      m.strokeStyle = 'rgba(255,205,90,0.25)'; m.lineWidth = 3;
      m.strokeRect(r.x + 6, r.y + 6, r.w - 12, r.h - 12);
    } else {
      m.strokeStyle = 'rgba(140,190,255,0.08)'; m.lineWidth = 6;
      m.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
    }
  }
}

/** Small per-map decorations scattered along room edges. */
function drawClutter(m, map) {
  if (map.id === 'Meridian') return;
  const avoid = [
    ...map.tasks,
    map.consoles.emergency, map.consoles.security,
    ...map.consoles.reactorPanels, ...map.consoles.o2Consoles,
    map.consoles.lightsPanel, map.consoles.commsPanel,
    ...map.vents,
  ];
  for (const r of map.rooms) {
    const seed = Math.floor(r.x * 3 + r.y * 5);
    const n = Math.min(6, Math.max(2, Math.floor((r.w * r.h) / 70000)));
    for (let i = 0; i < n; i++) {
      // hug the walls so gameplay props stay readable
      const edge = Math.floor(hh(seed + i, 1) * 4);
      const t = 0.12 + hh(seed + i, 2) * 0.76;
      const inset = 42;
      let x, y;
      if (edge === 0) { x = r.x + r.w * t; y = r.y + inset; }
      else if (edge === 1) { x = r.x + r.w * t; y = r.y + r.h - inset; }
      else if (edge === 2) { x = r.x + inset; y = r.y + r.h * t; }
      else { x = r.x + r.w - inset; y = r.y + r.h * t; }
      if (avoid.some(a => Math.hypot(a.x - x, a.y - y) < 85)) continue;
      drawClutterItem(m, map.id, x, y, seed + i);
    }
  }
}

function drawClutterItem(m, mapId, x, y, seed) {
  if (mapId === 'Kepler') {
    m.fillStyle = 'rgba(190,235,255,0.55)';
    m.beginPath();
    m.moveTo(x, y - 16 - hh(seed, 3) * 10);
    m.lineTo(x + 7, y); m.lineTo(x + 15, y - 9 - hh(seed, 4) * 8);
    m.lineTo(x + 19, y); m.lineTo(x - 8, y);
    m.closePath(); m.fill();
  } else if (mapId === 'Hive') {
    m.fillStyle = '#241a10';
    m.beginPath();
    m.moveTo(x - 12, y); m.lineTo(x - 6, y - 12); m.lineTo(x + 6, y - 14);
    m.lineTo(x + 13, y - 4); m.lineTo(x + 10, y + 4); m.lineTo(x - 9, y + 4);
    m.closePath(); m.fill();
    m.fillStyle = '#ffb340';
    m.fillRect(x - 3, y - 8, 4, 4); m.fillRect(x + 4, y - 5, 3, 3);
  } else if (mapId === 'Abyss') {
    m.fillStyle = '#22394a';
    m.beginPath(); m.roundRect(x - 16, y - 8, 32, 12, 6); m.fill();
    m.strokeStyle = '#2c4a5c'; m.lineWidth = 2; m.stroke();
    m.fillStyle = '#45e08a';
    m.beginPath(); m.arc(x + 10, y - 2, 3, 0, Math.PI * 2); m.fill();
  } else if (mapId === 'Aurora') {
    if (hh(seed, 5) > 0.5) {
      m.fillStyle = '#8a6d2f';
      m.beginPath(); m.roundRect(x - 8, y - 10, 16, 12, 4); m.fill();
      m.fillStyle = '#2f8f45';
      m.beginPath(); m.arc(x - 4, y - 14, 6, 0, Math.PI * 2); m.arc(x + 5, y - 16, 7, 0, Math.PI * 2); m.fill();
    } else {
      m.strokeStyle = '#8a6d2f'; m.lineWidth = 3;
      m.beginPath(); m.moveTo(x, y); m.lineTo(x, y - 20); m.stroke();
      m.fillStyle = 'rgba(255,220,130,0.9)';
      m.beginPath(); m.arc(x, y - 24, 5, 0, Math.PI * 2); m.fill();
    }
  }
}

/** Special interaction consoles — same visual language on every map. */
function drawConsoles(m, map) {
  const C = map.consoles;
  // emergency table
  m.fillStyle = '#33415f'; m.beginPath(); m.arc(C.emergency.x, C.emergency.y, 78, 0, Math.PI * 2); m.fill();
  m.strokeStyle = '#4c5f88'; m.lineWidth = 5; m.stroke();
  m.fillStyle = '#822736'; m.beginPath(); m.arc(C.emergency.x, C.emergency.y, 30, 0, Math.PI * 2); m.fill();
  m.fillStyle = '#e0455a'; m.beginPath(); m.arc(C.emergency.x, C.emergency.y, 20, 0, Math.PI * 2); m.fill();
  // security desk
  m.fillStyle = '#1a2233';
  m.beginPath(); m.roundRect(C.security.x - 70, C.security.y - 35, 140, 70, 10); m.fill();
  for (let i = 0; i < 3; i++) {
    m.fillStyle = '#2a4a68';
    m.fillRect(C.security.x - 58 + i * 42, C.security.y - 26, 34, 24);
  }
  // reactor hold panels
  for (const p of C.reactorPanels) {
    m.fillStyle = '#3a1f28'; m.beginPath(); m.roundRect(p.x - 26, p.y - 20, 52, 40, 8); m.fill();
    m.strokeStyle = '#ff5470'; m.lineWidth = 3; m.stroke();
    m.fillStyle = '#ff9aac'; m.beginPath(); m.arc(p.x, p.y, 9, 0, Math.PI * 2); m.fill();
  }
  // fix consoles
  for (const [pos, col] of [
    [C.o2Consoles[0], '#45e08a'], [C.o2Consoles[1], '#45e08a'],
    [C.lightsPanel, '#f5c744'], [C.commsPanel, '#8f5fe8'],
  ]) {
    m.fillStyle = '#131c2e'; m.beginPath(); m.roundRect(pos.x - 24, pos.y - 18, 48, 36, 7); m.fill();
    m.strokeStyle = col; m.lineWidth = 3; m.stroke();
  }
}

/** Themed room decoration — data-driven so every map gets detail. */
function drawTheme(m, r) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const t = r.theme;
  if (t === 'reactor') {
    const rad = Math.min(r.w, r.h) * 0.28;
    m.fillStyle = '#5b2333'; m.beginPath(); m.arc(cx, cy, rad, 0, Math.PI * 2); m.fill();
    m.fillStyle = '#ff5470'; m.beginPath(); m.arc(cx, cy, rad * 0.62, 0, Math.PI * 2); m.fill();
    m.fillStyle = '#ffc2ce'; m.beginPath(); m.arc(cx, cy, rad * 0.27, 0, Math.PI * 2); m.fill();
  } else if (t === 'engine') {
    for (const off of [0.3, 0.7]) {
      const bx = r.x + r.w * off, by = r.y + r.h * 0.62;
      m.fillStyle = '#4a3b26'; m.beginPath(); m.roundRect(bx - 55, by - 42, 110, 84, 12); m.fill();
      m.fillStyle = '#6e5836';
      for (let i = 0; i < 3; i++) m.fillRect(bx - 44 + i * 33, by - 30, 20, 60);
      m.fillStyle = '#ffb340'; m.beginPath(); m.arc(bx, by, 11, 0, Math.PI * 2); m.fill();
    }
  } else if (t === 'medical') {
    for (const off of [0.3, 0.58]) {
      m.fillStyle = '#dfe8f0'; m.beginPath(); m.roundRect(r.x + r.w * off, r.y + 60, 56, 100, 10); m.fill();
      m.fillStyle = '#7fc3d8'; m.beginPath(); m.roundRect(r.x + r.w * off + 8, r.y + 68, 40, 28, 6); m.fill();
    }
    m.strokeStyle = '#55d7f2'; m.lineWidth = 4;
    m.beginPath(); m.arc(r.x + r.w * 0.55, r.y + r.h * 0.55, 42, 0, Math.PI * 2); m.stroke();
    m.fillStyle = 'rgba(85,215,242,0.12)'; m.fill();
  } else if (t === 'lab') {
    m.fillStyle = '#31445e';
    m.beginPath(); m.roundRect(r.x + r.w * 0.15, cy - 30, r.w * 0.35, 56, 10); m.fill();
    m.beginPath(); m.roundRect(r.x + r.w * 0.6, cy - 30, r.w * 0.25, 56, 10); m.fill();
    for (const [fx, fc] of [[0.2, '#45e08a'], [0.3, '#8f5fe8'], [0.4, '#55d7f2']]) {
      m.fillStyle = fc; m.beginPath(); m.arc(r.x + r.w * fx, cy - 15, 11, 0, Math.PI * 2); m.fill();
    }
  } else if (t === 'garden') {
    const n = Math.max(3, Math.floor(r.w / 150));
    for (let i = 0; i < n; i++) {
      const px = r.x + 70 + i * ((r.w - 140) / Math.max(1, n - 1)), py = r.y + r.h * 0.62;
      m.fillStyle = '#5b3d28'; m.beginPath(); m.roundRect(px - 32, py - 20, 64, 40, 8); m.fill();
      m.fillStyle = '#2f8f45';
      m.beginPath(); m.arc(px - 10, py - 16, 15, 0, Math.PI * 2); m.arc(px + 12, py - 20, 17, 0, Math.PI * 2); m.fill();
    }
  } else if (t === 'nav') {
    m.fillStyle = '#0a1020';
    m.beginPath(); m.roundRect(r.x + r.w - 84, r.y + 50, 54, r.h - 100, 18); m.fill();
    m.fillStyle = '#fff';
    for (let i = 0; i < 12; i++) {
      m.globalAlpha = 0.3 + ((i * 37) % 10) / 14;
      m.beginPath();
      m.arc(r.x + r.w - 57 + ((i * 53) % 28) - 14, r.y + 80 + ((i * 97) % (r.h - 150)), 2, 0, Math.PI * 2);
      m.fill();
    }
    m.globalAlpha = 1;
    m.strokeStyle = '#4b5f85'; m.lineWidth = 5;
    m.beginPath(); m.arc(r.x + r.w * 0.35, cy, 44, Math.PI * 0.2, Math.PI * 0.8); m.stroke();
  } else if (t === 'comms') {
    m.strokeStyle = '#6b5fb8'; m.lineWidth = 6;
    m.beginPath(); m.arc(cx, cy + 20, 50, Math.PI * 0.15, Math.PI * 0.85); m.stroke();
    m.beginPath(); m.moveTo(cx, cy + 20); m.lineTo(cx, cy + 75); m.stroke();
  } else if (t === 'security') {
    m.fillStyle = '#2a4a68';
    for (let i = 0; i < 3; i++) m.fillRect(r.x + 40 + i * 46, r.y + 36, 36, 26);
  } else if (t === 'crates') {
    const n = Math.max(4, Math.floor((r.w * r.h) / 60000));
    for (let i = 0; i < n; i++) {
      const cx2 = r.x + 60 + ((i * 173) % Math.max(60, r.w - 150));
      const cy2 = r.y + 70 + ((i * 251) % Math.max(60, r.h - 170));
      m.fillStyle = i % 2 ? '#4d4a33' : '#40483a';
      m.beginPath(); m.roundRect(cx2, cy2, 58, 58, 6); m.fill();
      m.strokeStyle = 'rgba(0,0,0,0.3)'; m.lineWidth = 2;
      m.strokeRect(cx2 + 7, cy2 + 7, 44, 44);
    }
  } else if (t === 'bunks') {
    const n = Math.max(2, Math.floor(r.w / 170));
    for (let i = 0; i < n; i++) {
      const bx = r.x + 55 + i * ((r.w - 160) / Math.max(1, n - 1));
      m.fillStyle = '#3b5068'; m.beginPath(); m.roundRect(bx, r.y + 60, 64, 110, 10); m.fill();
      m.fillStyle = '#dfe8f0'; m.beginPath(); m.roundRect(bx, r.y + 60, 64, 32, 10); m.fill();
    }
  } else if (t === 'hub') {
    m.strokeStyle = 'rgba(255,255,255,0.06)'; m.lineWidth = 10;
    m.beginPath(); m.arc(cx, cy, Math.min(r.w, r.h) * 0.36, 0, Math.PI * 2); m.stroke();
  } else if (t === 'cryo') {
    const n = Math.max(3, Math.floor(r.w / 140));
    for (let i = 0; i < n; i++) {
      const px = r.x + 55 + i * ((r.w - 150) / Math.max(1, n - 1));
      m.fillStyle = '#22404e'; m.beginPath(); m.roundRect(px, r.y + 50, 58, 120, 22); m.fill();
      m.strokeStyle = '#7fd8f0'; m.lineWidth = 3; m.stroke();
      m.fillStyle = 'rgba(140,230,255,0.35)';
      m.beginPath(); m.roundRect(px + 12, r.y + 66, 34, 56, 12); m.fill();
    }
  } else if (t === 'drill') {
    m.fillStyle = '#241c10'; m.beginPath(); m.arc(cx, cy + 20, Math.min(r.w, r.h) * 0.26, 0, Math.PI * 2); m.fill();
    m.strokeStyle = '#6e5836'; m.lineWidth = 8; m.stroke();
    m.fillStyle = '#8a7a63';
    m.beginPath(); m.moveTo(cx - 16, cy - 60); m.lineTo(cx + 16, cy - 60); m.lineTo(cx, cy + 25); m.closePath(); m.fill();
    m.fillStyle = '#5c4a33';
    for (let i = 0; i < 6; i++) {
      m.beginPath(); m.arc(r.x + 50 + ((i * 137) % (r.w - 100)), r.y + 45 + ((i * 89) % (r.h - 90)), 8, 0, Math.PI * 2); m.fill();
    }
  } else if (t === 'pool') {
    m.fillStyle = '#155a78';
    m.beginPath(); m.roundRect(r.x + 60, r.y + 70, r.w - 200, r.h - 160, 26); m.fill();
    m.strokeStyle = '#7fd8f0'; m.lineWidth = 4; m.stroke();
    m.strokeStyle = 'rgba(190,240,255,0.35)'; m.lineWidth = 2.5;
    for (let i = 0; i < 5; i++) {
      m.beginPath();
      m.arc(r.x + 120 + ((i * 157) % (r.w - 300)), r.y + 120 + ((i * 97) % (r.h - 250)), 16 + (i % 3) * 7, 0.4, 2.6);
      m.stroke();
    }
  } else if (t === 'casino') {
    for (const [ox, oy] of [[0.3, 0.4], [0.62, 0.62], [0.3, 0.75]]) {
      m.fillStyle = '#1d5c3a';
      m.beginPath(); m.ellipse(r.x + r.w * ox, r.y + r.h * oy, 55, 36, 0, 0, Math.PI * 2); m.fill();
      m.strokeStyle = '#6e5836'; m.lineWidth = 5; m.stroke();
    }
    for (let i = 0; i < 4; i++) {
      m.fillStyle = '#5c3a56';
      m.beginPath(); m.roundRect(r.x + r.w - 100, r.y + 50 + i * 70, 52, 56, 6); m.fill();
      m.fillStyle = '#ffd23e'; m.fillRect(r.x + r.w - 90, r.y + 62 + i * 70, 32, 16);
    }
  } else if (t === 'kitchen') {
    m.fillStyle = '#5a5f66';
    m.beginPath(); m.roundRect(r.x + 40, r.y + 45, r.w - 80, 44, 8); m.fill();
    for (let i = 0; i < 3; i++) {
      m.fillStyle = '#23232e';
      m.beginPath(); m.arc(r.x + 90 + i * 70, r.y + 67, 16, 0, Math.PI * 2); m.fill();
      m.strokeStyle = '#8b95a5'; m.lineWidth = 2; m.stroke();
    }
  } else if (t === 'dock') {
    m.fillStyle = '#0b2436';
    m.beginPath(); m.arc(cx, cy + 15, Math.min(r.w, r.h) * 0.3, 0, Math.PI * 2); m.fill();
    m.strokeStyle = '#f5c744'; m.lineWidth = 6; m.setLineDash([18, 12]);
    m.stroke(); m.setLineDash([]);
    m.fillStyle = '#2f4a63';
    m.beginPath(); m.ellipse(cx, cy + 15, 42, 20, 0.3, 0, Math.PI * 2); m.fill();
  }
}

// ------------------------------------------------------------- frame --------

export function render(game, tMs) {
  const map = game.map;
  if (!map) return;
  // a minimized/zero-size window would make every canvas op throw
  if (!W || !H) {
    resize();
    if (!W || !H) return;
  }
  const layer = getMapLayer(map);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#04060c';
  ctx.fillRect(0, 0, W, H);

  const zoom = Math.min(1.15, Math.max(0.6, Math.min(W, H) / 820)) * (game.you.alive ? 1 : 0.9);
  const shakeX = game.shake > 0 ? (Math.random() - 0.5) * game.shake : 0;
  const shakeY = game.shake > 0 ? (Math.random() - 0.5) * game.shake : 0;
  const camX = game.you.x + shakeX, camY = game.you.y + shakeY;

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-camX, -camY);

  ctx.drawImage(layer, 0, 0);

  drawDoors(game);
  drawHighlights(game, tMs);

  for (const b of game.bodies.values()) {
    const pl = game.players.get(b.pid);
    drawDeadBody(ctx, b.x, b.y, pl ? pl.cosmetics.color : 'red', tMs);
  }

  drawEntities(game, tMs);
  drawParticles(ctx);
  ctx.restore();

  drawLighting(game, zoom);
  drawAmbient(game, tMs);
  drawVignettes(game, tMs);
}

/** Screen-space atmosphere: snow, bubbles, embers, sparkles. */
function drawAmbient(game, tMs) {
  if (App.settings.graphics === 'low') return;
  const id = game.map.id;
  if (id === 'Kepler') {
    ctx.fillStyle = 'rgba(220,240,255,0.55)';
    for (let i = 0; i < 70; i++) {
      const spd = 30 + hh(i, 1) * 50;
      const x = ((hh(i, 2) * W + Math.sin(tMs / 900 + i) * 40 + tMs * 0.01 * (10 + hh(i, 3) * 20)) % W + W) % W;
      const y = (hh(i, 4) * H + tMs / 1000 * spd) % H;
      const s = 1.5 + hh(i, 5) * 2.2;
      ctx.globalAlpha = 0.25 + hh(i, 6) * 0.45;
      ctx.fillRect(x, y, s, s);
    }
    ctx.globalAlpha = 1;
  } else if (id === 'Abyss') {
    ctx.strokeStyle = 'rgba(150,220,255,0.35)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) {
      const spd = 18 + hh(i, 1) * 35;
      const x = hh(i, 2) * W + Math.sin(tMs / 700 + i * 2) * 14;
      const y = ((H - (hh(i, 3) * H + tMs / 1000 * spd) % H) + H) % H;
      ctx.globalAlpha = 0.12 + hh(i, 4) * 0.25;
      ctx.beginPath(); ctx.arc(x, y, 2 + hh(i, 5) * 4, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (id === 'Hive') {
    ctx.fillStyle = 'rgba(255,170,80,0.5)';
    for (let i = 0; i < 26; i++) {
      const spd = 10 + hh(i, 1) * 22;
      const x = hh(i, 2) * W + Math.sin(tMs / 500 + i * 3) * 22;
      const y = ((H - (hh(i, 3) * H + tMs / 1000 * spd) % H) + H) % H;
      ctx.globalAlpha = 0.1 + Math.abs(Math.sin(tMs / 300 + i)) * 0.3;
      ctx.fillRect(x, y, 2.5, 2.5);
    }
    ctx.globalAlpha = 1;
  } else if (id === 'Aurora') {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 24; i++) {
      const tw = Math.sin(tMs / 400 + i * 1.7);
      if (tw < 0.55) continue;
      const x = hh(i, 1) * W, y = hh(i, 2) * H;
      const s = (tw - 0.55) * 9;
      ctx.globalAlpha = (tw - 0.55) * 1.6;
      ctx.fillRect(x - s / 2, y - 1, s, 2);
      ctx.fillRect(x - 1, y - s / 2, 2, s);
    }
    ctx.globalAlpha = 1;
  }
}

function drawDoors(game) {
  for (const [roomId] of game.doors) {
    for (const d of game.map.doors) {
      if (d.room !== roomId) continue;
      ctx.fillStyle = '#3d485e';
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.strokeStyle = '#f5c744';
      ctx.lineWidth = 4;
      ctx.strokeRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4);
      ctx.fillStyle = 'rgba(245,199,68,0.7)';
      const cx = d.x + d.w / 2, cy = d.y + d.h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(d.w > d.h ? 0 : Math.PI / 2);
      for (let i = -2; i <= 2; i++) ctx.fillRect(i * 26 - 4, -6, 12, 12);
      ctx.restore();
    }
  }
}

function drawHighlights(game, tMs) {
  const pulse = 0.5 + Math.sin(tMs / 300) * 0.35;
  const high = App.settings.graphics === 'high';
  const C = game.map.consoles;

  const commsDown = game.sab && game.sab.kind === SABOTAGES.COMMS;
  if (!commsDown) {
    for (const t of game.tasks) {
      if (t.done) continue;
      const td = game.map.taskById.get(t.id);
      if (!td) continue;
      ctx.strokeStyle = `rgba(245,199,68,${pulse})`;
      ctx.lineWidth = 4;
      if (high) { ctx.shadowColor = '#f5c744'; ctx.shadowBlur = 16; }
      ctx.beginPath(); ctx.arc(td.x, td.y, 40, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  if (game.sab) {
    const pts = [];
    if (game.sab.kind === SABOTAGES.REACTOR) pts.push(...C.reactorPanels);
    if (game.sab.kind === SABOTAGES.O2) pts.push(...C.o2Consoles);
    if (game.sab.kind === SABOTAGES.LIGHTS) pts.push(C.lightsPanel);
    if (game.sab.kind === SABOTAGES.COMMS) pts.push(C.commsPanel);
    if (game.sab.kind === SABOTAGES.CAMERAS) pts.push(C.security);
    for (const p of pts) {
      ctx.strokeStyle = `rgba(255,84,112,${pulse})`;
      ctx.lineWidth = 5;
      if (high) { ctx.shadowColor = '#ff5470'; ctx.shadowBlur = 22; }
      ctx.beginPath(); ctx.arc(p.x, p.y, 48, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  if (game.camsOn && Math.floor(tMs / 400) % 2 === 0) {
    for (const c of game.map.cameras) {
      ctx.fillStyle = '#ff3b30';
      ctx.beginPath(); ctx.arc(c.x + 7, c.y - 24, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawEntities(game, tMs) {
  const list = [];
  const renderTime = performance.now() - 120;
  const cb = App.settings.colorblind;

  for (const [pid, ent] of game.entities) {
    if (pid === game.youPid) continue;
    const pl = game.players.get(pid);
    if (!pl) continue;
    const pos = sampleBuffer(ent, renderTime);
    if (!pos) continue;
    ent.rx = pos.x; ent.ry = pos.y;
    const fresh = performance.now() - ent.lastSeen < 700;
    ent.alpha = Math.max(0, Math.min(1, (ent.alpha || 0) + (fresh ? 0.1 : -0.1)));
    if (ent.alpha <= 0.02) continue;
    list.push({
      y: pos.y,
      draw: () => {
        drawPet(ctx, pos.x - (pos.dir === 1 ? 34 : -34), pos.y, pl.cosmetics.pet, pl.cosmetics.color, tMs + pid.length * 137);
        drawCrewmate(ctx, pos.x, pos.y, {
          colorId: pl.cosmetics.color, hat: pl.cosmetics.hat, skin: pl.cosmetics.skin,
          facing: pos.dir === 1 ? 1 : -1, moving: pos.moving,
          walkPhase: tMs / 55, ghost: ent.dead, alpha: ent.alpha,
          cbLetter: cb, t: tMs,
        });
        nameplate(pos.x, pos.y, pl, ent);
      },
    });
  }

  const y = game.you;
  const youPl = game.players.get(game.youPid);
  if (youPl) {
    list.push({
      y: y.y,
      draw: () => {
        drawPet(ctx, y.x - (game.facing === 1 ? 34 : -34), y.y, youPl.cosmetics.pet, youPl.cosmetics.color, tMs);
        drawCrewmate(ctx, y.x, y.y, {
          colorId: youPl.cosmetics.color, hat: youPl.cosmetics.hat, skin: youPl.cosmetics.skin,
          facing: game.facing, moving: game.movingNow, walkPhase: game.walkPhase,
          ghost: !y.alive, cbLetter: cb, t: tMs, shielded: game.youShielded,
        });
        nameplate(y.x, y.y, youPl, null, true);
      },
    });
  }

  list.sort((a, b) => a.y - b.y);
  for (const item of list) item.draw();

  for (const [pid, ent] of game.entities) {
    if (!ent.emote || performance.now() > ent.emote.until) continue;
    const px = pid === game.youPid ? game.you.x : ent.rx;
    const py = pid === game.youPid ? game.you.y : ent.ry;
    if (px === undefined) continue;
    ctx.font = '34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,15,28,0.85)';
    ctx.beginPath(); ctx.arc(px, py - 92, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillText(ent.emote.text, px, py - 80);
  }
}

function nameplate(x, y, pl, ent, isYou = false) {
  const dead = ent ? ent.dead : false;
  ctx.font = '700 15px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  const plate = pl.cosmetics.plate;
  ctx.fillStyle =
    plate === 'gold' ? '#ffd23e' :
    plate === 'neon' ? '#55f2c4' :
    plate === 'hazard' ? '#ffb340' :
    plate === 'galaxy' ? '#b28dff' :
    plate === 'crimson' ? '#ff6b81' :
    plate === 'ice' ? '#bfe8ff' :
    plate === 'toxic' ? '#9dff57' :
    plate === 'sunset' ? '#ff9d5c' :
    isYou ? '#dff3ff' : '#ffffff';
  ctx.globalAlpha = dead ? 0.5 : 0.9;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.lineWidth = 3;
  const label = (pl.isBot ? '🤖 ' : '') + pl.name;
  ctx.strokeText(label, x, y - 66);
  ctx.fillText(label, x, y - 66);
  ctx.globalAlpha = 1;
}

function sampleBuffer(ent, renderTime) {
  const buf = ent.buf;
  if (!buf || buf.length === 0) return null;
  while (buf.length > 2 && buf[1].t <= renderTime) buf.shift();
  if (buf.length === 1 || buf[0].t >= renderTime) {
    const s = buf[0];
    return { x: s.x, y: s.y, moving: s.mv, dir: s.dir };
  }
  const a = buf[0], b = buf[1];
  const f = Math.max(0, Math.min(1, (renderTime - a.t) / Math.max(1, b.t - a.t)));
  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    moving: b.mv, dir: b.dir,
  };
}

// ------------------------------------------------------------ lighting ------

const DARKNESS_TINT = {
  Meridian: '3,6,14', Kepler: '8,16,26', Hive: '14,7,2',
  Abyss: '1,10,18', Aurora: '10,4,18',
};

function drawLighting(game, zoom) {
  const lc = lightCtx;
  const darkness = game.you.alive ? 0.88 : 0.45;
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.clearRect(0, 0, W, H);
  lc.fillStyle = `rgba(${DARKNESS_TINT[game.map.id] || '3,6,14'},${darkness})`;
  lc.fillRect(0, 0, W, H);

  const s = game.settings;
  const isImp = game.role === ROLES.IMPOSTOR;
  let vision = BASE_VISION * (isImp ? s.impostorVision : s.crewVision);
  if (!game.you.alive) vision = 4000;
  else if (game.sab && game.sab.kind === SABOTAGES.LIGHTS && !isImp) vision *= 0.35;

  const r = vision * zoom;
  const g = lc.createRadialGradient(W / 2, H / 2, r * 0.25, W / 2, H / 2, r);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.8, 'rgba(0,0,0,0.85)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  lc.globalCompositeOperation = 'destination-out';
  lc.fillStyle = g;
  lc.beginPath(); lc.arc(W / 2, H / 2, r, 0, Math.PI * 2); lc.fill();
  lc.globalCompositeOperation = 'source-over';

  ctx.drawImage(lightCanvas, 0, 0);
}

function drawVignettes(game, tMs) {
  if (game.sab && (game.sab.kind === SABOTAGES.REACTOR || game.sab.kind === SABOTAGES.O2)) {
    if (App.settings.reduceflash) return;
    const a = 0.12 + Math.sin(tMs / 250) * 0.08;
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, 'rgba(200,20,40,0)');
    g.addColorStop(1, `rgba(200,20,40,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

// ------------------------------------------------------------ minimap -------

export function renderMinimap(cv, game) {
  const map = game.map;
  const c = cv.getContext('2d');
  const sc = Math.min(cv.width / map.width, cv.height / map.height) * 0.95;
  const ox = (cv.width - map.width * sc) / 2, oy = (cv.height - map.height * sc) / 2;
  c.fillStyle = '#060a13';
  c.fillRect(0, 0, cv.width, cv.height);
  for (const r of [...map.corridors, ...map.rooms]) {
    c.fillStyle = r.name ? 'rgba(85,140,220,0.25)' : 'rgba(85,140,220,0.15)';
    c.fillRect(ox + r.x * sc, oy + r.y * sc, r.w * sc, r.h * sc);
  }
  c.font = '700 11px "Segoe UI", sans-serif';
  c.textAlign = 'center';
  c.fillStyle = 'rgba(220,235,255,0.7)';
  for (const r of map.rooms) {
    c.fillText(r.name, ox + (r.x + r.w / 2) * sc, oy + (r.y + r.h / 2) * sc);
  }
  const commsDown = game.sab && game.sab.kind === SABOTAGES.COMMS;
  if (!commsDown) {
    for (const t of game.tasks) {
      if (t.done) continue;
      const td = map.taskById.get(t.id);
      if (!td) continue;
      c.fillStyle = '#f5c744';
      c.beginPath(); c.arc(ox + td.x * sc, oy + td.y * sc, 5, 0, Math.PI * 2); c.fill();
    }
  }
  if (game.sab) {
    const C = map.consoles;
    c.fillStyle = '#ff5470';
    const pts = game.sab.kind === SABOTAGES.REACTOR ? C.reactorPanels
      : game.sab.kind === SABOTAGES.O2 ? C.o2Consoles
      : game.sab.kind === SABOTAGES.LIGHTS ? [C.lightsPanel]
      : game.sab.kind === SABOTAGES.COMMS ? [C.commsPanel] : [C.security];
    const blink = Math.floor(performance.now() / 300) % 2 === 0;
    if (blink) for (const p of pts) {
      c.beginPath(); c.arc(ox + p.x * sc, oy + p.y * sc, 7, 0, Math.PI * 2); c.fill();
    }
  }
  c.fillStyle = '#55d7f2';
  c.strokeStyle = '#fff'; c.lineWidth = 2;
  c.beginPath(); c.arc(ox + game.you.x * sc, oy + game.you.y * sc, 6, 0, Math.PI * 2);
  c.fill(); c.stroke();
}

// ---------------------------------------------------------- camera feeds ----

export function renderCams(cv, game, tMs) {
  const map = game.map;
  const layer = getMapLayer(map);
  const c = cv.getContext('2d');
  const cols = 3, rows = 2;
  const cw = cv.width / cols, ch = cv.height / rows;
  c.fillStyle = '#04070d';
  c.fillRect(0, 0, cv.width, cv.height);

  map.cameras.forEach((cam, i) => {
    const gx = (i % cols) * cw, gy = Math.floor(i / cols) * ch;
    c.save();
    c.beginPath(); c.rect(gx + 3, gy + 3, cw - 6, ch - 6); c.clip();
    const sc = 0.42;
    c.translate(gx + cw / 2 - cam.x * sc, gy + ch / 2 - cam.y * sc);
    c.scale(sc, sc);
    c.drawImage(layer, 0, 0);
    for (const ent of game.camsEnts) {
      const pl = game.players.get(ent.pid);
      if (!pl) continue;
      drawCrewmate(c, ent.x, ent.y, {
        colorId: pl.cosmetics.color, hat: pl.cosmetics.hat, skin: pl.cosmetics.skin,
        facing: ent.dir === 1 ? 1 : -1, moving: !!ent.moving, walkPhase: tMs / 55, t: tMs,
      });
    }
    for (const b of game.bodies.values()) {
      const pl = game.players.get(b.pid);
      drawDeadBody(c, b.x, b.y, pl ? pl.cosmetics.color : 'red', tMs);
    }
    c.restore();
    c.strokeStyle = '#2c3a52'; c.lineWidth = 3;
    c.strokeRect(gx + 3, gy + 3, cw - 6, ch - 6);
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(gx + 8, gy + 8, 120, 20);
    c.fillStyle = '#55d7f2';
    c.font = '700 12px "Segoe UI", sans-serif';
    c.textAlign = 'left';
    c.fillText(`● ${cam.name}`, gx + 14, gy + 22);
  });

  const gx = 2 * cw, gy = ch;
  c.fillStyle = '#0a0f1a';
  c.fillRect(gx + 3, gy + 3, cw - 6, ch - 6);
  c.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 200; i++) {
    c.fillRect(gx + 3 + Math.random() * (cw - 6), gy + 3 + Math.random() * (ch - 6), 2, 2);
  }
  c.fillStyle = '#4b5f85';
  c.font = '700 14px "Segoe UI", sans-serif';
  c.textAlign = 'center';
  c.fillText('NO SIGNAL', gx + cw / 2, gy + ch / 2);
}
