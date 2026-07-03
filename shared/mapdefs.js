// =============================================================
// AMONGSUS — raw map definitions. Five unique locations, each a
// pure-data layout compiled by buildMap() in map.js.
//   rooms:     {id, name, theme, x, y, w, h, color}
//   corridors: [x, y, w, h]           (overlap rooms by ~30u)
//   doors:     [room, x, y, w, h]     (slabs at room/corridor junctions)
//   vents:     [room, x, y, net]      (same net = connected)
//   cameras:   [name, x, y]
//   tasks:     [type, room, x, y, customName?]
// =============================================================

// ---------------------------------------------------------------------------
// MAP 1 — ISV MERIDIAN: the original starship. Three horizontal decks.
// ---------------------------------------------------------------------------
const MERIDIAN = {
  id: 'Meridian',
  name: 'ISV Meridian',
  blurb: 'The original starship — three decks and a humming reactor.',
  width: 4300, height: 2650,
  spawn: { x: 2150, y: 1150 },
  safeRoom: 'atrium',
  palette: { corridor: '#20283a', wall: '#36435c', wallEdge: '#05080f' },
  rooms: [
    { id: 'medbay',     name: 'Medical Bay',    theme: 'medical',  x: 500,  y: 200,  w: 550, h: 450, color: '#20393f' },
    { id: 'lab',        name: 'Laboratory',     theme: 'lab',      x: 1450, y: 150,  w: 650, h: 500, color: '#243447' },
    { id: 'greenhouse', name: 'Greenhouse',     theme: 'garden',   x: 2500, y: 150,  w: 650, h: 500, color: '#22402b' },
    { id: 'navigation', name: 'Navigation',     theme: 'nav',      x: 3550, y: 250,  w: 550, h: 500, color: '#2d3350' },
    { id: 'reactor',    name: 'Reactor',        theme: 'reactor',  x: 150,  y: 1000, w: 500, h: 600, color: '#3f2731' },
    { id: 'engine',     name: 'Engine Room',    theme: 'engine',   x: 950,  y: 1050, w: 650, h: 500, color: '#3d3226' },
    { id: 'atrium',     name: 'Central Atrium', theme: 'hub',      x: 1800, y: 1000, w: 700, h: 550, color: '#2b3a55' },
    { id: 'comms',      name: 'Communications', theme: 'comms',    x: 2800, y: 1075, w: 500, h: 450, color: '#31294a' },
    { id: 'security',   name: 'Security',       theme: 'security', x: 3600, y: 1050, w: 450, h: 450, color: '#40303a' },
    { id: 'storage',    name: 'Storage',        theme: 'crates',   x: 700,  y: 1900, w: 550, h: 500, color: '#33372a' },
    { id: 'cargo',      name: 'Cargo Hold',     theme: 'crates',   x: 1600, y: 1950, w: 700, h: 500, color: '#3a3a2e' },
    { id: 'quarters',   name: 'Crew Quarters',  theme: 'bunks',    x: 2700, y: 1950, w: 600, h: 450, color: '#2e3c48' },
  ],
  corridors: [
    [1020, 360, 460, 160], [2070, 360, 460, 160], [3120, 400, 460, 160],
    [500, 620, 150, 410], [1450, 620, 150, 460], [1900, 620, 160, 410],
    [2900, 620, 160, 485], [3750, 720, 160, 360],
    [620, 1200, 360, 160], [1570, 1200, 260, 160], [2470, 1200, 360, 160], [3270, 1200, 360, 160],
    [1000, 1520, 160, 410], [2000, 1520, 160, 460], [2950, 1495, 160, 485],
    [1220, 2120, 410, 160], [2270, 2120, 460, 160],
  ],
  doors: [
    ['medbay', 1050, 360, 50, 160], ['medbay', 500, 650, 150, 50],
    ['lab', 1400, 360, 50, 160], ['lab', 2100, 360, 50, 160],
    ['lab', 1450, 650, 150, 50], ['lab', 1900, 650, 160, 50],
    ['greenhouse', 2500, 360, 50, 160], ['greenhouse', 3100, 400, 50, 160], ['greenhouse', 2900, 650, 160, 50],
    ['navigation', 3530, 400, 50, 160], ['navigation', 3750, 750, 160, 50],
    ['reactor', 500, 950, 150, 50], ['reactor', 650, 1200, 50, 160],
    ['engine', 1450, 1030, 150, 50], ['engine', 900, 1200, 50, 160],
    ['engine', 1600, 1200, 50, 160], ['engine', 1000, 1550, 160, 50],
    ['comms', 2900, 1075, 160, 50], ['comms', 2750, 1200, 50, 160],
    ['comms', 3300, 1200, 50, 160], ['comms', 2950, 1495, 160, 50],
    ['security', 3750, 1030, 160, 50], ['security', 3550, 1200, 50, 160],
    ['storage', 1000, 1880, 160, 50], ['storage', 1250, 2120, 50, 160],
    ['cargo', 1550, 2120, 50, 160], ['cargo', 2000, 1930, 160, 50], ['cargo', 2300, 2120, 50, 160],
    ['quarters', 2650, 2120, 50, 160], ['quarters', 2950, 1930, 160, 50],
  ],
  vents: [
    ['reactor', 400, 1450, 'A'], ['engine', 1480, 1480, 'A'], ['medbay', 950, 560, 'A'],
    ['lab', 1550, 230, 'B'], ['greenhouse', 3050, 230, 'B'], ['navigation', 4020, 680, 'B'],
    ['security', 3980, 1420, 'C'], ['comms', 3230, 1140, 'C'], ['quarters', 3220, 2320, 'C'],
    ['storage', 790, 2320, 'D'], ['cargo', 1700, 2380, 'D'], ['atrium', 1860, 1490, 'D'],
  ],
  cameras: [
    ['Top Corridor', 1500, 430], ['Atrium', 2150, 1040], ['West Spine', 800, 1280],
    ['East Spine', 2650, 1280], ['Lower Deck', 1425, 2200],
  ],
  consoles: {
    emergency: { x: 2150, y: 1275 },
    security: { x: 3825, y: 1120 },
    reactorPanels: [{ x: 240, y: 1090 }, { x: 240, y: 1510 }],
    o2Consoles: [{ x: 2620, y: 520 }, { x: 3980, y: 330 }],
    lightsPanel: { x: 1520, y: 1090 },
    commsPanel: { x: 3060, y: 1460 },
  },
  tasks: [
    ['dna', 'medbay', 580, 280], ['medscan', 'medbay', 800, 430], ['blood', 'medbay', 990, 280],
    ['wires', 'lab', 2040, 230], ['samples', 'lab', 1520, 590], ['chem', 'lab', 1800, 590],
    ['filter', 'greenhouse', 2560, 230], ['water', 'greenhouse', 2800, 590],
    ['prune', 'greenhouse', 3090, 560], ['dial', 'greenhouse', 3000, 230, 'Adjust O2 Mix'],
    ['asteroids', 'navigation', 4040, 320], ['navalign', 'navigation', 3620, 700],
    ['courseplot', 'navigation', 3800, 520], ['solar', 'navigation', 3980, 700],
    ['reactbal', 'reactor', 560, 1060], ['coolant', 'reactor', 350, 1560],
    ['fuel', 'engine', 1010, 1500], ['powerroute', 'engine', 1300, 1090],
    ['upload', 'atrium', 2400, 1050], ['lightscal', 'atrium', 1850, 1080],
    ['satellite', 'comms', 2860, 1120], ['decrypt', 'comms', 3240, 1110], ['antenna', 'comms', 3250, 1470],
    ['wires', 'security', 3650, 1100],
    ['wires', 'storage', 760, 1950], ['batteries', 'storage', 1190, 2350], ['trash', 'storage', 760, 2350],
    ['valves', 'cargo', 1660, 2010], ['pressure', 'cargo', 2240, 2400],
    ['manifest', 'cargo', 2240, 2010], ['sweep', 'cargo', 1900, 2400],
    ['keycard', 'quarters', 2760, 2010], ['lockers', 'quarters', 3240, 2010],
  ],
};

