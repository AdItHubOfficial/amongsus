// =============================================================
// AMONGSUS client — main menu: name entry, host/join/browse,
// customization with unlocks, profile panel, how-to.
// =============================================================

import { App } from '../state.js';
import { $, $$, el, show, hide, toast, showScreen } from '../utils/dom.js';
import { COLORS, HATS, PETS, SKINS, PLATES } from '/shared/constants.js';
import { drawCrewmate, drawPet, colorHex } from '../game/CharacterRenderer.js';
import {
  isUnlocked, saveProfile, levelFromXp, ACHIEVEMENTS,
} from '../progression/Progression.js';
import { sfx } from '../audio/AudioEngine.js';

export function initMenu() {
  const nameInp = $('#inp-name');
  nameInp.value = App.profile.name || '';
  nameInp.addEventListener('input', () => {
    App.profile.name = nameInp.value;
    saveProfile();
  });

  $('#btn-host').onclick = () => joinOrHost('host');
  $('#btn-join').onclick = () => joinOrHost('join');
  $('#inp-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') joinOrHost('join'); });
  $('#btn-practice').onclick = () => joinOrHost('practice');
  $('#btn-browse').onclick = () => { openPanel('#panel-browse'); refreshBrowse(); };
  $('#btn-browse-refresh').onclick = refreshBrowse;
  $('#btn-customize').onclick = () => { openPanel('#panel-customize'); buildCosmeticGrids(); };
  $('#btn-lobby-customize').onclick = () => { openPanel('#panel-customize'); buildCosmeticGrids(); };
  $('#btn-profile').onclick = () => { openPanel('#panel-profile'); fillProfile(); };
  $('#btn-how').onclick = () => openPanel('#panel-how');
  $('#btn-settings-menu').onclick = () => show('#overlay-settings');

  for (const btn of $$('.panel-close')) {
    btn.onclick = () => hide(btn.closest('.overlay'));
  }

  // rejoin a live session after refresh
  const sess = App.conn.savedSession();
  if (sess) {
    const btn = $('#btn-rejoin');
    show(btn);
    btn.onclick = async () => {
      const res = await App.conn.join({
        code: sess.code, token: sess.token,
        name: App.profile.name || 'Crewmate', cosmetics: App.profile.cosmetics,
      });
      if (!res.ok) {
        toast('That game is gone.', 'warn');
        App.conn.clearSession();
        hide(btn);
      }
    };
  }

  updateMenuLevel();
}

function openPanel(sel) {
  sfx('click');
  show(sel);
}

async function joinOrHost(mode) {
  const name = ($('#inp-name').value || '').trim();
  if (!name) { toast('Enter a name first!', 'warn'); $('#inp-name').focus(); return; }
  sfx('click');
  const base = { name, cosmetics: App.profile.cosmetics };
  let res;
  if (mode === 'join') {
    const code = ($('#inp-code').value || '').trim().toUpperCase();
    if (code.length !== 5) { toast('Lobby codes are 5 letters.', 'warn'); return; }
    res = await App.conn.join({ ...base, code });
  } else {
    res = await App.conn.create({ ...base, isPublic: false, practice: mode === 'practice' });
  }
  if (!res.ok) toast(res.error || 'Could not connect.', 'error');
}

async function joinByCode(code) {
  const name = ($('#inp-name').value || '').trim();
  if (!name) { toast('Enter a name first!', 'warn'); hide('#panel-browse'); return; }
  const res = await App.conn.join({ code, name, cosmetics: App.profile.cosmetics });
  if (!res.ok) toast(res.error || 'Could not join.', 'error');
  else hide('#panel-browse');
}

async function refreshBrowse() {
  const list = $('#browse-list');
  list.innerHTML = '';
  list.appendChild(el('div', 'browse-empty', 'Searching…'));
  const rooms = await App.conn.browse();
  list.innerHTML = '';
  if (!rooms.length) {
    list.appendChild(el('div', 'browse-empty', 'No public lobbies right now. Host one!'));
    return;
  }
  for (const r of rooms) {
    const row = el('div', 'browse-row');
    row.appendChild(el('span', 'b-code', r.code));
    row.appendChild(el('span', 'b-host', `${r.host}'s lobby`));
    row.appendChild(el('span', '', `${r.players}/${r.max}`));
    const join = el('button', 'btn btn-small btn-primary', 'JOIN');
    join.onclick = () => joinByCode(r.code);
    row.appendChild(join);
    list.appendChild(row);
  }
}

