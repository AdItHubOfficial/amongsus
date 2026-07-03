// =============================================================
// AMONGSUS client — procedural astronaut art: bean-shaped crew,
// hats, skins, pets, ghosts, and bodies. No sprite files.
// =============================================================

import { COLORS } from '/shared/constants.js';

const COLOR_HEX = new Map(COLORS.map(c => [c.id, c.hex]));
const COLOR_LETTER = new Map(COLORS.map(c => [c.id, c.name[0]]));

export function colorHex(id) { return COLOR_HEX.get(id) || '#e0455a'; }
export function colorLetter(id) { return COLOR_LETTER.get(id) || '?'; }

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) * f)) | 0;
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) * f)) | 0;
  const b = Math.min(255, Math.max(0, (n & 255) * f)) | 0;
  return `rgb(${r},${g},${b})`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * Draw an astronaut. (x, y) is the feet center; body is ~44w × 54h at scale 1.
 * opts: { colorId, skin, hat, facing(1|-1), walkPhase, moving, ghost, alpha,
 *         cbLetter(bool), shielded, t (ms clock for idle anims) }
 */
export function drawCrewmate(ctx, x, y, o = {}) {
  const s = o.scale || 1;
  const f = o.facing === -1 ? -1 : 1;
  const hex = colorHex(o.colorId);
  const t = o.t || 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.globalAlpha = (o.alpha !== undefined ? o.alpha : 1) * (o.ghost ? 0.55 : 1);

  const bob = o.moving ? Math.abs(Math.sin(o.walkPhase || 0)) * 3 : Math.sin(t / 700) * 1.2;
  const top = -54 - bob + (o.ghost ? -8 + Math.sin(t / 400) * 3 : 0);

  // shadow
  if (!o.ghost) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // legs
  if (!o.ghost) {
    const lift = o.moving ? Math.sin(o.walkPhase || 0) * 5 : 0;
    ctx.fillStyle = shade(hex, 0.75);
    roundRect(ctx, -16, -14 - bob - Math.max(0, lift), 13, 14 + Math.max(0, lift), 5); ctx.fill();
    roundRect(ctx, 3, -14 - bob - Math.max(0, -lift), 13, 14 + Math.max(0, -lift), 5); ctx.fill();
  }

  // backpack (behind the body, opposite the visor)
  ctx.fillStyle = shade(hex, 0.8);
  roundRect(ctx, f === 1 ? -28 : 12, top + 14, 16, 26, 6);
  ctx.fill();

  // body
  ctx.fillStyle = hex;
  roundRect(ctx, -22, top, 44, 48, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // body highlight
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, -16, top + 4, 12, 30, 8);
  ctx.fill();

  // ghost tail instead of legs
  if (o.ghost) {
    ctx.fillStyle = hex;
    ctx.beginPath();
    ctx.moveTo(-22, top + 40);
    for (let i = 0; i <= 4; i++) {
      const wx = -22 + (i * 11);
      ctx.quadraticCurveTo(wx + 5.5, top + 52 + Math.sin(t / 200 + i) * 4, wx + 11, top + 44);
    }
    ctx.lineTo(22, top + 20);
    ctx.lineTo(-22, top + 20);
    ctx.fill();
  }

  // skin details
  drawSkin(ctx, o.skin, hex, top);

  // visor
  ctx.fillStyle = '#b8e6f5';
  ctx.beginPath();
  ctx.ellipse(f * 9, top + 15, 13, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(f * 13, top + 12, 4.5, 2.6, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // hat
  drawHat(ctx, o.hat, hex, f, top, t);

  // shield bubble
  if (o.shielded) {
    ctx.strokeStyle = 'rgba(105,255,200,0.8)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(0, top + 24, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // colorblind badge
  if (o.cbLetter) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    ctx.arc(-f * 13, top + 8, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(colorLetter(o.colorId), -f * 13, top + 9);
  }

  ctx.restore();
}

function drawSkin(ctx, skin, hex, top) {
  if (!skin || skin === 'none') return;
  ctx.save();
  if (skin === 'engineer') {
    ctx.fillStyle = '#ef8633';
    roundRect(ctx, -22, top + 32, 44, 10, 4); ctx.fill();
    ctx.fillStyle = '#c96a1e';
    roundRect(ctx, -14, top + 8, 6, 26, 3); ctx.fill();
    roundRect(ctx, 8, top + 8, 6, 26, 3); ctx.fill();
  } else if (skin === 'scientist') {
    ctx.fillStyle = '#eef3f8';
    roundRect(ctx, -22, top + 28, 44, 16, 6); ctx.fill();
  } else if (skin === 'security') {
    ctx.fillStyle = '#2c3442';
    roundRect(ctx, -22, top + 24, 44, 18, 6); ctx.fill();
    ctx.fillStyle = '#f5c744';
    ctx.beginPath(); ctx.arc(-10, top + 32, 3.5, 0, Math.PI * 2); ctx.fill();
  } else if (skin === 'mechanic') {
    ctx.fillStyle = '#6b4a2f';
    roundRect(ctx, -22, top + 34, 44, 8, 3); ctx.fill();
    ctx.fillStyle = '#c9c9c9';
    for (const dx of [-12, -2, 8]) { roundRect(ctx, dx, top + 34, 5, 8, 2); ctx.fill(); }
  } else if (skin === 'captain') {
    ctx.fillStyle = '#20315e';
    roundRect(ctx, -22, top + 26, 44, 16, 6); ctx.fill();
    ctx.fillStyle = '#f5c744';
    for (const dy of [30, 37]) { ctx.beginPath(); ctx.arc(0, top + dy, 2.2, 0, Math.PI * 2); ctx.fill(); }
  } else if (skin === 'medic') {
    ctx.fillStyle = '#eef3f8';
    roundRect(ctx, -22, top + 26, 44, 16, 6); ctx.fill();
    ctx.fillStyle = '#d43a3a';
    ctx.fillRect(-2, top + 28, 4, 12);
    ctx.fillRect(-6, top + 32, 12, 4);
  } else if (skin === 'chef') {
    ctx.fillStyle = '#f5f7fa';
    roundRect(ctx, -14, top + 22, 28, 22, 5); ctx.fill();
    ctx.strokeStyle = '#d9dee6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-11, top + 22); ctx.lineTo(-7, top + 14); ctx.moveTo(11, top + 22); ctx.lineTo(7, top + 14); ctx.stroke();
  } else if (skin === 'prisoner') {
    ctx.fillStyle = '#e8ecf2';
    roundRect(ctx, -22, top + 24, 44, 18, 6); ctx.fill();
    ctx.fillStyle = '#3a3f4a';
    for (let i = 0; i < 3; i++) ctx.fillRect(-22, top + 27 + i * 6, 44, 3);
  } else if (skin === 'tuxedo') {
    ctx.fillStyle = '#23232e';
    roundRect(ctx, -22, top + 24, 44, 20, 6); ctx.fill();
    ctx.fillStyle = '#f5f7fa';
    ctx.beginPath();
    ctx.moveTo(-5, top + 24); ctx.lineTo(5, top + 24); ctx.lineTo(0, top + 36);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d43a3a';
    ctx.beginPath();
    ctx.moveTo(0, top + 26); ctx.lineTo(-4, top + 23.5); ctx.lineTo(-4, top + 28.5);
    ctx.moveTo(0, top + 26); ctx.lineTo(4, top + 23.5); ctx.lineTo(4, top + 28.5);
    ctx.fill();
  } else if (skin === 'winter') {
    ctx.fillStyle = '#d43a3a';
    roundRect(ctx, -16, top + 22, 32, 7, 3); ctx.fill();
    roundRect(ctx, 4, top + 26, 7, 13, 3); ctx.fill();
    ctx.fillStyle = '#eef3f8';
    roundRect(ctx, -22, top + 40, 44, 5, 2); ctx.fill();
  } else if (skin === 'banana') {
    ctx.fillStyle = '#f5c744';
    roundRect(ctx, -22, top + 26, 44, 16, 6); ctx.fill();
    ctx.fillStyle = '#8a5a3b';
    ctx.beginPath(); ctx.ellipse(-18, top + 40, 3.5, 2, 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(18, top + 40, 3.5, 2, -0.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawHat(ctx, hat, hex, f, top, t) {
  if (!hat || hat === 'none') return;
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  if (hat === 'antenna') {
    ctx.beginPath(); ctx.moveTo(0, top + 2); ctx.lineTo(0, top - 12); ctx.stroke();
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath(); ctx.arc(0, top - 15, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (hat === 'cap') {
    ctx.fillStyle = shade(hex, 1.25);
    ctx.beginPath(); ctx.arc(0, top + 4, 16, Math.PI, 0); ctx.fill(); ctx.stroke();
    roundRect(ctx, f === 1 ? 8 : -24, top, 16, 5, 2); ctx.fill();
  } else if (hat === 'beanie') {
    ctx.fillStyle = '#d94fd0';
    ctx.beginPath(); ctx.arc(0, top + 4, 17, Math.PI, 0); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b13aaa';
    roundRect(ctx, -17, top, 34, 6, 3); ctx.fill();
  } else if (hat === 'headset') {
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(0, top + 8, 17, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.fillStyle = '#444';
    ctx.beginPath(); ctx.arc(-16, top + 10, 6, 0, Math.PI * 2); ctx.fill();
  } else if (hat === 'sprout') {
    ctx.strokeStyle = '#3ea23e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, top + 2); ctx.quadraticCurveTo(2, top - 10, 0, top - 14); ctx.stroke();
    ctx.fillStyle = '#4ecb4e';
    ctx.beginPath(); ctx.ellipse(-6, top - 14, 7, 4, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, top - 16, 7, 4, 0.5, 0, Math.PI * 2); ctx.fill();
  } else if (hat === 'tophat') {
    ctx.fillStyle = '#23232e';
    roundRect(ctx, -18, top + 1, 36, 5, 2); ctx.fill();
    roundRect(ctx, -11, top - 20, 22, 22, 3); ctx.fill();
    ctx.fillStyle = '#8f5fe8';
    roundRect(ctx, -11, top - 4, 22, 5, 1); ctx.fill();
  } else if (hat === 'chef') {
    ctx.fillStyle = '#f5f7fa';
    roundRect(ctx, -13, top - 14, 26, 18, 4); ctx.fill(); ctx.stroke();
    for (const dx of [-9, 0, 9]) {
      ctx.beginPath(); ctx.arc(dx, top - 15, 7, 0, Math.PI * 2); ctx.fill();
    }
  } else if (hat === 'party') {
    ctx.fillStyle = '#ff6f61';
    ctx.beginPath(); ctx.moveTo(-11, top + 4); ctx.lineTo(11, top + 4); ctx.lineTo(0, top - 20); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath(); ctx.arc(0, top - 21, 4, 0, Math.PI * 2); ctx.fill();
  } else if (hat === 'cowboy') {
    ctx.fillStyle = '#8a5a3b';
    ctx.beginPath(); ctx.ellipse(0, top + 3, 22, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    roundRect(ctx, -11, top - 12, 22, 15, 5); ctx.fill();
  } else if (hat === 'halo') {
    ctx.strokeStyle = '#ffe36e'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, top - 12 + Math.sin(t / 500) * 2, 15, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (hat === 'viking') {
    ctx.fillStyle = '#9aa5b5';
    ctx.beginPath(); ctx.arc(0, top + 5, 17, Math.PI, 0); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8ecf2';
    ctx.beginPath(); ctx.moveTo(-16, top); ctx.quadraticCurveTo(-27, top - 12, -20, top - 18);
    ctx.quadraticCurveTo(-18, top - 6, -12, top - 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(16, top); ctx.quadraticCurveTo(27, top - 12, 20, top - 18);
    ctx.quadraticCurveTo(18, top - 6, 12, top - 2); ctx.fill();
  } else if (hat === 'crown') {
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.moveTo(-14, top + 4); ctx.lineTo(-14, top - 10); ctx.lineTo(-7, top - 2);
    ctx.lineTo(0, top - 12); ctx.lineTo(7, top - 2); ctx.lineTo(14, top - 10); ctx.lineTo(14, top + 4);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e0455a';
    ctx.beginPath(); ctx.arc(0, top + 0, 2.5, 0, Math.PI * 2); ctx.fill();
  } else if (hat === 'flower') {
    ctx.strokeStyle = '#3ea23e'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, top + 2); ctx.lineTo(0, top - 6); ctx.stroke();
    ctx.fillStyle = '#f5f7fa';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * 6, top - 10 + Math.sin(a) * 6, 4.5, 3, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath(); ctx.arc(0, top - 10, 3.5, 0, Math.PI * 2); ctx.fill();
  } else if (hat === 'catears') {
    ctx.fillStyle = shade(hex, 0.85);
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 16, top + 3); ctx.lineTo(sx * 10, top - 13); ctx.lineTo(sx * 3, top + 1);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f2a2c0';
      ctx.beginPath();
      ctx.moveTo(sx * 13, top + 1); ctx.lineTo(sx * 10, top - 8); ctx.lineTo(sx * 6, top + 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(hex, 0.85);
    }
  } else if (hat === 'bandana') {
    ctx.fillStyle = '#e0455a';
    roundRect(ctx, -16, top + 1, 32, 8, 3); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-f * 14, top + 4); ctx.lineTo(-f * 24, top + 10); ctx.lineTo(-f * 18, top + 12);
    ctx.closePath(); ctx.fill();
  } else if (hat === 'goggles') {
    ctx.fillStyle = '#333';
    roundRect(ctx, -17, top + 3, 34, 5, 2); ctx.fill();
    for (const dx of [-8, 8]) {
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(dx, top + 5, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#55d7f2';
      ctx.beginPath(); ctx.arc(dx, top + 5, 4.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (hat === 'mushroom') {
    ctx.fillStyle = '#d43a3a';
    ctx.beginPath(); ctx.arc(0, top + 3, 17, Math.PI, 0); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f5f7fa';
    for (const [dx, dy, r] of [[-8, -4, 3], [5, -8, 2.5], [10, -2, 2]]) {
      ctx.beginPath(); ctx.arc(dx, top + 3 + dy, r, 0, Math.PI * 2); ctx.fill();
    }
  } else if (hat === 'fedora') {
    ctx.fillStyle = '#4a3b52';
    ctx.beginPath(); ctx.ellipse(0, top + 3, 21, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    roundRect(ctx, -12, top - 12, 24, 15, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8f5fe8';
    roundRect(ctx, -12, top - 3, 24, 5, 2); ctx.fill();
  } else if (hat === 'mohawk') {
    ctx.fillStyle = '#3ec96f';
    ctx.beginPath();
    ctx.moveTo(-14, top + 3);
    for (let i = 0; i < 4; i++) {
      ctx.lineTo(-10 + i * 7, top - 14);
      ctx.lineTo(-7 + i * 7, top + 1);
    }
    ctx.lineTo(14, top + 3);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (hat === 'cone') {
    ctx.fillStyle = '#ef8633';
    ctx.beginPath();
    ctx.moveTo(-11, top + 3); ctx.lineTo(11, top + 3); ctx.lineTo(0, top - 19);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f5f7fa';
    ctx.beginPath();
    ctx.moveTo(-6, top - 6); ctx.lineTo(6, top - 6); ctx.lineTo(4, top - 11); ctx.lineTo(-4, top - 11);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ef8633';
    ctx.beginPath(); ctx.ellipse(0, top + 3, 14, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  } else if (hat === 'santa') {
    ctx.fillStyle = '#d43a3a';
    ctx.beginPath();
    ctx.moveTo(-15, top + 3);
    ctx.quadraticCurveTo(-6, top - 16, 8, top - 14);
    ctx.quadraticCurveTo(16, top - 13, 17, top - 6);
    ctx.lineTo(15, top + 3);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f5f7fa';
    roundRect(ctx, -17, top + 1, 34, 6, 3); ctx.fill();
    ctx.beginPath(); ctx.arc(18, top - 8, 4.5, 0, Math.PI * 2); ctx.fill();
  } else if (hat === 'grad') {
    ctx.fillStyle = '#2c2c38';
    ctx.beginPath(); ctx.arc(0, top + 4, 13, Math.PI, 0); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, top - 14); ctx.lineTo(21, top - 5); ctx.lineTo(0, top + 3); ctx.lineTo(-21, top - 5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, top - 5); ctx.lineTo(14, top + 2); ctx.stroke();
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath(); ctx.arc(14, top + 4, 2.8, 0, Math.PI * 2); ctx.fill();
  } else if (hat === 'pirate') {
    ctx.fillStyle = '#23232e';
    ctx.beginPath();
    ctx.moveTo(-21, top + 3);
    ctx.quadraticCurveTo(0, top - 18, 21, top + 3);
    ctx.quadraticCurveTo(0, top - 4, -21, top + 3);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f5f7fa';
    ctx.beginPath(); ctx.arc(0, top - 5, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-4, top - 1, 8, 2);
  } else if (hat === 'wizard') {
    ctx.fillStyle = '#5b3fa8';
    ctx.beginPath(); ctx.ellipse(0, top + 3, 19, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12, top + 2);
    ctx.quadraticCurveTo(0, top - 8, 5, top - 26);
    ctx.quadraticCurveTo(3, top - 9, 12, top + 2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath(); ctx.arc(-2, top - 8, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, top - 16, 1.5, 0, Math.PI * 2); ctx.fill();
  } else if (hat === 'horns') {
    ctx.fillStyle = '#d43a3a';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 6, top + 2);
      ctx.quadraticCurveTo(sx * 16, top - 4, sx * 13, top - 16);
      ctx.quadraticCurveTo(sx * 10, top - 6, sx * 2, top + 1);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();
}

/** Small companion drawn near the owner's feet. */
export function drawPet(ctx, x, y, type, ownerColorId, t) {
  if (!type || type === 'none') return;
  const hex = colorHex(ownerColorId);
  ctx.save();
  ctx.translate(x, y);
  const bob = Math.sin(t / 300) * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 2, 10, 3, 0, 0, Math.PI * 2); ctx.fill();

  if (type === 'blob') {
    ctx.fillStyle = hex;
    ctx.beginPath();
    ctx.ellipse(0, -7 + bob * 0.5, 10, 8 + Math.sin(t / 250) * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-3, -9, 2, 0, Math.PI * 2); ctx.arc(3, -9, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-3, -9, 1, 0, Math.PI * 2); ctx.arc(3, -9, 1, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'robopup') {
    ctx.fillStyle = '#9aa5b5';
    ctx.fillRect(-8, -10, 16, 8);
    ctx.fillRect(4, -16, 8, 7);
    ctx.fillStyle = hex;
    ctx.fillRect(-8, -12, 16, 3);
    ctx.strokeStyle = '#666'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-13, -12 + Math.sin(t / 150) * 3); ctx.stroke();
    ctx.fillStyle = '#55d7f2';
    ctx.fillRect(9, -14, 2.5, 2.5);
  } else if (type === 'ufo') {
    const fy = -14 + bob;
    ctx.fillStyle = '#b9c6da';
    ctx.beginPath(); ctx.ellipse(0, fy, 12, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(140,220,255,0.8)';
    ctx.beginPath(); ctx.arc(0, fy - 4, 6, Math.PI, 0); ctx.fill();
    ctx.fillStyle = hex;
    for (const dx of [-7, 0, 7]) { ctx.beginPath(); ctx.arc(dx, fy + 2, 1.6, 0, Math.PI * 2); ctx.fill(); }
  } else if (type === 'star') {
    const fy = -12 + bob;
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 10 : 4.5;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2 + t / 2000;
      ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, fy + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  } else if (type === 'boxbot') {
    ctx.fillStyle = shade(hex, 0.9);
    ctx.fillRect(-8, -14, 16, 13);
    ctx.fillStyle = '#0a1120';
    ctx.fillRect(-5, -11, 10, 5);
    ctx.fillStyle = '#55d7f2';
    ctx.fillRect(-3, -10, 2, 2); ctx.fillRect(2, -10, 2, 2);
    ctx.fillStyle = '#444';
    ctx.beginPath(); ctx.arc(-5, 0, 2.5, 0, Math.PI * 2); ctx.arc(5, 0, 2.5, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'ducky') {
    ctx.fillStyle = '#f5c744';
    ctx.beginPath(); ctx.ellipse(0, -7 + bob * 0.4, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -15 + bob * 0.4, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ef8633';
    ctx.beginPath();
    ctx.moveTo(10, -15 + bob * 0.4); ctx.lineTo(15, -14 + bob * 0.4); ctx.lineTo(10, -12 + bob * 0.4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(7, -16 + bob * 0.4, 1.1, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'snail') {
    ctx.fillStyle = '#c9a26b';
    ctx.beginPath(); ctx.ellipse(0, -4, 11, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c9a26b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(8, -7); ctx.lineTo(11, -14); ctx.moveTo(10, -7); ctx.lineTo(14, -12); ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(11, -15, 1.2, 0, Math.PI * 2); ctx.arc(14, -13, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a5a3b';
    ctx.beginPath(); ctx.arc(-3, -10, 7.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5f3d27'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-3, -10, 4, 0.5, Math.PI * 1.8); ctx.stroke();
  } else if (type === 'frog') {
    const hop = Math.abs(Math.sin(t / 400)) * 4;
    ctx.fillStyle = '#4ecb4e';
    ctx.beginPath(); ctx.ellipse(0, -6 - hop, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    for (const dx of [-4, 4]) {
      ctx.beginPath(); ctx.arc(dx, -13 - hop, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(dx, -13.5 - hop, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(dx, -13.5 - hop, 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4ecb4e';
    }
  } else if (type === 'crab') {
    const scuttle = Math.sin(t / 150) * 2;
    ctx.save();
    ctx.translate(scuttle, 0);
    ctx.fillStyle = '#e0455a';
    ctx.beginPath(); ctx.ellipse(0, -7, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    for (const sx of [-1, 1]) {
      ctx.beginPath(); ctx.arc(sx * 11, -11, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e0455a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx * 5, -3); ctx.lineTo(sx * 9, 0); ctx.stroke();
    }
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-3, -9, 1.1, 0, Math.PI * 2); ctx.arc(3, -9, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (type === 'minicrew') {
    ctx.fillStyle = hex;
    ctx.beginPath(); ctx.roundRect(-7, -21 + bob * 0.4, 14, 16, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = shade(hex, 0.75);
    ctx.fillRect(-6, -6 + bob * 0.4, 4.5, 5); ctx.fillRect(1.5, -6 + bob * 0.4, 4.5, 5);
    ctx.fillStyle = '#b8e6f5';
    ctx.beginPath(); ctx.ellipse(3, -16 + bob * 0.4, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'ghostie') {
    const fy = -10 + bob;
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#cfe6ff';
    ctx.beginPath();
    ctx.arc(0, fy - 4, 8, Math.PI, 0);
    ctx.lineTo(8, fy + 4);
    for (let i = 0; i < 4; i++) {
      ctx.quadraticCurveTo(6 - i * 4, fy + 7 + Math.sin(t / 200 + i) * 1.5, 4 - i * 4, fy + 4);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2c3442';
    ctx.beginPath(); ctx.arc(-3, fy - 4, 1.3, 0, Math.PI * 2); ctx.arc(3, fy - 4, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** A fallen crewmate on the floor. */
export function drawDeadBody(ctx, x, y, colorId, t) {
  const hex = colorHex(colorId);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 4, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(-0.12);
  // lying body
  ctx.fillStyle = shade(hex, 0.85);
  roundRect(ctx, -26, -20, 50, 26, 13);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2.5; ctx.stroke();
  // cracked visor
  ctx.fillStyle = '#7ea6b5';
  ctx.beginPath(); ctx.ellipse(12, -12, 9, 6, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(20,40,50,0.8)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(8, -16); ctx.lineTo(14, -10); ctx.moveTo(12, -15); ctx.lineTo(10, -9);
  ctx.stroke();
  // little ghost wisp
  const a = 0.25 + Math.sin(t / 400) * 0.1;
  ctx.globalAlpha = a;
  ctx.fillStyle = '#cfe6ff';
  ctx.beginPath(); ctx.arc(-14, -30 - Math.sin(t / 500) * 3, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---- portrait cache (meeting cards, results) --------------------------------

const portraitCache = new Map();

export function makePortrait(cosmetics, w = 60, h = 74) {
  const key = `${cosmetics.color}|${cosmetics.hat}|${cosmetics.skin}|${w}x${h}`;
  if (portraitCache.has(key)) return portraitCache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  drawCrewmate(ctx, w / 2, h - 6, {
    colorId: cosmetics.color, hat: cosmetics.hat, skin: cosmetics.skin,
    facing: 1, scale: w / 62, t: 0,
  });
  portraitCache.set(key, c);
  return c;
}