// ---------------------------------------------------------------------------
// MAP 2 — KEPLER OUTPOST: a frozen research base. Two long wings around a
// central command dome; blizzard-blue palette, cryo pods and a drill bay.
// ---------------------------------------------------------------------------
const KEPLER = {
  id: 'Kepler',
  name: 'Kepler Outpost',
  blurb: 'A research base dug into a frozen world. Long icy wings, one warm dome.',
  width: 4600, height: 2100,
  spawn: { x: 2350, y: 950 },
  safeRoom: 'command',
  palette: { corridor: '#22303f', wall: '#3e5c74', wallEdge: '#04070c' },
  rooms: [
    { id: 'command',  name: 'Command Dome',  theme: 'hub',      x: 2000, y: 800,  w: 700, h: 500, color: '#28455c' },
    { id: 'cryo',     name: 'Cryo Lab',      theme: 'cryo',     x: 400,  y: 300,  w: 600, h: 450, color: '#1f3d4d' },
    { id: 'biodome',  name: 'Bio Dome',      theme: 'garden',   x: 1300, y: 250,  w: 550, h: 450, color: '#244431' },
    { id: 'observatory', name: 'Observatory', theme: 'nav',     x: 2900, y: 250,  w: 600, h: 450, color: '#2b3a5e' },
    { id: 'commstower', name: 'Comms Tower', theme: 'comms',    x: 3800, y: 300,  w: 500, h: 400, color: '#33305a' },
    { id: 'warehouse', name: 'Warehouse',    theme: 'crates',   x: 250,  y: 850,  w: 500, h: 400, color: '#2e3a44' },
    { id: 'secpost',  name: 'Security Post', theme: 'security', x: 3000, y: 850,  w: 450, h: 400, color: '#41333f' },
    { id: 'quarters', name: 'Living Quarters', theme: 'bunks',  x: 3600, y: 850,  w: 550, h: 400, color: '#31424f' },
    { id: 'generator', name: 'Generator',    theme: 'reactor',  x: 350,  y: 1350, w: 600, h: 500, color: '#402c34' },
    { id: 'drillbay', name: 'Drill Bay',     theme: 'drill',    x: 1250, y: 1400, w: 600, h: 450, color: '#3d3527' },
    { id: 'medstation', name: 'Med Station', theme: 'medical',  x: 2900, y: 1400, w: 550, h: 450, color: '#21404a' },
    { id: 'garage',   name: 'Garage',        theme: 'crates',   x: 3700, y: 1350, w: 600, h: 500, color: '#38383c' },
  ],
  corridors: [
    [970, 450, 390, 160],    // cryo–biodome
    [1820, 450, 1110, 160],  // biodome–observatory (north gallery)
    [3470, 450, 360, 160],   // observatory–comms tower
    [2250, 580, 160, 250],   // gallery down to command
    [920, 1550, 360, 160],   // generator–drill
    [1820, 1550, 1110, 160], // drill–med station (south gallery)
    [2350, 1270, 160, 310],  // command down to south gallery
    [3420, 1550, 310, 160],  // med–garage
    [450, 720, 160, 160],    // cryo–warehouse
    [450, 1220, 160, 160],   // warehouse–generator
    [3900, 670, 160, 210],   // comms tower–quarters
    [3900, 1220, 160, 160],  // quarters–garage
    [2670, 950, 360, 160],   // command–security
    [3420, 950, 210, 160],   // security–quarters
  ],
  doors: [
    ['cryo', 1000, 450, 50, 160], ['cryo', 450, 720, 160, 50],
    ['biodome', 1300, 450, 50, 160], ['biodome', 1820, 450, 50, 160],
    ['observatory', 2870, 450, 50, 160], ['observatory', 3480, 450, 50, 160],
    ['commstower', 3780, 450, 50, 160], ['commstower', 3900, 690, 160, 50],
    ['warehouse', 450, 820, 160, 50], ['warehouse', 450, 1230, 160, 50],
    ['generator', 450, 1330, 160, 50], ['generator', 930, 1550, 50, 160],
    ['drillbay', 1260, 1550, 50, 160], ['drillbay', 1820, 1550, 50, 160],
    ['medstation', 2870, 1550, 50, 160], ['medstation', 3430, 1550, 50, 160],
    ['garage', 3670, 1550, 50, 160], ['garage', 3900, 1330, 160, 50],
    ['quarters', 3900, 800, 160, 50], ['quarters', 3560, 950, 50, 160], ['quarters', 3900, 1230, 160, 50],
    ['secpost', 2980, 950, 50, 160], ['secpost', 3410, 950, 50, 160],
  ],
  vents: [
    ['cryo', 900, 400, 'A'], ['biodome', 1400, 350, 'A'], ['warehouse', 350, 950, 'A'],
    ['observatory', 3400, 350, 'B'], ['commstower', 4200, 400, 'B'], ['quarters', 4050, 950, 'B'],
    ['generator', 480, 1480, 'C'], ['drillbay', 1750, 1500, 'C'], ['command', 2100, 1200, 'C'],
    ['medstation', 3350, 1500, 'D'], ['garage', 4200, 1450, 'D'], ['secpost', 3350, 1000, 'D'],
  ],
  cameras: [
    ['North Gallery', 1600, 530], ['Dome Approach', 2330, 700], ['East Hall', 2850, 1030],
    ['South Gallery', 2400, 1630], ['West Link', 530, 800],
  ],
  consoles: {
    emergency: { x: 2350, y: 1050 },
    security: { x: 3200, y: 1000 },
    reactorPanels: [{ x: 560, y: 1420 }, { x: 830, y: 1760 }],
    o2Consoles: [{ x: 1500, y: 350 }, { x: 3050, y: 350 }],
    lightsPanel: { x: 1550, y: 1500 },
    commsPanel: { x: 4050, y: 500 },
  },
  tasks: [
    ['dna', 'cryo', 460, 360, 'Thaw Samples'], ['blood', 'cryo', 940, 680],
    ['water', 'biodome', 1400, 600], ['prune', 'biodome', 1750, 320], ['dial', 'biodome', 1600, 650, 'Adjust Dome Mix'],
    ['asteroids', 'observatory', 3400, 320, 'Track Meteors'], ['courseplot', 'observatory', 3000, 600, 'Chart the Storm'],
    ['navalign', 'observatory', 3350, 650],
    ['decrypt', 'commstower', 3900, 370], ['antenna', 'commstower', 4200, 620], ['satellite', 'commstower', 4050, 350],
    ['upload', 'command', 2600, 900], ['lightscal', 'command', 2100, 1250],
    ['wires', 'secpost', 3050, 900],
    ['keycard', 'quarters', 3700, 900], ['lockers', 'quarters', 4050, 1200],
    ['wires', 'warehouse', 350, 900], ['batteries', 'warehouse', 650, 1200], ['trash', 'warehouse', 320, 1200],
    ['fuel', 'generator', 880, 1420], ['reactbal', 'generator', 520, 1800], ['coolant', 'generator', 800, 1620],
    ['sweep', 'drillbay', 1600, 1800, 'Sweep Drill Tailings'], ['pressure', 'drillbay', 1800, 1450],
    ['powerroute', 'drillbay', 1350, 1800],
    ['medscan', 'medstation', 3100, 1650], ['samples', 'medstation', 3300, 1500, 'Analyze Ice Cores'],
    ['valves', 'garage', 3800, 1450], ['manifest', 'garage', 4150, 1700], ['filter', 'garage', 4000, 1800, 'Degrease Filter'],
  ],
};

