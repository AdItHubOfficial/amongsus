// =============================================================
// AMONGSUS client — the mini-game library. Every task type gets a
// hand-built interactive game; sabotage repairs live here too.
// Each entry: { instr, create(root, api) } where api provides
// helpers and api.done() reports completion.
// =============================================================

const WIRE_COLORS = ['#e0455a', '#f5c744', '#2f7de1', '#45e08a'];

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const MINIGAMES = {

  // ---- wiring -----------------------------------------------------------
  wires: {
    instr: 'Drag each wire to its matching color.',
    create(root, api) {
      const { cv, g } = api.canvas(480, 300);
      const left = shuffle([0, 1, 2, 3].slice());
      const right = shuffle([0, 1, 2, 3].slice());
      const done = new Set();
      let drag = null; // {li, x, y}
      const LY = i => 55 + i * 65, LX = 60, RX = 420;

      const draw = () => {
        g.clearRect(0, 0, 480, 300);
        g.fillStyle = '#131b2c'; g.fillRect(0, 0, 40, 300); g.fillRect(440, 0, 40, 300);
        for (let i = 0; i < 4; i++) {
          // connected wires
          if (done.has(i)) {
            const ri = right.indexOf(left[i]);
            g.strokeStyle = WIRE_COLORS[left[i]]; g.lineWidth = 8;
            g.beginPath(); g.moveTo(LX, LY(i)); g.lineTo(RX, LY(ri)); g.stroke();
          }
          g.fillStyle = WIRE_COLORS[left[i]];
          g.fillRect(40, LY(i) - 12, 30, 24);
          g.fillStyle = WIRE_COLORS[right[i]];
          g.fillRect(410, LY(i) - 12, 30, 24);
        }
        if (drag) {
          g.strokeStyle = WIRE_COLORS[left[drag.li]]; g.lineWidth = 8;
          g.beginPath(); g.moveTo(LX, LY(drag.li)); g.lineTo(drag.x, drag.y); g.stroke();
        }
      };
      draw();

      api.pointer(cv, {
        down(x, y) {
          for (let i = 0; i < 4; i++) {
            if (!done.has(i) && Math.abs(y - LY(i)) < 26 && x < 110) { drag = { li: i, x, y }; break; }
          }
        },
        move(x, y) { if (drag) { drag.x = x; drag.y = y; draw(); } },
        up(x, y) {
          if (!drag) return;
          for (let i = 0; i < 4; i++) {
            if (Math.abs(y - LY(i)) < 26 && x > 370 && right[i] === left[drag.li]) {
              done.add(drag.li);
              api.sfx('task');
            }
          }
          drag = null; draw();
          if (done.size === 4) api.done();
        },
      });
    },
  },

  // ---- fuel -------------------------------------------------------------
  fuel: {
    instr: 'Hold the pump to fill the tank to 100%.',
    create(root, api) {
      let fill = 0, holding = false;
      const bar = api.gauge();
      const btn = api.el('button', 'btn btn-primary big', '⛽ HOLD TO PUMP');
      btn.addEventListener('pointerdown', () => { holding = true; });
      const stop = () => { holding = false; };
      btn.addEventListener('pointerup', stop);
      btn.addEventListener('pointerleave', stop);
      api.onFrame((dt) => {
        if (holding && fill < 100) {
          fill = Math.min(100, fill + dt * 28);
          bar.set(fill / 100, Math.round(fill) + '%');
          if (Math.random() < dt * 8) api.sfx('task');
          if (fill >= 100) api.done();
        }
      });
    },
  },

  // ---- reactor balance ----------------------------------------------------
  reactbal: {
    instr: 'Keep the needle in the green zone. Tap/press to push it left.',
    create(root, api) {
      const { cv, g } = api.canvas(460, 220);
      let pos = 0.3, vel = 0.15, stable = 0;
      let push = false;
      api.pointer(cv, { down() { push = true; }, up() { push = false; } });
      api.onFrame((dt, t) => {
        vel += (Math.sin(t / 700) * 0.35 + 0.25) * dt;
        if (push) vel -= 1.1 * dt;
        vel = Math.max(-0.6, Math.min(0.6, vel));
        pos = Math.max(0, Math.min(1, pos + vel * dt));
        const inZone = pos > 0.4 && pos < 0.6;
        stable = inZone ? stable + dt : Math.max(0, stable - dt * 0.6);
        g.clearRect(0, 0, 460, 220);
        g.fillStyle = '#131b2c'; g.fillRect(20, 60, 420, 40);
        g.fillStyle = 'rgba(69,224,138,0.4)'; g.fillRect(20 + 420 * 0.4, 60, 420 * 0.2, 40);
        g.fillStyle = inZone ? '#45e08a' : '#ff5470';
        g.fillRect(16 + pos * 420, 46, 8, 68);
        g.fillStyle = '#233150'; g.fillRect(80, 150, 300, 16);
        g.fillStyle = '#45e08a'; g.fillRect(80, 150, 300 * Math.min(1, stable / 3), 16);
        g.fillStyle = '#8b98b0'; g.font = '13px sans-serif'; g.textAlign = 'center';
        g.fillText('STABILITY', 230, 195);
        if (stable >= 3) api.done();
      });
    },
  },

  // ---- power routing ------------------------------------------------------
  powerroute: {
    instr: 'Flip the breakers to match the target pattern.',
    create(root, api) {
      const target = Array.from({ length: 6 }, () => Math.random() < 0.5);
      const state = Array.from({ length: 6 }, () => Math.random() < 0.5);
      if (target.every((v, i) => v === state[i])) state[0] = !state[0];
      const tRow = api.row();
      target.forEach(v => {
        const d = api.el('div', '', v ? 'ON' : 'OFF', tRow);
        d.style.cssText = `width:52px;text-align:center;font-weight:800;color:${v ? '#45e08a' : '#8b98b0'}`;
      });
      const row = api.row();
      const btns = state.map((v, i) => {
        const b = api.el('button', 'btn', v ? 'ON' : 'OFF', row);
        b.style.cssText = 'width:52px;padding:14px 0';
        b.onclick = () => {
          state[i] = !state[i];
          b.textContent = state[i] ? 'ON' : 'OFF';
          b.style.background = state[i] ? '#1d7d4c' : '';
          api.sfx('click');
          if (target.every((v2, k) => v2 === state[k])) api.done();
        };
        b.style.background = v ? '#1d7d4c' : '';
        return b;
      });
    },
  },

  // ---- asteroids ----------------------------------------------------------
  asteroids: {
    instr: 'Click the asteroids before they cross the screen. Destroy 10.',
    create(root, api) {
      const { cv, g } = api.canvas(500, 300);
      let rocks = [], hit = 0;
      const spawnRock = () => rocks.push({
        x: 520, y: 30 + Math.random() * 240,
        r: 14 + Math.random() * 14, v: 60 + Math.random() * 80,
        spin: Math.random() * Math.PI,
      });
      api.timer(spawnRock, 700);
      spawnRock();
      api.pointer(cv, {
        down(x, y) {
          for (let i = rocks.length - 1; i >= 0; i--) {
            const r = rocks[i];
            if (Math.hypot(x - r.x, y - r.y) < r.r + 8) {
              rocks.splice(i, 1); hit++; api.sfx('task');
              if (hit >= 10) api.done();
              return;
            }
          }
        },
      });
      api.onFrame((dt, t) => {
        g.clearRect(0, 0, 500, 300);
        g.fillStyle = '#fff';
        for (let i = 0; i < 30; i++) g.fillRect((i * 97 + t / 30) % 500, (i * 61) % 300, 1.5, 1.5);
        rocks = rocks.filter(r => r.x > -30);
        for (const r of rocks) {
          r.x -= r.v * dt;
          g.save(); g.translate(r.x, r.y); g.rotate(r.spin + t / 800);
          g.fillStyle = '#8a7a63';
          g.beginPath();
          for (let i = 0; i < 7; i++) {
            const a = i / 7 * Math.PI * 2;
            const rad = r.r * (0.75 + ((i * 53) % 10) / 25);
            g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rad, Math.sin(a) * rad);
          }
          g.closePath(); g.fill();
          g.restore();
        }
        g.fillStyle = '#55d7f2'; g.font = 'bold 16px sans-serif'; g.textAlign = 'left';
        g.fillText(`${hit} / 10`, 14, 24);
      });
    },
  },

  // ---- navigation align ----------------------------------------------------
  navalign: {
    instr: 'Drag the crosshair onto the target star and hold it there.',
    create(root, api) {
      const { cv, g } = api.canvas(460, 280);
      const tx = 80 + Math.random() * 300, ty = 60 + Math.random() * 160;
      let cx = 230, cy = 140, hold = 0, dragging = false;
      api.pointer(cv, {
        down(x, y) { dragging = true; cx = x; cy = y; },
        move(x, y) { if (dragging) { cx = x; cy = y; } },
        up() { dragging = false; },
      });
      api.onFrame((dt, t) => {
        g.clearRect(0, 0, 460, 280);
        g.fillStyle = '#fff';
        for (let i = 0; i < 40; i++) g.fillRect((i * 137) % 460, (i * 89) % 280, 1.5, 1.5);
        g.fillStyle = '#ffd23e';
        g.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? 5 : 12, a = i / 10 * Math.PI * 2 + t / 900;
          g[i ? 'lineTo' : 'moveTo'](tx + Math.cos(a) * r, ty + Math.sin(a) * r);
        }
        g.closePath(); g.fill();
        const near = Math.hypot(cx - tx, cy - ty) < 18;
        hold = near ? hold + dt : 0;
        g.strokeStyle = near ? '#45e08a' : '#55d7f2'; g.lineWidth = 2.5;
        g.beginPath(); g.arc(cx, cy, 20, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.moveTo(cx - 30, cy); g.lineTo(cx + 30, cy); g.moveTo(cx, cy - 30); g.lineTo(cx, cy + 30); g.stroke();
        if (near) {
          g.strokeStyle = '#45e08a'; g.lineWidth = 4;
          g.beginPath(); g.arc(cx, cy, 26, -Math.PI / 2, -Math.PI / 2 + hold * Math.PI * 2); g.stroke();
        }
        if (hold >= 1) api.done();
      });
    },
  },

  // ---- sample analysis -------------------------------------------------------
  samples: {
    instr: 'Start the centrifuge, then select the anomalous sample.',
    create(root, api) {
      const { cv, g } = api.canvas(460, 240);
      const odd = Math.floor(Math.random() * 5);
      let phase = 'idle', spinT = 0;
      const btn = api.el('button', 'btn btn-primary', 'START CENTRIFUGE');
      btn.onclick = () => { if (phase === 'idle') { phase = 'spin'; api.sfx('task'); } };
      api.pointer(cv, {
        down(x, y) {
          if (phase !== 'pick') return;
          const i = Math.floor((x - 30) / 85);
          if (i >= 0 && i < 5 && y > 60 && y < 200) {
            if (i === odd) api.done();
            else { phase = 'idle'; spinT = 0; api.sfx('error'); }
          }
        },
      });
      api.onFrame((dt, t) => {
        if (phase === 'spin') { spinT += dt; if (spinT > 2.2) { phase = 'pick'; api.sfx('taskDone'); } }
        g.clearRect(0, 0, 460, 240);
        for (let i = 0; i < 5; i++) {
          const x = 30 + i * 85, shakeX = phase === 'spin' ? Math.sin(t / 30 + i) * 3 : 0;
          g.fillStyle = '#1a2438';
          g.beginPath(); g.roundRect(x + shakeX, 60, 62, 140, 8); g.fill();
          g.fillStyle = phase === 'pick' && i === odd ? '#ff5470' : '#45b0e0';
          g.beginPath(); g.roundRect(x + 8 + shakeX, 120, 46, 70, 6); g.fill();
          if (phase === 'pick') {
            g.fillStyle = '#8b98b0'; g.font = '12px sans-serif'; g.textAlign = 'center';
            g.fillText('#' + (i + 1), x + 31, 52);
          }
        }
        if (phase === 'spin') {
          g.fillStyle = '#f5c744'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center';
          g.fillText('ANALYZING…', 230, 30);
        }
      });
    },
  },

  // ---- chemical mixing ---------------------------------------------------------
  chem: {
    instr: 'Add the chemicals in the order shown.',
    create(root, api) {
      const order = shuffle([0, 1, 2]);
      const names = ['🟥 Nitrogen', '🟨 Sulfur', '🟦 Coolant'];
      api.el('div', 'task-instr', 'Sequence: ' + order.map(i => names[i].slice(0, 2)).join(' → '));
      const bar = api.gauge();
      let step = 0;
      const row = api.row();
      [0, 1, 2].forEach(i => {
        const b = api.el('button', 'btn', names[i], row);
        b.onclick = () => {
          if (i === order[step]) {
            step++; api.sfx('task');
            bar.set(step / 3, `${step}/3`);
            if (step === 3) api.done();
          } else {
            step = 0; bar.set(0, 'Wrong order!'); api.sfx('error');
          }
        };
      });
    },
  },

  // ---- satellite dish -----------------------------------------------------------
  satellite: {
    instr: 'Rotate the dish until the signal locks (95%+).',
    create(root, api) {
      const { cv, g } = api.canvas(440, 220);
      const target = Math.random() * 360;
      const slider = api.slider(0, 360, Math.random() * 360);
      let locked = 0;
      api.onFrame((dt) => {
        const ang = Number(slider.value);
        let diff = Math.abs(ang - target) % 360;
        if (diff > 180) diff = 360 - diff;
        const sig = Math.max(0, 1 - diff / 90);
        locked = sig > 0.95 ? locked + dt : 0;
        g.clearRect(0, 0, 440, 220);
        g.save(); g.translate(160, 120); g.rotate((ang * Math.PI) / 180);
        g.strokeStyle = '#8fa3c8'; g.lineWidth = 7;
        g.beginPath(); g.arc(0, 0, 46, Math.PI * 0.6, Math.PI * 1.4); g.stroke();
        g.beginPath(); g.moveTo(0, 0); g.lineTo(-30, 0); g.stroke();
        g.restore();
        g.fillStyle = '#233150'; g.fillRect(260, 60, 30, 120);
        g.fillStyle = sig > 0.95 ? '#45e08a' : '#f5c744';
        g.fillRect(260, 60 + 120 * (1 - sig), 30, 120 * sig);
        g.fillStyle = '#8b98b0'; g.font = '12px sans-serif'; g.textAlign = 'center';
        g.fillText('SIGNAL ' + Math.round(sig * 100) + '%', 275, 200);
        if (locked > 0.8) api.done();
      });
    },
  },

  // ---- keycard swipe --------------------------------------------------------------
  keycard: {
    instr: 'Swipe the card — not too fast, not too slow.',
    create(root, api) {
      const { cv, g } = api.canvas(460, 200);
      let cardX = 40, dragging = false, startT = 0, msg = '';
      api.pointer(cv, {
        down(x, y) { if (Math.abs(x - cardX) < 50 && y > 90) { dragging = true; startT = performance.now(); } },
        move(x) { if (dragging) cardX = Math.max(40, Math.min(420, x)); },
        up() {
          if (!dragging) return;
          dragging = false;
          if (cardX > 400) {
            const dur = performance.now() - startT;
            if (dur > 350 && dur < 1400) { api.sfx('taskDone'); api.done(); return; }
            msg = dur <= 350 ? 'TOO FAST — try again' : 'TOO SLOW — try again';
            api.sfx('error');
          }
          cardX = 40;
        },
      });
      api.onFrame(() => {
        g.clearRect(0, 0, 460, 200);
        g.fillStyle = '#131b2c'; g.fillRect(20, 60, 420, 20);
        g.fillStyle = '#2b93c9';
        g.beginPath(); g.roundRect(cardX - 45, 90, 90, 60, 8); g.fill();
        g.fillStyle = '#dfe8f5'; g.fillRect(cardX - 45, 104, 90, 12);
        g.fillStyle = '#f5c744'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center';
        g.fillText(msg, 230, 40);
      });
    },
  },

  // ---- valves -------------------------------------------------------------------------
  valves: {
    instr: 'Turn every valve until it points UP.',
    create(root, api) {
      const { cv, g } = api.canvas(440, 200);
      const angles = [1, 2, 3].map(() => Math.floor(Math.random() * 3) + 1); // quarter turns off
      api.pointer(cv, {
        down(x, y) {
          const i = Math.floor((x - 40) / 130);
          if (i >= 0 && i < 3 && y > 40 && y < 180) {
            angles[i] = (angles[i] + 1) % 4;
            api.sfx('task');
            if (angles.every(a => a === 0)) api.done();
          }
        },
      });
      api.onFrame(() => {
        g.clearRect(0, 0, 440, 200);
        for (let i = 0; i < 3; i++) {
          const x = 105 + i * 130, y = 110;
          g.fillStyle = '#28354f'; g.beginPath(); g.arc(x, y, 44, 0, Math.PI * 2); g.fill();
          g.strokeStyle = angles[i] === 0 ? '#45e08a' : '#8fa3c8'; g.lineWidth = 10;
          g.save(); g.translate(x, y); g.rotate((angles[i] * Math.PI) / 2);
          g.beginPath(); g.moveTo(0, 10); g.lineTo(0, -36); g.stroke();
          g.restore();
        }
      });
    },
  },

  // ---- pressure -----------------------------------------------------------------------
  pressure: {
    instr: 'Equalize both tanks (within 3 units).',
    create(root, api) {
      let a = 20 + Math.random() * 30, b = 60 + Math.random() * 30;
      const { cv, g } = api.canvas(400, 200);
      const row = api.row();
      const mk = (label, fn) => {
        const btn = api.el('button', 'btn', label, row);
        btn.onclick = () => { fn(); api.sfx('click'); };
      };
      mk('◀ VENT A', () => { a = Math.max(0, a - 4); });
      mk('A → B', () => { const m = Math.min(6, a); a -= m; b += m; });
      mk('B → A', () => { const m = Math.min(6, b); b -= m; a += m; });
      mk('VENT B ▶', () => { b = Math.max(0, b - 4); });
      api.onFrame((dt) => {
        a += Math.sin(performance.now() / 900) * dt * 2;
        g.clearRect(0, 0, 400, 200);
        for (const [x, v, label] of [[80, a, 'A'], [240, b, 'B']]) {
          g.fillStyle = '#131b2c'; g.fillRect(x, 20, 80, 150);
          g.fillStyle = Math.abs(a - b) < 3 ? '#45e08a' : '#55d7f2';
          const h = Math.min(150, v * 1.5);
          g.fillRect(x, 170 - h, 80, h);
          g.fillStyle = '#dfe8f5'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center';
          g.fillText(`${label}: ${Math.round(v)}`, x + 40, 190);
        }
        if (Math.abs(a - b) < 3 && a > 5) api.done();
      });
    },
  },

  // ---- batteries -----------------------------------------------------------------------
  batteries: {
    instr: 'Click each cell when the charge needle is in the green.',
    create(root, api) {
      const { cv, g } = api.canvas(460, 220);
      const done = [false, false, false, false];
      api.pointer(cv, {
        down(x, y) {
          const i = Math.floor((x - 20) / 110);
          if (i < 0 || i > 3 || done[i]) return;
          const ph = (performance.now() / 600 + i * 0.7) % 1;
          if (ph > 0.35 && ph < 0.6) { done[i] = true; api.sfx('task'); }
          else api.sfx('error');
          if (done.every(Boolean)) api.done();
        },
      });
      api.onFrame(() => {
        g.clearRect(0, 0, 460, 220);
        for (let i = 0; i < 4; i++) {
          const x = 30 + i * 110;
          g.fillStyle = done[i] ? '#1d7d4c' : '#131b2c';
          g.beginPath(); g.roundRect(x, 40, 90, 130, 8); g.fill();
          g.fillStyle = 'rgba(69,224,138,0.35)';
          g.fillRect(x + 12, 40 + 130 * 0.4, 66, 130 * 0.25);
          const ph = (performance.now() / 600 + i * 0.7) % 1;
          g.fillStyle = '#f5c744';
          g.fillRect(x + 12, 42 + ph * 122, 66, 5);
        }
      });
    },
  },

  // ---- trash --------------------------------------------------------------------------
  trash: {
    instr: 'Hold the lever until the chute is empty.',
    create(root, api) {
      let held = 0, holding = false;
      const bar = api.gauge();
      const btn = api.el('button', 'btn btn-warn big', '🗑 HOLD LEVER');
      btn.addEventListener('pointerdown', () => { holding = true; api.sfx('door'); });
      const stop = () => { holding = false; };
      btn.addEventListener('pointerup', stop);
      btn.addEventListener('pointerleave', stop);
      api.onFrame((dt) => {
        if (holding) {
          held += dt;
          bar.set(Math.min(1, held / 2.6), 'EJECTING…');
          if (held >= 2.6) api.done();
        }
      });
    },
  },

  // ---- filter cleaning -------------------------------------------------------------------
  filter: {
    instr: 'Drag the debris out of the filter ring.',
    create(root, api) {
      const { cv, g } = api.canvas(440, 280);
      const bits = Array.from({ length: 6 }, (_, i) => ({
        x: 220 + Math.cos(i) * 60, y: 140 + Math.sin(i * 2) * 50, out: false,
      }));
      let drag = null;
      api.pointer(cv, {
        down(x, y) { drag = bits.find(b => !b.out && Math.hypot(x - b.x, y - b.y) < 20) || null; },
        move(x, y) { if (drag) { drag.x = x; drag.y = y; } },
        up() {
          if (drag && Math.hypot(drag.x - 220, drag.y - 140) > 120) {
            drag.out = true; api.sfx('task');
            if (bits.every(b => b.out)) api.done();
          }
          drag = null;
        },
      });
      api.onFrame(() => {
        g.clearRect(0, 0, 440, 280);
        g.strokeStyle = '#3c4f74'; g.lineWidth = 10;
        g.beginPath(); g.arc(220, 140, 120, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(85,215,242,0.25)'; g.lineWidth = 2;
        for (let i = -4; i < 5; i++) {
          g.beginPath(); g.moveTo(220 + i * 24, 40); g.lineTo(220 + i * 24, 240); g.stroke();
        }
        for (const b of bits) {
          if (b.out) continue;
          g.fillStyle = '#7c6a4e';
          g.beginPath(); g.arc(b.x, b.y, 14, 0, Math.PI * 2); g.fill();
        }
      });
    },
  },

  // ---- water plants -------------------------------------------------------------------------
  water: {
    instr: 'Hold the can over each pot until it blooms.',
    create(root, api) {
      const pots = [0, 1, 2, 3, 4].map(() => ({ w: 0 }));
      const row = api.row();
      pots.forEach((p, i) => {
        const b = api.el('button', 'btn', '🪴 0%', row);
        b.style.minWidth = '76px';
        let holding = false;
        b.addEventListener('pointerdown', () => { holding = true; });
        const stop = () => { holding = false; };
        b.addEventListener('pointerup', stop);
        b.addEventListener('pointerleave', stop);
        api.onFrame((dt) => {
          if (holding && p.w < 1) {
            p.w = Math.min(1, p.w + dt * 0.9);
            b.textContent = p.w >= 1 ? '🌸 100%' : `🪴 ${Math.round(p.w * 100)}%`;
            if (p.w >= 1) { api.sfx('task'); if (pots.every(q => q.w >= 1)) api.done(); }
          }
        });
      });
    },
  },

  // ---- prune vines -----------------------------------------------------------------------------
  prune: {
    instr: 'Snip all the overgrown vines.',
    create(root, api) {
      const { cv, g } = api.canvas(440, 260);
      const vines = Array.from({ length: 8 }, (_, i) => ({
        x: 40 + (i % 4) * 110, y: 60 + Math.floor(i / 4) * 120, cut: false, sway: i,
      }));
      api.pointer(cv, {
        down(x, y) {
          const v = vines.find(v => !v.cut && Math.abs(x - v.x - 20) < 30 && Math.abs(y - v.y - 30) < 50);
          if (v) {
            v.cut = true; api.sfx('task');
            if (vines.every(q => q.cut)) api.done();
          }
        },
      });
      api.onFrame((dt, t) => {
        g.clearRect(0, 0, 440, 260);
        for (const v of vines) {
          if (v.cut) {
            g.strokeStyle = '#2f5a38'; g.lineWidth = 6;
            g.beginPath(); g.moveTo(v.x + 20, v.y); g.lineTo(v.x + 20, v.y + 20); g.stroke();
            continue;
          }
          g.strokeStyle = '#3ea23e'; g.lineWidth = 7;
          g.beginPath();
          g.moveTo(v.x + 20, v.y);
          g.quadraticCurveTo(v.x + 20 + Math.sin(t / 500 + v.sway) * 14, v.y + 45, v.x + 20, v.y + 85);
          g.stroke();
          g.fillStyle = '#4ecb4e';
          g.beginPath(); g.ellipse(v.x + 32, v.y + 55, 10, 5, 0.5, 0, Math.PI * 2); g.fill();
        }
      });
    },
  },

  // ---- DNA match --------------------------------------------------------------------------------
  dna: {
    instr: 'Match the sample pairs.',
    create(root, api) {
      const icons = shuffle(['🧬', '🧬', '🦠', '🦠', '🩸', '🩸', '⚗️', '⚗️']);
      const grid = api.row();
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,70px);gap:8px';
      let open = [], matched = 0, lock = false;
      icons.forEach((ic, i) => {
        const b = api.el('button', 'btn', '❔', grid);
        b.style.cssText = 'height:70px;font-size:26px';
        b.onclick = () => {
          if (lock || b.dataset.done || open.includes(i)) return;
          b.textContent = ic;
          open.push(i);
          api.sfx('click');
          if (open.length === 2) {
            lock = true;
            const [a, c] = open;
            setTimeout(() => {
              const btns = grid.children;
              if (icons[a] === icons[c]) {
                btns[a].dataset.done = btns[c].dataset.done = '1';
                btns[a].style.opacity = btns[c].style.opacity = 0.4;
                matched++;
                api.sfx('task');
                if (matched === 4) api.done();
              } else {
                btns[a].textContent = btns[c].textContent = '❔';
              }
              open = []; lock = false;
            }, 550);
          }
        };
      });
    },
  },

  // ---- medbay scan (auto) ---------------------------------------------------------------------------
  medscan: {
    instr: 'Stand still while the scanner completes its pass.',
    create(root, api) {
      const { cv, g } = api.canvas(300, 240);
      let prog = 0;
      api.onFrame((dt, t) => {
        prog = Math.min(1, prog + dt / 8);
        g.clearRect(0, 0, 300, 240);
        g.strokeStyle = '#55d7f2'; g.lineWidth = 3;
        g.strokeRect(60, 20, 180, 190);
        g.fillStyle = 'rgba(85,215,242,0.12)'; g.fillRect(60, 20, 180, 190);
        // silhouette
        g.fillStyle = '#2b93c9';
        g.beginPath(); g.roundRect(120, 70, 60, 80, 26); g.fill();
        g.beginPath(); g.ellipse(162, 95, 16, 11, 0, 0, Math.PI * 2);
        g.fillStyle = '#b8e6f5'; g.fill();
        // scan line
        const sy = 20 + ((t / 16) % 190);
        g.fillStyle = 'rgba(85,255,200,0.5)'; g.fillRect(60, sy, 180, 4);
        g.fillStyle = '#45e08a'; g.font = 'bold 15px sans-serif'; g.textAlign = 'center';
        g.fillText(`SCANNING ${Math.round(prog * 100)}%`, 150, 232);
        if (prog >= 1) api.done();
      });
    },
  },

  // ---- blood sample -----------------------------------------------------------------------------------
  blood: {
    instr: 'Click DRAW when the needle crosses the green band. 3 good draws.',
    create(root, api) {
      const { cv, g } = api.canvas(420, 130);
      let got = 0;
      const btn = api.el('button', 'btn btn-primary', '💉 DRAW');
      btn.onclick = () => {
        const ph = (performance.now() / 800) % 1;
        if (ph > 0.4 && ph < 0.6) {
          got++; api.sfx('task');
          if (got >= 3) api.done();
        } else api.sfx('error');
      };
      api.onFrame(() => {
        g.clearRect(0, 0, 420, 130);
        g.fillStyle = '#131b2c'; g.fillRect(20, 40, 380, 30);
        g.fillStyle = 'rgba(69,224,138,0.45)'; g.fillRect(20 + 380 * 0.4, 40, 380 * 0.2, 30);
        const ph = (performance.now() / 800) % 1;
        g.fillStyle = '#ff5470'; g.fillRect(16 + ph * 380, 30, 8, 50);
        g.fillStyle = '#dfe8f5'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center';
        g.fillText(`${got} / 3`, 210, 110);
      });
    },
  },

  // ---- course plotting ------------------------------------------------------------------------------------
  courseplot: {
    instr: 'Click the waypoints in order: 1 → 5.',
    create(root, api) {
      const { cv, g } = api.canvas(460, 260);
      const pts = shuffle([0, 1, 2, 3, 4]).map((n, i) => ({
        n: n + 1, x: 50 + i * 90, y: 50 + ((i * 83) % 160),
      }));
      let next = 1;
      api.pointer(cv, {
        down(x, y) {
          const p = pts.find(p => Math.hypot(x - p.x, y - p.y) < 22);
          if (!p) return;
          if (p.n === next) { next++; api.sfx('task'); if (next > 5) api.done(); }
          else { next = 1; api.sfx('error'); }
        },
      });
      api.onFrame((dt, t) => {
        g.clearRect(0, 0, 460, 260);
        g.fillStyle = '#fff';
        for (let i = 0; i < 30; i++) g.fillRect((i * 121) % 460, (i * 73) % 260, 1.5, 1.5);
        g.strokeStyle = 'rgba(85,215,242,0.5)'; g.lineWidth = 2;
        const doneP = pts.filter(p => p.n < next).sort((a, b) => a.n - b.n);
        g.beginPath();
        doneP.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p.x, p.y));
        g.stroke();
        for (const p of pts) {
          g.fillStyle = p.n < next ? '#45e08a' : '#2b93c9';
          g.beginPath(); g.arc(p.x, p.y, 18, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#fff'; g.font = 'bold 15px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(p.n, p.x, p.y);
        }
        g.textBaseline = 'alphabetic';
      });
    },
  },

  // ---- decrypt ---------------------------------------------------------------------------------------------
  decrypt: {
    instr: 'Memorize the code, then key it in.',
    create(root, api) {
      const code = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)).join('');
      const disp = api.el('div', '', code);
      disp.style.cssText = 'font-size:34px;font-weight:900;letter-spacing:12px;color:#f5c744';
      let entered = '';
      const out = api.el('div', '', '');
      out.style.cssText = 'font-size:26px;font-weight:800;letter-spacing:8px;min-height:34px;color:#55d7f2';
      setTimeout(() => { disp.textContent = '• • • • •'; }, 2200);
      const pad = api.row();
      pad.style.cssText = 'display:grid;grid-template-columns:repeat(5,56px);gap:6px';
      for (let n = 0; n <= 9; n++) {
        const b = api.el('button', 'btn', String(n), pad);
        b.onclick = () => {
          if (disp.textContent === code) return; // still memorizing
          entered += n;
          out.textContent = entered;
          api.sfx('click');
          if (entered.length === 5) {
            if (entered === code) api.done();
            else { entered = ''; out.textContent = ''; api.sfx('error'); disp.textContent = code; setTimeout(() => { disp.textContent = '• • • • •'; }, 1600); }
          }
        };
      }
    },
  },

  // ---- antenna tune ------------------------------------------------------------------------------------------
  antenna: {
    instr: 'Match your wave (cyan) to the target (gold).',
    create(root, api) {
      const { cv, g } = api.canvas(440, 200);
      const targetF = 2 + Math.random() * 4;
      const slider = api.slider(20, 60, 20 + Math.random() * 40); // f*10
      let locked = 0;
      api.onFrame((dt, t) => {
        const f = Number(slider.value) / 10;
        const match = Math.abs(f - targetF) < 0.25;
        locked = match ? locked + dt : 0;
        g.clearRect(0, 0, 440, 200);
        const wave = (freq, color, off) => {
          g.strokeStyle = color; g.lineWidth = 3;
          g.beginPath();
          for (let x = 0; x <= 440; x += 4) {
            const y = 100 + Math.sin((x / 440) * freq * Math.PI * 2 + t / 400) * 46 + off;
            g[x ? 'lineTo' : 'moveTo'](x, y);
          }
          g.stroke();
        };
        wave(targetF, 'rgba(245,199,68,0.8)', 0);
        wave(f, match ? '#45e08a' : '#55d7f2', 0);
        if (locked > 0.9) api.done();
      });
    },
  },

  // ---- coolant flush --------------------------------------------------------------------------------------------
  coolant: {
    instr: 'Open the valves in sequence 1 → 4.',
    create(root, api) {
      let next = 1;
      const row = api.row();
      shuffle([1, 2, 3, 4]).forEach(n => {
        const b = api.el('button', 'btn', `Valve ${n}`, row);
        b.style.padding = '18px 14px';
        b.onclick = () => {
          if (n === next) {
            b.style.background = '#1d7d4c'; next++; api.sfx('task');
            if (next > 4) api.done();
          } else {
            next = 1; api.sfx('error');
            for (const c of row.children) c.style.background = '';
          }
        };
      });
    },
  },

  // ---- O2 dial ----------------------------------------------------------------------------------------------------
  dial: {
    instr: 'Set the O2 mix to the target value, then confirm.',
    create(root, api) {
      const target = 30 + Math.floor(Math.random() * 60);
      api.el('div', 'task-instr', `Target mix: ${target}%`);
      const { cv, g } = api.canvas(240, 180);
      const slider = api.slider(0, 100, 50);
      const btn = api.el('button', 'btn btn-primary', 'CONFIRM');
      btn.onclick = () => {
        if (Math.abs(Number(slider.value) - target) <= 2) api.done();
        else api.sfx('error');
      };
      api.onFrame(() => {
        const v = Number(slider.value);
        g.clearRect(0, 0, 240, 180);
        g.strokeStyle = '#233150'; g.lineWidth = 16;
        g.beginPath(); g.arc(120, 110, 70, Math.PI, 0); g.stroke();
        g.strokeStyle = Math.abs(v - target) <= 2 ? '#45e08a' : '#55d7f2';
        g.beginPath(); g.arc(120, 110, 70, Math.PI, Math.PI + (v / 100) * Math.PI); g.stroke();
        g.fillStyle = '#dfe8f5'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center';
        g.fillText(v + '%', 120, 110);
      });
    },
  },

  // ---- manifest audit -----------------------------------------------------------------------------------------------
  manifest: {
    instr: 'Count the crates and enter the number.',
    create(root, api) {
      const { cv, g } = api.canvas(420, 200);
      const n = 8 + Math.floor(Math.random() * 8);
      const boxes = Array.from({ length: n }, (_, i) => ({
        x: 30 + ((i * 97) % 360), y: 24 + ((i * 61) % 140),
      }));
      g.clearRect(0, 0, 420, 200);
      for (const b of boxes) {
        g.fillStyle = '#4d4a33';
        g.beginPath(); g.roundRect(b.x, b.y, 36, 36, 4); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.4)'; g.strokeRect(b.x + 5, b.y + 5, 26, 26);
      }
      const row = api.row();
      const out = api.el('div', '', '');
      out.style.cssText = 'font-size:24px;font-weight:900;color:#55d7f2;min-height:30px';
      let val = '';
      for (const d of [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, '⌫', 'OK']) {
        const b = api.el('button', 'btn btn-small', String(d), row);
        b.onclick = () => {
          if (d === '⌫') val = val.slice(0, -1);
          else if (d === 'OK') {
            if (Number(val) === n) { api.done(); return; }
            val = ''; api.sfx('error');
          } else if (val.length < 2) val += d;
          out.textContent = val;
        };
      }
    },
  },

  // ---- solar array ----------------------------------------------------------------------------------------------------
  solar: {
    instr: 'Align all three panels with their beams.',
    create(root, api) {
      const { cv, g } = api.canvas(440, 170);
      const targets = [0, 1, 2].map(() => 20 + Math.random() * 60);
      const sliders = targets.map(() => api.slider(0, 100, Math.random() * 100));
      api.onFrame(() => {
        g.clearRect(0, 0, 440, 170);
        let ok = 0;
        for (let i = 0; i < 3; i++) {
          const x = 80 + i * 140, v = Number(sliders[i].value);
          const good = Math.abs(v - targets[i]) < 5;
          if (good) ok++;
          // beam
          g.strokeStyle = 'rgba(245,199,68,0.6)'; g.lineWidth = 4;
          g.save(); g.translate(x, 130); g.rotate((-targets[i] / 100) * Math.PI * 0.8 - 0.15);
          g.beginPath(); g.moveTo(0, 0); g.lineTo(110, 0); g.stroke();
          g.restore();
          // panel
          g.save(); g.translate(x, 130); g.rotate((-v / 100) * Math.PI * 0.8 - 0.15);
          g.fillStyle = good ? '#45e08a' : '#2b6bb0';
          g.fillRect(20, -9, 70, 18);
          g.restore();
          g.fillStyle = '#28354f'; g.beginPath(); g.arc(x, 130, 12, 0, Math.PI * 2); g.fill();
        }
        if (ok === 3) api.done();
      });
    },
  },

  // ---- upload -----------------------------------------------------------------------------------------------------------
  upload: {
    instr: 'Upload the collected task data to HQ.',
    create(root, api) {
      const bar = api.gauge();
      let prog = -1;
      const btn = api.el('button', 'btn btn-primary big', '⬆ START UPLOAD');
      btn.onclick = () => { if (prog < 0) { prog = 0; btn.disabled = true; api.sfx('task'); } };
      api.onFrame((dt) => {
        if (prog < 0) return;
        prog = Math.min(1, prog + dt / 6);
        const eta = Math.ceil((1 - prog) * 6);
        bar.set(prog, prog >= 1 ? 'COMPLETE' : `Uploading… ${Math.round(prog * 100)}% (ETA ${eta}s)`);
        if (prog >= 1) api.done();
      });
    },
  },

  // ---- lighting calibration ---------------------------------------------------------------------------------------------
  lightscal: {
    instr: 'Match every panel to the reference brightness.',
    create(root, api) {
      const target = 30 + Math.random() * 55;
      const ref = api.el('div', '', 'REFERENCE');
      ref.style.cssText = `width:200px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;color:#0a0f1a;background:rgb(${Math.round(target * 2.4)},${Math.round(target * 2.4)},${Math.round(target * 1.5)})`;
      const sliders = [0, 1, 2].map(() => {
        const s = api.slider(0, 100, Math.random() * 100);
        return s;
      });
      const tiles = sliders.map(() => {
        const d = api.el('div', '', '');
        d.style.cssText = 'width:200px;height:20px;border-radius:6px;margin-top:-6px';
        return d;
      });
      // reorder: slider then tile pairs already appended in order; fine.
      api.onFrame(() => {
        let ok = 0;
        sliders.forEach((s, i) => {
          const v = Number(s.value);
          tiles[i].style.background = `rgb(${Math.round(v * 2.4)},${Math.round(v * 2.4)},${Math.round(v * 1.5)})`;
          if (Math.abs(v - target) < 5) ok++;
        });
        if (ok === 3) api.done();
      });
    },
  },

  // ---- magnet sweep -----------------------------------------------------------------------------------------------------
  sweep: {
    instr: 'Drag the magnet over all the loose bolts.',
    create(root, api) {
      const { cv, g } = api.canvas(440, 250);
      const bolts = Array.from({ length: 6 }, (_, i) => ({
        x: 40 + ((i * 149) % 360), y: 40 + ((i * 97) % 180), got: false,
      }));
      let mx = 220, my = 125, dragging = false;
      api.pointer(cv, {
        down(x, y) { dragging = true; mx = x; my = y; },
        move(x, y) { if (dragging) { mx = x; my = y; } },
        up() { dragging = false; },
      });
      api.onFrame(() => {
        for (const b of bolts) {
          if (!b.got && Math.hypot(mx - b.x, my - b.y) < 26) {
            b.got = true; api.sfx('task');
            if (bolts.every(q => q.got)) api.done();
          }
        }
        g.clearRect(0, 0, 440, 250);
        g.fillStyle = '#98a3b8';
        for (const b of bolts) {
          if (b.got) continue;
          g.beginPath(); g.arc(b.x, b.y, 7, 0, Math.PI * 2); g.fill();
        }
        // magnet
        g.fillStyle = '#e0455a';
        g.beginPath(); g.roundRect(mx - 20, my - 22, 40, 26, 6); g.fill();
        g.fillStyle = '#dfe8f5';
        g.fillRect(mx - 20, my + 4, 15, 12); g.fillRect(mx + 5, my + 4, 15, 12);
      });
    },
  },

  // ---- sort lockers -----------------------------------------------------------------------------------------------------
  lockers: {
    instr: 'Select each item, then click its matching locker.',
    create(root, api) {
      const kinds = [['🔧', 'TOOLS'], ['🧪', 'LAB'], ['🍎', 'MESS'], ['🧯', 'SAFETY']];
      const items = shuffle(kinds.flatMap(([ic]) => [ic]));
      let selected = null, placed = 0;
      const itemRow = api.row();
      const itemBtns = items.map(ic => {
        const b = api.el('button', 'btn', ic, itemRow);
        b.style.fontSize = '24px';
        b.onclick = () => {
          if (b.dataset.done) return;
          for (const o of itemRow.children) o.classList.remove('selected');
          b.classList.add('selected');
          b.style.borderColor = '#55d7f2';
          selected = { ic, b };
          api.sfx('click');
        };
        return b;
      });
      const lockRow = api.row();
      kinds.forEach(([ic, label]) => {
        const b = api.el('button', 'btn', `${ic} ${label}`, lockRow);
        b.onclick = () => {
          if (!selected) return;
          if (selected.ic === ic) {
            selected.b.dataset.done = '1';
            selected.b.style.opacity = 0.3;
            selected.b.style.borderColor = '';
            selected = null;
            placed++;
            api.sfx('task');
            if (placed === 4) api.done();
          } else api.sfx('error');
        };
      });
    },
  },

  // =============== SABOTAGE REPAIRS ===============

  'fix-o2': {
    instr: 'Enter the oxygen reset code.',
    create(root, api) {
      const code = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)).join('');
      api.el('div', 'task-instr', `Reset code: ${code}`);
      const out = api.el('div', '', '');
      out.style.cssText = 'font-size:28px;font-weight:900;letter-spacing:8px;min-height:36px;color:#45e08a';
      let entered = '';
      const pad = api.row();
      pad.style.cssText = 'display:grid;grid-template-columns:repeat(5,56px);gap:6px';
      for (let n = 0; n <= 9; n++) {
        const b = api.el('button', 'btn', String(n), pad);
        b.onclick = () => {
          entered += n;
          out.textContent = entered;
          api.sfx('click');
          if (entered.length === 5) {
            if (entered === code) api.done();
            else { entered = ''; out.textContent = ''; api.sfx('error'); }
          }
        };
      }
    },
  },

  'fix-lights': {
    instr: 'Flip every breaker back ON.',
    create(root, api) {
      const row = api.row();
      const state = Array.from({ length: 5 }, () => Math.random() < 0.4);
      state.forEach((v, i) => {
        const b = api.el('button', 'btn', v ? 'ON' : 'OFF', row);
        b.style.cssText = 'width:60px;padding:16px 0';
        b.style.background = v ? '#1d7d4c' : '';
        b.onclick = () => {
          state[i] = !state[i];
          b.textContent = state[i] ? 'ON' : 'OFF';
          b.style.background = state[i] ? '#1d7d4c' : '';
          api.sfx('click');
          if (state.every(Boolean)) api.done();
        };
      });
    },
  },

  'fix-comms': {
    instr: 'Retune the frequency until the static clears.',
    create(root, api) {
      const { cv, g } = api.canvas(440, 180);
      const target = 10 + Math.random() * 80;
      const slider = api.slider(0, 100, Math.random() * 100);
      let locked = 0;
      api.onFrame((dt, t) => {
        const v = Number(slider.value);
        const clarity = Math.max(0, 1 - Math.abs(v - target) / 30);
        locked = clarity > 0.93 ? locked + dt : 0;
        g.clearRect(0, 0, 440, 180);
        // static noise proportional to (1 - clarity)
        g.fillStyle = '#0d1526'; g.fillRect(0, 0, 440, 180);
        const noise = Math.round((1 - clarity) * 400);
        g.fillStyle = 'rgba(255,255,255,0.25)';
        for (let i = 0; i < noise; i++) {
          g.fillRect(Math.random() * 440, Math.random() * 180, 2, 2);
        }
        g.strokeStyle = `rgba(85,215,242,${clarity})`; g.lineWidth = 3;
        g.beginPath();
        for (let x = 0; x <= 440; x += 4) {
          g[x ? 'lineTo' : 'moveTo'](x, 90 + Math.sin(x / 30 + t / 300) * 34 * clarity);
        }
        g.stroke();
        g.fillStyle = '#dfe8f5'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center';
        g.fillText(`SIGNAL ${Math.round(clarity * 100)}%`, 220, 168);
        if (locked > 0.8) api.done();
      });
    },
  },

  'fix-cameras': {
    instr: 'Hold REBOOT until the security system restarts.',
    create(root, api) {
      let held = 0, holding = false;
      const bar = api.gauge();
      const btn = api.el('button', 'btn btn-warn big', '📷 HOLD TO REBOOT');
      btn.addEventListener('pointerdown', () => { holding = true; });
      const stop = () => { holding = false; };
      btn.addEventListener('pointerup', stop);
      btn.addEventListener('pointerleave', stop);
      api.onFrame((dt) => {
        if (holding) {
          held += dt;
          bar.set(Math.min(1, held / 2.5), 'REBOOTING…');
          if (held >= 2.5) api.done();
        } else if (held > 0) {
          held = Math.max(0, held - dt * 2);
          bar.set(held / 2.5, '');
        }
      });
    },
  },
};
