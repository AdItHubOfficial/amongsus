// =============================================================
// AMONGSUS client — in-game HUD: action buttons with cooldowns,
// task list & bar, sabotage alerts, vents, cameras, map, emotes,
// ghost chat, ping. Updated every frame from the main loop.
// =============================================================

import { App } from '../state.js';
import { $, $$, el, show, hide, toast, fmtSecs } from '../utils/dom.js';
import { EMOTES, ROLES, SABOTAGES } from '/shared/constants.js';
import { onAction } from '../game/Input.js';
import { openTask, openFix, isTaskOpen, closeTask } from '../tasks/TaskRunner.js';
import { renderMinimap, renderCams } from '../game/Renderer.js';
import { appendChat } from './LobbyUI.js';
import { sfx } from '../audio/AudioEngine.js';
import { record } from '../progression/Progression.js';

let prox = null;
let camsOpen = false;
let camsAutoClose = 0;
let tasksDirty = true;
let ghostChatEl = null;

const game = () => App.game;

export function initHUD() {
  // action buttons
  $('#btn-use').onclick = doUse;
  $('#btn-kill').onclick = doKill;
  $('#btn-report').onclick = () => game() && game().report();
  $('#btn-vent').onclick = doVent;
  $('#btn-ability').onclick = doAbility;
  $('#btn-sabotage').onclick = () => toggleOverlay('#overlay-sab');
  $('#btn-map').onclick = () => toggleOverlay('#overlay-map');
  $('#btn-emote').onclick = () => toggleOverlay('#overlay-emotes');
  $('#btn-pause').onclick = () => show('#overlay-pause');

  // keyboard
  onAction('use', doUse);
  onAction('kill', doKill);
  onAction('report', () => game() && game().report());
  onAction('vent', doVent);
  onAction('ability', doAbility);
  onAction('map', () => toggleOverlay('#overlay-map'));
  onAction('emote', () => toggleOverlay('#overlay-emotes'));

  // overlay closes
  $('#btn-map-close').onclick = () => hide('#overlay-map');
  $('#btn-sab-close').onclick = () => hide('#overlay-sab');
  $('#btn-cams-close').onclick = closeCams;
  $('#btn-task-close').onclick = () => closeTask(false);
  $('#btn-vent-exit').onclick = () => game() && game().vent();

  // sabotage menu (door buttons are rebuilt per game — see setupHUDForGame)
  for (const btn of $$('.sab-btn')) {
    btn.onclick = () => {
      game().sabotage(btn.dataset.sab);
      hide('#overlay-sab');
      sfx('click');
    };
  }

  // emote wheel
  const wheel = $('#emote-wheel');
  EMOTES.forEach((e, i) => {
    const b = el('button', '', e);
    const a = (i / EMOTES.length) * Math.PI * 2 - Math.PI / 2;
    b.style.left = (113 + Math.cos(a) * 105) + 'px';
    b.style.top = (113 + Math.sin(a) * 105) + 'px';
    b.onclick = () => { game().sendEmote(i); hide('#overlay-emotes'); };
    wheel.appendChild(b);
  });
  $('#overlay-emotes').addEventListener('click', (e) => {
    if (e.target.id === 'overlay-emotes') hide('#overlay-emotes');
  });

  // ghost chat (created dynamically; shown while dead)
  ghostChatEl = el('div', 'panel-glass hidden');
  ghostChatEl.id = 'ghost-chat';
  ghostChatEl.style.cssText =
    'position:absolute;left:12px;bottom:90px;width:270px;height:210px;display:flex;flex-direction:column;padding:10px;z-index:20';
  const title = el('div', '', '👻 Ghost chat');
  title.style.cssText = 'font-size:11px;letter-spacing:0.1em;color:#a9b7e8;margin-bottom:4px';
  const log = el('div', 'chat-log');
  log.id = 'ghost-chat-log';
  const rowEl = el('div', 'chat-input-row');
  const inp = el('input');
  inp.id = 'ghost-chat-input';
  inp.maxLength = 120;
  inp.placeholder = 'Boo…';
  const sendB = el('button', 'btn btn-small', '➤');
  const send = () => {
    if (!inp.value.trim()) return;
    App.conn.chat(inp.value.trim());
    record('chat');
    inp.value = '';
  };
  sendB.onclick = send;
  inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') send(); });
  rowEl.append(inp, sendB);
  ghostChatEl.append(title, log, rowEl);
  $('#hud').appendChild(ghostChatEl);

  App.on('ui:tasks', () => { tasksDirty = true; });
  App.on('ui:vent', updateVentOverlay);
}