// ---------------------------------------------------------------------------
// MAP 3 — THE HIVE: an asteroid mining rig. A hot refinery hub with pods
// radiating outward through rock-cut tunnels. Amber industrial palette.
// ---------------------------------------------------------------------------
const HIVE = {
  id: 'Hive',
  name: 'The Hive',
  blurb: 'An asteroid mining rig — every tunnel leads back to the refinery.',
  width: 3600, height: 3000,
  spawn: { x: 1850, y: 1400 },
  safeRoom: 'refinery',
  palette: { corridor: '#33291e', wall: '#5c4a33', wallEdge: '#0a0603' },
  rooms: [
    { id: 'refinery',  name: 'Refinery',      theme: 'hub',      x: 1500, y: 1250, w: 700, h: 500, color: '#4a3524' },
    { id: 'scanner',   name: 'Scanner Array', theme: 'nav',      x: 1450, y: 200,  w: 600, h: 450, color: '#37324a' },
    { id: 'fungal',    name: 'Fungal Farm',   theme: 'garden',   x: 2600, y: 350,  w: 600, h: 450, color: '#31402a' },
    { id: 'infirmary', name: 'Infirmary',     theme: 'medical',  x: 2350, y: 850,  w: 450, h: 350, color: '#274044' },
    { id: 'radio',     name: 'Radio Room',    theme: 'comms',    x: 2750, y: 1300, w: 550, h: 450, color: '#3a3152' },
    { id: 'bunks',     name: 'Bunks',         theme: 'bunks',    x: 2600, y: 2200, w: 600, h: 450, color: '#33404b' },
    { id: 'messhall',  name: 'Mess Hall',     theme: 'kitchen',  x: 2300, y: 1850, w: 450, h: 350, color: '#453b2c' },
    { id: 'crusher',   name: 'Crusher',       theme: 'engine',   x: 1450, y: 2350, w: 650, h: 450, color: '#42351f' },
    { id: 'smelter',   name: 'Smelter',       theme: 'reactor',  x: 400,  y: 2200, w: 700, h: 500, color: '#4d2c26' },
    { id: 'watchpost', name: 'Watch Post',    theme: 'security', x: 950,  y: 1850, w: 450, h: 350, color: '#443039' },
    { id: 'orestore',  name: 'Ore Storage',   theme: 'crates',   x: 300,  y: 1300, w: 550, h: 450, color: '#3c3a2c' },
    { id: 'drillshaft', name: 'Drill Shaft',  theme: 'drill',    x: 400,  y: 350,  w: 600, h: 500, color: '#3f3222' },
  ],
  corridors: [
    [1670, 620, 160, 660],   // refinery north spoke → scanner
    [2170, 1420, 610, 160],  // east spoke → radio
    [1700, 1720, 160, 660],  // south spoke → crusher
    [820, 1420, 710, 160],   // west spoke → ore storage
    [540, 820, 160, 640],    // drill shaft → ore storage
    [2620, 770, 160, 130],   // fungal → infirmary
    [2450, 1170, 160, 300],  // infirmary → east spoke
    [2900, 1720, 160, 510],  // radio → bunks
    [2550, 1550, 160, 330],  // east spoke → mess hall
    [2620, 2170, 160, 80],   // mess hall → bunks
    [960, 2170, 160, 80],    // watch post → smelter
    [1090, 1550, 160, 330],  // west spoke → watch post
    [1070, 2450, 410, 160],  // smelter → crusher
    [2070, 2450, 560, 160],  // crusher → bunks
    [970, 420, 510, 160],    // drill shaft → scanner
    [2020, 470, 610, 160],   // scanner → fungal
  ],
  doors: [
    ['scanner', 1670, 650, 160, 50], ['scanner', 1450, 420, 50, 160], ['scanner', 2000, 470, 50, 160],
    ['fungal', 2570, 470, 50, 160], ['fungal', 2620, 790, 160, 50],
    ['infirmary', 2620, 850, 160, 50], ['infirmary', 2450, 1190, 160, 50],
    ['radio', 2710, 1420, 50, 160], ['radio', 2900, 1740, 160, 50],
    ['bunks', 2900, 2160, 160, 50], ['bunks', 2620, 2180, 160, 50], ['bunks', 2570, 2450, 50, 160],
    ['messhall', 2550, 1830, 160, 50],
    ['crusher', 1700, 2320, 160, 50], ['crusher', 1460, 2450, 50, 160], ['crusher', 2080, 2450, 50, 160],
    ['smelter', 960, 2180, 160, 50], ['smelter', 1090, 2450, 50, 160],
    ['watchpost', 1090, 1820, 160, 50], ['watchpost', 960, 2150, 160, 50],
    ['orestore', 830, 1420, 50, 160], ['orestore', 540, 1280, 160, 50],
    ['drillshaft', 540, 830, 160, 50], ['drillshaft', 990, 420, 50, 160],
  ],
  vents: [
    ['drillshaft', 900, 780, 'A'], ['orestore', 380, 1380, 'A'], ['smelter', 480, 2620, 'A'],
    ['scanner', 1950, 260, 'B'], ['fungal', 3100, 430, 'B'], ['infirmary', 2400, 920, 'B'],
    ['radio', 3200, 1690, 'C'], ['bunks', 3100, 2580, 'C'], ['messhall', 2380, 1920, 'C'],
    ['refinery', 1560, 1690, 'D'], ['crusher', 2020, 2720, 'D'], ['watchpost', 1020, 1920, 'D'],
  ],
  cameras: [
    ['North Spoke', 1750, 900], ['East Spoke', 2500, 1500], ['South Spoke', 1780, 2100],
    ['West Spoke', 1200, 1500], ['Rock Gallery', 2450, 550],
  ],
  consoles: {
    emergency: { x: 1850, y: 1500 },
    security: { x: 1150, y: 2050 },
    reactorPanels: [{ x: 500, y: 2280 }, { x: 1000, y: 2600 }],
    o2Consoles: [{ x: 2700, y: 430 }, { x: 1550, y: 260 }],
    lightsPanel: { x: 1550, y: 2430 },
    commsPanel: { x: 3050, y: 1450 },
  },
  tasks: [
    ['asteroids', 'scanner', 1520, 260, 'Zap Debris Field'], ['navalign', 'scanner', 1980, 600],
    ['courseplot', 'scanner', 1750, 250, 'Map the Belt'],
    ['water', 'fungal', 2800, 750, 'Mist the Fungus'], ['prune', 'fungal', 3150, 500, 'Trim Overgrowth'],
    ['dial', 'fungal', 2650, 750, 'Adjust Spore Mix'],
    ['medscan', 'infirmary', 2550, 1050], ['blood', 'infirmary', 2400, 1120],
    ['decrypt', 'radio', 2820, 1350], ['antenna', 'radio', 3250, 1600], ['satellite', 'radio', 2800, 1700],
    ['keycard', 'bunks', 2650, 2280], ['lockers', 'bunks', 3150, 2280],
    ['chem', 'messhall', 2350, 1900, 'Brew the Stew'], ['manifest', 'messhall', 2700, 2050, 'Count Rations'],
    ['powerroute', 'crusher', 1500, 2700], ['sweep', 'crusher', 2050, 2700, 'Sweep Ore Dust'],
    ['pressure', 'crusher', 1900, 2400],
    ['reactbal', 'smelter', 700, 2650, 'Stabilize Smelter'], ['coolant', 'smelter', 450, 2450],
    ['fuel', 'smelter', 1050, 2280, 'Feed the Furnace'],
    ['wires', 'orestore', 350, 1350], ['batteries', 'orestore', 800, 1700], ['trash', 'orestore', 350, 1700, 'Dump Slag'],
    ['wires', 'drillshaft', 950, 400], ['filter', 'drillshaft', 450, 800, 'Unclog Drill Filter'],
    ['valves', 'drillshaft', 900, 550],
    ['wires', 'watchpost', 1350, 1900],
    ['upload', 'refinery', 2150, 1300], ['lightscal', 'refinery', 1550, 1300],
  ],
};

