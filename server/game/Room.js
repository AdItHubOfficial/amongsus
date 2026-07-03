// =============================================================
// AMONGSUS server — authoritative game room. Owns the lobby, the
// 30 Hz simulation loop, snapshots, meetings, votes, and win logic.
// =============================================================

import {
  NET, GAME_STATES, MEETING_PHASES, ROLES, SABOTAGES, TIMERS,
  DEFAULT_SETTINGS, SETTINGS_SCHEMA, KILL_DISTANCES, XP_RULES,
  TICK_RATE, PLAYER_RADIUS, BASE_SPEED, GHOST_SPEED, INTERACT_RANGE,
  REPORT_RANGE, CULL_RADIUS, MAX_PLAYERS, COLORS,
} from '../../shared/constants.js';
import { getMap, dist, nearest } from '../../shared/map.js';
import { stepMovement } from '../../shared/movement.js';
import { sampleTasks } from '../../shared/tasksData.js';
import { Player } from './Player.js';
import { SabotageSystem } from './SabotageSystem.js';
import { BotAI, pickBotName, BOT_HATS, BOT_PETS } from './BotAI.js';
import { makeToken, sanitizeName, sanitizeChat } from '../utils/util.js';

const REVEAL_MS = 4000;

export class Room {
  constructor(code, isPublic, manager) {
    this.code = code;
    this.isPublic = !!isPublic;
    this.manager = manager;
    this.state = GAME_STATES.LOBBY;
    this.players = new Map();          // pid -> Player
    this.banned = new Set();           // tokens + addresses
    this.settings = { ...DEFAULT_SETTINGS };
    this.map = getMap(this.settings.map);
    this.hostPid = null;
    this.pidSeq = 0;
    this.practice = false;

    // In-game state
    this.botAI = new BotAI(this);
    this.sabotage = new SabotageSystem(this);
    this.bodies = [];                  // { pid, x, y, at }
    this.doorsClosed = new Map();      // roomId -> untilTs
    this.doorReadyAt = new Map();      // roomId -> ts
    this.meeting = null;
    this.totalTasks = 0;
    this.tasksDone = 0;
    this.impostorCount = 0;
    this.emergencyAvailableAt = 0;

    this.snapToggle = false;
    this.lastTick = Date.now();
    this.timer = setInterval(() => this.tick(), 1000 / TICK_RATE);
    this.startTimeout = null;
    this.endTimeout = null;
  }

  destroy() {
    clearInterval(this.timer);
    clearTimeout(this.startTimeout);
    clearTimeout(this.endTimeout);
  }

  // ---------------------------------------------------------- lobby --------

  addPlayer(socket, name, cosmetics) {
    if (this.players.size >= MAX_PLAYERS) return { error: 'Lobby is full.' };
    if (this.state !== GAME_STATES.LOBBY && this.state !== GAME_STATES.ENDED) {
      return { error: 'Game already in progress.' };
    }
    if (this.banned.has(socket.handshake.address)) return { error: 'You are banned from this lobby.' };

    const pid = 'p' + (++this.pidSeq);
    const p = new Player(socket, pid, makeToken(), sanitizeName(name), this.validCosmetics(cosmetics));
    this.dedupeName(p);
    this.assignFreeColor(p);
    if (!this.hostPid) { this.hostPid = pid; p.isHost = true; }
    this.players.set(pid, p);
    this.systemChat(`${p.name} joined the lobby`);
    this.broadcastLobby();
    return { player: p };
  }

  /** Host-only: add an AI player to the lobby. */
  addBot(byPid) {
    const by = this.players.get(byPid);
    if (!by || !by.isHost || this.state !== GAME_STATES.LOBBY) return;
    if (this.players.size >= MAX_PLAYERS) {
      return by.emit(NET.ERROR_MSG, { msg: 'Lobby is full.' });
    }
    const pid = 'p' + (++this.pidSeq);
    const name = pickBotName([...this.players.values()].map(p => p.name));
    const bot = new Player(null, pid, makeToken(), name, this.validCosmetics({
      color: COLORS[Math.floor(Math.random() * COLORS.length)].id,
      hat: BOT_HATS[Math.floor(Math.random() * BOT_HATS.length)],
      pet: BOT_PETS[Math.floor(Math.random() * BOT_PETS.length)],
    }));
    bot.isBot = true;
    bot.ready = true;
    this.players.set(pid, bot);
    this.assignFreeColor(bot);
    this.systemChat(`🤖 ${bot.name} came online`);
    this.broadcastLobby();
  }

  reconnect(socket, token) {
    for (const p of this.players.values()) {
      if (p.token === token && !p.connected) {
        p.socket = socket;
        p.connected = true;
        p.disconnectedAt = 0;
        this.systemChat(`${p.name} reconnected`);
        if (this.state === GAME_STATES.PLAYING || this.state === GAME_STATES.MEETING ||
            this.state === GAME_STATES.STARTING) {
          this.sendGameStart(p, true);
        }
        this.broadcastLobby();
        return { player: p };
      }
    }
    return { error: 'Nothing to reconnect to.' };
  }

