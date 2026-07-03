// =============================================================
// AMONGSUS — shared constants (imported by both server & client)
// =============================================================

export const PROTOCOL_VERSION = 1;

// ---- Network event names -------------------------------------------------
export const NET = {
  // client -> server
  CREATE: 'c:create', JOIN: 'c:join', BROWSE: 'c:browse', LEAVE: 'c:leave',
  READY: 'c:ready', COSMETICS: 'c:cosmetics', SETTINGS: 'c:settings',
  KICK: 'c:kick', BAN: 'c:ban', START: 'c:start', CHAT: 'c:chat',
  INPUT: 'c:input', ACTION: 'c:action', VOTE: 'c:vote', PING: 'c:ping',
  EMOTE: 'c:emote', ADD_BOT: 'c:addbot',
  // server -> client
  LOBBY_STATE: 's:lobby', CHAT_MSG: 's:chat', GAME_START: 's:start',
  SNAPSHOT: 's:snap', EVENT: 's:event', MEETING: 's:meeting',
  GAME_END: 's:end', ERROR_MSG: 's:error', PONG: 's:pong', KICKED: 's:kicked',
};

// ---- Simulation ------------------------------------------------------------
export const TICK_RATE = 30;          // server simulation Hz
export const SNAPSHOT_RATE = 15;      // state broadcast Hz
export const PLAYER_RADIUS = 22;      // world units
export const BASE_SPEED = 260;        // units / second at speed x1
export const GHOST_SPEED = 320;
export const INTERACT_RANGE = 110;
export const REPORT_RANGE = 150;
export const CULL_RADIUS = 1400;      // server interest radius (anti-wallhack)
export const BASE_VISION = 460;       // crew vision radius at x1

export const KILL_DISTANCES = { short: 90, normal: 140, long: 200 };

// ---- Timers (seconds) ------------------------------------------------------
export const TIMERS = {
  emergencyCooldown: 20,   // after game start / meeting
  sabotageCooldown: 30,
  doorCooldown: 20,
  doorCloseTime: 10,
  criticalSabotage: 45,    // reactor / O2 countdown
  camerasAutoFix: 60,
  ventCooldown: 25,        // engineer only
  engineerVentMax: 15,
  medicShieldCd: 60,
  guardianShieldCd: 45,
  hackerCamsCd: 45,
  hackerCamsDur: 8,
  ejectScene: 6,
  startCountdown: 3,
  reconnectGrace: 60,
  endedToLobby: 12,
};

// ---- Enums -----------------------------------------------------------------
export const GAME_STATES = { LOBBY: 'lobby', STARTING: 'starting', PLAYING: 'playing', MEETING: 'meeting', ENDED: 'ended' };
export const MEETING_PHASES = { DISCUSSION: 'discussion', VOTING: 'voting', REVEAL: 'reveal', EJECT: 'eject' };
export const ROLES = {
  CREW: 'crewmate', IMPOSTOR: 'impostor',
  ENGINEER: 'engineer', MEDIC: 'medic', SHERIFF: 'sheriff',
  DETECTIVE: 'detective', GUARDIAN: 'guardian', HACKER: 'hacker',
};
export const IMPOSTOR_ROLES = new Set([ROLES.IMPOSTOR]);
export const SABOTAGES = { REACTOR: 'reactor', O2: 'o2', LIGHTS: 'lights', COMMS: 'comms', CAMERAS: 'cameras' };

// ---- Cosmetics -------------------------------------------------------------
// lvl = player level required to equip (validated client-side; no accounts/DB)
export const COLORS = [
  { id: 'red',     hex: '#e0455a', name: 'Red' },
  { id: 'blue',    hex: '#2f7de1', name: 'Blue' },
  { id: 'teal',    hex: '#29c5b6', name: 'Teal' },
  { id: 'green',   hex: '#38b24a', name: 'Green' },
  { id: 'lime',    hex: '#a7e14e', name: 'Lime' },
  { id: 'yellow',  hex: '#f5c744', name: 'Yellow' },
  { id: 'orange',  hex: '#ef8633', name: 'Orange' },
  { id: 'coral',   hex: '#ff6f61', name: 'Coral' },
  { id: 'pink',    hex: '#ef62b1', name: 'Pink' },
  { id: 'purple',  hex: '#8f5fe8', name: 'Purple' },
  { id: 'magenta', hex: '#d94fd0', name: 'Magenta' },
  { id: 'brown',   hex: '#8a5a3b', name: 'Brown' },
  { id: 'tan',     hex: '#c9a26b', name: 'Tan' },
  { id: 'white',   hex: '#e8ecf2', name: 'White' },
  { id: 'gray',    hex: '#8b95a5', name: 'Gray' },
  { id: 'black',   hex: '#3a3f4a', name: 'Black' },
  { id: 'cyan',    hex: '#55d7f2', name: 'Cyan' },
  { id: 'navy',    hex: '#33518e', name: 'Navy' },
  { id: 'mint',    hex: '#7fe8c3', name: 'Mint' },
  { id: 'lavender',hex: '#b8a7f5', name: 'Lavender' },
  { id: 'rose',    hex: '#f2a2c0', name: 'Rose' },
  { id: 'olive',   hex: '#7c8a3f', name: 'Olive' },
  { id: 'slate',   hex: '#5c6e91', name: 'Slate' },
  { id: 'rust',    hex: '#b0502f', name: 'Rust' },
];

