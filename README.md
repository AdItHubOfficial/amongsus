# AMONGSUS 🚀

An original multiplayer social-deduction game set aboard the starship **ISV Meridian**.
Runs entirely in the browser on localhost — no database, no paid services, no external assets
(every sprite is procedural canvas art and every sound is synthesized WebAudio).

## Quick start

```bash
npm install
npm start
```

Open **http://localhost:8620** in as many browser tabs/devices as you like (4–15 players).
One player hosts, shares the 5-letter lobby code, everyone readies up, the host launches.

> Solo? Hit **PRACTICE** to explore the ship and try every task, or lower
> **Min Players** in the host settings to test with a small group.

## Features

- **Multiplayer**: Socket.IO real-time networking, lobby codes, public lobby browser,
  automatic host migration, kick/ban, ready system, ping indicator, reconnect after refresh.
- **AI players**: the host can add bots (🤖 ADD AI in the lobby). Bots pathfind around the
  ship (grid A*), complete tasks, hold reactor panels and fix sabotages, report bodies,
  chat and vote in meetings — and stalk, sabotage and kill when one rolls impostor.
  Fill empty seats or play a full match solo against them.
- **Server-authoritative**: movement is simulated on the server from validated inputs
  (speed-hack budget, collision), kills check role/cooldown/distance, tasks check
  proximity + minimum duration, chat/actions are rate-limited, interest culling
  prevents wall-hacks. Client uses prediction + reconciliation, remotes interpolate 120 ms behind.
- **Five original maps** (host picks in match settings): the **ISV Meridian** starship,
  **Kepler Outpost** (a frozen research base with cryo lab and drill bay), **The Hive**
  (an asteroid mining rig radiating from a hot refinery), **Abyss Station** (a deep-sea
  lab across three stacked decks with a moon-pool sub dock), and **Aurora Skyport**
  (a luxury orbital resort — casino, pool deck, royal suites). Every map has 12-13
  themed rooms, ~30 placed tasks, 12 vents in 4 networks, 5 cameras, lockable doors,
  and its own color palette; geometry is machine-validated for reachability.
- **33 tasks, 31 unique mini-games**: wiring, fuel, reactor balancing, asteroid defense,
  keycard swipes, DNA matching, decryption, magnet sweeps, and more.
- **Sabotages**: reactor meltdown (two-player simultaneous hold), O2 depletion (two keypads),
  lights, comms blackout (hides tasks & cameras), camera disable, per-room door locks.
- **Roles** (host-toggleable): Impostor, Engineer (vents), Medic (shields), Sheriff
  (risky kills), Detective (body forensics), Guardian (protect from beyond), Hacker (remote cams).
- **Meetings**: emergency button & body reports, discussion/voting phases, anonymous
  voting, confirm-ejects, tie handling, vote pips, meeting chat with mute-dead, ejection cutscenes.
- **Ghosts**: walk through walls, finish tasks, ghost-only chat.
- **Match settings**: impostor count, cooldowns, vision, speed, task count, kill distance,
  task-bar mode, emergency meeting limits, and more — all host-configurable in the lobby.
- **Progression**: XP & levels, 12 achievements, statistics, 3 daily challenges,
  and a big unlockable wardrobe — 24 colors, 26 hats, 12 pets, 12 skins and
  9 nameplates, all procedural canvas art (stored in localStorage).
- **Polish**: animated lobby & menus, role reveal / meeting / ejection cutscenes,
  dynamic lighting & vision, particles with pooling, screen shake, procedural music &
  ship ambience, tooltips, toasts.
- **Settings**: volume mixer, graphics quality, FPS limit, fullscreen, rebindable keys,
  colorblind badges, reduced flashing, EN/ES localization framework.
- **Mobile friendly**: touch joystick + tap actions, responsive layouts.

## Controls

| Key | Action |
| --- | ------ |
| WASD / Arrows | Move |
| E | Use / interact / fix |
| R | Report body |
| Q | Kill (impostor/sheriff) |
| V | Vent |
| F | Role ability |
| M | Ship map |
| T | Emote wheel |
| Esc | Menu / close |

## Project layout

```
airlock/
├─ server/            Node + Express + Socket.IO (authoritative)
│  ├─ index.js        entrypoint & socket wiring
│  ├─ game/           Room (loop/snapshots/meetings/wins), Players, Sabotage, RoomManager
│  └─ utils/          ids, sanitizing, rate limiting
├─ shared/            constants, map, movement physics, task data (used by BOTH sides)
└─ client/
   ├─ index.html      all screens & overlays
   ├─ css/            UI stylesheet
   └─ js/
      ├─ game/        renderer, prediction, input, particles, character art
      ├─ network/     Socket.IO wrapper
      ├─ tasks/       31 mini-games + runner
      ├─ ui/          menu, lobby, HUD, meetings, settings, results, cutscenes
      ├─ audio/       procedural WebAudio engine
      ├─ progression/ XP, achievements, dailies, unlocks
      └─ utils/       dom, storage, i18n
```

AMONGSUS is an original work inspired by the social-deduction genre. It contains no
assets, code, audio, maps, or artwork from any other game.