  /** Socket dropped: grace period in-game, instant removal in lobby. */
  handleDisconnect(pid) {
    const p = this.players.get(pid);
    if (!p) return;
    if (this.state === GAME_STATES.LOBBY || this.state === GAME_STATES.ENDED) {
      this.removePlayer(pid, 'left');
    } else {
      p.connected = false;
      p.disconnectedAt = Date.now();
      this.systemChat(`${p.name} lost connection`);
      this.broadcastLobby();
    }
  }

  removePlayer(pid, reason) {
    const p = this.players.get(pid);
    if (!p) return;
    this.players.delete(pid);
    this.systemChat(`${p.name} ${reason === 'kicked' ? 'was kicked' : reason === 'banned' ? 'was banned' : 'left'}`);

    // a room of only bots has no reason to live
    if (![...this.players.values()].some(q => !q.isBot)) {
      this.manager.remove(this.code);
      return;
    }
    if (this.hostPid === pid) {
      const humans = [...this.players.values()].filter(q => !q.isBot);
      const next = humans.find(q => q.connected) || humans[0];
      this.hostPid = next ? next.pid : null;
      if (next) { next.isHost = true; this.systemChat(`${next.name} is now the host`); }
    }

    if (this.state === GAME_STATES.PLAYING || this.state === GAME_STATES.MEETING) {
      if (this.meeting && this.meeting.phase === MEETING_PHASES.VOTING) this.maybeEndVoting();
      this.checkWin();
    }
    this.broadcastLobby();
  }

  kick(byPid, targetPid, ban) {
    const by = this.players.get(byPid);
    const target = this.players.get(targetPid);
    if (!by || !by.isHost || !target || targetPid === byPid) return;
    if (ban) { this.banned.add(target.token); this.banned.add(target.address); }
    target.emit(NET.KICKED, { reason: ban ? 'banned' : 'kicked' });
    this.removePlayer(targetPid, ban ? 'banned' : 'kicked');
  }

  setReady(pid, ready) {
    const p = this.players.get(pid);
    if (!p || this.state !== GAME_STATES.LOBBY) return;
    p.ready = !!ready;
    this.broadcastLobby();
  }

  setCosmetics(pid, cosmetics) {
    const p = this.players.get(pid);
    if (!p) return;
    p.cosmetics = this.validCosmetics({ ...p.cosmetics, ...cosmetics });
    this.assignFreeColor(p);
    this.broadcastLobby();
  }

  validCosmetics(c = {}) {
    const pick = (list, id, def) => list.some(x => x.id === id) ? id : def;
    return {
      color: COLORS.some(x => x.id === c.color) ? c.color : 'red',
      hat: typeof c.hat === 'string' ? c.hat.slice(0, 16) : 'none',
      pet: typeof c.pet === 'string' ? c.pet.slice(0, 16) : 'none',
      skin: typeof c.skin === 'string' ? c.skin.slice(0, 16) : 'none',
      plate: typeof c.plate === 'string' ? c.plate.slice(0, 16) : 'default',
    };
  }

  assignFreeColor(p) {
    const taken = new Set([...this.players.values()].filter(q => q !== p).map(q => q.cosmetics.color));
    if (!taken.has(p.cosmetics.color)) return;
    const free = COLORS.find(c => !taken.has(c.id));
    if (free) p.cosmetics.color = free.id;
  }

  dedupeName(p) {
    const names = new Set([...this.players.values()].map(q => q.name));
    let n = p.name, i = 2;
    while (names.has(n)) n = `${p.name.slice(0, 11)}#${i++}`;
    p.name = n;
  }

  updateSettings(pid, patch) {
    const p = this.players.get(pid);
    if (!p || !p.isHost || this.state !== GAME_STATES.LOBBY || typeof patch !== 'object' || !patch) return;
    for (const spec of SETTINGS_SCHEMA) {
      if (!(spec.key in patch)) continue;
      let v = patch[spec.key];
      if (spec.type === 'toggle') v = !!v;
      else if (spec.type === 'select') { if (!spec.options.includes(v)) continue; }
      else {
        v = Number(v);
        if (!Number.isFinite(v)) continue;
        v = Math.max(spec.min, Math.min(spec.max, v));
      }
      this.settings[spec.key] = v;
    }
    this.map = getMap(this.settings.map);
    this.broadcastLobby();
  }

  setPublic(pid, isPublic) {
    const p = this.players.get(pid);
    if (!p || !p.isHost) return;
    this.isPublic = !!isPublic;
    this.broadcastLobby();
  }

  handleChat(pid, text) {
    const p = this.players.get(pid);
    const clean = sanitizeChat(text);
    if (!p || !clean) return;
    const msg = {
      scope: 'lobby', from: p.pid, name: p.name,
      color: p.cosmetics.color, text: clean, ts: Date.now(),
    };
    if (this.state === GAME_STATES.LOBBY || this.state === GAME_STATES.ENDED) {
      this.broadcast(NET.CHAT_MSG, msg);
    } else if (this.state === GAME_STATES.MEETING) {
      msg.scope = p.alive ? 'meeting' : 'ghost';
      if (p.alive) this.broadcast(NET.CHAT_MSG, msg);           // dead players are muted for the living
      else this.broadcastGhosts(msg);
    } else {
      if (p.alive) return;                                       // no live chat while playing
      msg.scope = 'ghost';
      this.broadcastGhosts(msg);
    }
  }

