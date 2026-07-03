// =============================================================
// AMONGSUS client — game state: client-side prediction with server
// reconciliation, snapshot interpolation buffers, proximity
// checks for HUD actions, and gameplay event handling.
// =============================================================

import { App } from '../state.js';
import { stepMovement } from '/shared/movement.js';
import { getMap, dist, nearest } from '/shared/map.js';
import {
  BASE_SPEED, GHOST_SPEED, INTERACT_RANGE, REPORT_RANGE,
  KILL_DISTANCES, PLAYER_RADIUS, ROLES, SABOTAGES, EMOTES,
} from '/shared/constants.js';
import { getMove } from './Input.js';
import { sfx, startAlarm, stopAlarm } from '../audio/AudioEngine.js';
import { spawnKillFx, spawnPoof, spawnSparks } from './Particles.js';
import { toast, screenShake } from '../utils/dom.js';
import { record } from '../progression/Progression.js';

const SEND_INTERVAL = 50; // ms between input batches

export class Game {
  constructor(payload) {
    this.applyStart(payload);
    this.seq = 0;
    this.pending = [];
    this.sendBuf = [];
    this.sendAcc = 0;
    this.walkPhase = 0;
    this.facing = 1;
    this.movingNow = false;
    this.footAcc = 0;
    this.shake = 0;
    this.uiLocks = 0;          // task modal / overlays that freeze movement
    this.openTaskId = null;
    this.holdingPanel = -1;
    this.youShielded = false;
    this.camsEnts = [];
    this.knownBodies = new Set();
  }

  applyStart(p) {
    this.youPid = p.youPid;
    this.role = p.role;
    this.partners = p.partners || [];
    this.practice = p.practice;
    this.settings = p.settings;
    this.map = getMap(p.settings.map);
    this.tasks = p.tasks.map(t => ({ id: t.id, done: !!t.done }));
    this.totalTasks = p.totalTasks;
    this.bar = p.totalTasks ? p.tasksDone / p.totalTasks : 0;
    this.state = p.state === 'starting' ? 'starting' : p.state;
    this.players = new Map(p.players.map(q => [q.pid, q]));
    this.entities = new Map();
    this.bodies = new Map();
    this.you = { x: p.you.x, y: p.you.y, alive: p.you.alive };
    this.inVent = null;
    this.sab = null;
    this.doors = new Map();
    this.cool = {};
    this.camsOn = false;
    this.meetingData = p.meeting;
    if (p.meeting) this.state = 'meeting';
  }

  get isImpostor() { return this.role === ROLES.IMPOSTOR; }
  get canUseVents() {
    return this.isImpostor || (this.role === ROLES.ENGINEER && this.settings.roleEngineer);
  }
  get canKill() {
    return this.isImpostor || (this.role === ROLES.SHERIFF && this.settings.roleSheriff);
  }

  canMove() {
    return this.state === 'playing' && this.uiLocks === 0 && !this.inVent;
  }

  // -------------------------------------------------------- per frame ------

  update(dtSec, tMs) {
    this.shake = Math.max(0, this.shake - dtSec * 30);

    if (!this.canMove()) { this.movingNow = false; return; }

    const { dx, dy } = getMove();
    const moving = dx !== 0 || dy !== 0;
    this.movingNow = moving;

    if (moving) {
      const inp = { seq: ++this.seq, dx, dy, dt: Math.min(0.05, dtSec) };
      const speed = this.you.alive ? BASE_SPEED * this.settings.playerSpeed : GHOST_SPEED;
      stepMovement(this.map, this.you, dx, dy, inp.dt, speed, this.closedDoorIds(), !this.you.alive);
      this.pending.push(inp);
      this.sendBuf.push(inp);
      if (this.pending.length > 120) this.pending.shift();
      if (dx !== 0) this.facing = dx > 0 ? 1 : -1;
      this.walkPhase += dtSec * 11;
      this.footAcc += dtSec;
      if (this.footAcc > 0.28 && this.you.alive) {
        this.footAcc = 0;
        sfx('footstep');
      }
    }

    this.sendAcc += dtSec * 1000;
    if (this.sendAcc >= SEND_INTERVAL && this.sendBuf.length) {
      this.sendAcc = 0;
      App.conn.sendInputs(this.sendBuf.splice(0));
    }
  }

