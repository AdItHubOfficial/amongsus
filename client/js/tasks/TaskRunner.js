// =============================================================
// AMONGSUS client — task modal runner. Hosts a mini-game, provides
// its helper API, and reports completion to the server (which
// enforces proximity + minimum-duration anti-cheat checks).
// =============================================================

import { App } from '../state.js';
import { $, el, show, hide } from '../utils/dom.js';
import { sfx } from '../audio/AudioEngine.js';
import { MINIGAMES } from './minigames.js';

let active = null; // { taskId, fix, frames:[], timers:[], openedAt, finished }

export function isTaskOpen() { return !!active; }

export function openTask(taskId) {
  const task = App.game.map.taskById.get(taskId);
  if (!task || active) return;
  App.game.taskOpen(taskId);
  launch(task.type, task.name, { taskId, minMs: task.minMs });
}

export function openFix(kind, which) {
  if (active) return;
  const names = { o2: 'Restore Oxygen', lights: 'Fix Lights', comms: 'Restore Comms', cameras: 'Reboot Cameras' };
  launch('fix-' + kind, names[kind] || 'Repair', { fix: { kind, which }, minMs: 0 });
}

function launch(type, title, meta) {
  const def = MINIGAMES[type];
  if (!def) return;
  const root = $('#task-root');
  root.innerHTML = '';
  $('#task-title').textContent = title;
  show('#overlay-task');
  App.game.uiLocks++;
  sfx('click');

  active = { ...meta, frames: [], timers: [], listeners: [], finished: false, openedAt: performance.now() };

  const api = {
    done: complete,
    sfx,
    el(tag, cls, text, parent) {
      const e = el(tag, cls, text);
      (parent || root).appendChild(e);
      return e;
    },
    row() {
      const r = el('div');
      r.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;align-items:center';
      root.appendChild(r);
      return r;
    },
    instr(text) { api.el('div', 'task-instr', text); },
    canvas(w, h) {
      const cv = el('canvas');
      cv.width = w; cv.height = h;
      cv.style.maxWidth = '100%';
      root.appendChild(cv);
      return { cv, g: cv.getContext('2d') };
    },
    slider(min, max, value) {
      const s = el('input');
      s.type = 'range'; s.min = min; s.max = max; s.value = value; s.step = 'any';
      s.style.width = '260px';
      root.appendChild(s);
      return s;
    },
    gauge() {
      const wrap = el('div');
      wrap.style.cssText = 'width:300px;height:26px;background:rgba(255,255,255,0.08);border-radius:8px;overflow:hidden;position:relative';
      const fill = el('div');
      fill.style.cssText = 'height:100%;width:0%;background:linear-gradient(90deg,#45e08a,#9dffc8);transition:width 0.1s';
      const label = el('div');
      label.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;text-shadow:0 1px 2px #000';
      wrap.append(fill, label);
      root.appendChild(wrap);
      return { set(p, text) { fill.style.width = (p * 100) + '%'; if (text !== undefined) label.textContent = text; } };
    },
    onFrame(fn) { active.frames.push(fn); },
    timer(fn, ms) {
      const id = setInterval(fn, ms);
      active.timers.push(id);
      return id;
    },
    pointer(cv, handlers) {
      const map = (e) => {
        const r = cv.getBoundingClientRect();
        return [(e.clientX - r.left) * (cv.width / r.width), (e.clientY - r.top) * (cv.height / r.height)];
      };
      const add = (ev, fn) => {
        const h = (e) => { e.preventDefault(); fn(...map(e), e); };
        cv.addEventListener(ev, h);
        active.listeners.push([cv, ev, h]);
      };
      if (handlers.down) add('pointerdown', handlers.down);
      if (handlers.move) add('pointermove', handlers.move);
      if (handlers.up) add('pointerup', handlers.up);
      if (handlers.up) add('pointercancel', handlers.up);
    },
  };

  if (def.instr) api.instr(def.instr);
  def.create(root, api);
}

/** Called from the main loop every frame while a game is open. */
export function tickTask(dt, tMs) {
  if (!active || active.finished) return;
  for (const fn of active.frames) fn(dt, tMs);
}

function complete() {
  if (!active || active.finished) return;
  active.finished = true;
  sfx('taskDone');
  $('.task-box').classList.add('task-complete-flash');

  const a = active;
  // Respect the server's minimum-duration check before reporting done.
  const elapsed = performance.now() - a.openedAt;
  const wait = a.taskId ? Math.max(500, (a.minMs || 0) * 0.85 - elapsed) : 500;
  setTimeout(() => {
    if (a.taskId) App.game.taskDone(a.taskId);
    else if (a.fix) App.game.fix(a.fix.kind, a.fix.which);
    closeTask(true);
  }, wait);
}

export function closeTask(completed = false) {
  if (!active) return;
  for (const id of active.timers) clearInterval(id);
  for (const [cv, ev, h] of active.listeners) cv.removeEventListener(ev, h);
  const wasTask = !!active.taskId && !completed;
  active = null;
  hide('#overlay-task');
  $('.task-box').classList.remove('task-complete-flash');
  $('#task-root').innerHTML = '';
  App.game.uiLocks = Math.max(0, App.game.uiLocks - 1);
  if (wasTask) App.game.taskCancel();
}