// ---------------------------------------------------------------------------
// MAP 4 — ABYSS STATION: a deep-sea laboratory. Three stacked decks joined
// by flooded shafts; navy-teal palette, kelp garden and a moon-pool sub dock.
// ---------------------------------------------------------------------------
const ABYSS = {
  id: 'Abyss',
  name: 'Abyss Station',
  blurb: 'A lab on the ocean floor — three decks, crushing pressure, no daylight.',
  width: 3200, height: 3200,
  spawn: { x: 1650, y: 1420 },
  safeRoom: 'control',
  palette: { corridor: '#152836', wall: '#2c4a5c', wallEdge: '#020608' },
  rooms: [
    { id: 'bridge',    name: 'Sonar Bridge',  theme: 'nav',      x: 350,  y: 250,  w: 600, h: 450, color: '#233a54' },
    { id: 'radio',     name: 'Radio Shack',   theme: 'comms',    x: 1250, y: 200,  w: 550, h: 450, color: '#302b4d' },
    { id: 'hydrolab',  name: 'Hydro Lab',     theme: 'lab',      x: 2100, y: 250,  w: 650, h: 450, color: '#1e3c46' },
    { id: 'kelp',      name: 'Kelp Garden',   theme: 'garden',   x: 2000, y: 850,  w: 500, h: 350, color: '#1e4034' },
    { id: 'control',   name: 'Control Room',  theme: 'hub',      x: 1300, y: 1300, w: 700, h: 500, color: '#24455c' },
    { id: 'sickbay',   name: 'Sick Bay',      theme: 'medical',  x: 350,  y: 1350, w: 600, h: 450, color: '#1d3d47' },
    { id: 'observation', name: 'Observation', theme: 'security', x: 2350, y: 1350, w: 600, h: 450, color: '#3a2f42' },
    { id: 'cabins',    name: 'Crew Cabins',   theme: 'bunks',    x: 600,  y: 2050, w: 550, h: 350, color: '#2b3d4c' },
    { id: 'supply',    name: 'Supply Hold',   theme: 'crates',   x: 2050, y: 2050, w: 550, h: 350, color: '#31392f' },
    { id: 'ballast',   name: 'Ballast Core',  theme: 'reactor',  x: 300,  y: 2450, w: 650, h: 500, color: '#3e2a33' },
    { id: 'turbine',   name: 'Turbine Room',  theme: 'engine',   x: 1300, y: 2500, w: 650, h: 450, color: '#3a3226' },
    { id: 'subdock',   name: 'Sub Dock',      theme: 'dock',     x: 2300, y: 2450, w: 650, h: 500, color: '#20364a' },
  ],
  corridors: [
    [920, 400, 360, 160],    // bridge–radio
    [1770, 400, 360, 160],   // radio–hydrolab
    [920, 1500, 410, 160],   // sickbay–control
    [1970, 1500, 410, 160],  // control–observation
    [920, 2600, 410, 160],   // ballast–turbine
    [1920, 2600, 410, 160],  // turbine–subdock
    [550, 670, 160, 710],    // west shaft: bridge → sickbay
    [700, 1770, 160, 310],   // sickbay → cabins
    [700, 2370, 160, 110],   // cabins → ballast
    [2250, 670, 160, 210],   // hydrolab → kelp
    [2350, 1170, 160, 210],  // kelp → observation
    [2400, 1770, 160, 310],  // observation → supply
    [2400, 2370, 160, 110],  // supply → subdock
    [1570, 620, 160, 710],   // center shaft: radio → control
    [1600, 1770, 160, 760],  // control → turbine
  ],
  doors: [
    ['bridge', 950, 400, 50, 160], ['bridge', 550, 680, 160, 50],
    ['radio', 1200, 400, 50, 160], ['radio', 1800, 400, 50, 160], ['radio', 1570, 640, 160, 50],
    ['hydrolab', 2060, 400, 50, 160], ['hydrolab', 2250, 680, 160, 50],
    ['sickbay', 550, 1330, 160, 50], ['sickbay', 950, 1500, 50, 160], ['sickbay', 700, 1790, 160, 50],
    ['observation', 2320, 1500, 50, 160], ['observation', 2350, 1330, 160, 50], ['observation', 2400, 1790, 160, 50],
    ['ballast', 950, 2600, 50, 160], ['ballast', 700, 2430, 160, 50],
    ['turbine', 1260, 2600, 50, 160], ['turbine', 1930, 2600, 50, 160], ['turbine', 1600, 2480, 160, 50],
    ['subdock', 2310, 2600, 50, 160], ['subdock', 2400, 2430, 160, 50],
    ['kelp', 2250, 830, 160, 50], ['kelp', 2350, 1170, 160, 50],
    ['cabins', 700, 2030, 160, 50], ['cabins', 700, 2370, 160, 50],
    ['supply', 2400, 2030, 160, 50], ['supply', 2400, 2370, 160, 50],
  ],
  vents: [
    ['bridge', 420, 320, 'A'], ['sickbay', 420, 1450, 'A'], ['ballast', 380, 2870, 'A'],
    ['hydrolab', 2680, 320, 'B'], ['kelp', 2430, 930, 'B'], ['observation', 2880, 1450, 'B'],
    ['radio', 1300, 260, 'C'], ['control', 1370, 1730, 'C'], ['turbine', 1370, 2870, 'C'],
    ['subdock', 2880, 2870, 'D'], ['supply', 2130, 2130, 'D'], ['cabins', 680, 2130, 'D'],
  ],
  cameras: [
    ['Deck One', 1100, 480], ['Upper Shaft', 1650, 1000], ['Deck Two', 2150, 1580],
    ['Lower Shaft', 1680, 2150], ['Deck Three', 1100, 2680],
  ],
  consoles: {
    emergency: { x: 1650, y: 1550 },
    security: { x: 2650, y: 1450 },
    reactorPanels: [{ x: 400, y: 2550 }, { x: 850, y: 2850 }],
    o2Consoles: [{ x: 2200, y: 1000 }, { x: 880, y: 300 }],
    lightsPanel: { x: 1850, y: 2550 },
    commsPanel: { x: 1700, y: 250 },
  },
  tasks: [
    ['asteroids', 'bridge', 400, 300, 'Ping the Deep'], ['courseplot', 'bridge', 900, 300, 'Chart the Trench'],
    ['navalign', 'bridge', 400, 650],
    ['decrypt', 'radio', 1300, 250, 'Decode Whale Song'], ['antenna', 'radio', 1750, 600], ['satellite', 'radio', 1320, 600, 'Aim the Array'],
    ['samples', 'hydrolab', 2150, 650, 'Test Water Samples'], ['chem', 'hydrolab', 2700, 650], ['dna', 'hydrolab', 2400, 300],
    ['upload', 'control', 1950, 1350], ['lightscal', 'control', 1350, 1350],
    ['medscan', 'sickbay', 650, 1600], ['blood', 'sickbay', 420, 1700],
    ['wires', 'observation', 2500, 1400],
    ['water', 'kelp', 2100, 1150, 'Feed the Kelp'], ['prune', 'kelp', 2450, 1100, 'Harvest Kelp'],
    ['dial', 'kelp', 2050, 900, 'Balance Salinity'],
    ['keycard', 'cabins', 650, 2100], ['lockers', 'cabins', 1100, 2300],
    ['wires', 'supply', 2100, 2100], ['batteries', 'supply', 2550, 2300], ['trash', 'supply', 2150, 2320],
    ['reactbal', 'ballast', 500, 2900, 'Trim the Ballast'], ['coolant', 'ballast', 900, 2500],
    ['fuel', 'turbine', 1350, 2900], ['powerroute', 'turbine', 1900, 2900], ['pressure', 'turbine', 1350, 2550],
    ['valves', 'subdock', 2350, 2500], ['manifest', 'subdock', 2900, 2500], ['sweep', 'subdock', 2600, 2900],
    ['filter', 'subdock', 2880, 2880, 'Clear the Moon Pool'],
  ],
};