  broadcastGhosts(msg) {
    for (const q of this.players.values()) if (!q.alive) q.emit(NET.CHAT_MSG, msg);
  }

  systemChat(text) {
    this.broadcast(NET.CHAT_MSG, { scope: 'system', text, ts: Date.now() });
  }

  handleEmote(pid, i) {
    const p = this.players.get(pid);
    if (!p || typeof i !== 'number' || i < 0 || i > 9) return;
    const ev = { e: 'emote', pid, i: Math.floor(i) };
    if (p.alive) this.broadcastEvent(ev);
    else for (const q of this.players.values()) if (!q.alive) q.emit(NET.EVENT, ev);
  }

  // ------------------------------------------------------- game start ------

  startGame(pid, opts = {}) {
    const host = this.players.get(pid);
    if (!host || !host.isHost || this.state !== GAME_STATES.LOBBY) return;
    const all = [...this.players.values()].filter(p => p.connected);
    const practice = !!opts.practice;
    if (!practice) {
      const min = Math.max(1, this.settings.minPlayers);
      if (all.length < min) {
        return host.emit(NET.ERROR_MSG, { msg: `Need at least ${min} players (host can lower Min Players).` });
      }
      if (!all.every(p => p.isHost || p.ready)) {
        return host.emit(NET.ERROR_MSG, { msg: 'Not everyone is ready.' });
      }
    }

    this.practice = practice || all.length === 1;
    this.impostorCount = this.practice ? 0
      : Math.min(this.settings.impostors, Math.max(1, Math.floor((all.length - 1) / 2)));

    // Roles
    const pool = all.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    for (const p of all) p.resetForGame();
    const impostors = pool.slice(0, this.impostorCount);
    impostors.forEach(p => { p.role = ROLES.IMPOSTOR; });
    const crew = pool.slice(this.impostorCount);
    const roleToggles = [
      ['roleEngineer', ROLES.ENGINEER], ['roleMedic', ROLES.MEDIC],
      ['roleSheriff', ROLES.SHERIFF], ['roleDetective', ROLES.DETECTIVE],
      ['roleGuardian', ROLES.GUARDIAN], ['roleHacker', ROLES.HACKER],
    ];
    const freeCrew = crew.filter(p => !p.isBot); // bots can be impostors, not special crew roles
    for (const [key, role] of roleToggles) {
      if (!this.settings[key] || !freeCrew.length) continue;
      const idx = Math.floor(Math.random() * freeCrew.length);
      freeCrew.splice(idx, 1)[0].role = role;
    }

    // Tasks & spawn
    const now = Date.now();
    this.totalTasks = 0; this.tasksDone = 0;
    this.bodies = [];
    this.doorsClosed.clear(); this.doorReadyAt.clear();
    this.sabotage = new SabotageSystem(this);
    this.sabotage.readyAt = now + 20000;
    this.meeting = null;
    all.forEach((p, i) => {
      const a = (i / all.length) * Math.PI * 2;
      p.x = this.map.spawn.x + Math.cos(a) * 150;
      p.y = this.map.spawn.y + Math.sin(a) * 110;
      p.tasks = sampleTasks(this.map, this.settings.tasksPerPlayer).map(id => ({ id, done: false }));
      if (!p.isImpostor) this.totalTasks += p.tasks.length;
      p.killReadyAt = now + 10000;
      p.abilityReadyAt = now + 10000;
      p.ventReadyAt = now;
    });
    this.emergencyAvailableAt = now + (TIMERS.startCountdown + TIMERS.emergencyCooldown) * 1000;
    this.botAI.onGameStart();

    this.state = GAME_STATES.STARTING;
    for (const p of all) this.sendGameStart(p, false);
    this.startTimeout = setTimeout(() => {
      if (this.state === GAME_STATES.STARTING) this.state = GAME_STATES.PLAYING;
    }, (TIMERS.startCountdown + 1) * 1000);
    this.broadcastLobby();
  }

  sendGameStart(p, resync) {
    const partners = p.isImpostor
      ? [...this.players.values()].filter(q => q.isImpostor && q !== p).map(q => q.pid)
      : [];
    p.emit(NET.GAME_START, {
      resync,
      youPid: p.pid,
      role: p.role,
      partners,
      practice: this.practice,
      players: [...this.players.values()].map(q => ({
        pid: q.pid, name: q.name, cosmetics: q.cosmetics,
        alive: q.alive, connected: q.connected, isBot: q.isBot,
      })),
      tasks: p.tasks,
      totalTasks: this.totalTasks,
      tasksDone: this.tasksDone,
      settings: this.settings,
      state: this.state,
      meeting: this.meeting ? this.meetingPayload() : null,
      you: { x: p.x, y: p.y, alive: p.alive },
    });
  }

  // ------------------------------------------------------------ loop -------

