// =============================================================
// AMONGSUS server — grid A* pathfinding, built per map and cached
// by map id. Used by AI players.
// =============================================================

const CELL = 40;
const cache = new Map(); // map.id -> pathfinder

export function getPathfinder(map) {
  if (!cache.has(map.id)) cache.set(map.id, build(map));
  return cache.get(map.id);
}

// Minimal binary heap keyed on f-score.
class Heap {
  constructor() { this.a = []; }
  push(node) {
    const a = this.a;
    a.push(node);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
  get size() { return this.a.length; }
}

function build(map) {
  const COLS = Math.ceil(map.width / CELL);
  const ROWS = Math.ceil(map.height / CELL);
  const walk = new Uint8Array(COLS * ROWS);
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      walk[cy * COLS + cx] = map.isWalkable(cx * CELL + CELL / 2, cy * CELL + CELL / 2) ? 1 : 0;
    }
  }

  const idx = (x, y) => y * COLS + x;
  const isOpen = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && walk[idx(x, y)] === 1;

  const cellOf = (x, y) => [
    Math.min(COLS - 1, Math.max(0, Math.floor(x / CELL))),
    Math.min(ROWS - 1, Math.max(0, Math.floor(y / CELL))),
  ];

  function nearestWalkable(cx, cy) {
    if (isOpen(cx, cy)) return [cx, cy];
    for (let r = 1; r <= 8; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (isOpen(cx + dx, cy + dy)) return [cx + dx, cy + dy];
        }
      }
    }
    return null;
  }

  function lineOfSight(x1, y1, x2, y2) {
    const d = Math.hypot(x2 - x1, y2 - y1);
    if (d < 1) return true;
    // require ~12px clearance so smoothed paths don't hug wall edges
    const ox = -(y2 - y1) / d * 12, oy = (x2 - x1) / d * 12;
    const steps = Math.max(1, Math.ceil(d / 24));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t;
      if (!map.isWalkable(px, py) || !map.isWalkable(px + ox, py + oy) || !map.isWalkable(px - ox, py - oy)) {
        return false;
      }
    }
    return true;
  }

  function findPath(x1, y1, x2, y2) {
    const s = nearestWalkable(...cellOf(x1, y1));
    const t = nearestWalkable(...cellOf(x2, y2));
    if (!s || !t) return null;
    const [sx, sy] = s, [tx, ty] = t;
    if (sx === tx && sy === ty) return [{ x: x2, y: y2 }];

    const g = new Float64Array(COLS * ROWS).fill(Infinity);
    const came = new Int32Array(COLS * ROWS).fill(-1);
    const closed = new Uint8Array(COLS * ROWS);
    const h = (x, y) => Math.hypot(x - tx, y - ty);

    const heap = new Heap();
    g[idx(sx, sy)] = 0;
    heap.push([h(sx, sy), sx, sy]);
    let iterations = 0;

    while (heap.size) {
      if (++iterations > 30000) return null;
      const [, cx, cy] = heap.pop();
      const ci = idx(cx, cy);
      if (closed[ci]) continue;
      closed[ci] = 1;
      if (cx === tx && cy === ty) break;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx, ny = cy + dy;
          if (!isOpen(nx, ny)) continue;
          if (dx && dy && (!isOpen(cx + dx, cy) || !isOpen(cx, cy + dy))) continue;
          const ni = idx(nx, ny);
          if (closed[ni]) continue;
          const cost = g[ci] + (dx && dy ? 1.4142 : 1);
          if (cost < g[ni]) {
            g[ni] = cost;
            came[ni] = ci;
            heap.push([cost + h(nx, ny), nx, ny]);
          }
        }
      }
    }

    if (came[idx(tx, ty)] === -1) return null;

    const cells = [];
    let cur = idx(tx, ty);
    while (cur !== -1 && cur !== idx(sx, sy)) {
      cells.push({ x: (cur % COLS) * CELL + CELL / 2, y: Math.floor(cur / COLS) * CELL + CELL / 2 });
      cur = came[cur];
    }
    cells.push({ x: x1, y: y1 });
    cells.reverse();

    // string-pulling smoothing
    const out = [];
    let i = 0;
    while (i < cells.length - 1) {
      let j = cells.length - 1;
      while (j > i + 1 && !lineOfSight(cells[i].x, cells[i].y, cells[j].x, cells[j].y)) j--;
      out.push(cells[j]);
      i = j;
    }
    const last = out[out.length - 1] || { x: x1, y: y1 };
    if (map.isWalkable(x2, y2) && lineOfSight(last.x, last.y, x2, y2)) out.push({ x: x2, y: y2 });
    return out.length ? out : [{ x: x2, y: y2 }];
  }

  function nearestCellCenter(x, y) {
    const c = nearestWalkable(...cellOf(x, y));
    if (!c) return null;
    return { x: c[0] * CELL + CELL / 2, y: c[1] * CELL + CELL / 2 };
  }

  return { findPath, nearestCellCenter };
}
