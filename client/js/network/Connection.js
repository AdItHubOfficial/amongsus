// =============================================================
// AMONGSUS client — Socket.IO wrapper. Emits typed events onto the
// App bus, measures ping, and persists the session for reconnect.
// =============================================================

import { App } from '../state.js';
import { NET } from '/shared/constants.js';
import { save, load, remove } from '../utils/storage.js';

export class Connection {
  constructor() {
    /* global io */
    this.socket = io({ transports: ['websocket', 'polling'] });
    this.connected = false;

    const s = this.socket;
    s.on('connect', () => { this.connected = true; App.emit('net:connect'); });
    s.on('disconnect', () => { this.connected = false; App.emit('net:disconnect'); });

    s.on(NET.LOBBY_STATE, (d) => { App.lobby = d; App.emit('lobby', d); });
    s.on(NET.CHAT_MSG, (d) => App.emit('chat', d));
    s.on(NET.GAME_START, (d) => App.emit('gameStart', d));
    s.on(NET.SNAPSHOT, (d) => App.emit('snapshot', d));
    s.on(NET.EVENT, (d) => App.emit('gameEvent', d));
    s.on(NET.MEETING, (d) => App.emit('meeting', d));
    s.on(NET.GAME_END, (d) => App.emit('gameEnd', d));
    s.on(NET.ERROR_MSG, (d) => App.emit('serverError', d));
    s.on(NET.KICKED, (d) => App.emit('kicked', d));
    s.on(NET.PONG, (d) => {
      if (d && typeof d.t === 'number') App.ping = Math.round(performance.now() - d.t);
    });

    setInterval(() => {
      if (this.connected) s.emit(NET.PING, { t: performance.now() });
    }, 2000);
  }

  _ack(event, data) {
    return new Promise((resolve) => {
      this.socket.timeout(6000).emit(event, data, (err, res) => {
        if (err) resolve({ ok: false, error: 'Server did not respond.' });
        else resolve(res || { ok: false, error: 'Bad response.' });
      });
    });
  }

  async create({ name, cosmetics, isPublic, practice }) {
    const res = await this._ack(NET.CREATE, { name, cosmetics, isPublic, practice });
    if (res.ok) this._storeSession(res);
    return res;
  }

  async join({ code, name, cosmetics, token }) {
    const res = await this._ack(NET.JOIN, { code, name, cosmetics, token });
    if (res.ok) this._storeSession(res);
    return res;
  }

  _storeSession(res) {
    App.youPid = res.pid;
    save('session', { code: res.code, token: res.token });
    // the lobby broadcast can arrive before this ack — re-render now that
    // we know who we are (host controls depend on youPid)
    if (App.lobby) App.emit('lobby', App.lobby);
  }

  browse() {
    return new Promise((resolve) => {
      this.socket.timeout(5000).emit(NET.BROWSE, (err, list) => resolve(err ? [] : (list || [])));
    });
  }

  savedSession() { return load('session', null); }
  clearSession() { remove('session'); }

  leave() { this.socket.emit(NET.LEAVE); this.clearSession(); }
  ready(ready) { this.socket.emit(NET.READY, { ready }); }
  cosmetics(c) { this.socket.emit(NET.COSMETICS, c); }
  updateSettings(settings) { this.socket.emit(NET.SETTINGS, { settings }); }
  kick(target) { this.socket.emit(NET.KICK, { target }); }
  addBot() { this.socket.emit(NET.ADD_BOT); }
  ban(target) { this.socket.emit(NET.BAN, { target }); }
  start(opts) { this.socket.emit(NET.START, opts || {}); }
  chat(text) { this.socket.emit(NET.CHAT, { text }); }
  sendInputs(inputs) { this.socket.emit(NET.INPUT, { inputs }); }
  action(a) { this.socket.emit(NET.ACTION, a); }
  vote(target) { this.socket.emit(NET.VOTE, { target }); }
  emote(i) { this.socket.emit(NET.EMOTE, { i }); }
}