  tick() {
    const now = Date.now();
    const dt = Math.min(0.2, (now - this.lastTick) / 1000);
    this.lastTick = now;

    // Reconnect grace expiry (any state except lobby handled on disconnect)
    for (const p of [...this.players.values()]) {
      if (!p.connected && p.disconnectedAt &&
          now - p.disconnectedAt > TIMERS.reconnectGrace * 1000) {
        this.removePlayer(p.pid, 'left');
      }
    }

    if (this.state === GAME_STATES.PLAYING) {
      for (const p of this.players.values()) {
        p.moveAllowance = Math.min(0.4, p.moveAllowance + dt);
        this.processInputs(p, now);
        if (p.watchingCams && p.camsUntil && now > p.camsUntil) { p.watchingCams = false; p.camsUntil = 0; }
        if (p.inVent && p.role === ROLES.ENGINEER &&
            now - p.ventEnteredAt > TIMERS.engineerVentMax * 1000) {
          this.exitVent(p);
        }
      }
      this.botAI.updatePlaying(dt, now);
      // Doors auto-open
      for (const [room, until] of this.doorsClosed) {
        if (now >= until) this.doorsClosed.delete(room);
      }
      this.sabotage.update(now);
    } else if (this.state === GAME_STATES.MEETING) {
      for (const p of this.players.values()) { p.inputQueue.length = 0; }
      this.updateMeeting(now);
      this.botAI.updateMeeting(now);
    } else {
      for (const p of this.players.values()) { p.inputQueue.length = 0; }
    }

    this.snapToggle = !this.snapToggle;
    if (this.snapToggle && this.state !== GAME_STATES.LOBBY && this.state !== GAME_STATES.ENDED) {
      for (const p of this.players.values()) {
        if (p.connected) p.emit(NET.SNAPSHOT, this.snapshotFor(p, now));
      }
    }
  }

  pushInputs(pid, inputs) {
    const p = this.players.get(pid);
    if (!p || !Array.isArray(inputs) || inputs.length > 30) return;
    for (const inp of inputs) {
      if (!inp || typeof inp.seq !== 'number') continue;
      if (p.inputQueue.length > 90) p.inputQueue.shift();
      p.inputQueue.push(inp);
    }
  }

  processInputs(p, now) {
    while (p.inputQueue.length) {
      const inp = p.inputQueue.shift();
      const seq = inp.seq | 0;
      if (seq <= p.lastSeq) continue;
      p.lastSeq = seq;
      if (p.inVent || p.openTask) continue;               // frozen while venting / in a task
      let dt = Number(inp.dt);
      if (!Number.isFinite(dt) || dt <= 0) continue;
      dt = Math.min(dt, 0.06, p.moveAllowance);           // anti-speedhack budget
      if (dt <= 0) continue;
      p.moveAllowance -= dt;
      const dx = Math.max(-1, Math.min(1, Number(inp.dx) || 0));
      const dy = Math.max(-1, Math.min(1, Number(inp.dy) || 0));
      const speed = p.alive ? BASE_SPEED * this.settings.playerSpeed : GHOST_SPEED;
      const moved = stepMovement(this.map, p, dx, dy, dt, speed, this.closedDoorIds(), !p.alive);
      if (moved) {
        p.movingUntil = now + 160;
        if (dx !== 0) p.dirX = dx > 0 ? 1 : -1;
      }
    }
  }

  closedDoorIds() {
    if (this.doorsClosed.size === 0) return null;
    const set = new Set();
    for (const d of this.map.doors) {
      if (this.doorsClosed.has(d.room)) set.add(d.id);
    }
    return set;
  }

  // -------------------------------------------------------- snapshots ------

  snapshotFor(p, now) {
    const ghostView = !p.alive;
    const ents = [];
    const seen = new Set();
    for (const q of this.players.values()) {
      if (q === p) continue;
      if (!ghostView) {
        if (!q.alive || q.inVent) continue;
        if (dist(p.x, p.y, q.x, q.y) > CULL_RADIUS) continue;
      }
      seen.add(q.pid);
      ents.push(this.entEntry(q, now, ghostView));
    }
    // Camera feeds reveal players near cameras even outside normal interest
    let cams;
    if (p.watchingCams && !this.camerasOffline()) {
      cams = [];
      for (const q of this.players.values()) {
        if (q === p || !q.alive || q.inVent) continue;
        for (const cam of this.map.cameras) {
          if (dist(cam.x, cam.y, q.x, q.y) <= cam.r) {
            cams.push(this.entEntry(q, now, false));
            break;
          }
        }
      }
    }

    const bodies = this.bodies
      .filter(b => ghostView || dist(p.x, p.y, b.x, b.y) <= CULL_RADIUS)
      .map(b => [b.pid, Math.round(b.x), Math.round(b.y)]);

    const cool = {};
    if (p.role === ROLES.IMPOSTOR || p.role === ROLES.SHERIFF) {
      cool.kill = Math.max(0, p.killReadyAt - now);
    }
    if (p.isImpostor) cool.sab = Math.max(0, this.sabotage.readyAt - now);
    if ([ROLES.MEDIC, ROLES.GUARDIAN, ROLES.HACKER].includes(p.role)) {
      cool.ability = Math.max(0, p.abilityReadyAt - now);
    }
    if (p.role === ROLES.ENGINEER) cool.vent = Math.max(0, p.ventReadyAt - now);
    cool.emerg = Math.max(0, this.emergencyAvailableAt - now);
    cool.emergLeft = Math.max(0, this.settings.emergencyMeetings - p.emergenciesUsed);

    const snap = {
      t: now,
      ack: p.lastSeq,
      you: [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10, p.inVent || 0],
      p: ents,
      bodies,
      sab: this.sabotage.serialize(now),
      doors: [...this.doorsClosed.entries()].map(([r, until]) => [r, Math.max(0, until - now)]),
      cool,
      camsOn: [...this.players.values()].some(q => q.alive && q.watchingCams && !q.camsUntil),
    };
    if (cams) snap.cams = cams;
    if (this.settings.taskBar === 'always' ||
        (this.settings.taskBar === 'meetings' && this.state === GAME_STATES.MEETING)) {
      snap.bar = this.totalTasks ? this.tasksDone / this.totalTasks : 0;
    }
    return snap;
  }

