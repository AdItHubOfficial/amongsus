// =============================================================
// AMONGSUS client — full-screen cutscenes: role reveal, meeting
// flash, ejection, death. Canvas-animated with promise timing.
// =============================================================

import { $, show, hide } from '../utils/dom.js';
import { drawCrewmate } from '../game/CharacterRenderer.js';
import { sfx } from '../audio/AudioEngine.js';
import { App } from '../state.js';
import { ROLES } from '/shared/constants.js';

let raf = null;

function run({ text, sub = '', cls = '', duration = 3000, draw = null }) {
  return new Promise((resolve) => {
    const overlay = $('#overlay-cutscene');
    const cv = $('#cutscene-canvas');
    const textEl = $('#cutscene-text');
    const subEl = $('#cutscene-sub');
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
    const g = cv.getContext('2d');
    textEl.textContent = text;
    textEl.className = cls;
    subEl.textContent = sub;
    show(overlay);

    const start = performance.now();
    cancelAnimationFrame(raf);
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      hide(overlay);
      g.clearRect(0, 0, cv.width, cv.height);
      resolve();
    };
    const frame = (now) => {
      if (finished) return;
      const t = (now - start) / duration;
      if (t >= 1) { finish(); return; }
      g.clearRect(0, 0, cv.width, cv.height);
      drawStars(g, cv.width, cv.height, now);
      if (draw) draw(g, t, cv.width, cv.height, now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // rAF pauses in background tabs — guarantee the scene still ends on time.
    setTimeout(finish, duration + 150);
  });
}

function drawStars(g, w, h, now) {
  g.fillStyle = '#fff';
  for (let i = 0; i < 90; i++) {
    const x = (i * 199) % w;
    const y = (i * 271) % h;
    g.globalAlpha = 0.25 + ((Math.sin(now / 700 + i) + 1) / 2) * 0.55;
    g.fillRect(x, y, i % 3 === 0 ? 2.5 : 1.5, i % 3 === 0 ? 2.5 : 1.5);
  }
  g.globalAlpha = 1;
}

export function roleReveal(game) {
  const isImp = game.role === ROLES.IMPOSTOR;
  const roleName = game.role.toUpperCase();
  const mates = isImp
    ? game.partners.map(pid => game.players.get(pid)).filter(Boolean)
    : [...game.players.values()].filter(p => p.pid !== game.youPid).slice(0, 8);
  const you = game.players.get(game.youPid);
  sfx(isImp ? 'sabotage' : 'meeting');
  return run({
    text: roleName,
    sub: isImp
      ? (game.partners.length ? 'Your partners are shown in red' : 'Eliminate the crew. Trust no one.')
      : game.practice ? 'Practice mode — explore the ship and try tasks'
        : 'Complete tasks and find the impostors',
    cls: isImp ? 'impostor' : 'crew',
    duration: 4300,
    draw(g, t, w, h) {
      const cx = w / 2, cy = h / 2 + 130;
      if (you) {
        drawCrewmate(g, cx, cy + 40, {
          colorId: you.cosmetics.color, hat: you.cosmetics.hat, skin: you.cosmetics.skin,
          facing: 1, scale: 1.6, t: performance.now(),
        });
      }
      mates.forEach((m, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const k = Math.floor(i / 2) + 1;
        const appear = Math.min(1, Math.max(0, t * 3 - k * 0.3));
        if (appear <= 0) return;
        drawCrewmate(g, cx + side * (90 + k * 75), cy + 46, {
          colorId: isImp ? m.cosmetics.color : m.cosmetics.color,
          hat: m.cosmetics.hat, skin: m.cosmetics.skin,
          facing: -side, scale: 1.1, alpha: appear, t: performance.now(),
        });
        if (isImp) {
          g.fillStyle = 'rgba(255,84,112,0.9)';
          g.font = '700 14px "Segoe UI", sans-serif';
          g.textAlign = 'center';
          g.fillText(m.name, cx + side * (90 + k * 75), cy + 70);
        }
      });
    },
  });
}

export function meetingFlash(reason) {
  sfx('meeting');
  return run({
    text: reason === 'body' ? 'DEAD BODY REPORTED' : 'EMERGENCY MEETING',
    cls: 'danger',
    duration: App.settings.reduceflash ? 1200 : 1900,
  });
}

export function deathScene() {
  sfx('kill');
  return run({
    text: 'YOU WERE ELIMINATED',
    sub: 'Keep helping as a ghost — finish your tasks',
    cls: 'impostor',
    duration: 2600,
  });
}

export function ejectScene(name, cosmetics, wasImpostor, confirm, tie) {
  sfx('eject');
  let text, sub = '';
  if (tie || !name) {
    text = tie ? 'TIE — NO ONE EJECTED' : 'NO ONE WAS EJECTED';
  } else {
    text = `${name} was ejected`;
    if (confirm) sub = wasImpostor ? `${name} was an Impostor.` : `${name} was NOT an Impostor.`;
  }
  return run({
    text, sub,
    cls: wasImpostor && confirm ? 'impostor' : 'crew',
    duration: 4800,
    draw(g, t, w, h, now) {
      if (tie || !name) return;
      const x = -100 + t * (w + 200);
      const y = h * 0.32 + Math.sin(t * 5) * 30;
      g.save();
      g.translate(x, y);
      g.rotate(t * 9);
      drawCrewmate(g, 0, 0, {
        colorId: cosmetics ? cosmetics.color : 'red',
        hat: cosmetics ? cosmetics.hat : 'none',
        skin: cosmetics ? cosmetics.skin : 'none',
        facing: 1, scale: 1.3, t: now,
      });
      g.restore();
    },
  });
}