export const HATS = [
  { id: 'none',      name: 'None',         lvl: 1 },
  { id: 'antenna',   name: 'Antenna',      lvl: 1 },
  { id: 'cap',       name: 'Cap',          lvl: 2 },
  { id: 'flower',    name: 'Daisy',        lvl: 2 },
  { id: 'beanie',    name: 'Beanie',       lvl: 3 },
  { id: 'catears',   name: 'Cat Ears',     lvl: 3 },
  { id: 'headset',   name: 'Headset',      lvl: 4 },
  { id: 'bandana',   name: 'Bandana',      lvl: 4 },
  { id: 'sprout',    name: 'Sprout',       lvl: 5 },
  { id: 'goggles',   name: 'Goggles',      lvl: 5 },
  { id: 'tophat',    name: 'Top Hat',      lvl: 6 },
  { id: 'mushroom',  name: 'Mushroom',     lvl: 6 },
  { id: 'chef',      name: 'Chef Hat',     lvl: 7 },
  { id: 'fedora',    name: 'Fedora',       lvl: 7 },
  { id: 'party',     name: 'Party Cone',   lvl: 8 },
  { id: 'mohawk',    name: 'Mohawk',       lvl: 9 },
  { id: 'cowboy',    name: 'Cowboy',       lvl: 10 },
  { id: 'cone',      name: 'Traffic Cone', lvl: 11 },
  { id: 'halo',      name: 'Halo',         lvl: 12 },
  { id: 'santa',     name: 'Santa Hat',    lvl: 13 },
  { id: 'viking',    name: 'Viking',       lvl: 14 },
  { id: 'grad',      name: 'Graduate',     lvl: 15 },
  { id: 'crown',     name: 'Crown',        lvl: 16 },
  { id: 'pirate',    name: 'Pirate',       lvl: 18 },
  { id: 'wizard',    name: 'Wizard',       lvl: 20 },
  { id: 'horns',     name: 'Horns',        lvl: 22 },
];

export const PETS = [
  { id: 'none',     name: 'None',      lvl: 1 },
  { id: 'blob',     name: 'Blob',      lvl: 3 },
  { id: 'ducky',    name: 'Ducky',     lvl: 4 },
  { id: 'robopup',  name: 'Robo-Pup',  lvl: 6 },
  { id: 'snail',    name: 'Snail',     lvl: 7 },
  { id: 'ufo',      name: 'Mini UFO',  lvl: 9 },
  { id: 'frog',     name: 'Frog',      lvl: 10 },
  { id: 'star',     name: 'Starling',  lvl: 12 },
  { id: 'crab',     name: 'Crab',      lvl: 13 },
  { id: 'boxbot',   name: 'Box-Bot',   lvl: 15 },
  { id: 'minicrew', name: 'Mini Crew', lvl: 17 },
  { id: 'ghostie',  name: 'Ghostie',   lvl: 20 },
];

export const SKINS = [
  { id: 'none',      name: 'None',      lvl: 1 },
  { id: 'engineer',  name: 'Engineer',  lvl: 4 },
  { id: 'chef',      name: 'Chef',      lvl: 5 },
  { id: 'medic',     name: 'Medic',     lvl: 7 },
  { id: 'scientist', name: 'Scientist', lvl: 8 },
  { id: 'winter',    name: 'Winter',    lvl: 9 },
  { id: 'security',  name: 'Security',  lvl: 10 },
  { id: 'prisoner',  name: 'Prisoner',  lvl: 11 },
  { id: 'mechanic',  name: 'Mechanic',  lvl: 12 },
  { id: 'tuxedo',    name: 'Tuxedo',    lvl: 14 },
  { id: 'captain',   name: 'Captain',   lvl: 16 },
  { id: 'banana',    name: 'Banana',    lvl: 18 },
];