  entEntry(q, now, ghostView) {
    return [
      q.pid, Math.round(q.x), Math.round(q.y),
      now < q.movingUntil ? 1 : 0,
      q.dirX > 0 ? 1 : 0,
      ghostView && !q.alive ? 1 : 0,
      ghostView && q.inVent ? 1 : 0,
    ];
  }

  camerasOffline() {
    return this.sabotage.kind === SABOTAGES.CAMERAS || this.sabotage.kind === SABOTAGES.COMMS;
  }

  // ---------------------------------------------------------- actions ------

  handleAction(pid, a) {
    const p = this.players.get(pid);
    if (!p || typeof a !== 'object' || !a) return;
    const now = Date.now();
    const playing = this.state === GAME_STATES.PLAYING;

    switch (a.type) {
      case 'kill': return playing && this.tryKill(p, a.target, now);
      case 'report': return playing && this.tryReport(p, now);
      case 'meeting': return playing && this.tryEmergency(p, now);
      case 'vent': return playing && this.tryVent(p, now);
      case 'ventMove': return playing && this.tryVentMove(p, a.to);
      case 'door': return playing && this.tryDoor(p, a.room, now);
      case 'sabotage': return playing && this.trySabotage(p, a.kind);
      case 'fixHold': return playing && this.tryFixHold(p, a.panel, a.on);
      case 'fix': return playing && this.tryFix(p, a.kind, a.which);
      case 'taskOpen': return playing && this.tryTaskOpen(p, a.id, now);
      case 'taskCancel': p.openTask = null; return;
      case 'taskDone': return playing && this.tryTaskDone(p, a.id, now);
      case 'ability': return playing && this.tryAbility(p, a.target, now);
      case 'cams': return playing && this.tryCams(p, a.on);
    }
  }

  tryKill(killer, targetPid, now) {
    const canKill = killer.role === ROLES.IMPOSTOR ||
      (killer.role === ROLES.SHERIFF && this.settings.roleSheriff);
    if (!canKill || !killer.alive || killer.inVent) return;
    if (now < killer.killReadyAt) return;
    const target = this.players.get(targetPid);
    if (!target || !target.alive || target === killer) return;
    if (killer.isImpostor && target.isImpostor) return;
    const range = KILL_DISTANCES[this.settings.killDistance] + PLAYER_RADIUS;
    if (dist(killer.x, killer.y, target.x, target.y) > range) return;

    if (target.shielded) {
      target.shielded = false;
      killer.killReadyAt = now + this.settings.killCooldown * 1000;
      killer.emit(NET.EVENT, { e: 'shieldBlocked' });
      target.emit(NET.EVENT, { e: 'shieldBlocked' });
      return;
    }

    // Sheriff misfire: shooting a non-impostor kills the sheriff instead.
    const victim = (killer.role === ROLES.SHERIFF && !target.isImpostor) ? killer : target;
    victim.alive = false;
    victim.shielded = false;
    victim.openTask = null;
    victim.holdingPanel = -1;
    this.bodies.push({ pid: victim.pid, x: victim.x, y: victim.y, at: now });
    if (victim !== killer) {
      killer.x = target.x; killer.y = target.y;      // classic lunge snap
      killer.stats.kills++;
    }
    killer.killReadyAt = now + this.settings.killCooldown * 1000;
    victim.emit(NET.EVENT, { e: 'youDied', by: killer.pid });
    if (victim !== killer) this.botAI.onKill(killer, victim);
    this.checkWin();
  }

  tryReport(p, now) {
    if (!p.alive || p.inVent) return;
    const body = this.bodies.find(b => dist(p.x, p.y, b.x, b.y) <= REPORT_RANGE);
    if (!body) return;
    this.startMeeting('body', p, body, now);
  }

  tryEmergency(p, now) {
    if (!p.alive || this.sabotage.isCritical) return;
    if (now < this.emergencyAvailableAt) return;
    if (p.emergenciesUsed >= this.settings.emergencyMeetings) return;
    const em = this.map.consoles.emergency;
    if (dist(p.x, p.y, em.x, em.y) > INTERACT_RANGE * 1.4) return;
    p.emergenciesUsed++;
    p.stats.meetingsCalled++;
    this.startMeeting('emergency', p, null, now);
  }

