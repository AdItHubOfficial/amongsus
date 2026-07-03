// =============================================================
// AMONGSUS client — settings overlay: audio, video (graphics/FPS/
// fullscreen), rebindable controls, accessibility, language.
// =============================================================

import { App } from '../state.js';
import { $, $$, el, show, hide } from '../utils/dom.js';
import { save } from '../utils/storage.js';
import { setLang } from '../utils/i18n.js';
import { applyVolumes, sfx } from '../audio/AudioEngine.js';
import { DEFAULT_KEYS } from '../game/Input.js';

export const DEFAULT_CLIENT_SETTINGS = {
  volMaster: 0.8, volMusic: 0.55, volSfx: 0.9,
  graphics: 'high', fps: 60, shake: true,
  colorblind: false, reduceflash: false, lang: 'en',
  keys: { ...DEFAULT_KEYS },
};

function persist() { save('settings', App.settings); }

export function initSettings() {
  const s = App.settings;

  // tabs
  for (const btn of $$('.tab-btn')) {
    btn.onclick = () => {
      $$('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      $$('.tab-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === btn.dataset.tab));
      sfx('click');
    };
  }
  $('#btn-settings-close').onclick = () => hide('#overlay-settings');

  // audio
  bindRange('#set-vol-master', 'volMaster');
  bindRange('#set-vol-music', 'volMusic');
  bindRange('#set-vol-sfx', 'volSfx');

  // video
  const gfx = $('#set-graphics');
  gfx.value = s.graphics;
  gfx.onchange = () => { s.graphics = gfx.value; persist(); };
  const fps = $('#set-fps');
  fps.value = String(s.fps);
  fps.onchange = () => { s.fps = Number(fps.value); persist(); };
  const shake = $('#set-shake');
  shake.checked = s.shake;
  shake.onchange = () => { s.shake = shake.checked; persist(); };
  $('#btn-fullscreen').onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  };

  // accessibility
  const cb = $('#set-colorblind');
  cb.checked = s.colorblind;
  cb.onchange = () => { s.colorblind = cb.checked; persist(); };
  const rf = $('#set-reduceflash');
  rf.checked = s.reduceflash;
  rf.onchange = () => { s.reduceflash = rf.checked; persist(); };
  const lang = $('#set-lang');
  lang.value = s.lang;
  lang.onchange = () => { s.lang = lang.value; setLang(s.lang); persist(); };

  buildKeybinds();
}

function bindRange(sel, key) {
  const inp = $(sel);
  inp.value = Math.round(App.settings[key] * 100);
  inp.oninput = () => {
    App.settings[key] = Number(inp.value) / 100;
    applyVolumes();
    persist();
  };
}

const KEY_LABELS = {
  use: 'Use / Interact', kill: 'Kill / Sabotage', report: 'Report Body',
  map: 'Ship Map', emote: 'Emote Wheel', vent: 'Vent', ability: 'Role Ability',
};

function buildKeybinds() {
  const wrap = $('#keybind-list');
  wrap.innerHTML = '';
  for (const [action, label] of Object.entries(KEY_LABELS)) {
    const row = el('div', 'keybind-row');
    row.appendChild(el('span', '', label));
    const btn = el('button', 'btn btn-small keybind-btn', prettyKey(App.settings.keys[action]));
    btn.onclick = () => {
      btn.classList.add('listening');
      btn.textContent = 'Press a key…';
      const capture = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.removeEventListener('keydown', capture, true);
        if (e.code !== 'Escape') {
          App.settings.keys[action] = e.code;
          persist();
        }
        btn.classList.remove('listening');
        btn.textContent = prettyKey(App.settings.keys[action]);
      };
      window.addEventListener('keydown', capture, true);
    };
    row.appendChild(btn);
    wrap.appendChild(row);
  }
}

function prettyKey(code) {
  return (code || '').replace('Key', '').replace('Digit', '') || '—';
}