// ---------------------------------------------------------------------------
// MAP 5 — AURORA SKYPORT: a luxury orbital resort. Grand atrium, casino,
// pool deck and suites over a dirty little engine level. Gold & violet.
// ---------------------------------------------------------------------------
const AURORA = {
  id: 'Aurora',
  name: 'Aurora Skyport',
  blurb: 'A five-star orbital resort. The champagne is real, the smiles are not.',
  width: 4400, height: 2400,
  spawn: { x: 2300, y: 1100 },
  safeRoom: 'atrium',
  palette: { corridor: '#2b2438', wall: '#5a4a6e', wallEdge: '#070409' },
  rooms: [
    { id: 'atrium',    name: 'Grand Atrium',   theme: 'hub',      x: 1900, y: 900,  w: 800, h: 700, color: '#3a2f52' },
    { id: 'bridge',    name: 'Bridge',         theme: 'nav',      x: 1950, y: 200,  w: 700, h: 400, color: '#2b3560' },
    { id: 'casino',    name: 'Casino',         theme: 'casino',   x: 500,  y: 300,  w: 750, h: 550, color: '#472c44' },
    { id: 'pooldeck',  name: 'Pool Deck',      theme: 'pool',     x: 350,  y: 1150, w: 700, h: 550, color: '#1f4152' },
    { id: 'spa',       name: 'Spa',            theme: 'medical',  x: 1300, y: 250,  w: 450, h: 400, color: '#2c4547' },
    { id: 'botanic',   name: 'Botanic Court',  theme: 'garden',   x: 2900, y: 250,  w: 650, h: 450, color: '#2b4430' },
    { id: 'broadcast', name: 'Broadcast Suite', theme: 'comms',   x: 3800, y: 300,  w: 500, h: 400, color: '#38305c' },
    { id: 'suites',    name: 'Royal Suites',   theme: 'bunks',    x: 3000, y: 1000, w: 600, h: 450, color: '#3c3550' },
    { id: 'secoffice', name: 'Security Office', theme: 'security', x: 3850, y: 1050, w: 450, h: 400, color: '#42313c' },
    { id: 'kitchen',   name: 'Kitchen',        theme: 'kitchen',  x: 2950, y: 1700, w: 550, h: 400, color: '#44392b' },
    { id: 'powercore', name: 'Power Core',     theme: 'reactor',  x: 450,  y: 1900, w: 650, h: 450, color: '#421f2e' },
    { id: 'enginepod', name: 'Engine Pod',     theme: 'engine',   x: 1400, y: 1950, w: 600, h: 400, color: '#3d3226' },
    { id: 'luggage',   name: 'Luggage Hold',   theme: 'crates',   x: 2300, y: 1950, w: 550, h: 400, color: '#37372f' },
  ],
  corridors: [
    [1220, 420, 130, 160],   // casino–spa
    [1720, 350, 280, 160],   // spa–bridge
    [2620, 380, 330, 160],   // bridge–botanic
    [3520, 420, 330, 160],   // botanic–broadcast
    [2220, 570, 160, 360],   // bridge–atrium
    [650, 820, 160, 360],    // casino–pool deck
    [1020, 1300, 910, 160],  // pool deck–atrium promenade
    [2670, 1150, 360, 160],  // atrium–suites
    [3570, 1150, 310, 160],  // suites–security
    [3950, 670, 160, 410],   // broadcast–security
    [2400, 1570, 160, 410],  // atrium–luggage
    [1970, 2100, 360, 160],  // luggage–engine pod
    [1070, 2100, 360, 160],  // engine pod–power core
    [600, 1670, 160, 260],   // power core–pool deck
    [2820, 1980, 160, 160],  // luggage–kitchen
    [3150, 1420, 160, 310],  // suites–kitchen
  ],
  doors: [
    ['casino', 1220, 420, 50, 160], ['casino', 650, 840, 160, 50],
    ['spa', 1300, 420, 50, 160], ['spa', 1730, 350, 50, 160],
    ['bridge', 1950, 350, 50, 160], ['bridge', 2620, 380, 50, 160], ['bridge', 2220, 590, 160, 50],
    ['botanic', 2900, 380, 50, 160], ['botanic', 3530, 420, 50, 160],
    ['broadcast', 3800, 420, 50, 160], ['broadcast', 3950, 690, 160, 50],
    ['pooldeck', 650, 1130, 160, 50], ['pooldeck', 1030, 1300, 50, 160], ['pooldeck', 600, 1680, 160, 50],
    ['suites', 2990, 1150, 50, 160], ['suites', 3580, 1150, 50, 160], ['suites', 3150, 1440, 160, 50],
    ['secoffice', 3830, 1150, 50, 160], ['secoffice', 3950, 1030, 160, 50],
    ['kitchen', 3150, 1690, 160, 50], ['kitchen', 2930, 1980, 50, 160],
    ['luggage', 2400, 1920, 160, 50], ['luggage', 2320, 2100, 50, 160], ['luggage', 2820, 1990, 50, 160],
    ['enginepod', 1960, 2100, 50, 160], ['enginepod', 1400, 2100, 50, 160],
    ['powercore', 1090, 2100, 50, 160], ['powercore', 600, 1880, 160, 50],
  ],
  vents: [
    ['casino', 600, 750, 'A'], ['pooldeck', 450, 1250, 'A'], ['powercore', 550, 2250, 'A'],
    ['spa', 1650, 300, 'B'], ['bridge', 2050, 250, 'B'], ['atrium', 1980, 1000, 'B'],
    ['botanic', 3480, 300, 'C'], ['broadcast', 4230, 650, 'C'], ['secoffice', 4230, 1400, 'C'],
    ['suites', 3550, 1050, 'D'], ['kitchen', 3020, 2050, 'D'], ['luggage', 2380, 2300, 'D'],
  ],
  cameras: [
    ['Bridge Lift', 2300, 780], ['Promenade', 1450, 1380], ['Service Lift', 2480, 1780],
    ['East Hall', 3720, 1230], ['Upper Deck', 2790, 460],
  ],
  consoles: {
    emergency: { x: 2300, y: 1250 },
    security: { x: 4050, y: 1250 },
    reactorPanels: [{ x: 560, y: 1980 }, { x: 1000, y: 2280 }],
    o2Consoles: [{ x: 3050, y: 350 }, { x: 2550, y: 270 }],
    lightsPanel: { x: 1500, y: 2020 },
    commsPanel: { x: 4050, y: 480 },
  },
  tasks: [
    ['manifest', 'casino', 1150, 380, 'Audit the Chips'], ['batteries', 'casino', 560, 380, 'Recharge Slot Machines'],
    ['sweep', 'casino', 900, 780, 'Sweep the Floor'],
    ['valves', 'pooldeck', 400, 1600], ['pressure', 'pooldeck', 950, 1250, 'Equalize the Pool'],
    ['water', 'pooldeck', 750, 1550, 'Water Deck Planters'],
    ['medscan', 'spa', 1500, 450, 'Relaxation Scan'], ['blood', 'spa', 1400, 300],
    ['navalign', 'bridge', 2000, 500], ['courseplot', 'bridge', 2600, 270], ['asteroids', 'bridge', 2450, 540, 'Clear Champagne Corks'],
    ['prune', 'botanic', 3480, 650], ['water', 'botanic', 2950, 650], ['dial', 'botanic', 3250, 300, 'Perfume the Air'],
    ['decrypt', 'broadcast', 3850, 350], ['antenna', 'broadcast', 4250, 350], ['satellite', 'broadcast', 3870, 640],
    ['upload', 'atrium', 2650, 950, 'Upload Guest Reviews'], ['lightscal', 'atrium', 1950, 1550, 'Tune Mood Lighting'],
    ['lockers', 'suites', 3550, 1400, 'Tidy the Suites'], ['keycard', 'suites', 3050, 1050],
    ['wires', 'secoffice', 3900, 1100],
    ['chem', 'kitchen', 3000, 1800, 'Mix the Sauce'], ['filter', 'kitchen', 3400, 1800, 'Degrease the Fryer'],
    ['trash', 'kitchen', 3200, 2050],
    ['reactbal', 'powercore', 700, 2300], ['coolant', 'powercore', 900, 1950], ['fuel', 'powercore', 1000, 2150],
    ['powerroute', 'enginepod', 1900, 2050], ['fuel', 'enginepod', 1450, 2250],
    ['wires', 'luggage', 2350, 2050], ['dna', 'luggage', 2800, 2050, 'Scan Lost Luggage'],
  ],
};

export const MAP_DEFS = [MERIDIAN, KEPLER, HIVE, ABYSS, AURORA];