  tryVent(p, now) {
    if (!p.alive) return;
    if (p.inVent) return this.exitVent(p);
    const isEng = p.role === ROLES.ENGINEER && this.settings.roleEngineer;
    if (!p.isImpostor && !isEng) return;
    if (isEng && now < p.ventReadyAt) return;
    const vent = nearest(this.map.vents, p.x, p.y, INTERACT_RANGE);
    if (!vent) return;
    p.inVent = vent.id;
    p.ventEnteredAt = now;
    p.x = vent.x; p.y = vent.y;
  }

  exitVent(p) {
    const vent = this.map.ventById.get(p.inVent);
    if (vent) { p.x = vent.x; p.y = vent.y; }
    p.inVent = null;
    if (p.role === ROLES.ENGINEER) p.ventReadyAt = Date.now() + TIMERS.ventCooldown * 1000;
  }

  tryVentMove(p, to) {
    if (!p.inVent) return;
    const cur = this.map.ventById.get(p.inVent);
    const next = this.map.ventById.get(to);
    if (!cur || !next || !cur.links.includes(to)) return;
    p.inVent = next.id;
    p.x = next.x; p.y = next.y;
  }

  tryDoor(p, room, now) {
    if (!p.isImpostor || !this.map.closableRooms.includes(room)) return;
    if (this.doorsClosed.has(room)) return;
    if (now < (this.doorReadyAt.get(room) || 0)) return;
    this.doorsClosed.set(room, now + TIMERS.doorCloseTime * 1000);
    this.doorReadyAt.set(room, now + TIMERS.doorCooldown * 1000);
    this.broadcastEvent({ e: 'doors', room });
  }

  trySabotage(p, kind) {
    if (!p.isImpostor || !p.alive) return;
    this.sabotage.start(kind);
  }

  tryFixHold(p, panel, on) {
    if (!p.alive || this.sabotage.kind !== SABOTAGES.REACTOR) return;
    if (!on) { p.holdingPanel = -1; return; }
    if (panel !== 0 && panel !== 1) return;
    const pos = this.map.consoles.reactorPanels[panel];
    if (dist(p.x, p.y, pos.x, pos.y) > INTERACT_RANGE * 1.4) return;
    p.holdingPanel = panel;
  }

  tryFix(p, kind, which) {
    if (!p.alive) return;
    const C = this.map.consoles;
    let pos = null;
    if (kind === SABOTAGES.O2) pos = C.o2Consoles[which];
    else if (kind === SABOTAGES.LIGHTS) pos = C.lightsPanel;
    else if (kind === SABOTAGES.COMMS) pos = C.commsPanel;
    else if (kind === SABOTAGES.CAMERAS) pos = C.security;
    if (!pos || dist(p.x, p.y, pos.x, pos.y) > INTERACT_RANGE * 1.6) return;
    this.sabotage.fix(kind, which, p);
  }

  tryTaskOpen(p, id, now) {
    const task = this.map.taskById.get(id);
    if (!task || !p.tasks.some(t => t.id === id && !t.done)) return;
    if (dist(p.x, p.y, task.x, task.y) > INTERACT_RANGE * 1.4) return;
    p.openTask = { id, at: now };
  }

  tryTaskDone(p, id, now) {
    const task = this.map.taskById.get(id);
    const mine = p.tasks.find(t => t.id === id && !t.done);
    if (!task || !mine || !p.openTask || p.openTask.id !== id) return;
    if (now - p.openTask.at < task.minMs * 0.75) return;   // finished suspiciously fast
    if (dist(p.x, p.y, task.x, task.y) > INTERACT_RANGE * 2.5) return;
    p.openTask = null;
    mine.done = true;
    if (!p.isImpostor) {                                    // impostor "tasks" are fake
      this.tasksDone++;
      p.stats.tasksDone++;
      this.checkWin();
    }
    p.emit(NET.EVENT, { e: 'taskDone', id });
  }

  tryAbility(p, targetPid, now) {
    if (now < p.abilityReadyAt) return;
    if (p.role === ROLES.MEDIC && this.settings.roleMedic && p.alive) {
      const t = this.players.get(targetPid);
      if (!t || !t.alive || dist(p.x, p.y, t.x, t.y) > INTERACT_RANGE * 1.6) return;
      t.shielded = true;
      p.abilityReadyAt = now + TIMERS.medicShieldCd * 1000;
      t.emit(NET.EVENT, { e: 'shielded' });
      p.emit(NET.EVENT, { e: 'shieldGiven', target: t.pid });
    } else if (p.role === ROLES.GUARDIAN && this.settings.roleGuardian && !p.alive) {
      const t = this.players.get(targetPid);
      if (!t || !t.alive || dist(p.x, p.y, t.x, t.y) > INTERACT_RANGE * 1.6) return;
      t.shielded = true;
      p.abilityReadyAt = now + TIMERS.guardianShieldCd * 1000;
      t.emit(NET.EVENT, { e: 'shielded' });
      p.emit(NET.EVENT, { e: 'shieldGiven', target: t.pid });
    } else if (p.role === ROLES.HACKER && this.settings.roleHacker && p.alive) {
      if (this.camerasOffline()) return;
      p.watchingCams = true;
      p.camsUntil = now + TIMERS.hackerCamsDur * 1000;
      p.abilityReadyAt = now + TIMERS.hackerCamsCd * 1000;
    }
  }

