// =============================================================
// AMONGSUS client — pooled particle system (world space).
// =============================================================

import { App } from '../state.js';

const POOL_SIZE = 600;
const pool = [];
for (let i = 0; i < POOL_SIZE; i++) pool.push({ active: false });
let cursor = 0;

function alloc() {
  for (let i = 0; i < POOL_SIZE; i++) {
    cursor = (cursor + 1) % POOL_SIZE;
    if (!pool[cursor].active) return pool[cursor];
  }
  return pool[cursor]; // recycle oldest when saturated
}

function budget() {
  const g = App.settings ? App.settings.graphics : 'high';
  return g === 'low' ? 0.25 : g === 'medium' ? 0.6 : 1;
}

export function spawnBurst(x, y, color, count = 14, opts = {}) {
  const n = Math.round(count * budget());
  for (let i = 0; i < n; i++) {
    const p = alloc();
    const a = Math.random() * Math.PI * 2;
    const sp = (opts.speed || 140) * (0.4 + Math.random() * 0.8);
    p.active = true;
    p.x = x; p.y = y;
    p.vx = Math.cos(a) * sp;
    p.vy = Math.sin(a) * sp - (opts.up || 40);
    p.size = (opts.size || 5) * (0.6 + Math.random() * 0.8);
    p.color = Array.isArray(color) ? color[i % color.length] : color;
    p.max = p.life = (opts.life || 0.7) * (0.6 + Math.random() * 0.8);
    p.grav = opts.grav !== undefined ? opts.grav : 220;
    p.square = !!opts.square;
  }
}

export function spawnSparks(x, y) {
  spawnBurst(x, y, ['#ffd23e', '#ff9a3e', '#fff2b0'], 10, { speed: 220, life: 0.4, grav: 300 });
}

export function spawnPoof(x, y, color = '#cfd8ea') {
  spawnBurst(x, y, color, 10, { speed: 70, life: 0.6, grav: -30, size: 8 });
}

export function spawnKillFx(x, y) {
  spawnBurst(x, y, ['#e0455a', '#8e2c3d', '#3a3f4a'], 22, { speed: 190, life: 0.8, size: 6 });
}

export function spawnConfetti(x, y) {
  spawnBurst(x, y, ['#55d7f2', '#45e08a', '#f5c744', '#ff5470', '#8f5fe8'], 40,
    { speed: 260, life: 1.6, up: 180, size: 5, square: true });
}

export function updateParticles(dt) {
  for (const p of pool) {
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) { p.active = false; continue; }
    p.vy += p.grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

/** Draw in world coordinates (call inside camera transform). */
export function drawParticles(ctx) {
  for (const p of pool) {
    if (!p.active) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    if (p.square) {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.max), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
