// =============================================================
// AMONGSUS client — local progression: XP, levels, statistics,
// achievements, daily challenges, cosmetic unlocks.
// Stored in localStorage (the game needs no database).
// =============================================================

import { App } from '../state.js';
import { load, save } from '../utils/storage.js';
import { HATS, PETS, SKINS, PLATES } from '/shared/constants.js';
import { toast } from '../utils/dom.js';
import { sfx } from '../audio/AudioEngine.js';

export const ACHIEVEMENTS = [
  { id: 'first',     ico: '🚀', name: 'First Flight',    desc: 'Play your first game' },
  { id: 'crewwin',   ico: '🛡️', name: 'Loyal Crew',      desc: 'Win a game as crew' },
  { id: 'impwin',    ico: '🗡️', name: 'Perfect Crime',   desc: 'Win a game as impostor' },
  { id: 'tasks50',   ico: '🔧', name: 'Taskmaster',      desc: 'Complete 50 tasks total' },
  { id: 'fixer',     ico: '🧯', name: 'Damage Control',  desc: 'Fix 10 sabotages total' },
  { id: 'crier',     ico: '📢', name: 'Town Crier',      desc: 'Call an emergency meeting' },
  { id: 'survivor',  ico: '❤️', name: 'Survivor',        desc: 'Win a game without dying' },
  { id: 'double',    ico: '💀', name: 'Double Agent',    desc: 'Get 2 eliminations in one game' },
  { id: 'ghosthelp', ico: '👻', name: 'Helpful Haunt',   desc: 'Complete 3 tasks while dead' },
  { id: 'social',    ico: '💬', name: 'Chatterbox',      desc: 'Send 25 chat messages' },
  { id: 'level5',    ico: '⭐', name: 'Veteran',         desc: 'Reach level 5' },
  { id: 'perfect',   ico: '✅', name: 'Perfectionist',   desc: 'Finish all your tasks in a game' },
];

const DAILY_POOL = [
  { id: 'd-tasks',   desc: 'Complete 5 tasks',        goal: 5, ev: 'task' },
  { id: 'd-games',   desc: 'Play 2 games',            goal: 2, ev: 'game' },
  { id: 'd-win',     desc: 'Win a game',              goal: 1, ev: 'win' },
  { id: 'd-meeting', desc: 'Call an emergency meeting', goal: 1, ev: 'meeting' },
  { id: 'd-fix',     desc: 'Fix 2 sabotages',         goal: 2, ev: 'fix' },
  { id: 'd-chat',    desc: 'Send 10 chat messages',   goal: 10, ev: 'chat' },
];

const DEFAULT_PROFILE = {
  xp: 0,
  name: '',
  cosmetics: { color: 'red', hat: 'none', pet: 'none', skin: 'none', plate: 'default' },
  stats: {
    games: 0, crewWins: 0, impWins: 0, tasks: 0, kills: 0,
    meetings: 0, fixes: 0, ejected: 0, chats: 0, ghostTasks: 0,
  },
  ach: {},
  dailies: { date: '', items: [] },
};

export function xpForLevel(l) { return 100 + (l - 1) * 50; }

export function levelFromXp(xp) {
  let level = 1, rem = xp;
  while (rem >= xpForLevel(level)) { rem -= xpForLevel(level); level++; }
  return { level, into: rem, need: xpForLevel(level) };
}

export function initProfile() {
  App.profile = { ...DEFAULT_PROFILE, ...load('profile', {}) };
  App.profile.stats = { ...DEFAULT_PROFILE.stats, ...(App.profile.stats || {}) };
  App.profile.cosmetics = { ...DEFAULT_PROFILE.cosmetics, ...(App.profile.cosmetics || {}) };
  rollDailies();
  saveProfile();
}

export function saveProfile() { save('profile', App.profile); }

export function unlocked(list) {
  const { level } = levelFromXp(App.profile.xp);
  return new Set(list.filter(item => item.lvl <= level).map(item => item.id));
}

export function isUnlocked(kind, id) {
  const lists = { hat: HATS, pet: PETS, skin: SKINS, plate: PLATES };
  const list = lists[kind];
  if (!list) return true;
  return unlocked(list).has(id);
}

// ---- daily challenges (deterministic per calendar day) -----------------------

function rollDailies() {
  const today = new Date().toISOString().slice(0, 10);
  const d = App.profile.dailies;
  if (d.date === today && d.items.length) return;
  // seed from date so everyone gets the same 3 challenges each day
  let seed = 0;
  for (const ch of today) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const pool = DAILY_POOL.slice();
  const items = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    items.push({ ...pool.splice(seed % pool.length, 1)[0], prog: 0, done: false });
  }
  App.profile.dailies = { date: today, items };
}

function bumpDaily(ev, n = 1) {
  rollDailies();
  let changed = false;
  for (const item of App.profile.dailies.items) {
    if (item.ev !== ev || item.done) continue;
    item.prog = Math.min(item.goal, item.prog + n);
    if (item.prog >= item.goal) {
      item.done = true;
      addXp(30, true);
      toast(`🗓️ Daily complete: ${item.desc} (+30 XP)`, 'gold', 5000);
    }
    changed = true;
  }
  if (changed) saveProfile();
}

// ---- xp ----------------------------------------------------------------------

export function addXp(n, silent = false) {
  const before = levelFromXp(App.profile.xp).level;
  App.profile.xp += n;
  const after = levelFromXp(App.profile.xp).level;
  saveProfile();
  if (after > before && !silent) {
    sfx('levelup');
    toast(`⭐ Level up! You are now level ${after} — new cosmetics may be unlocked.`, 'gold', 6000);
  }
  return after - before;
}

// ---- achievements --------------------------------------------------------------

function grant(id) {
  if (App.profile.ach[id]) return null;
  App.profile.ach[id] = Date.now();
  const a = ACHIEVEMENTS.find(x => x.id === id);
  if (a) {
    toast(`${a.ico} Achievement unlocked: ${a.name}`, 'gold', 6000);
    sfx('levelup');
  }
  saveProfile();
  return a;
}

/** Record a gameplay event; returns any achievements newly unlocked. */
export function record(ev, data = {}) {
  const s = App.profile.stats;
  const out = [];
  const g = (id) => { const a = grant(id); if (a) out.push(a); };

  if (ev === 'chat') { s.chats++; bumpDaily('chat'); if (s.chats >= 25) g('social'); }
  if (ev === 'task') {
    s.tasks++; bumpDaily('task');
    if (data.dead) { s.ghostTasks++; if (s.ghostTasks >= 3) g('ghosthelp'); }
    if (s.tasks >= 50) g('tasks50');
  }
  if (ev === 'meeting') { s.meetings++; bumpDaily('meeting'); g('crier'); }
  if (ev === 'fix') { s.fixes++; bumpDaily('fix'); if (s.fixes >= 10) g('fixer'); }
  if (ev === 'ejectedYou') { s.ejected++; }
  if (ev === 'gameEnd') {
    s.games++; bumpDaily('game');
    g('first');
    s.kills += data.kills || 0;
    if (data.won) {
      bumpDaily('win');
      if (data.impostor) { s.impWins++; g('impwin'); } else { s.crewWins++; g('crewwin'); }
      if (data.alive) g('survivor');
    }
    if ((data.kills || 0) >= 2) g('double');
    if (data.allTasksDone) g('perfect');
    if (levelFromXp(App.profile.xp).level >= 5) g('level5');
  }
  saveProfile();
  return out;
}