  tryCams(p, on) {
    if (!on) { if (!p.camsUntil) p.watchingCams = false; return; }
    if (!p.alive || this.camerasOffline()) return;
    const sec = this.map.consoles.security;
    if (dist(p.x, p.y, sec.x, sec.y) > INTERACT_RANGE * 1.6) return;
    p.watchingCams = true;
    p.camsUntil = 0;
  }

  // ---------------------------------------------------------- meetings -----

  startMeeting(reason, reporter, body, now) {
    this.state = GAME_STATES.MEETING;
    const victim = body ? this.players.get(body.pid) : null;
    const diedAgo = body ? Math.round((now - body.at) / 1000) : 0;
    const bodyRoom = body ? this.map.roomName(this.map.roomAt(body.x, body.y)) : '';
    this.bodies = [];
    this.doorsClosed.clear();
    if (this.sabotage.active) this.sabotage.clear(false);

    const alive = [...this.players.values()].filter(q => q.alive);
    const pos = this.map.meetingPositions(alive.length);
    alive.forEach((q, i) => { q.x = pos[i].x; q.y = pos[i].y; });
    for (const q of this.players.values()) {
      if (q.inVent) this.exitVent(q);
      q.watchingCams = false; q.camsUntil = 0;
      q.openTask = null; q.holdingPanel = -1;
      q.vote = undefined;
    }

    this.meeting = {
      reason,
      reporter: reporter.pid,
      victim: victim ? victim.pid : null,
      phase: MEETING_PHASES.DISCUSSION,
      phaseEndsAt: now + this.settings.discussionTime * 1000,
      votes: new Map(),
      reveal: null,
    };
    this.broadcast(NET.MEETING, this.meetingPayload());
    this.botAI.onMeetingStart(now);

    if (victim && this.settings.roleDetective) {
      for (const q of this.players.values()) {
        if (q.role === ROLES.DETECTIVE && q.alive) {
          q.emit(NET.EVENT, { e: 'detective', text: `${victim.name} died ~${diedAgo}s ago in ${bodyRoom}.` });
        }
      }
    }
  }

  meetingPayload() {
    const m = this.meeting;
    const now = Date.now();
    return {
      phase: m.phase,
      reason: m.reason,
      reporter: m.reporter,
      victim: m.victim,
      remainMs: Math.max(0, m.phaseEndsAt - now),
      players: [...this.players.values()].map(q => ({
        pid: q.pid, name: q.name, cosmetics: q.cosmetics,
        alive: q.alive, connected: q.connected, isBot: q.isBot,
      })),
      voted: [...m.votes.keys()],
      reveal: m.reveal,
    };
  }

  updateMeeting(now) {
    const m = this.meeting;
    if (!m || now < m.phaseEndsAt) return;
    if (m.phase === MEETING_PHASES.DISCUSSION) {
      m.phase = MEETING_PHASES.VOTING;
      m.phaseEndsAt = now + this.settings.votingTime * 1000;
      this.broadcast(NET.MEETING, this.meetingPayload());
    } else if (m.phase === MEETING_PHASES.VOTING) {
      this.tallyVotes(now);
    } else if (m.phase === MEETING_PHASES.REVEAL) {
      this.endMeeting(now);
    }
  }

  castVote(pid, target) {
    const m = this.meeting;
    const p = this.players.get(pid);
    if (!m || m.phase !== MEETING_PHASES.VOTING || !p || !p.alive) return;
    if (m.votes.has(pid)) return;
    if (target !== 'skip') {
      const t = this.players.get(target);
      if (!t || !t.alive) return;
    }
    m.votes.set(pid, target);
    this.broadcast(NET.MEETING, { phase: 'votesUpdate', voted: [...m.votes.keys()] });
    this.maybeEndVoting();
  }

  maybeEndVoting() {
    const m = this.meeting;
    if (!m || m.phase !== MEETING_PHASES.VOTING) return;
    const aliveConnected = [...this.players.values()].filter(q => q.alive && q.connected);
    if (aliveConnected.every(q => m.votes.has(q.pid))) this.tallyVotes(Date.now());
  }

  tallyVotes(now) {
    const m = this.meeting;
    const counts = new Map();
    for (const target of m.votes.values()) {
      counts.set(target, (counts.get(target) || 0) + 1);
    }
    let best = null, bestN = 0, tie = false;
    for (const [target, n] of counts) {
      if (n > bestN) { best = target; bestN = n; tie = false; }
      else if (n === bestN) tie = true;
    }
    const ejected = (!tie && best && best !== 'skip') ? best : null;
    const ejectedPlayer = ejected ? this.players.get(ejected) : null;

    m.phase = MEETING_PHASES.REVEAL;
    m.phaseEndsAt = now + REVEAL_MS + TIMERS.ejectScene * 1000;
    m.reveal = {
      ejected,
      tie,
      counts: Object.fromEntries(counts),
      votes: this.settings.anonymousVotes ? null
        : [...m.votes.entries()].map(([voter, target]) => ({ voter, target })),
      confirm: this.settings.confirmEjects,
      wasImpostor: (this.settings.confirmEjects && ejectedPlayer) ? ejectedPlayer.isImpostor : null,
      remainingImpostors: this.settings.confirmEjects
        ? [...this.players.values()].filter(q => q.isImpostor && q.alive && q.pid !== ejected).length
        : null,
    };
    if (ejectedPlayer) ejectedPlayer.alive = false;
    this.broadcast(NET.MEETING, this.meetingPayload());
  }

