// =============================================================
// AMONGSUS server utilities — ids, sanitizing, rate limiting.
// =============================================================

import crypto from 'crypto';
import { MAX_NAME_LEN, MAX_CHAT_LEN } from '../../shared/constants.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O — avoids ambiguity
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001f\\u007f]', 'g');

export function makeLobbyCode() {
  let s = '';
  for (let i = 0; i < 5; i++) s += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
  return s;
}

export function makeToken() {
  return crypto.randomBytes(12).toString('hex');
}

/** Strip control characters and clamp length. Rendering always uses textContent. */
export function sanitizeText(str, maxLen) {
  if (typeof str !== 'string') return '';
  return str.replace(CONTROL_CHARS, '').trim().slice(0, maxLen);
}

export function sanitizeName(str) {
  const s = sanitizeText(str, MAX_NAME_LEN);
  return s.length ? s : 'Crewmate';
}

export function sanitizeChat(str) {
  return sanitizeText(str, MAX_CHAT_LEN);
}

/** Sliding-window rate limiter: allow `count` events per `perMs`. */
export class Limiter {
  constructor(count, perMs) {
    this.count = count;
    this.perMs = perMs;
    this.stamps = [];
  }
  allow() {
    const now = Date.now();
    while (this.stamps.length && this.stamps[0] < now - this.perMs) this.stamps.shift();
    if (this.stamps.length >= this.count) return false;
    this.stamps.push(now);
    return true;
  }
}