export function setupHUDForGame(g) {
  tasksDirty = true;
  camsOpen = false;
  // per-map door lockdown buttons
  const doors = $('#sab-doors');
  doors.innerHTML = '';
  for (const room of g.map.closableRooms) {
    const b = el('button', 'btn', `🚪 ${g.map.roomName(room)}`);
    b.onclick = () => { game().door(room); sfx('click'); };
    doors.appendChild(b);
  }
  hide('#overlay-map'); hide('#overlay-sab'); hide('#overlay-cams'); hide('#overlay-emotes');
  hide('#overlay-vent'); hide('#hud-sabotage'); hide('#hud-ghost'); hide(ghostChatEl);

  const role = $('#hud-role');
  show(role);
  role.className = g.isImpostor ? 'impostor' : 'crew';
  role.textContent = g.role.toUpperCase() + (g.practice ? ' · PRACTICE' : '');

  toggleBtn('#btn-kill', g.canKill);
  toggleBtn('#btn-sabotage', g.isImpostor);
  toggleBtn('#btn-vent', g.canUseVents);
  toggleBtn('#btn-ability', [ROLES.MEDIC, ROLES.GUARDIAN, ROLES.HACKER].includes(g.role));
  if (App.isTouch) show('#joystick');
  $('#hud-taskbar-wrap').style.display = g.settings.taskBar === 'never' ? 'none' : '';
}

function toggleBtn(sel, on) { on ? show(sel) : hide(sel); }

// ------------------------------------------------------------ actions -------

function doUse() {
  const g = game();
  if (!g || !prox || isTaskOpen() || g.state !== 'playing') return;
  if (g.inVent) return;
  if (prox.fix) {
    if (prox.fix.kind === SABOTAGES.REACTOR) {
      const holding = g.holdingPanel === prox.fix.which;
      g.fixHold(prox.fix.which, !holding);
      sfx('click');
    } else {
      openFix(prox.fix.kind, prox.fix.which);
    }
    return;
  }
  if (prox.task) { openTask(prox.task.id); return; }
  if (prox.emergency) { g.emergency(); return; }
  if (prox.security) openCams();
}

function doKill() {
  const g = game();
  if (!g || !prox || !prox.killTarget) return;
  if (remaining(g, 'kill') > 0) return;
  g.kill(prox.killTarget);
}

function doVent() {
  const g = game();
  if (!g || !g.canUseVents) return;
  if (g.inVent || prox.vent) g.vent();
}

function doAbility() {
  const g = game();
  if (!g) return;
  if (remaining(g, 'ability') > 0) return;
  if (g.role === ROLES.HACKER) {
    g.ability();
    openCams(true);
    camsAutoClose = performance.now() + 8000;
  } else if (prox && prox.abilityTarget) {
    g.ability(prox.abilityTarget);
  }
}

function toggleOverlay(sel) {
  const o = $(sel);
  o.classList.contains('hidden') ? show(o) : hide(o);
  sfx('click');
}

function openCams(remote = false) {
  if (camsOpen) return;
  camsOpen = true;
  camsAutoClose = 0;
  if (!remote) game().camsOnOff(true);
  game().uiLocks++;
  show('#overlay-cams');
}

