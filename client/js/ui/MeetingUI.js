// =============================================================
// AMONGSUS client — meetings: animated player cards, voting with
// confirmation, vote reveal with pips, chat, timers, ejection.
// =============================================================

import { App } from '../state.js';
import { $, el, show, hide, fmtSecs } from '../utils/dom.js';
import { EMOTES, MEETING_PHASES } from '/shared/constants.js';
import { makePortrait, colorHex } from '../game/CharacterRenderer.js';
import { appendChat } from './LobbyUI.js';
import { meetingFlash, ejectScene } from './Cutscenes.js';
import { sfx } from '../audio/AudioEngine.js';
import { record } from '../progression/Progression.js';

let current = null;   // last payload
let receivedAt = 0;
let open = false;
let myVote = null;
let ejectPlayed = false;

export function initMeeting() {
  const send = () => {
    const inp = $('#meeting-chat-input');
    if (!inp.value.trim()) return;
    App.conn.chat(inp.value.trim());
    record('chat');
    inp.value = '';
  };
  $('#btn-meeting-send').onclick = send;
  $('#meeting-chat-input').addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') send();
  });
  const emojiRow = $('#meeting-emoji-row');
  for (const e of EMOTES) {
    const b = el('button', '', e);
    b.onclick = () => { $('#meeting-chat-input').value += e; };
    emojiRow.appendChild(b);
  }
  $('#btn-skip-vote').onclick = () => castVote('skip');
}

export function isMeetingOpen() { return open; }

export async function handleMeeting(payload) {
  const g = App.game;
  if (!g) return;

  if (payload.phase === 'votesUpdate') {
    if (current) { current.voted = payload.voted; renderCards(); updateVotedLabel(); }
    return;
  }
  if (payload.phase === 'end') {
    open = false;
    current = null;
    hide('#overlay-meeting');
    return;
  }

  const isNew = !open;
  current = payload;
  receivedAt = performance.now();

  if (isNew) {
    open = true;
    myVote = null;
    ejectPlayed = false;
    $('#meeting-chat-log').innerHTML = '';
    g.onMeetingPhase({ phase: 'discussion', players: payload.players });
    await meetingFlash(payload.reason);
    if (!open) return; // meeting may have ended during the flash
    show('#overlay-meeting');
  }

  $('#meeting-reason').textContent =
    payload.reason === 'body' ? 'DEAD BODY REPORTED' : 'EMERGENCY MEETING';

  if (payload.phase === MEETING_PHASES.DISCUSSION) {
    $('#meeting-phase-label').textContent = 'Discussion — talk it out';
    hide('#btn-skip-vote');
  } else if (payload.phase === MEETING_PHASES.VOTING) {
    $('#meeting-phase-label').textContent = 'Voting — click a card to vote';
    if (g.you.alive) show('#btn-skip-vote');
    sfx('meeting');
  } else if (payload.phase === MEETING_PHASES.REVEAL) {
    $('#meeting-phase-label').textContent = 'Votes are in';
    hide('#btn-skip-vote');
    if (!ejectPlayed) {
      ejectPlayed = true;
      setTimeout(() => playEject(payload), 3800);
    }
  }
  renderCards();
  updateVotedLabel();
}

async function playEject(payload) {
  const g = App.game;
  const r = payload.reveal;
  if (!r || !open) return;
  hide('#overlay-meeting');
  const pl = r.ejected ? g.players.get(r.ejected) : null;
  if (pl) {
    pl.alive = false;
    if (r.ejected === g.youPid) { g.you.alive = false; record('ejectedYou'); }
  }
  await ejectScene(pl ? pl.name : null, pl ? pl.cosmetics : null, r.wasImpostor, r.confirm, r.tie);
  if (r.confirm && r.ejected && r.remainingImpostors !== null && open) {
    // brief impostor count note handled by cutscene sub text already
  }
}

function castVote(target) {
  const g = App.game;
  if (!g || !g.you.alive || myVote !== null) return;
  if (!current || current.phase !== MEETING_PHASES.VOTING) return;
  myVote = target;
  App.conn.vote(target);
  sfx('vote');
  renderCards();
}

