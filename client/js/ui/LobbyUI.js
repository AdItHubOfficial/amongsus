// =============================================================
// AMONGSUS client — lobby screen: player list with host controls,
// chat with emoji, live match settings, ready/start flow.
// =============================================================

import { App } from '../state.js';
import { $, el, show, hide, toast } from '../utils/dom.js';
import { SETTINGS_SCHEMA, EMOTES, GAME_STATES } from '/shared/constants.js';
import { colorHex } from '../game/CharacterRenderer.js';
import { sfx } from '../audio/AudioEngine.js';
import { record } from '../progression/Progression.js';

let myReady = false;

export function initLobby() {
  $('#btn-copy-code').onclick = async () => {
    try {
      await navigator.clipboard.writeText(App.lobby ? App.lobby.code : '');
      toast('Code copied — send it to your crew!');
    } catch {
      toast('Copy failed — the code is shown above.', 'warn');
    }
  };
  $('#btn-add-bot').onclick = () => { App.conn.addBot(); sfx('click'); };

  $('#btn-ready').onclick = () => {
    myReady = !myReady;
    App.conn.ready(myReady);
    sfx('click');
  };
  $('#btn-start').onclick = () => { App.conn.start(); sfx('click'); };
  $('#btn-leave-lobby').onclick = () => {
    App.conn.leave();
    App.lobby = null;
    App.emit('ui:leftLobby');
  };

  const send = () => {
    const inp = $('#lobby-chat-input');
    const text = inp.value.trim();
    if (!text) return;
    App.conn.chat(text);
    record('chat');
    inp.value = '';
  };
  $('#btn-chat-send').onclick = send;
  $('#lobby-chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

  const emojiRow = $('#lobby-emoji-row');
  for (const e of [...EMOTES, '🚀', '☠️', '🤖']) {
    const b = el('button', '', e);
    b.onclick = () => { $('#lobby-chat-input').value += e; $('#lobby-chat-input').focus(); };
    emojiRow.appendChild(b);
  }
}

export function resetReady() { myReady = false; }

export function updateLobby(lob) {
  const isHost = lob.hostPid === App.youPid;

  $('#lobby-code').textContent = lob.code;
  $('#lobby-count').textContent = `${lob.players.length}/${lob.maxPlayers}`;
  const pub = $('#chk-public');
  pub.checked = lob.isPublic;
  pub.disabled = !isHost;
  pub.onchange = () => App.conn.socket.emit('c:public', { isPublic: pub.checked });

  // players
  const ul = $('#lobby-players');
  ul.innerHTML = '';
  for (const p of lob.players) {
    const li = el('li');
    const dot = el('span', 'player-dot');
    dot.style.background = colorHex(p.cosmetics.color);
    li.appendChild(dot);
    li.appendChild(el('span', 'player-name', p.name + (p.pid === App.youPid ? ' (you)' : '')));
    const tags = el('span', 'player-tags');
    if (p.isHost) tags.appendChild(el('span', 'tag tag-host', 'HOST'));
    if (p.isBot) tags.appendChild(el('span', 'tag tag-bot', '🤖 AI'));
    else if (!p.connected) tags.appendChild(el('span', 'tag tag-off', 'AWAY'));
    else if (p.ready) tags.appendChild(el('span', 'tag tag-ready', 'READY'));
    li.appendChild(tags);
    if (isHost && p.pid !== App.youPid) {
      const kick = el('button', 'kick-btn', '✕');
      kick.dataset.tip = p.isBot ? 'Remove AI' : 'Kick player';
      kick.onclick = () => App.conn.kick(p.pid);
      li.appendChild(kick);
      if (!p.isBot) {
        const ban = el('button', 'kick-btn', '🚫');
        ban.dataset.tip = 'Ban player';
        ban.onclick = () => App.conn.ban(p.pid);
        li.appendChild(ban);
      }
    }
    ul.appendChild(li);
  }
  const addBot = $('#btn-add-bot');
  (isHost && lob.players.length < lob.maxPlayers) ? show(addBot) : hide(addBot);

  // ready / start buttons
  const me = lob.players.find(p => p.pid === App.youPid);
  if (me) myReady = me.ready;
  const readyBtn = $('#btn-ready');
  readyBtn.textContent = myReady ? 'UNREADY' : 'READY';
  readyBtn.classList.toggle('btn-go', myReady);
  if (isHost) {
    hide(readyBtn);
    show('#btn-start');
    const others = lob.players.filter(p => p.pid !== App.youPid && p.connected);
    const allReady = others.every(p => p.ready);
    const enough = lob.players.length >= lob.settings.minPlayers;
    $('#btn-start').disabled = !(allReady && enough);
    $('#btn-start').dataset.tip = !enough
      ? `Need ${lob.settings.minPlayers}+ players (adjust Min Players →)`
      : !allReady ? 'Waiting for everyone to ready up' : 'Launch the mission!';
  } else {
    show(readyBtn);
    hide('#btn-start');
  }

  buildSettingsPanel(lob, isHost);
}

function buildSettingsPanel(lob, isHost) {
  const wrap = $('#lobby-settings');
  wrap.innerHTML = '';
  for (const spec of SETTINGS_SCHEMA) {
    const row = el('div', 'setting-row' + (isHost ? '' : ' readonly'));
    row.appendChild(el('label', '', spec.label));
    const val = lob.settings[spec.key];

    if (spec.type === 'toggle') {
      const cb = el('input');
      cb.type = 'checkbox';
      cb.checked = !!val;
      cb.disabled = !isHost;
      cb.onchange = () => App.conn.updateSettings({ [spec.key]: cb.checked });
      row.appendChild(cb);
    } else if (spec.type === 'select') {
      const sel = el('select');
      for (const opt of spec.options) {
        const o = el('option', '', opt);
        o.value = opt;
        if (opt === val) o.selected = true;
        sel.appendChild(o);
      }
      sel.disabled = !isHost;
      sel.onchange = () => App.conn.updateSettings({ [spec.key]: sel.value });
      row.appendChild(sel);
    } else {
      const range = el('input');
      range.type = 'range';
      range.min = spec.min; range.max = spec.max; range.step = spec.step;
      range.value = val;
      range.disabled = !isHost;
      const label = el('span', 'set-val', val + (spec.unit || ''));
      range.oninput = () => { label.textContent = range.value + (spec.unit || ''); };
      range.onchange = () => App.conn.updateSettings({ [spec.key]: Number(range.value) });
      row.appendChild(range);
      row.appendChild(label);
    }
    wrap.appendChild(row);
  }
}

export function addLobbyChat(msg) {
  appendChat($('#lobby-chat-log'), msg);
}

export function appendChat(log, msg) {
  const div = el('div', 'chat-msg');
  if (msg.scope === 'system') {
    div.classList.add('system');
    div.textContent = msg.text;
  } else {
    if (msg.scope === 'ghost') div.classList.add('ghost');
    const name = el('span', 'chat-name', msg.name + ': ');
    name.style.color = colorHex(msg.color);
    div.appendChild(name);
    div.appendChild(document.createTextNode(msg.text));
  }
  log.appendChild(div);
  while (log.children.length > 120) log.firstChild.remove();
  log.scrollTop = log.scrollHeight;
}

export function updateLobbyPing() {
  const chip = $('#lobby-ping');
  chip.textContent = `${App.ping} ms`;
  chip.classList.toggle('bad', App.ping > 150);
}
