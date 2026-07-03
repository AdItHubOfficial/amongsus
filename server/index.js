// =============================================================
// AMONGSUS — server entrypoint. Express static hosting + Socket.IO.
//   npm install && npm start  →  http://localhost:8620
// =============================================================

import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { NET } from '../shared/constants.js';
import { RoomManager } from './game/RoomManager.js';
import { Limiter } from './utils/util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8620;

const app = express();
app.use(express.static(path.join(__dirname, '..', 'client')));
app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));

const server = http.createServer(app);
const io = new Server(server, {
  // Same-origin only; payload cap keeps hostile packets small.
  maxHttpBufferSize: 16 * 1024,
});

const manager = new RoomManager();

io.on('connection', (socket) => {
  const S = socket.data;
  S.room = null;
  S.pid = null;
  S.limits = {
    chat: new Limiter(4, 4000),
    action: new Limiter(40, 1000),
    input: new Limiter(80, 1000),
    join: new Limiter(10, 10000),
    emote: new Limiter(2, 3000),
  };

  const inRoom = () => S.room && S.room.players.has(S.pid) ? S.room : null;

  socket.on(NET.CREATE, (data, ack) => {
    if (typeof ack !== 'function') return;
    if (!S.limits.join.allow()) return ack({ ok: false, error: 'Slow down.' });
    if (inRoom()) return ack({ ok: false, error: 'Already in a lobby.' });
    data = data || {};
    const room = manager.create(!!data.isPublic);
    const res = room.addPlayer(socket, data.name, data.cosmetics);
    if (res.error) { manager.remove(room.code); return ack({ ok: false, error: res.error }); }
    S.room = room; S.pid = res.player.pid;
    ack({ ok: true, code: room.code, pid: res.player.pid, token: res.player.token });
    if (data.practice) room.startGame(res.player.pid, { practice: true });
  });

  socket.on(NET.JOIN, (data, ack) => {
    if (typeof ack !== 'function') return;
    if (!S.limits.join.allow()) return ack({ ok: false, error: 'Slow down.' });
    if (inRoom()) return ack({ ok: false, error: 'Already in a lobby.' });
    data = data || {};
    const room = manager.get(data.code);
    if (!room) return ack({ ok: false, error: 'Lobby not found.' });
    // Reconnect path first (page refresh / dropped connection)
    if (data.token) {
      const rec = room.reconnect(socket, data.token);
      if (rec.player) {
        S.room = room; S.pid = rec.player.pid;
        return ack({ ok: true, code: room.code, pid: rec.player.pid, token: rec.player.token, resynced: true });
      }
    }
    const res = room.addPlayer(socket, data.name, data.cosmetics);
    if (res.error) return ack({ ok: false, error: res.error });
    S.room = room; S.pid = res.player.pid;
    ack({ ok: true, code: room.code, pid: res.player.pid, token: res.player.token });
  });

  socket.on(NET.BROWSE, (ack) => {
    if (typeof ack === 'function') ack(manager.browse());
  });

  socket.on(NET.LEAVE, () => {
    const room = inRoom();
    if (room) room.removePlayer(S.pid, 'left');
    S.room = null; S.pid = null;
  });

  socket.on(NET.READY, (d) => { const r = inRoom(); if (r) r.setReady(S.pid, d && d.ready); });
  socket.on(NET.COSMETICS, (d) => { const r = inRoom(); if (r) r.setCosmetics(S.pid, d || {}); });
  socket.on(NET.SETTINGS, (d) => { const r = inRoom(); if (r) r.updateSettings(S.pid, (d && d.settings) || {}); });
  socket.on(NET.KICK, (d) => { const r = inRoom(); if (r && d) r.kick(S.pid, d.target, false); });
  socket.on(NET.BAN, (d) => { const r = inRoom(); if (r && d) r.kick(S.pid, d.target, true); });
  socket.on(NET.START, (d) => { const r = inRoom(); if (r) r.startGame(S.pid, d || {}); });
  socket.on('c:public', (d) => { const r = inRoom(); if (r && d) r.setPublic(S.pid, d.isPublic); });
  socket.on(NET.ADD_BOT, () => { const r = inRoom(); if (r) r.addBot(S.pid); });

  socket.on(NET.CHAT, (d) => {
    const r = inRoom();
    if (!r || !d || !S.limits.chat.allow()) return;
    r.handleChat(S.pid, d.text);
  });

  socket.on(NET.INPUT, (d) => {
    const r = inRoom();
    if (!r || !d || !S.limits.input.allow()) return;
    r.pushInputs(S.pid, d.inputs);
  });

  socket.on(NET.ACTION, (d) => {
    const r = inRoom();
    if (!r || !S.limits.action.allow()) return;
    r.handleAction(S.pid, d);
  });

  socket.on(NET.VOTE, (d) => {
    const r = inRoom();
    if (!r || !d || !S.limits.action.allow()) return;
    r.castVote(S.pid, d.target);
  });

  socket.on(NET.EMOTE, (d) => {
    const r = inRoom();
    if (!r || !d || !S.limits.emote.allow()) return;
    r.handleEmote(S.pid, Number(d.i));
  });

  socket.on(NET.PING, (d) => {
    socket.emit(NET.PONG, { t: d && d.t });
  });

  socket.on('disconnect', () => {
    const r = inRoom();
    if (r) r.handleDisconnect(S.pid);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔═══════════════════════════════════════════╗');
  console.log('  ║   AMONGSUS — ISV Meridian is now boarding  ║');
  console.log(`  ║   http://localhost:${PORT}                    ║`);
  console.log('  ╚═══════════════════════════════════════════╝');
  console.log('');
});
