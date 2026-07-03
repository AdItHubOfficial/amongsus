// =============================================================
// AMONGSUS client — central app state + tiny event bus.
// Modules import { App } to share state without circular imports.
// =============================================================

export const App = {
  settings: null,     // client settings (audio/video/controls)
  profile: null,      // progression profile
  conn: null,         // Connection instance
  game: null,         // active Game instance (null in menu/lobby)
  lobby: null,        // last lobby state payload
  youPid: null,
  screen: 'loading',
  ping: 0,
  isTouch: ('ontouchstart' in window) || navigator.maxTouchPoints > 0,

  _listeners: new Map(),
  on(ev, fn) {
    if (!this._listeners.has(ev)) this._listeners.set(ev, []);
    this._listeners.get(ev).push(fn);
  },
  emit(ev, data) {
    const fns = this._listeners.get(ev);
    if (fns) for (const fn of fns) fn(data);
  },
};
