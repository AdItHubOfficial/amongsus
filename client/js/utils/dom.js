// =============================================================
// AMONGSUS client — DOM helpers, screens, toasts, tooltips.
// All user-generated text goes through textContent (XSS-safe).
// =============================================================

export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => [...document.querySelectorAll(sel)];

export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function showScreen(id) {
  for (const s of $$('.screen')) s.classList.toggle('active', s.id === id);
}

export function show(elOrId) {
  (typeof elOrId === 'string' ? $(elOrId) : elOrId).classList.remove('hidden');
}
export function hide(elOrId) {
  (typeof elOrId === 'string' ? $(elOrId) : elOrId).classList.add('hidden');
}

export function toast(msg, type = 'info', ms = 3500) {
  const t = el('div', 'toast' + (type !== 'info' ? ' ' + type : ''), msg);
  $('#toast-container').appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 350);
  }, ms);
}

export function screenShake() {
  const app = $('#app');
  app.classList.remove('shake');
  void app.offsetWidth; // restart animation
  app.classList.add('shake');
}

/** Hover tooltips for any element with [data-tip]. */
export function initTooltips() {
  const tip = $('#tooltip');
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-tip]');
    if (!target) { tip.classList.add('hidden'); return; }
    tip.textContent = target.dataset.tip;
    tip.classList.remove('hidden');
    const r = target.getBoundingClientRect();
    tip.style.left = Math.min(window.innerWidth - 250, r.left) + 'px';
    tip.style.top = (r.top > 60 ? r.top - 34 : r.bottom + 8) + 'px';
  });
}

export function fmtSecs(ms) {
  return Math.ceil(ms / 1000).toString();
}
