// =============================================================
// AMONGSUS server — AI players. Bots pathfind around the ship,
// complete tasks, respond to sabotage, report bodies, chat and
// vote in meetings — and hunt the crew when they roll impostor.
// =============================================================

import {
  BASE_SPEED, GHOST_SPEED, INTERACT_RANGE, KILL_DISTANCES,
  PLAYER_RADIUS, SABOTAGES, MEETING_PHASES, NET,
} from '../../shared/constants.js';
import { dist } from '../../shared/map.js';
import { stepMovement } from '../../shared/movement.js';
import { getPathfinder } from './pathfinding.js';

export const BOT_NAMES = [
  'Nova', 'Orbit', 'Pixel', 'Vega', 'Cosmo', 'Luna', 'Byte',
  'Echo', 'Comet', 'Zippy', 'Astro', 'Quark', 'Jinx', 'Bolt',
];
export const BOT_HATS = [
  'none', 'antenna', 'cap', 'beanie', 'headset', 'sprout', 'tophat', 'party',
  'cowboy', 'halo', 'flower', 'catears', 'bandana', 'goggles', 'mushroom',
  'fedora', 'mohawk', 'cone', 'santa', 'grad', 'pirate', 'wizard',
];
export const BOT_PETS = [
  'none', 'none', 'blob', 'robopup', 'ufo', 'star', 'boxbot',
  'ducky', 'snail', 'frog', 'crab', 'minicrew', 'ghostie',
];

const CHAT_LINES = [
  'where was the body?', 'sus…', "it wasn't me, I was doing tasks",
  'anyone see anything?', 'hmm 🤔', 'no clue, I was across the ship',
  "let's not vote randomly", 'someone check the cams next time',
];

export function pickBotName(takenNames) {
  const taken = new Set(takenNames);
  const free = BOT_NAMES.filter(n => !taken.has(n));
  if (free.length) return free[Math.floor(Math.random() * free.length)];
  return 'Bot-' + Math.floor(100 + Math.random() * 900);
}

export class BotAI {
  constructor(room) {
    this.room = room;
    this.states = new Map(); // pid -> brain state
  }

  bots() {
    return [...this.room.players.values()].filter(p => p.isBot);
  }

  freshState() {
    return {
      goal: null, goalKey: null, path: null, pathI: 0,
      workUntil: 0, repathAt: 0, checkAt: 0, checkX: 0, checkY: 0,
      voteAt: 0, chatAt: 0, chatMsg: null, suspect: null,
      nextSabAt: Date.now() + 45000 + Math.random() * 45000,
    };
  }

  state(b) {
    let s = this.states.get(b.pid);
    if (!s) { s = this.freshState(); this.states.set(b.pid, s); }
    return s;
  }

  onGameStart() {
    this.states.clear();
    this.pf = getPathfinder(this.room.map);
    for (const b of this.bots()) this.states.set(b.pid, this.freshState());
  }

  onMeetingStart(now) {
    for (const b of this.bots()) {
      const s = this.state(b);
      this.clearGoal(s);
      s.voteAt = 0;
      s.chatAt = 0;
      if (!b.alive) continue;
      const suspect = s.suspect ? this.room.players.get(s.suspect) : null;
      if (suspect && suspect.alive && !b.isImpostor) {
        s.chatAt = now + 3000 + Math.random() * 4000;
        s.chatMsg = `I saw ${suspect.name} near the body!`;
      } else if (Math.random() < 0.4) {
        s.chatAt = now + 3500 + Math.random() * 8000;
        s.chatMsg = CHAT_LINES[Math.floor(Math.random() * CHAT_LINES.length)];
      }
    }
  }

  onMeetingEnd() {
    for (const s of this.states.values()) this.clearGoal(s);
  }

  /** Crew bots close to a fresh kill remember who did it. */
  onKill(killer, victim) {
    for (const b of this.bots()) {
      if (!b.alive || b.isImpostor || b === victim || b === killer) continue;
      if (dist(b.x, b.y, victim.x, victim.y) < 520 && Math.random() < 0.85) {
        this.state(b).suspect = killer.pid;
      }
    }
  }

  clearGoal(s) {
    s.goal = null; s.goalKey = null; s.path = null; s.pathI = 0; s.workUntil = 0;
    s.fails = 0;
  }

  setPath(b, s, x, y) {
    s.pathI = 0;
    if (!b.alive) { s.path = [{ x, y }]; return; }   // ghosts fly straight
    if (!this.pf) this.pf = getPathfinder(this.room.map);
    s.path = this.pf.findPath(b.x, b.y, x, y) || [{ x, y }];
  }

  // ---------------------------------------------------------- playing ------

  updatePlaying(dt, now) {
    for (const b of this.bots()) {
      const s = this.state(b);
      if (b.isImpostor && b.alive) this.updateImpostor(b, s, dt, now);
      else this.updateCrew(b, s, dt, now);
    }
  }

