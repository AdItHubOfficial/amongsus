// =============================================================
// AMONGSUS — deterministic movement step, shared by the server
// (authoritative simulation) and the client (prediction).
// =============================================================

const SUBSTEP = 8; // max units moved per collision substep

/**
 * Advance a position by one input. Axis-separated collision gives wall sliding.
 * @param {object} map  compiled map (from shared/map.js)
 * @param {{x:number,y:number}} pos  mutated in place
 * @param {number} dx normalized direction x (-1..1)
 * @param {number} dy normalized direction y (-1..1)
 * @param {number} dt seconds
 * @param {number} speed units/second
 * @param {Set<string>|null} closedDoors closed door ids
 * @param {boolean} noclip ghosts pass through walls
 * @returns {boolean} whether the position changed
 */
export function stepMovement(map, pos, dx, dy, dt, speed, closedDoors = null, noclip = false) {
  const mag = Math.hypot(dx, dy);
  if (mag < 0.001 || dt <= 0) return false;
  if (mag > 1) { dx /= mag; dy /= mag; }

  const moveX = dx * speed * dt;
  const moveY = dy * speed * dt;

  if (noclip) {
    pos.x = Math.min(map.width + 200, Math.max(-200, pos.x + moveX));
    pos.y = Math.min(map.height + 200, Math.max(-200, pos.y + moveY));
    return true;
  }

  const startX = pos.x, startY = pos.y;
  const total = Math.hypot(moveX, moveY);
  const steps = Math.max(1, Math.ceil(total / SUBSTEP));
  const sx = moveX / steps, sy = moveY / steps;

  for (let i = 0; i < steps; i++) {
    if (sx !== 0) {
      const nx = pos.x + sx;
      if (map.isWalkable(nx, pos.y, closedDoors)) pos.x = nx;
    }
    if (sy !== 0) {
      const ny = pos.y + sy;
      if (map.isWalkable(pos.x, ny, closedDoors)) pos.y = ny;
    }
  }
  return Math.abs(pos.x - startX) > 0.01 || Math.abs(pos.y - startY) > 0.01;
}
