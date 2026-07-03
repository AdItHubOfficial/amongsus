// =============================================================
// AMONGSUS — map registry. Compiles the raw definitions from
// mapdefs.js into full map objects with derived structures and
// helper methods. Shared by server and client; a server can run
// different maps in different lobbies simultaneously.
// =============================================================

import { MAP_DEFS } from './mapdefs.js';
import { TASK_TYPES } from './tasksData.js';

export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

/** Nearest entry of [{x,y,...}] within range, else null. */
export function nearest(list, x, y, range) {
  let best = null, bd = range;
  for (const it of list) {
    const d = dist(it.x, it.y, x, y);
    if (d <= bd) { bd = d; best = it; }
  }
  return best;
}

function buildMap(def) {
  const rooms = def.rooms.map(r => ({ ...r }));
  const roomById = new Map(rooms.map(r => [r.id, r]));

  const corridors = def.corridors.map(([x, y, w, h], i) => ({ id: 'c' + i, x, y, w, h }));
  const walkable = [...rooms, ...corridors];

  const doors = def.doors.map(([room, x, y, w, h], i) => ({ id: `d${i}-${room}`, room, x, y, w, h }));
  const doorById = new Map(doors.map(d => [d.id, d]));

  // vents: same net = fully linked
  const vents = def.vents.map(([room, x, y, net], i) => ({ id: 'v' + i, room, x, y, net, links: [] }));
  for (const v of vents) {
    v.links = vents.filter(o => o.net === v.net && o !== v).map(o => o.id);
  }
  const ventById = new Map(vents.map(v => [v.id, v]));

  const cameras = def.cameras.map(([name, x, y], i) => ({ id: 'cam' + i, name, x, y, r: 420 }));

  const tasks = def.tasks.map(([type, room, x, y, customName], i) => ({
    id: `t${i}-${type}`,
    type, room, x, y,
    name: customName || (TASK_TYPES[type] ? TASK_TYPES[type].name : type),
    minMs: TASK_TYPES[type] ? TASK_TYPES[type].minMs : 3000,
  }));
  const taskById = new Map(tasks.map(t => [t.id, t]));

  const closableRooms = rooms.map(r => r.id).filter(id => id !== def.safeRoom);

  const map = {
    id: def.id,
    name: def.name,
    blurb: def.blurb || '',
    width: def.width, height: def.height,
    spawn: def.spawn,
    safeRoom: def.safeRoom,
    palette: def.palette,
    rooms, roomById, corridors, walkable,
    doors, vents, ventById, cameras, tasks, taskById,
    closableRooms,
    consoles: def.consoles,

    isWalkable(x, y, closedDoorIds = null) {
      let inside = false;
      for (const r of walkable) {
        if (pointInRect(x, y, r)) { inside = true; break; }
      }
      if (!inside) return false;
      if (closedDoorIds && closedDoorIds.size) {
        for (const id of closedDoorIds) {
          const d = doorById.get(id);
          if (d && pointInRect(x, y, d)) return false;
        }
      }
      return true;
    },

    roomAt(x, y) {
      for (const r of rooms) if (pointInRect(x, y, r)) return r.id;
      for (const c of corridors) if (pointInRect(x, y, c)) return 'hall';
      return null;
    },

    roomName(id) {
      const r = roomById.get(id);
      return r ? r.name : 'Hallway';
    },

    meetingPositions(count) {
      const { x, y } = def.consoles.emergency;
      const out = [];
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 - Math.PI / 2;
        out.push({ x: x + Math.cos(a) * 130, y: y + Math.sin(a) * 110 });
      }
      return out;
    },
  };
  return map;
}

export const MAPS = {};
for (const def of MAP_DEFS) MAPS[def.id] = buildMap(def);
export const MAP_IDS = MAP_DEFS.map(d => d.id);

export function getMap(id) {
  return MAPS[id] || MAPS[MAP_IDS[0]];
}