  updateCrew(b, s, dt, now) {
    const goal = this.pickCrewGoal(b, s, now);
    if (!goal) return;
    if (goal.key !== s.goalKey) {
      this.clearGoal(s);
      s.goal = goal;
      s.goalKey = goal.key;
      this.setPath(b, s, goal.x, goal.y);
      if (b.holdingPanel >= 0 && goal.type !== 'panel') b.holdingPanel = -1;
    }
    const near = dist(b.x, b.y, goal.x, goal.y) <= INTERACT_RANGE * (goal.type === 'wander' ? 0.6 : 1.1);
    if (!near) { this.moveAlong(b, s, dt, now); return; }

    const room = this.room;
    switch (goal.type) {
      case 'report':
        if (!s.workUntil) { s.workUntil = now + 700 + Math.random() * 900; break; }
        if (now >= s.workUntil && room.bodies.includes(goal.body)) {
          room.startMeeting('body', b, goal.body, now);
        }
        break;
      case 'panel':
        b.holdingPanel = goal.idx;
        break;
      case 'fix':
        if (!s.workUntil) { s.workUntil = now + 2200 + Math.random() * 900; break; }
        if (now >= s.workUntil) {
          room.sabotage.fix(goal.kind, goal.which, b);
          this.clearGoal(s);
        }
        break;
      case 'task': {
        if (!s.workUntil) {
          const td = this.room.map.taskById.get(goal.id);
          s.workUntil = now + td.minMs * (0.9 + Math.random() * 0.7);
          break;
        }
        if (now >= s.workUntil) {
          room.botCompleteTask(b, goal.id);
          this.clearGoal(s);
        }
        break;
      }
      case 'wander':
        if (!s.workUntil) { s.workUntil = now + 1200 + Math.random() * 3000; break; }
        if (now >= s.workUntil) this.clearGoal(s);
        break;
    }
  }

  pickCrewGoal(b, s, now) {
    const room = this.room;
    const sab = room.sabotage;
    const C = room.map.consoles;

    // sabotage response (never for impostors faking tasks, never for ghosts)
    if (b.alive && !b.isImpostor && sab.active) {
      const k = sab.kind;
      const crewBots = this.bots().filter(q => q.alive && !q.isImpostor);
      const myIdx = Math.max(0, crewBots.indexOf(b)) % 2;
      if (k === SABOTAGES.REACTOR) {
        const p = C.reactorPanels[myIdx];
        return { type: 'panel', idx: myIdx, x: p.x, y: p.y, key: 'panel' + myIdx };
      }
      if (k === SABOTAGES.O2) {
        let which = myIdx;
        if (sab.active.o2Fixed[which]) which = 1 - which;
        if (!sab.active.o2Fixed[which]) {
          const c = C.o2Consoles[which];
          return { type: 'fix', kind: k, which, x: c.x, y: c.y, key: 'o2' + which };
        }
      }
      if ((k === SABOTAGES.LIGHTS || k === SABOTAGES.COMMS || k === SABOTAGES.CAMERAS) &&
          crewBots[0] === b) {
        const c = k === SABOTAGES.LIGHTS ? C.lightsPanel
          : k === SABOTAGES.COMMS ? C.commsPanel : C.security;
        return { type: 'fix', kind: k, which: undefined, x: c.x, y: c.y, key: 'fix' + k };
      }
    }

    // report bodies we walk past
    if (b.alive && !b.isImpostor) {
      const body = room.bodies.find(bd => dist(b.x, b.y, bd.x, bd.y) < 460);
      if (body) return { type: 'report', body, x: body.x, y: body.y, key: 'report' + body.pid };
    }

    // stick with the current objective while it's valid
    if (s.goal && s.goal.type === 'task') {
      const mine = b.tasks.find(t => t.id === s.goal.id);
      if (mine && !mine.done) return s.goal;
    }
    if (s.goal && s.goal.type === 'wander') return s.goal;

    const undone = b.tasks.filter(t => !t.done);
    if (undone.length) {
      const td = room.map.taskById.get(undone[Math.floor(Math.random() * undone.length)].id);
      return { type: 'task', id: td.id, x: td.x, y: td.y, key: 'task' + td.id };
    }
    const roomsList = room.map.rooms;
    const r = roomsList[Math.floor(Math.random() * roomsList.length)];
    return {
      type: 'wander',
      x: r.x + 80 + Math.random() * (r.w - 160),
      y: r.y + 80 + Math.random() * (r.h - 160),
      key: 'wander' + Math.floor(now),
    };
  }