  closedDoorIds() {
    if (this.doors.size === 0) return null;
    const set = new Set();
    for (const d of this.map.doors) if (this.doors.has(d.room)) set.add(d.id);
    return set;
  }

  // -------------------------------------------------------- snapshots ------

  onSnapshot(s) {
    const now = performance.now();

    // reconciliation: rebase on authoritative pos, replay unacked inputs
    this.pending = this.pending.filter(i => i.seq > s.ack);
    const auth = { x: s.you[0], y: s.you[1] };
    const speed = this.you.alive ? BASE_SPEED * this.settings.playerSpeed : GHOST_SPEED;
    const doors = this.closedDoorIds();
    for (const inp of this.pending) {
      stepMovement(this.map, auth, inp.dx, inp.dy, inp.dt, speed, doors, !this.you.alive);
    }
    if (dist(auth.x, auth.y, this.you.x, this.you.y) > 3) {
      this.you.x = auth.x; this.you.y = auth.y;
    }

    const wasVent = this.inVent;
    this.inVent = s.you[2] || null;
    if (!!wasVent !== !!this.inVent) {
      sfx('vent');
      spawnPoof(this.you.x, this.you.y);
      App.emit('ui:vent', this.inVent);
    }

    // remote entities → interpolation buffers
    for (const e of s.p) {
      const [pid, x, y, mv, dir, dead] = e;
      let ent = this.entities.get(pid);
      if (!ent) { ent = { buf: [], alpha: 0, lastSeen: 0 }; this.entities.set(pid, ent); }
      ent.buf.push({ t: now, x, y, mv: !!mv, dir });
      if (ent.buf.length > 20) ent.buf.shift();
      ent.lastSeen = now;
      ent.dead = !!dead;
    }

    // bodies (detect new ones for kill FX)
    const newBodies = new Map();
    for (const [pid, x, y] of s.bodies) {
      newBodies.set(pid, { pid, x, y });
      if (!this.knownBodies.has(pid)) {
        this.knownBodies.add(pid);
        const d = dist(this.you.x, this.you.y, x, y);
        if (d < 700) {
          spawnKillFx(x, y);
          sfx('kill');
          if (d < 320 && App.settings.shake) { this.shake = 14; screenShake(); }
        }
        const pl = this.players.get(pid);
        if (pl) pl.alive = false;
      }
    }
    this.bodies = newBodies;

    // sabotage transitions
    const prevKind = this.sab ? this.sab.kind : null;
    this.sab = s.sab;
    const kind = this.sab ? this.sab.kind : null;
    if (kind !== prevKind) {
      if (kind) {
        sfx('sabotage');
        if (kind === SABOTAGES.REACTOR || kind === SABOTAGES.O2) startAlarm();
      } else {
        stopAlarm();
      }
      App.emit('ui:sabotage', this.sab);
    }

    // doors
    const prevDoors = this.doors;
    this.doors = new Map(s.doors);
    for (const [room] of this.doors) {
      if (!prevDoors.has(room)) sfx('door');
    }

    this.cool = s.cool || {};
    this.snapAt = now;           // for counting down cooldown/timer displays
    this.camsOn = !!s.camsOn;
    this.camsEnts = (s.cams || []).map(([pid, x, y, mv, dir]) => ({ pid, x, y, moving: mv, dir }));
    if (s.bar !== undefined) this.bar = s.bar;
  }

  // ------------------------------------------------------- proximity -------