  endMeeting(now) {
    this.meeting = null;
    this.state = GAME_STATES.PLAYING;
    for (const q of this.players.values()) {
      q.shielded = false;
      q.killReadyAt = now + this.settings.killCooldown * 1000;
      q.inputQueue.length = 0;
    }
    this.emergencyAvailableAt = now + TIMERS.emergencyCooldown * 1000;
    this.sabotage.readyAt = Math.max(this.sabotage.readyAt, now + 15000);
    this.botAI.onMeetingEnd();
    this.broadcast(NET.MEETING, { phase: 'end' });
    this.checkWin();
  }

  /** Task completion for AI players (real tasks count, impostor fakes don't). */
  botCompleteTask(bot, taskId) {
    const mine = bot.tasks.find(t => t.id === taskId && !t.done);
    if (!mine) return;
    mine.done = true;
    if (!bot.isImpostor) {
      this.tasksDone++;
      bot.stats.tasksDone++;
      this.checkWin();
    }
  }

  // ------------------------------------------------------------- wins ------

  checkWin() {
    if (this.state !== GAME_STATES.PLAYING && this.state !== GAME_STATES.MEETING) return;
    const alive = [...this.players.values()].filter(q => q.alive);
    const impostors = alive.filter(q => q.isImpostor).length;
    const crew = alive.length - impostors;

    if (this.totalTasks > 0 && this.tasksDone >= this.totalTasks) {
      return this.endGame('crew', 'tasks');
    }
    if (this.practice) return;
    if (impostors === 0) return this.endGame('crew', 'ejected');
    if (impostors >= crew) return this.endGame('impostor', 'kills');
  }

  endGame(winner, reason) {
    if (this.state === GAME_STATES.ENDED || this.state === GAME_STATES.LOBBY) return;
    this.state = GAME_STATES.ENDED;
    this.meeting = null;
    const summary = [...this.players.values()].map(q => ({
      pid: q.pid, name: q.name, role: q.role, alive: q.alive,
      cosmetics: q.cosmetics, stats: q.stats, isBot: q.isBot,
    }));
    for (const p of this.players.values()) {
      const won = !this.practice &&
        ((winner === 'crew' && !p.isImpostor) || (winner === 'impostor' && p.isImpostor));
      const xp = {
        participate: XP_RULES.participate,
        tasks: p.stats.tasksDone * XP_RULES.perTask,
        kills: p.stats.kills * XP_RULES.perKill,
        fixes: p.stats.fixes * XP_RULES.perFix,
        win: won ? XP_RULES.win : 0,
      };
      xp.total = xp.participate + xp.tasks + xp.kills + xp.fixes + xp.win;
      p.emit(NET.GAME_END, {
        winner, reason, practice: this.practice, players: summary, won, xp,
      });
    }
    this.endTimeout = setTimeout(() => this.resetToLobby(), TIMERS.endedToLobby * 1000);
  }

  resetToLobby() {
    for (const p of [...this.players.values()]) {
      if (!p.connected) { this.players.delete(p.pid); continue; }
      p.resetForGame();
      p.ready = p.isBot; // bots are always ready
    }
    if (![...this.players.values()].some(q => !q.isBot)) { this.manager.remove(this.code); return; }
    if (!this.players.has(this.hostPid)) {
      const humans = [...this.players.values()].filter(q => !q.isBot);
      const next = humans[0];
      this.hostPid = next.pid; next.isHost = true;
    }
    this.state = GAME_STATES.LOBBY;
    this.practice = false;
    this.broadcastLobby();
  }

  // ------------------------------------------------------------ misc -------

  broadcast(event, data) {
    for (const p of this.players.values()) p.emit(event, data);
  }

  broadcastEvent(data) {
    this.broadcast(NET.EVENT, data);
  }

  broadcastLobby() {
    this.broadcast(NET.LOBBY_STATE, this.serializeLobby());
  }

  serializeLobby() {
    return {
      code: this.code,
      isPublic: this.isPublic,
      hostPid: this.hostPid,
      state: this.state,
      maxPlayers: MAX_PLAYERS,
      settings: this.settings,
      players: [...this.players.values()].map(p => ({
        pid: p.pid, name: p.name, cosmetics: p.cosmetics,
        ready: p.ready, isHost: p.isHost, connected: p.connected, isBot: p.isBot,
      })),
    };
  }

  browseInfo() {
    const host = this.players.get(this.hostPid);
    return {
      code: this.code,
      host: host ? host.name : '?',
      players: this.players.size,
      max: MAX_PLAYERS,
      inGame: this.state !== GAME_STATES.LOBBY,
    };
  }
}
