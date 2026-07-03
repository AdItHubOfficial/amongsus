// =============================================================
// AMONGSUS client — entrypoint: boot sequence, event wiring,
// screen routing, and the main render loop (with FPS limiter).
// =============================================================

import { App } from './state.js';
import { load } from './utils/storage.js';
import { $, showScreen, show, hide, toast, initTooltips } from './utils/dom.js';
import { setLang } from './utils/i18n.js';
import { Connection } from './network/Connection.js';
import { initProfile } from './progression/Progression.js';
import { initInput, onAction } from './game/Input.js';
import { initRenderer, render } from './game/Renderer.js';
import { Game } from './game/Game.js';
import { updateParticles } from './game/Particles.js';
import {
  primeAudio, applyVolumes, startMusic, stopMusic,
  startAmbient, stopAmbient, stopAlarm,
} from './audio/AudioEngine.js';
import { initMenu, renderPreview } from './ui/MenuUI.js';
import {
  initLobby, updateLobby, addLobbyChat, updateLobbyPing, resetReady,
} from './ui/LobbyUI.js';
import {
  initHUD, setupHUDForGame, updateHUD, addGhostChat, hudEscape, hudCloseAll,
} from './ui/HUD.js';
import {
  initMeeting, handleMeeting, updateMeetingTimer, addMeetingChat, isMeetingOpen,
} from './ui/MeetingUI.js';
import { initSettings, DEFAULT_CLIENT_SETTINGS } from './ui/SettingsUI.js';
import { initResults, showResults } from './ui/ResultsUI.js';
import { roleReveal, deathScene } from './ui/Cutscenes.js';
import { isTaskOpen, closeTask, tickTask } from './tasks/TaskRunner.js';

// ------------------------------------------------------------- boot ---------

function go(screenId) {
  App.screen = screenId;
  showScreen(screenId);
}

function boot() {
  App.settings = { ...DEFAULT_CLIENT_SETTINGS, ...load('settings', {}) };
  App.settings.keys = { ...DEFAULT_CLIENT_SETTINGS.keys, ...(App.settings.keys || {}) };
  initProfile();
  setLang(App.settings.lang);

  initStars();
  initTooltips();
  initInput();
  initSettings();
  initResults();
  initMeeting();
  initHUD();
  initLobby();
  initRenderer($('#game-canvas'));

  App.conn = new Connection();
  initMenu();
  wireEvents();
  wireEscape();

  // Audio needs a user gesture — prime on the first one.
  const prime = () => {
    primeAudio();
    applyVolumes();
    if (App.screen === 'screen-menu' || App.screen === 'screen-lobby') startMusic();
    window.removeEventListener('pointerdown', prime);
    window.removeEventListener('keydown', prime);
  };
  window.addEventListener('pointerdown', prime);
  window.addEventListener('keydown', prime);

  // Loading sequence
  let p = 0;
  const iv = setInterval(() => {
    p = Math.min(100, p + 9 + Math.random() * 14);
    $('#loading-fill').style.width = p + '%';
    if (p >= 100) {
      clearInterval(iv);
      setTimeout(() => go('screen-menu'), 250);
    }
  }, 90);

  requestAnimationFrame(frame);
}

// ------------------------------------------------------------ events --------

function cleanupGame() {
  App.game = null;
  stopAmbient();
  stopAlarm();
  closeTask(false);
  hudCloseAll();
  hide('#overlay-meeting');
  hide('#overlay-vent');
  hide('#overlay-pause');
}