  /** What can we interact with right now? Drives the HUD buttons. */
  computeProx() {
    const px = this.you.x, py = this.you.y;
    const out = {
      task: null, body: null, vent: null, killTarget: null,
      emergency: false, fix: null, security: false, abilityTarget: null,
    };
    if (this.state !== 'playing') return out;

    // bodies
    if (this.you.alive) {
      let best = REPORT_RANGE;
      for (const b of this.bodies.values()) {
        const d = dist(px, py, b.x, b.y);
        if (d < best) { best = d; out.body = b; }
      }
    }

    // own pending task
    const C = this.map.consoles;
    const commsDown = this.sab && this.sab.kind === SABOTAGES.COMMS;
    if (!commsDown) {
      let best = INTERACT_RANGE;
      for (const t of this.tasks) {
        if (t.done) continue;
        const td = this.map.taskById.get(t.id);
        if (!td) continue;
        const d = dist(px, py, td.x, td.y);
        if (d < best) { best = d; out.task = td; }
      }
    }

    // sabotage fix points
    if (this.sab && this.you.alive) {
      const k = this.sab.kind;
      if (k === SABOTAGES.REACTOR) {
        C.reactorPanels.forEach((p, i) => {
          if (dist(px, py, p.x, p.y) <= INTERACT_RANGE * 1.3) out.fix = { kind: k, which: i };
        });
      } else if (k === SABOTAGES.O2) {
        C.o2Consoles.forEach((p, i) => {
          if (dist(px, py, p.x, p.y) <= INTERACT_RANGE * 1.3 && !this.sab.o2Fixed[i]) {
            out.fix = { kind: k, which: i };
          }
        });
      } else if (k === SABOTAGES.LIGHTS && dist(px, py, C.lightsPanel.x, C.lightsPanel.y) <= INTERACT_RANGE * 1.3) {
        out.fix = { kind: k };
      } else if (k === SABOTAGES.COMMS && dist(px, py, C.commsPanel.x, C.commsPanel.y) <= INTERACT_RANGE * 1.3) {
        out.fix = { kind: k };
      } else if (k === SABOTAGES.CAMERAS && dist(px, py, C.security.x, C.security.y) <= INTERACT_RANGE * 1.3) {
        out.fix = { kind: k };
      }
    }

    // emergency button
    if (this.you.alive && !this.sabCritical() &&
        dist(px, py, C.emergency.x, C.emergency.y) <= INTERACT_RANGE * 1.3) {
      out.emergency = true;
    }

    // security console
    if (this.you.alive && dist(px, py, C.security.x, C.security.y) <= INTERACT_RANGE * 1.3) {
      out.security = true;
    }

    // vents
    if (this.canUseVents && this.you.alive) {
      out.vent = nearest(this.map.vents, px, py, INTERACT_RANGE);
    }

    // kill target — nearest living non-partner within range
    if (this.canKill && this.you.alive) {
      const range = KILL_DISTANCES[this.settings.killDistance] + PLAYER_RADIUS;
      let best = range;
      for (const [pid, ent] of this.entities) {
        if (pid === this.youPid || ent.dead || ent.rx === undefined) continue;
        if (this.isImpostor && this.partners.includes(pid)) continue;
        if (ent.alpha < 0.5) continue;
        const d = dist(px, py, ent.rx, ent.ry);
        if (d < best) { best = d; out.killTarget = pid; }
      }
    }

    // medic (alive) / guardian (dead) shield target
    if ((this.role === ROLES.MEDIC && this.you.alive) ||
        (this.role === ROLES.GUARDIAN && !this.you.alive)) {
      let best = INTERACT_RANGE * 1.5;
      for (const [pid, ent] of this.entities) {
        if (pid === this.youPid || ent.dead || ent.rx === undefined) continue;
        const d = dist(px, py, ent.rx, ent.ry);
        if (d < best) { best = d; out.abilityTarget = pid; }
      }
    }

    return out;
  }

  sabCritical() {
    return this.sab && (this.sab.kind === SABOTAGES.REACTOR || this.sab.kind === SABOTAGES.O2);
  }