function renderCards() {
  const g = App.game;
  if (!current || !g) return;
  const wrap = $('#meeting-cards');
  wrap.innerHTML = '';
  const voting = current.phase === MEETING_PHASES.VOTING;
  const reveal = current.phase === MEETING_PHASES.REVEAL ? current.reveal : null;
  const canVote = voting && g.you.alive && myVote === null;

  current.players.forEach((p, i) => {
    const card = el('div', 'meet-card');
    card.style.animationDelay = (i * 0.05) + 's';
    card.dataset.pid = p.pid;
    if (!p.alive) card.classList.add('dead');
    if (p.alive && canVote && p.pid !== g.youPid) card.classList.add('votable');
    if (myVote === p.pid) card.classList.add('selected');

    card.appendChild(makePortrait(p.cosmetics).cloneNode(true));
    // cloneNode on canvas loses pixels — draw portrait into a fresh canvas instead
    card.firstChild.remove();
    const pc = makePortrait(p.cosmetics);
    const cv = document.createElement('canvas');
    cv.width = pc.width; cv.height = pc.height;
    cv.getContext('2d').drawImage(pc, 0, 0);
    card.prepend(cv);

    const name = el('span', 'meet-name', p.name + (p.isBot ? ' 🤖' : ''));
    if (p.pid === current.reporter) name.textContent += ' 📢';
    card.appendChild(name);

    const sub = el('span', 'meet-sub');
    if ((current.voted || []).includes(p.pid) && p.alive && !reveal) {
      sub.appendChild(el('span', 'voted-stamp', 'VOTED'));
    }
    card.appendChild(sub);

    // vote pips on reveal
    if (reveal) {
      const pips = el('span', 'vote-pips');
      if (reveal.votes) {
        reveal.votes.filter(v => v.target === p.pid).forEach((v, k) => {
          const voter = g.players.get(v.voter);
          const pip = el('span', 'vote-pip');
          pip.style.background = voter ? colorHex(voter.cosmetics.color) : '#888';
          pip.style.animationDelay = (k * 0.15) + 's';
          pips.appendChild(pip);
        });
      } else {
        const n = reveal.counts[p.pid] || 0;
        for (let k = 0; k < n; k++) {
          const pip = el('span', 'vote-pip');
          pip.style.background = '#8b98b0';
          pip.style.animationDelay = (k * 0.15) + 's';
          pips.appendChild(pip);
        }
      }
      card.appendChild(pips);
      if (reveal.ejected === p.pid) card.classList.add('selected');
    }

    if (p.alive && canVote && p.pid !== g.youPid) {
      card.onclick = () => showConfirm(card, p.pid);
    }
    wrap.appendChild(card);
  });

  // skip pips on reveal
  if (reveal) {
    const skipRow = el('div', 'meet-card');
    skipRow.appendChild(el('span', 'meet-name', `Skipped: ${reveal.counts.skip || 0}`));
    wrap.appendChild(skipRow);
  }
}

function showConfirm(card, pid) {
  if (card.querySelector('.confirm-vote')) return;
  const conf = el('div', 'confirm-vote');
  const yes = el('button', 'btn btn-small btn-danger', 'VOTE');
  const no = el('button', 'btn btn-small', 'CANCEL');
  yes.onclick = (e) => { e.stopPropagation(); castVote(pid); };
  no.onclick = (e) => { e.stopPropagation(); conf.remove(); };
  conf.append(yes, no);
  card.appendChild(conf);
}

function updateVotedLabel() {
  if (!current) return;
  const alive = current.players.filter(p => p.alive).length;
  const voted = (current.voted || []).length;
  $('#meeting-voted-label').textContent =
    current.phase === MEETING_PHASES.VOTING ? `${voted}/${alive} votes cast` : '';
}

/** Countdown — called every frame from the main loop. */
export function updateMeetingTimer() {
  if (!open || !current) return;
  const remain = Math.max(0, (current.remainMs || 0) - (performance.now() - receivedAt));
  $('#meeting-timer').textContent = fmtSecs(remain);
}

export function addMeetingChat(msg) {
  appendChat($('#meeting-chat-log'), msg);
  // speaking indicator
  if (msg.from) {
    const card = $(`#meeting-cards .meet-card[data-pid="${msg.from}"]`);
    if (card) {
      card.classList.add('speaking');
      setTimeout(() => card.classList.remove('speaking'), 1200);
    }
  }
}