function wireEvents() {
  App.on('lobby', (lob) => {
    updateLobby(lob);
    hide('#overlay-reconnect');
    if (App.screen === 'screen-menu') {
      hide('#btn-rejoin');
      go('screen-lobby');
      startMusic();
    } else if (App.screen === 'screen-game' && lob.state === 'lobby' &&
               $('#overlay-results').classList.contains('hidden')) {
      cleanupGame();
      go('screen-lobby');
      startMusic();
    }
  });

  App.on('chat', (msg) => {
    if (App.screen === 'screen-game') {
      if (isMeetingOpen()) addMeetingChat(msg);
      else if (msg.scope === 'ghost') addGhostChat(msg);
      else if (msg.scope === 'system') toast(msg.text, 'info', 2500);
      // meeting chat also mirrors into the lobby log for later
      addLobbyChat(msg);
    } else {
      addLobbyChat(msg);
    }
  });

  App.on('gameStart', async (payload) => {
    hide('#overlay-reconnect');
    closeTask(false);
    App.youPid = payload.youPid;
    App.game = new Game(payload);
    setupHUDForGame(App.game);
    resetReady();
    stopMusic();
    startAmbient();
    go('screen-game');
    if (!payload.resync) {
      await roleReveal(App.game);
      if (App.game && App.game.state === 'starting') App.game.state = 'playing';
    }
  });

  App.on('snapshot', (s) => { if (App.game) App.game.onSnapshot(s); });
  App.on('gameEvent', (ev) => { if (App.game) App.game.applyEvent(ev); });

  App.on('ui:death', async () => {
    closeTask(false);
    hudCloseAll();
    await deathScene();
  });

  App.on('meeting', (payload) => {
    if (!App.game) return;
    if (payload.phase === 'discussion' || payload.phase === 'voting' || payload.phase === 'reveal') {
      closeTask(false);
      hudCloseAll();
    }
    App.game.onMeetingPhase(payload);
    handleMeeting(payload);
  });

  App.on('gameEnd', (payload) => {
    if (App.game) App.game.state = 'ended';
    closeTask(false);
    hudCloseAll();
    hide('#overlay-meeting');
    showResults(payload);
  });

  App.on('ui:resultsDone', () => {
    cleanupGame();
    if (App.lobby) { go('screen-lobby'); startMusic(); }
    else go('screen-menu');
  });

  App.on('kicked', (d) => {
    toast(d.reason === 'banned' ? 'You were banned from the lobby.' : 'You were kicked from the lobby.', 'error');
    App.conn.clearSession();
    App.lobby = null;
    cleanupGame();
    go('screen-menu');
  });

  App.on('serverError', (d) => toast(d.msg || 'Server error', 'warn'));

  App.on('ui:leftLobby', () => {
    cleanupGame();
    App.lobby = null;
    go('screen-menu');
  });

  // ---- reconnect flow ----
  App.on('net:disconnect', () => {
    if (App.lobby) show('#overlay-reconnect');
  });
  App.on('net:connect', async () => {
    const sess = App.conn.savedSession();
    if (!App.lobby || !sess) return; // fresh connection, nothing to restore
    const res = await App.conn.join({
      code: sess.code, token: sess.token,
      name: App.profile.name || 'Crewmate', cosmetics: App.profile.cosmetics,
    });
    hide('#overlay-reconnect');
    if (!res.ok) {
      toast('Could not rejoin the game.', 'error');
      App.conn.clearSession();
      App.lobby = null;
      cleanupGame();
      go('screen-menu');
    }
  });

  // pause menu buttons
  $('#btn-resume').onclick = () => hide('#overlay-pause');
  $('#btn-pause-settings').onclick = () => { hide('#overlay-pause'); show('#overlay-settings'); };
  $('#btn-pause-leave').onclick = () => {
    App.conn.leave();
    App.lobby = null;
    cleanupGame();
    go('screen-menu');
  };
}

function wireEscape() {
  onAction('escape', () => {
    if (!$('#overlay-settings').classList.contains('hidden')) { hide('#overlay-settings'); return; }
    for (const sel of ['#panel-customize', '#panel-profile', '#panel-browse', '#panel-how']) {
      if (!$(sel).classList.contains('hidden')) { hide(sel); return; }
    }
    if (isTaskOpen()) { closeTask(false); return; }
    if (hudEscape()) return;
    if (!$('#overlay-pause').classList.contains('hidden')) { hide('#overlay-pause'); return; }
    if (App.screen === 'screen-game') show('#overlay-pause');
  });
}

// ---------------------------------------------------------- starfield -------

let stars = [];
function initStars() {
  const cv = $('#stars-bg');
  const fit = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; };
  fit();
  window.addEventListener('resize', fit);
  stars = Array.from({ length: 140 }, () => ({
    x: Math.random(), y: Math.random(),
    z: 0.3 + Math.random() * 0.7, tw: Math.random() * Math.PI * 2,
  }));
}

function drawStars(now) {
  const cv = $('#stars-bg');
  const g = cv.getContext('2d');
  g.fillStyle = '#070b14';
  g.fillRect(0, 0, cv.width, cv.height);
  for (const s of stars) {
    s.x -= s.z * 0.00008;
    if (s.x < 0) s.x += 1;
    const a = 0.25 + ((Math.sin(now / 900 + s.tw) + 1) / 2) * 0.5 * s.z;
    g.globalAlpha = a;
    g.fillStyle = s.z > 0.8 ? '#cfe6ff' : '#8fa8cc';
    const size = s.z > 0.8 ? 2.2 : 1.4;
    g.fillRect(s.x * cv.width, s.y * cv.height, size, size);
  }
  g.globalAlpha = 1;
}

// --------------------------------------------------------- main loop --------

let last = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  const fps = App.settings.fps;
  if (fps > 0 && now - last < 1000 / fps - 0.6) return;
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  if (App.screen === 'screen-game' && App.game) {
    App.game.update(dt, now);
    tickTask(dt, now);
    updateParticles(dt);
    render(App.game, now);
    updateHUD(now);
    updateMeetingTimer();
  } else {
    drawStars(now);
    renderPreview(now);
    if (App.screen === 'screen-lobby') updateLobbyPing();
  }
}

boot();