export const PLATES = [
  { id: 'default', name: 'Standard', lvl: 1 },
  { id: 'neon',    name: 'Neon',     lvl: 5 },
  { id: 'crimson', name: 'Crimson',  lvl: 7 },
  { id: 'gold',    name: 'Gold',     lvl: 10 },
  { id: 'ice',     name: 'Ice',      lvl: 12 },
  { id: 'hazard',  name: 'Hazard',   lvl: 15 },
  { id: 'toxic',   name: 'Toxic',    lvl: 17 },
  { id: 'galaxy',  name: 'Galaxy',   lvl: 20 },
  { id: 'sunset',  name: 'Sunset',   lvl: 25 },
];

export const EMOTES = ['👋', '😂', '😠', '❤️', '❓', '🕺'];

// ---- Match settings --------------------------------------------------------
export const DEFAULT_SETTINGS = {
  map: 'Meridian',
  impostors: 1,
  discussionTime: 45,
  votingTime: 60,
  killCooldown: 30,
  crewVision: 1.0,
  impostorVision: 1.5,
  tasksPerPlayer: 5,
  emergencyMeetings: 1,
  confirmEjects: true,
  anonymousVotes: false,
  playerSpeed: 1.0,
  killDistance: 'normal',
  taskBar: 'always',          // always | meetings | never
  minPlayers: 4,              // lower it for small-group testing
  roleEngineer: false,
  roleMedic: false,
  roleSheriff: false,
  roleDetective: false,
  roleGuardian: false,
  roleHacker: false,
};

// Schema drives both the host settings UI and server-side validation.
export const SETTINGS_SCHEMA = [
  { key: 'map',              label: 'Map',                 type: 'select', options: ['Meridian', 'Kepler', 'Hive', 'Abyss', 'Aurora'] },
  { key: 'impostors',        label: 'Impostors',           type: 'range',  min: 1,    max: 3,   step: 1 },
  { key: 'minPlayers',       label: 'Min Players',         type: 'range',  min: 1,    max: 15,  step: 1 },
  { key: 'discussionTime',   label: 'Discussion Time',     type: 'range',  min: 15,   max: 120, step: 15, unit: 's' },
  { key: 'votingTime',       label: 'Voting Time',         type: 'range',  min: 30,   max: 120, step: 15, unit: 's' },
  { key: 'killCooldown',     label: 'Kill Cooldown',       type: 'range',  min: 10,   max: 60,  step: 5,  unit: 's' },
  { key: 'killDistance',     label: 'Kill Distance',       type: 'select', options: ['short', 'normal', 'long'] },
  { key: 'playerSpeed',      label: 'Player Speed',        type: 'range',  min: 0.75, max: 1.5, step: 0.25, unit: 'x' },
  { key: 'crewVision',       label: 'Crew Vision',         type: 'range',  min: 0.5,  max: 2,   step: 0.25, unit: 'x' },
  { key: 'impostorVision',   label: 'Impostor Vision',     type: 'range',  min: 1,    max: 2.5, step: 0.25, unit: 'x' },
  { key: 'tasksPerPlayer',   label: 'Tasks Per Player',    type: 'range',  min: 3,    max: 10,  step: 1 },
  { key: 'emergencyMeetings',label: 'Emergency Meetings',  type: 'range',  min: 0,    max: 3,   step: 1 },
  { key: 'taskBar',          label: 'Task Bar Updates',    type: 'select', options: ['always', 'meetings', 'never'] },
  { key: 'confirmEjects',    label: 'Confirm Ejects',      type: 'toggle' },
  { key: 'anonymousVotes',   label: 'Anonymous Voting',    type: 'toggle' },
  { key: 'roleEngineer',     label: 'Role: Engineer',      type: 'toggle' },
  { key: 'roleMedic',        label: 'Role: Medic',         type: 'toggle' },
  { key: 'roleSheriff',      label: 'Role: Sheriff',       type: 'toggle' },
  { key: 'roleDetective',    label: 'Role: Detective',     type: 'toggle' },
  { key: 'roleGuardian',     label: 'Role: Guardian',      type: 'toggle' },
  { key: 'roleHacker',       label: 'Role: Hacker',        type: 'toggle' },
];

// ---- Progression -----------------------------------------------------------
export const XP_RULES = { participate: 40, perTask: 8, perKill: 10, perFix: 15, win: 50 };
export const MAX_PLAYERS = 15;
export const MIN_PLAYERS_HARD = 1;
export const MAX_NAME_LEN = 14;
export const MAX_CHAT_LEN = 120;