  // ---------------------------------------------------------- actions ------

  kill(targetPid) { App.conn.action({ type: 'kill', target: targetPid }); }
  report() { App.conn.action({ type: 'report' }); }
  emergency() { App.conn.action({ type: 'meeting' }); }
  vent() { App.conn.action({ type: 'vent' }); }
  ventMove(to) { App.conn.action({ type: 'ventMove', to }); }
  sabotage(kind) { App.conn.action({ type: 'sabotage', kind }); }
  door(room) { App.conn.action({ type: 'door', room }); }
  ability(target) { App.conn.action({ type: 'ability', target }); }
  camsOnOff(on) { App.conn.action({ type: 'cams', on }); }
  fix(kind, which) { App.conn.action({ type: 'fix', kind, which }); }
  fixHold(panel, on) {
    this.holdingPanel = on ? panel : -1;
    App.conn.action({ type: 'fixHold', panel, on });
  }
  taskOpen(id) { this.openTaskId = id; App.conn.action({ type: 'taskOpen', id }); }
  taskCancel() { this.openTaskId = null; App.conn.action({ type: 'taskCancel' }); }
  taskDone(id) { this.openTaskId = null; App.conn.action({ type: 'taskDone', id }); }

  sendEmote(i) {
    App.conn.emote(i);
    this.showEmote(this.youPid, i);
  }

  showEmote(pid, i) {
    let ent = this.entities.get(pid);
    if (!ent) { ent = { buf: [], alpha: 0, lastSeen: 0 }; this.entities.set(pid, ent); }
    ent.emote = { text: EMOTES[i] || '❓', until: performance.now() + 2500 };
    sfx('emote');
  }

  // ------------------------------------------------------------ events -----

  applyEvent(ev) {
    switch (ev.e) {
      case 'youDied': {
        this.you.alive = false;
        this.pending = [];
        this.taskCancel();
        record('ejectedYou');
        App.emit('ui:death');
        break;
      }
      case 'taskDone': {
        const t = this.tasks.find(t => t.id === ev.id);
        if (t) t.done = true;
        sfx('taskDone');
        if (!this.isImpostor) record('task', { dead: !this.you.alive });
        App.emit('ui:tasks');
        break;
      }
      case 'detective':
        toast(`🔍 ${ev.text}`, 'warn', 7000);
        break;
      case 'shielded':
        this.youShielded = true;
        sfx('shield');
        toast('🛡️ Someone shielded you!', 'info');
        break;
      case 'shieldGiven':
        sfx('shield');
        toast('🛡️ Shield applied.', 'info');
        break;
      case 'shieldBlocked':
        this.youShielded = false;
        sfx('shield');
        toast('🛡️ A shield blocked an attack!', 'warn');
        break;
      case 'sabotage':
        break; // snapshot transition handles sound/banner
      case 'sabotageEnd':
        stopAlarm();
        if (ev.fixed) { sfx('taskDone'); spawnSparks(this.you.x, this.you.y - 40); }
        App.emit('ui:sabotage', null);
        break;
      case 'doors':
        break; // handled via snapshot diff
      case 'emote':
        if (ev.pid !== this.youPid) this.showEmote(ev.pid, ev.i);
        break;
    }
  }

  /** Meeting begins/ends — reset motion state so we don't rubber-band. */
  onMeetingPhase(payload) {
    if (payload.phase === 'discussion' && this.state !== 'meeting') {
      this.state = 'meeting';
      this.pending = [];
      this.sendBuf = [];
      this.taskCancel();
      this.knownBodies.clear();
      for (const q of payload.players) {
        const pl = this.players.get(q.pid);
        if (pl) pl.alive = q.alive;
        if (q.pid === this.youPid) this.you.alive = q.alive;
      }
    } else if (payload.phase === 'end') {
      this.state = 'playing';
      this.pending = [];
      this.youShielded = false; // shields expire at meetings
    }
  }
}