function closeCams() {
  if (!camsOpen) return;
  camsOpen = false;
  game().camsOnOff(false);
  game().uiLocks = Math.max(0, game().uiLocks - 1);
  hide('#overlay-cams');
}

function updateVentOverlay(ventId) {
  const overlay = $('#overlay-vent');
  const wrap = $('#vent-arrows');
  wrap.innerHTML = '';
  const g = game();
  if (!ventId || !g) { hide(overlay); return; }
  const vent = g.map.ventById.get(ventId);
  if (!vent) { hide(overlay); return; }
  show(overlay);
  vent.links.forEach((to, i) => {
    const target = g.map.ventById.get(to);
    const b = el('button', 'vent-arrow', i === 0 ? '◀' : '▶');
    b.dataset.tip = g.map.roomName(target.room);
    b.style.left = (i === 0 ? 30 : 70) + '%';
    b.style.top = '45%';
    b.onclick = () => game().ventMove(to);
    wrap.appendChild(b);
  });
}

// ------------------------------------------------------------ per frame -----

function remaining(g, key) {
  if (!g.cool || g.cool[key] === undefined) return 0;
  return Math.max(0, g.cool[key] - (performance.now() - (g.snapAt || 0)));
}

export function updateHUD(tMs) {
  const g = game();
  if (!g) return;

  // ping
  const chip = $('#hud-ping');
  chip.textContent = `${App.ping} ms`;
  chip.classList.toggle('bad', App.ping > 150);

  prox = g.computeProx();

  // taskbar + list
  $('#hud-taskbar').style.width = Math.round((g.bar || 0) * 100) + '%';
  if (tasksDirty) { rebuildTasks(g); tasksDirty = false; }

  // use button
  const useBtn = $('#btn-use');
  const canUse = !!(prox.fix || prox.task || prox.emergency || prox.security);
  useBtn.disabled = !canUse || g.state !== 'playing';
  useBtn.classList.toggle('ready', canUse);
  const useIco = useBtn.querySelector('.hb-ico');
  useIco.textContent = prox.fix ? '🔧' : prox.emergency ? '🚨' : prox.security ? '📺' : '✋';

  // report
  const repBtn = $('#btn-report');
  repBtn.disabled = !prox.body;
  repBtn.classList.toggle('ready', !!prox.body);

  // kill
  if (g.canKill) {
    const kb = $('#btn-kill');
    const cd = remaining(g, 'kill');
    kb.querySelector('.hb-cd').textContent = cd > 0 ? fmtSecs(cd) : '';
    const ok = g.you.alive && cd <= 0 && !!prox.killTarget;
    kb.disabled = !ok;
    kb.classList.toggle('ready', ok);
  }

  // sabotage
  if (g.isImpostor) {
    const sb = $('#btn-sabotage');
    const cd = remaining(g, 'sab');
    sb.querySelector('.hb-cd').textContent = cd > 0 && !g.sab ? fmtSecs(cd) : '';
    sb.disabled = !g.you.alive || g.state !== 'playing';
    for (const btn of $$('.sab-btn')) btn.disabled = cd > 0 || !!g.sab;
  }

  // vent
  if (g.canUseVents) {
    const vb = $('#btn-vent');
    const cd = g.role === ROLES.ENGINEER ? remaining(g, 'vent') : 0;
    vb.querySelector('.hb-cd').textContent = cd > 0 ? fmtSecs(cd) : '';
    const ok = g.you.alive && cd <= 0 && (!!prox.vent || !!g.inVent);
    vb.disabled = !ok;
    vb.classList.toggle('ready', ok);
  }

  // ability
  const ab = $('#btn-ability');
  if (!ab.classList.contains('hidden')) {
    const cd = remaining(g, 'ability');
    ab.querySelector('.hb-cd').textContent = cd > 0 ? fmtSecs(cd) : '';
    const usable = g.role === ROLES.HACKER ? g.you.alive
      : g.role === ROLES.GUARDIAN ? (!g.you.alive && !!prox.abilityTarget)
      : (g.you.alive && !!prox.abilityTarget);
    ab.disabled = cd > 0 || !usable;
    ab.classList.toggle('ready', cd <= 0 && usable);
    ab.querySelector('.hb-ico').textContent = g.role === ROLES.HACKER ? '💻' : '🛡';
  }

  // emergency hint on use tooltip
  updateSabBanner(g);

  // ghost UI
  const dead = !g.you.alive && g.state === 'playing';
  dead ? show('#hud-ghost') : hide('#hud-ghost');
  dead ? show(ghostChatEl) : hide(ghostChatEl);

  // overlays that render every frame
  if (!$('#overlay-map').classList.contains('hidden')) {
    renderMinimap($('#map-canvas'), g);
  }
  if (camsOpen) {
    renderCams($('#cams-canvas'), g, tMs);
    if (camsAutoClose && performance.now() > camsAutoClose) closeCams();
    if (g.sab && (g.sab.kind === SABOTAGES.CAMERAS || g.sab.kind === SABOTAGES.COMMS)) closeCams();
  }
}