// ---- customization -----------------------------------------------------------

function buildCosmeticGrids() {
  const cos = App.profile.cosmetics;
  buildGrid('#grid-colors', COLORS, 'color', (item, btn) => {
    btn.style.background = item.hex;
    btn.textContent = '';
    btn.dataset.tip = item.name;
  });
  buildGrid('#grid-hats', HATS, 'hat');
  buildGrid('#grid-pets', PETS, 'pet');
  buildGrid('#grid-skins', SKINS, 'skin');
  buildGrid('#grid-plates', PLATES, 'plate');
}

function buildGrid(sel, list, kind, decorate) {
  const grid = $(sel);
  grid.innerHTML = '';
  const cos = App.profile.cosmetics;
  for (const item of list) {
    const locked = item.lvl !== undefined ? !isUnlocked(kind, item.id) && kind !== 'color' : false;
    const btn = el('button', 'cos-item', item.name);
    if (decorate) decorate(item, btn);
    if (locked) {
      btn.classList.add('locked');
      btn.dataset.tip = `Unlocks at level ${item.lvl}`;
    }
    if (cos[kind] === item.id) btn.classList.add('selected');
    btn.onclick = () => {
      if (locked) { sfx('error'); return; }
      cos[kind] = item.id;
      saveProfile();
      sfx('click');
      buildCosmeticGrids();
      if (App.lobby) App.conn.cosmetics(cos);
    };
    grid.appendChild(btn);
  }
}

/** Animated character preview — called from the main loop. */
export function renderPreview(tMs) {
  const panel = $('#panel-customize');
  if (panel.classList.contains('hidden')) return;
  const cv = $('#preview-canvas');
  const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  const cos = App.profile.cosmetics;
  drawCrewmate(g, cv.width / 2, cv.height - 60, {
    colorId: cos.color, hat: cos.hat, skin: cos.skin,
    facing: Math.sin(tMs / 1600) > 0 ? 1 : -1,
    moving: true, walkPhase: tMs / 160, t: tMs, scale: 1.7,
  });
  drawPet(g, cv.width / 2 + 62, cv.height - 44, cos.pet, cos.color, tMs);
}

// ---- profile panel ------------------------------------------------------------

export function updateMenuLevel() {
  const { level } = levelFromXp(App.profile.xp);
  $('#menu-level').textContent = `Level ${level} · ${App.profile.xp} XP · ${App.profile.stats.games} games`;
}

function fillProfile() {
  const p = App.profile;
  const { level, into, need } = levelFromXp(p.xp);
  $('#profile-level').textContent = level;
  $('#profile-xpfill').style.width = (into / need * 100) + '%';
  $('#profile-xptext').textContent = `${into} / ${need} XP to level ${level + 1}`;

  const stats = $('#profile-stats');
  stats.innerHTML = '';
  const cells = [
    [p.stats.games, 'Games'], [p.stats.crewWins, 'Crew wins'], [p.stats.impWins, 'Impostor wins'],
    [p.stats.tasks, 'Tasks done'], [p.stats.kills, 'Eliminations'], [p.stats.fixes, 'Sabotage fixes'],
    [p.stats.meetings, 'Meetings called'], [p.stats.ejected, 'Times died'], [p.stats.chats, 'Chats sent'],
  ];
  for (const [v, label] of cells) {
    const c = el('div', 'stat-cell');
    c.appendChild(el('b', '', String(v)));
    c.appendChild(el('span', '', label));
    stats.appendChild(c);
  }

  const dailies = $('#list-dailies');
  dailies.innerHTML = '';
  for (const d of p.dailies.items) {
    const row = el('div', 'daily-row' + (d.done ? ' done' : ''));
    row.appendChild(el('span', '', d.done ? '✅' : '🗓️'));
    row.appendChild(el('span', '', d.desc));
    row.appendChild(el('span', 'daily-prog', `${d.prog}/${d.goal}`));
    dailies.appendChild(row);
  }

  const grid = $('#grid-achievements');
  grid.innerHTML = '';
  for (const a of ACHIEVEMENTS) {
    const got = !!p.ach[a.id];
    const cell = el('div', 'ach-cell' + (got ? '' : ' locked'));
    cell.appendChild(el('span', 'ach-ico', a.ico));
    const info = el('div');
    info.appendChild(el('b', '', a.name));
    info.appendChild(el('span', '', a.desc));
    cell.appendChild(info);
    grid.appendChild(cell);
  }
}
