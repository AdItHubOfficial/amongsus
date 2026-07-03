// =============================================================
// AMONGSUS client — keyboard + touch input. Movement is fixed to
// WASD/arrows; action keys are rebindable via Settings.
// =============================================================

import { App } from '../state.js';

const down = new Set();
let joyVec = { x: 0, y: 0 };
let joyPointer = null;
const actionHandlers = new Map(); // action -> fn

export const DEFAULT_KEYS = {
  use: 'KeyE', kill: 'KeyQ', report: 'KeyR',
  map: 'KeyM', emote: 'KeyT', vent: 'KeyV', ability: 'KeyF',
};

export function initInput() {
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.matches && e.target.matches('input, textarea, select')) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    down.add(e.code);
    const keys = App.settings.keys;
    for (const [action, code] of Object.entries(keys)) {
      if (e.code === code) {
        const fn = actionHandlers.get(action);
        if (fn) fn();
      }
    }
    if (e.code === 'Escape') {
      const fn = actionHandlers.get('escape');
      if (fn) fn();
    }
  });
  window.addEventListener('keyup', (e) => down.delete(e.code));
  window.addEventListener('blur', () => down.clear());
  initJoystick();
}

export function onAction(action, fn) { actionHandlers.set(action, fn); }

export function getMove() {
  let dx = 0, dy = 0;
  if (down.has('KeyW') || down.has('ArrowUp')) dy -= 1;
  if (down.has('KeyS') || down.has('ArrowDown')) dy += 1;
  if (down.has('KeyA') || down.has('ArrowLeft')) dx -= 1;
  if (down.has('KeyD') || down.has('ArrowRight')) dx += 1;
  if (dx === 0 && dy === 0 && (joyVec.x || joyVec.y)) {
    dx = joyVec.x; dy = joyVec.y;
  }
  const mag = Math.hypot(dx, dy);
  if (mag > 1) { dx /= mag; dy /= mag; }
  return { dx, dy };
}

// ---- touch joystick ----------------------------------------------------------

function initJoystick() {
  const joy = document.getElementById('joystick');
  const stick = document.getElementById('joystick-stick');
  if (!joy) return;

  const handle = (e) => {
    const r = joy.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const max = r.width / 2 - 10;
    const mag = Math.hypot(dx, dy);
    if (mag > max) { dx = dx / mag * max; dy = dy / mag * max; }
    stick.style.left = (r.width / 2 - 25 + dx) + 'px';
    stick.style.top = (r.height / 2 - 25 + dy) + 'px';
    joyVec = { x: dx / max, y: dy / max };
  };
  const reset = () => {
    joyPointer = null;
    joyVec = { x: 0, y: 0 };
    stick.style.left = '40px';
    stick.style.top = '40px';
  };

  joy.addEventListener('pointerdown', (e) => {
    joyPointer = e.pointerId;
    joy.setPointerCapture(e.pointerId);
    handle(e);
  });
  joy.addEventListener('pointermove', (e) => {
    if (e.pointerId === joyPointer) handle(e);
  });
  joy.addEventListener('pointerup', reset);
  joy.addEventListener('pointercancel', reset);
}
