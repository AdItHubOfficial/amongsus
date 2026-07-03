// =============================================================
// AMONGSUS server — sabotage state machine (reactor, O2, lights,
// comms, cameras). Doors are handled directly by Room.
// =============================================================

import { SABOTAGES, TIMERS, INTERACT_RANGE } from '../../shared/constants.js';
import { dist } from '../../shared/map.js';

export class SabotageSystem {
  constructor(room) {
    this.room = room;
    this.active = null;   // { kind, endsAt, o2Fixed:[b,b] }
    this.readyAt = 0;
  }

  get kind() { return this.active ? this.active.kind : null; }
  get isCritical() {
    return this.active && (this.active.kind === SABOTAGES.REACTOR || this.active.kind === SABOTAGES.O2);
  }

  start(kind) {
    const now = Date.now();
    if (this.active || now < this.readyAt) return false;
    if (!Object.values(SABOTAGES).includes(kind)) return false;
    const critical = kind === SABOTAGES.REACTOR || kind === SABOTAGES.O2;
    this.active = {
      kind,
      startedAt: now,
      endsAt: critical ? now + TIMERS.criticalSabotage * 1000
        : kind === SABOTAGES.CAMERAS ? now + TIMERS.camerasAutoFix * 1000 : 0,
      o2Fixed: [false, false],
    };
    this.room.broadcastEvent({ e: 'sabotage', kind });
    return true;
  }

  /** Called every tick. Handles reactor dual-hold and critical expiry. */
  update(now) {
    if (!this.active) return;
    const { kind, endsAt } = this.active;

    if (kind === SABOTAGES.REACTOR) {
      // Both panels must be held simultaneously by players standing at them.
      const held = [false, false];
      for (const p of this.room.players.values()) {
        if (!p.alive || p.holdingPanel < 0) continue;
        const panel = this.room.map.consoles.reactorPanels[p.holdingPanel];
        if (panel && dist(p.x, p.y, panel.x, panel.y) <= INTERACT_RANGE * 1.4) {
          held[p.holdingPanel] = true;
        } else {
          p.holdingPanel = -1;
        }
      }
      this.active.panels = held;
      if (held[0] && held[1]) {
        for (const p of this.room.players.values()) {
          if (p.holdingPanel >= 0) { p.stats.fixes++; p.holdingPanel = -1; }
        }
        return this.clear(true);
      }
    }

    if (kind === SABOTAGES.CAMERAS && now >= endsAt) return this.clear(false);

    if (this.isCritical && now >= endsAt) {
      this.room.endGame('impostor', 'sabotage');
    }
  }

  /** Player-initiated fix at a console. Proximity already checked by Room. */
  fix(kind, which, player) {
    if (!this.active || this.active.kind !== kind) return false;
    if (kind === SABOTAGES.O2) {
      if (which !== 0 && which !== 1) return false;
      if (this.active.o2Fixed[which]) return false;
      this.active.o2Fixed[which] = true;
      player.stats.fixes++;
      if (this.active.o2Fixed[0] && this.active.o2Fixed[1]) this.clear(true);
      else this.room.broadcastEvent({ e: 'sabProgress', kind, o2Fixed: this.active.o2Fixed });
      return true;
    }
    if (kind === SABOTAGES.LIGHTS || kind === SABOTAGES.COMMS || kind === SABOTAGES.CAMERAS) {
      player.stats.fixes++;
      this.clear(true);
      return true;
    }
    return false;
  }

  clear(fixed) {
    this.active = null;
    this.readyAt = Date.now() + TIMERS.sabotageCooldown * 1000;
    this.room.broadcastEvent({ e: 'sabotageEnd', fixed: !!fixed });
  }

  serialize(now) {
    if (!this.active) return null;
    const a = this.active;
    return {
      kind: a.kind,
      remainMs: a.endsAt ? Math.max(0, a.endsAt - now) : 0,
      panels: a.panels || [false, false],
      o2Fixed: a.o2Fixed,
    };
  }
}
