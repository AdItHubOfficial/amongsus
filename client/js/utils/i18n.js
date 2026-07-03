// =============================================================
// AMONGSUS client — localization. English is complete; other
// languages fall back to English per-key. Add a language by
// adding a dictionary here and an <option> in Settings.
// =============================================================

const STRINGS = {
  en: {
    tagline: 'Trust no one aboard the ISV Meridian',
    customize: 'Customize', profile: 'Profile', settings: 'Settings', how: 'How to Play',
    players: 'Players', chat: 'Chat', matchSettings: 'Match Settings', public: 'Public',
    totalTasks: 'TOTAL TASKS', shipMap: 'ISV MERIDIAN — DECK MAP', sabotage: 'SABOTAGE',
    lockDoors: 'LOCK DOORS', security: 'SECURITY FEED',
    audio: 'Audio', video: 'Video', controls: 'Controls', access: 'Accessibility',
    volMaster: 'Master Volume', volMusic: 'Music', volSfx: 'Effects',
    graphics: 'Graphics Quality', fpsLimit: 'FPS Limit', screenShake: 'Screen Shake',
    fullscreen: 'Fullscreen', colorblind: 'Colorblind Mode (letter badges)',
    reduceFlash: 'Reduce Flashing', language: 'Language',
    moveHint: 'Move with WASD or Arrow Keys. Click a binding to rebind.',
    reconnecting: 'Reconnecting to the Meridian…',
    stats: 'Statistics', dailies: 'Daily Challenges', achievements: 'Achievements',
    publicGames: 'Public Games', color: 'Color', hat: 'Hat', pet: 'Pet', skin: 'Skin',
    nameplate: 'Nameplate',
    ghostHint: "You're a ghost — finish your tasks! Walls can't stop you.",
    emergencyMeeting: 'EMERGENCY MEETING', bodyReported: 'DEAD BODY REPORTED',
    victory: 'VICTORY', defeat: 'DEFEAT', crewWins: 'CREW WINS', impostorWins: 'IMPOSTORS WIN',
    youDied: 'YOU WERE ELIMINATED',
    discussion: 'Discussion', voting: 'Voting — click a card to vote', reveal: 'Votes are in',
    skipVote: 'SKIP VOTE', use: 'Use', report: 'Report',
  },
  es: {
    tagline: 'No confíes en nadie a bordo del ISV Meridian',
    customize: 'Personalizar', profile: 'Perfil', settings: 'Ajustes', how: 'Cómo jugar',
    players: 'Jugadores', chat: 'Chat', matchSettings: 'Ajustes de partida', public: 'Pública',
    totalTasks: 'TAREAS TOTALES', sabotage: 'SABOTAJE', lockDoors: 'CERRAR PUERTAS',
    security: 'CÁMARAS', audio: 'Audio', video: 'Vídeo', controls: 'Controles',
    access: 'Accesibilidad', volMaster: 'Volumen general', volMusic: 'Música', volSfx: 'Efectos',
    graphics: 'Calidad gráfica', fpsLimit: 'Límite de FPS', screenShake: 'Vibración de pantalla',
    fullscreen: 'Pantalla completa', colorblind: 'Modo daltónico (insignias)',
    reduceFlash: 'Reducir destellos', language: 'Idioma',
    reconnecting: 'Reconectando con el Meridian…',
    stats: 'Estadísticas', dailies: 'Retos diarios', achievements: 'Logros',
    publicGames: 'Partidas públicas', color: 'Color', hat: 'Sombrero', pet: 'Mascota',
    skin: 'Traje', nameplate: 'Placa',
    ghostHint: 'Eres un fantasma: ¡termina tus tareas! Las paredes no te detienen.',
    emergencyMeeting: 'REUNIÓN DE EMERGENCIA', bodyReported: 'CUERPO ENCONTRADO',
    victory: 'VICTORIA', defeat: 'DERROTA', crewWins: 'GANA LA TRIPULACIÓN',
    impostorWins: 'GANAN LOS IMPOSTORES', youDied: 'HAS SIDO ELIMINADO',
    discussion: 'Debate', voting: 'Votación — pulsa una carta para votar', reveal: 'Votos contados',
    skipVote: 'SALTAR VOTO',
  },
};

let lang = 'en';

export function setLang(l) {
  lang = STRINGS[l] ? l : 'en';
  applyI18n();
}

export function t(key) {
  return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
}

/** Re-translate all static elements tagged with data-i18n. */
export function applyI18n() {
  for (const node of document.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n);
  }
}
