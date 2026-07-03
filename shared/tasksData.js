// =============================================================
// AMONGSUS — task TYPE metadata. Each map places its own task
// instances (see mapdefs.js); the `type` selects the client
// mini-game and `minMs` is the server anti-cheat minimum time.
// =============================================================

export const TASK_TYPES = {
  wires:      { name: 'Repair Wiring',     minMs: 2500 },
  fuel:       { name: 'Refuel Engines',    minMs: 4000 },
  reactbal:   { name: 'Stabilize Core',    minMs: 5000 },
  powerroute: { name: 'Route Power',       minMs: 2500 },
  asteroids:  { name: 'Clear Debris',      minMs: 6000 },
  navalign:   { name: 'Align Heading',     minMs: 2000 },
  samples:    { name: 'Analyze Samples',   minMs: 5000 },
  chem:       { name: 'Mix Chemicals',     minMs: 3000 },
  satellite:  { name: 'Aim Dish',          minMs: 2500 },
  keycard:    { name: 'Scan Keycard',      minMs: 2000 },
  valves:     { name: 'Rotate Valves',     minMs: 3000 },
  pressure:   { name: 'Equalize Pressure', minMs: 3000 },
  batteries:  { name: 'Charge Batteries',  minMs: 3000 },
  trash:      { name: 'Eject Trash',       minMs: 2500 },
  filter:     { name: 'Clean Filter',      minMs: 3000 },
  water:      { name: 'Water Plants',      minMs: 3000 },
  prune:      { name: 'Prune Vines',       minMs: 2500 },
  dna:        { name: 'Sequence DNA',      minMs: 4000 },
  medscan:    { name: 'Submit Body Scan',  minMs: 8000 },
  blood:      { name: 'Draw Blood Sample', minMs: 2000 },
  courseplot: { name: 'Plot Course',       minMs: 3000 },
  decrypt:    { name: 'Decrypt Signal',    minMs: 4000 },
  antenna:    { name: 'Tune Antenna',      minMs: 2500 },
  coolant:    { name: 'Flush Coolant',     minMs: 3000 },
  dial:       { name: 'Adjust Mix',        minMs: 2000 },
  manifest:   { name: 'Audit Manifest',    minMs: 3000 },
  solar:      { name: 'Angle Solar Array', minMs: 2500 },
  upload:     { name: 'Upload Data',       minMs: 6000 },
  lightscal:  { name: 'Calibrate Lighting', minMs: 2500 },
  sweep:      { name: 'Magnet Sweep',      minMs: 3000 },
  lockers:    { name: 'Sort Lockers',      minMs: 3000 },
};

/** Random sample of n task ids from a map's task list. */
export function sampleTasks(map, n) {
  const pool = map.tasks.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(n, pool.length)).map(t => t.id);
}
