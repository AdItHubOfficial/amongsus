// =============================================================
// AMONGSUS server — lobby registry: create, join by code, browse.
// =============================================================

import { Room } from './Room.js';
import { makeLobbyCode } from '../utils/util.js';
import { GAME_STATES, MAX_PLAYERS } from '../../shared/constants.js';

export class RoomManager {
  constructor() {
    this.rooms = new Map(); // code -> Room
  }

  create(isPublic) {
    let code;
    do { code = makeLobbyCode(); } while (this.rooms.has(code));
    const room = new Room(code, isPublic, this);
    this.rooms.set(code, room);
    return room;
  }

  get(code) {
    if (typeof code !== 'string') return null;
    return this.rooms.get(code.trim().toUpperCase()) || null;
  }

  remove(code) {
    const room = this.rooms.get(code);
    if (room) {
      room.destroy();
      this.rooms.delete(code);
    }
  }

  browse() {
    const out = [];
    for (const room of this.rooms.values()) {
      if (!room.isPublic) continue;
      if (room.state !== GAME_STATES.LOBBY) continue;
      if (room.players.size >= MAX_PLAYERS) continue;
      out.push(room.browseInfo());
      if (out.length >= 20) break;
    }
    return out;
  }
}