function updateSabBanner(g) {
  const banner = $('#hud-sabotage');
  if (!g.sab) { hide(banner); return; }
  show(banner);
  const k = g.sab.kind;
  const remainMs = Math.max(0, (g.sab.remainMs || 0) - (performance.now() - (g.snapAt || 0)));
  if (k === SABOTAGES.REACTOR) {
    const held = (g.sab.panels || []).filter(Boolean).length;
    banner.textContent = `☢ REACTOR MELTDOWN — ${fmtSecs(remainMs)}s · panels held: ${held}/2 (both at once!)`;
  } else if (k === SABOTAGES.O2) {
    const fixed = (g.sab.o2Fixed || []).filter(Boolean).length;
    banner.textContent = `💨 OXYGEN DEPLETION — ${fmtSecs(remainMs)}s · consoles reset: ${fixed}/2`;
  } else if (k === SABOTAGES.LIGHTS) {
    banner.textContent = '💡 LIGHTS OUT — repair the breaker panel in the Engine Room';
  } else if (k === SABOTAGES.COMMS) {
    banner.textContent = '📡 COMMS OFFLINE — tasks hidden! Repair in Communications';
  } else if (k === SABOTAGES.CAMERAS) {
    banner.textContent = '📷 CAMERAS DISABLED — reboot from Security';
  }
}

function rebuildTasks(g) {
  const wrap = $('#hud-tasks');
  wrap.innerHTML = '';
  if (g.isImpostor) {
    const h = el('div', 'hud-hint', 'Fake tasks (blend in):');
    h.classList.add('fake');
    wrap.appendChild(h);
  }
  const commsDown = g.sab && g.sab.kind === SABOTAGES.COMMS;
  if (commsDown && !g.isImpostor) {
    wrap.appendChild(el('div', 'hud-hint', '— COMMS OFFLINE —'));
    return;
  }
  for (const t of g.tasks) {
    const td = g.map.taskById.get(t.id);
    if (!td) continue;
    const line = el('div', 'task-line' + (t.done ? ' done' : ''),
      `${g.map.roomName(td.room)}: ${td.name}`);
    wrap.appendChild(line);
  }
}

export function addGhostChat(msg) {
  const log = $('#ghost-chat-log');
  if (log) appendChat(log, msg);
}

/** Close any open HUD overlay; returns true if something was closed. */
export function hudEscape() {
  if (camsOpen) { closeCams(); return true; }
  for (const sel of ['#overlay-map', '#overlay-sab', '#overlay-emotes']) {
    const o = $(sel);
    if (!o.classList.contains('hidden')) { hide(o); return true; }
  }
  return false;
}

export function hudCloseAll() {
  if (camsOpen) closeCams();
  hide('#overlay-map'); hide('#overlay-sab'); hide('#overlay-emotes');
}
