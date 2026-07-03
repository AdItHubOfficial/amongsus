// =============================================================
// AMONGSUS client — end-of-game results: winner banner, roster,
// animated XP bar, achievement unlocks.
// =============================================================

import { App } from '../state.js';
import { $, el, show, hide } from '../utils/dom.js';
import { makePortrait } from '../game/CharacterRenderer.js';
import { addXp, levelFromXp, record } from '../progression/Progression.js';
import { updateMenuLevel } from './MenuUI.js';
import { sfx, stopAlarm, stopAmbient } from '../audio/AudioEngine.js';

const REASON_TEXT = {
  tasks: 'All tasks were completed',
  ejected: 'Every impostor was thrown out the airlock',
  kills: 'The impostors overran the crew',
  sabotage: 'Critical systems failed',
  forfeit: 'The other side abandoned ship',
};

export function initResults() {
  $('#btn-results-continue').onclick = () => {
    hide('#overlay-results');
    App.emit('ui:resultsDone');
  };
}

export function showResults(payload) {
  const g = App.game;
  stopAlarm();
  stopAmbient();

  const title = $('#results-title');
  if (payload.practice) {
    title.textContent = 'PRACTICE COMPLETE';
    title.className = 'crew';
    sfx('win');
  } else {
    title.textContent = payload.winner === 'crew' ? 'CREW WINS' : 'IMPOSTORS WIN';
    title.className = payload.winner === 'crew' ? 'crew' : 'impostor';
    sfx(payload.won ? 'win' : 'lose');
  }
  $('#results-sub').textContent =
    (payload.won && !payload.practice ? 'Victory — ' : '') + (REASON_TEXT[payload.reason] || '');

  // roster
  const roster = $('#results-players');
  roster.innerHTML = '';
  payload.players.forEach((p, i) => {
    const chip = el('div', 'result-chip' + (p.role === 'impostor' ? ' imp' : ''));
    chip.style.animationDelay = (i * 0.08) + 's';
    const pc = makePortrait(p.cosmetics, 22, 27);
    const cv = document.createElement('canvas');
    cv.width = pc.width; cv.height = pc.height;
    cv.getContext('2d').drawImage(pc, 0, 0);
    chip.appendChild(cv);
    chip.appendChild(el('span', '', `${p.name}${p.isBot ? ' 🤖' : ''} · ${p.role}${p.alive ? '' : ' ☠'}`));
    roster.appendChild(chip);
  });

  // progression
  const me = payload.players.find(p => p.pid === App.youPid);
  const unlockedAch = record('gameEnd', {
    won: payload.won,
    impostor: me && me.role === 'impostor',
    kills: me ? me.stats.kills : 0,
    alive: me ? me.alive : false,
    allTasksDone: g && !g.isImpostor && g.tasks.length > 0 && g.tasks.every(t => t.done),
  });
  addXp(payload.xp.total, true);
  updateMenuLevel();

  const { level, into, need } = levelFromXp(App.profile.xp);
  $('#xp-label').textContent =
    `+${payload.xp.total} XP  (tasks ${payload.xp.tasks} · fixes ${payload.xp.fixes} · win ${payload.xp.win})`;
  $('#xp-level').textContent = `Level ${level}`;
  const fill = $('#xp-fill');
  fill.style.width = '0%';
  setTimeout(() => { fill.style.width = (into / need * 100) + '%'; }, 150);

  const achWrap = $('#results-achievements');
  achWrap.innerHTML = '';
  unlockedAch.forEach((a, i) => {
    const row = el('div', 'ach-unlock', `${a.ico} Achievement unlocked — ${a.name}: ${a.desc}`);
    row.style.animationDelay = (0.4 + i * 0.2) + 's';
    achWrap.appendChild(row);
  });

  show('#overlay-results');
}
