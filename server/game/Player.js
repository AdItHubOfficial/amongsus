// =============================================================
// AMONGSUS server — per-connection player state.
// =============================================================

import { ROLES } from '../../shared/constants.js';

export class Player {
  constructor(socket, pid, token, name, cosmetics) {
    this.socket = socket; // null for AI players
    this.pid = pid;
    this.token = token;
    this.name = name;
    this.cosmetics = cosmetics; // { color, hat, pet, skin, plate }
    this.address = socket ? (socket.handshake.address || '') : 'bot';
    this.isBot = false;
    this.isHost = false;
    this.ready = false;
    this.connected = true;
    this.disconnectedAt = 0;
    this.resetForGame();
  }

  resetForGame() {
    this.role = ROLES.CREW;
    this.alive = true;
    this.x = 0; this.y = 0;
    this.dirX = 1;
    this.movingUntil = 0;
    this.inVent = null;
    this.ventEnteredAt = 0;
    this.ventReadyAt = 0;
    this.tasks = [];            // [{ id, done }]
    this.inputQueue = [];
    this.lastSeq = 0;
    this.moveAllowance = 0;
    this.killReadyAt = 0;
    this.abilityReadyAt = 0;
    this.emergenciesUsed = 0;
    this.shielded = false;
    this.watchingCams = false;
    this.camsUntil = 0;         // hacker remote-cams expiry
    this.openTask = null;       // { id, at }
    this.holdingPanel = -1;     // reactor panel index being held
    this.vote = undefined;
    this.stats = { kills: 0, tasksDone: 0, fixes: 0, meetingsCalled: 0 };
  }

  get isImpostor() { return this.role === ROLES.IMPOSTOR; }

  emit(event, data) {
    if (this.connected && this.socket) this.socket.emit(event, data);
  }
}