  updateImpostor(b, s, dt, now) {
    const room = this.room;

    // occasional sabotage for chaos
    if (now >= s.nextSabAt && !room.sabotage.active && now >= room.sabotage.readyAt) {
      const kind = Math.random() < 0.18 ? SABOTAGES.REACTOR
        : [SABOTAGES.LIGHTS, SABOTAGES.COMMS, SABOTAGES.CAMERAS][Math.floor(Math.random() * 3)];
      room.sabotage.start(kind);
      s.nextSabAt = now + 50000 + Math.random() * 40000;
    }

    // pick the nearest living victim
    const victims = [...room.players.values()]
      .filter(q => q.alive && !q.isImpostor && q !== b);
    if (!victims.length) { this.updateCrew(b, s, dt, now); return; }
    let victim = victims[0], best = Infinity;
    for (const v of victims) {
      const d = dist(b.x, b.y, v.x, v.y);
      if (d < best) { best = d; victim = v; }
    }

    const killReady = now >= b.killReadyAt;
    if (killReady && best < 950) {
      // stalk — repath towards the moving victim
      if (now >= s.repathAt || !s.path) {
        s.repathAt = now + 700;
        s.goal = null;
        s.goalKey = 'hunt';
        this.setPath(b, s, victim.x, victim.y);
      }
      const range = (KILL_DISTANCES[room.settings.killDistance] + PLAYER_RADIUS) * 0.8;
      if (best <= range) {
        const witnesses = [...room.players.values()].filter(q =>
          q.alive && q !== b && q !== victim && !q.isImpostor &&
          dist(q.x, q.y, victim.x, victim.y) < 520).length;
        if (witnesses === 0) {
          room.tryKill(b, victim.pid, now);
          this.clearGoal(s);
          // slink away from the scene
          const roomsList = room.map.rooms;
          const r = roomsList[Math.floor(Math.random() * roomsList.length)];
          s.goal = { type: 'wander', x: r.x + r.w / 2, y: r.y + r.h / 2, key: 'flee' + now };
          s.goalKey = s.goal.key;
          this.setPath(b, s, s.goal.x, s.goal.y);
          return;
        }
      }
      this.moveAlong(b, s, dt, now);
      return;
    }

    // cooldown or nobody near: blend in with fake tasks
    this.updateCrew(b, s, dt, now);
  }

  moveAlong(b, s, dt, now) {
    if (!s.path || !s.path.length) return;
    const wp = s.path[Math.min(s.pathI, s.path.length - 1)];
    const dx = wp.x - b.x, dy = wp.y - b.y;
    const d = Math.hypot(dx, dy);
    if (d < 26) {
      if (s.pathI < s.path.length - 1) { s.pathI++; return; }
      // path exhausted but the caller still isn't "near" its goal — replan,
      // and give up on goals that repeatedly can't be reached
      if (now >= s.repathAt) {
        s.repathAt = now + 1200;
        s.fails = (s.fails || 0) + 1;
        if (s.fails > 3 || !s.goal) this.clearGoal(s);
        else this.setPath(b, s, s.goal.x, s.goal.y);
      }
      return;
    }
    const speed = (b.alive ? BASE_SPEED * this.room.settings.playerSpeed : GHOST_SPEED) * 0.92;
    stepMovement(this.room.map, b, dx / d, dy / d, dt, speed, this.room.closedDoorIds(), !b.alive);
    b.movingUntil = now + 180;
    if (Math.abs(dx) > 2) b.dirX = dx > 0 ? 1 : -1;

    // stuck? (wedged corner, closed door) — un-wedge onto the grid and repath
    if (now >= s.checkAt) {
      if (s.checkAt && dist(b.x, b.y, s.checkX, s.checkY) < 25) {
        if (!this.pf) this.pf = getPathfinder(this.room.map);
        const c = this.pf.nearestCellCenter(b.x, b.y);
        if (c && b.alive) { b.x = c.x; b.y = c.y; }
        if (s.goal) this.setPath(b, s, s.goal.x, s.goal.y);
        else this.clearGoal(s);
      }
      s.checkAt = now + 1000;
      s.checkX = b.x;
      s.checkY = b.y;
    }
  }

  // ---------------------------------------------------------- meetings -----

  updateMeeting(now) {
    const room = this.room;
    const m = room.meeting;
    if (!m) return;
    for (const b of this.bots()) {
      const s = this.state(b);
      if (s.chatAt && now >= s.chatAt && b.alive) {
        s.chatAt = 0;
        room.broadcast(NET.CHAT_MSG, {
          scope: 'meeting', from: b.pid, name: b.name,
          color: b.cosmetics.color, text: s.chatMsg, ts: now,
        });
      }
      if (m.phase === MEETING_PHASES.VOTING && b.alive && !m.votes.has(b.pid)) {
        if (!s.voteAt) { s.voteAt = now + 2500 + Math.random() * 9000; continue; }
        if (now >= s.voteAt) {
          let target = 'skip';
          const suspect = s.suspect ? room.players.get(s.suspect) : null;
          if (suspect && suspect.alive && !b.isImpostor) target = suspect.pid;
          else if (Math.random() < 0.3) {
            const alive = [...room.players.values()]
              .filter(q => q.alive && q.pid !== b.pid && !(b.isImpostor && q.isImpostor));
            if (alive.length) target = alive[Math.floor(Math.random() * alive.length)].pid;
          }
          room.castVote(b.pid, target);
        }
      }
    }
  }
}
