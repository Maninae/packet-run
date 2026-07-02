// screens.js — the three overlay screens: start (mission), win (the render —
// the emotional payoff), loss (one honest line + retry; full autopsy is 1b).
// Kid-facing copy: ≤2 short sentences per beat, 6th-grade level (design/06).

import { pipAvatar, letterIcon, callIcon } from './icons.js';
import { REWARD_CARDS, BELT_TOOLS } from './hud.js';

const $ = (sel) => document.querySelector(sel);

// The payload: five lines for five fragments — the message IS the party.
export const MESSAGE_LINES = [
  'Dear Grandma,',
  'HAPPY BIRTHDAY!!',
  'I miss you so much.',
  'I baked you a cake — save me a slice?',
  'Love, me',
];

function grandmaSVG(size = 72) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 72 72" class="grandma-react" aria-hidden="true">
    <circle cx="36" cy="40" r="22" fill="#f6d7b8"/>
    <path d="M14 40 a22 22 0 0 1 44 0" fill="#e8e6e3"/>
    <circle cx="36" cy="16" r="8" fill="#e8e6e3"/>
    <circle cx="28" cy="40" r="6.5" fill="none" stroke="#6b5d4f" stroke-width="2"/>
    <circle cx="44" cy="40" r="6.5" fill="none" stroke="#6b5d4f" stroke-width="2"/>
    <path d="M34.5 40 h3" stroke="#6b5d4f" stroke-width="2"/>
    <circle cx="28" cy="40" r="1.6" fill="#4a4038"/>
    <circle cx="44" cy="40" r="1.6" fill="#4a4038"/>
    <path d="M29 51 q7 6 14 0" fill="none" stroke="#b0685c" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M58 22 c3-4 8-2 8 2 0 4-8 8-8 8 s-8-4-8-8 c0-4 5-6 8-2z" fill="#e05a7a"/>
    <path d="M12 14 c2-3 6-1.5 6 1.5 0 3-6 6-6 6 s-6-3-6-6 c0-3 4-4.5 6-1.5z" fill="#e05a7a" opacity="0.8"/>
  </svg>`;
}

function starsSVG(stars) {
  const star = (filled) => `<svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.5 14.9 8.6 21.5 9.5 16.7 14.1 17.9 20.7 12 17.5 6.1 20.7 7.3 14.1 2.5 9.5 9.1 8.6z"
      fill="${filled ? 'var(--star)' : 'var(--surface-2)'}"
      stroke="${filled ? 'var(--star)' : 'var(--wire-lit)'}" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`;
  return `<div class="win-stars" data-stars="${stars}" aria-label="${stars} star delivery">
    ${[1, 2, 3].map((n) => star(n <= stars)).join('')}</div>`;
}

// After the first win, the kid picks what they're sending — two payloads,
// two strategies. TCP/UDP are never named here (vocab rule, design/06).
export function showStart({ seed, showPicker, payload = 'tcp-file', gentle, onPlay, onGentle, onDaily }) {
  const picker = showPicker
    ? `<div class="reward-cards payload-cards">
        <button class="reward-card" data-payload="tcp-file">
          ${letterIcon(30)}<strong>Birthday message</strong>
          <span>Every piece must arrive.</span>
        </button>
        <button class="reward-card" data-payload="udp-call">
          ${callIcon(30)}<strong>Live call</strong>
          <span>Keep it moving — skip stragglers.</span>
        </button>
      </div>`
    : `<div class="btn-row"><button class="primary-btn" data-payload="${payload}">Deliver it!</button></div>`;
  $('#overlay').innerHTML = `
    <div class="screen start-screen">
      <div class="float">${pipAvatar(72)}</div>
      <h1>Packet Run</h1>
      <p><strong>${showPicker ? 'What are we sending Grandma today?' : "Grandma's birthday message is ready to go."}</strong><br>
      It travels as 5 fragments — you're Pip, their guide.
      ${showPicker ? '' : 'Get all 5 across the internet before her bedtime.'}</p>
      ${picker}
      <div class="start-extras">
        <label class="gentle-toggle">
          <input type="checkbox" id="gentle" ${gentle ? 'checked' : ''}>
          Gentle mode
        </label>
        <button class="ghost-btn daily-btn" id="daily">Today's run</button>
      </div>
      <span class="seed-note">SEED · ${seed}</span>
    </div>`;
  for (const btn of document.querySelectorAll('#overlay [data-payload]')) {
    btn.addEventListener('click', () => {
      $('#overlay').replaceChildren();
      onPlay(btn.dataset.payload);
    });
  }
  $('#gentle').addEventListener('change', (e) => onGentle(e.target.checked));
  $('#daily').addEventListener('click', () => {
    $('#overlay').replaceChildren();
    onDaily();
  });
}

// Panic-copying wins but wastes energy — make the waste legible (fun-gate
// review, Gate 2) without scolding: it's the star meter's tuition.
function wasteLine(run) {
  const tossed = run.events.find((e) => e.type === 'copies-discarded');
  if (!tossed) return '';
  const n = tossed.fragments.length;
  return `<p class="stat-line">The dock tossed ${n} spare ${n === 1 ? 'copy' : 'copies'}
    it never needed — energy you can keep next time.</p>`;
}

// A live call's render: the call PLAYS, with visible glitch bars where
// frames were skipped — your choices are legible in the win (design/05).
function callFrames(run) {
  return `<div class="call-frames">${run.fragments.map((f) => {
    const played = f.status === 'with-party' && !f.corrupted;
    return played
      ? `<div class="call-frame played">${grandmaSVG(34)}</div>`
      : `<div class="call-frame gap" aria-label="skipped frame"></div>`;
  }).join('')}</div>`;
}

export function showWin({ run, onNewRun, onSameSeed }) {
  const slack = run.deadline;
  const isCall = run.payload === 'udp-call';
  const delivered = run.events.find((e) => e.type === 'render')?.delivered ?? 5;
  const body = isCall
    ? `${callFrames(run)}
       <p class="stat-line">The call played — ${delivered}/5 frames, a little glitchy, all love.
         ${slack} tick${slack === 1 ? '' : 's'} to spare, ${run.bandwidth} energy left.</p>`
    : `<div class="message-card">${MESSAGE_LINES.map((line, i) =>
        `<div class="win-line" style="animation-delay:${0.15 + i * 0.4}s">${line}</div>`).join('')}
      </div>
      ${grandmaSVG()}
      <p class="stat-line">All 5 fragments made it with ${slack} tick${slack === 1 ? '' : 's'}
        of bedtime to spare and ${run.bandwidth} energy left.</p>`;
  $('#overlay').innerHTML = `
    <div class="screen win-screen">
      <h2>${isCall ? 'The call connected!' : 'It rendered!'}</h2>
      ${starsSVG(run.stars)}
      ${body}
      ${wasteLine(run)}
      <div class="btn-row">
        <button class="primary-btn new-run">New run</button>
        <button class="ghost-btn same-seed">Same seed</button>
      </div>
      <span class="seed-note">SEED · ${run.seed}</span>
    </div>`;
  $('#overlay .new-run').addEventListener('click', onNewRun);
  $('#overlay .same-seed').addEventListener('click', onSameSeed);
}

// What killed the run, honestly and without moralizing. Attribution matches
// the autopsy: the LAST impact is the killer, not the first (1b review).
function listIds(ids) {
  if (ids.length <= 2) return ids.join(' and ');
  return `${ids.slice(0, -1).join(', ')}, and ${ids.at(-1)}`;
}

function lossLine(run) {
  const isCall = run.payload === 'udp-call';
  if (run.failure.reason === 'missing-fragments') {
    if (isCall) {
      return `Too many frames went missing — a call needs 3 of 5.
        This happens on real calls all the time.`;
    }
    const missing = run.fragments.filter((f) => f.status !== 'with-party').map((f) => `#${f.id}`);
    const kind = run.lastImpact?.kind ?? 'storm';
    return `The ${kind} got ${listIds(missing)} — the message couldn't finish.
      This happens on the real internet all the time.`;
  }
  if (run.failure.reason === 'corrupted-payload') {
    return "The dock caught a scrambled fragment — the message couldn't render.";
  }
  return isCall
    ? 'The call dropped — too slow, too late.'
    : 'Bedtime came before the message did.';
}

const CONCEPT_NAMES = {
  'packet-loss': 'packet loss',
  latency: 'lag',
  corruption: 'scrambled data',
};

// The loss autopsy card (design/06): what killed → which concept → which tool
// might have saved you → the real-internet line → hint retry.
// Pick-1-of-3 at a mid-map junction (design/03). When the belt is full,
// tapping a tool card opens the swap row: tap what it replaces.
export function showReward({ options, belt, beltFull, onTake }) {
  $('#overlay').innerHTML = `
    <div class="screen reward-screen">
      <h2>A relay station!</h2>
      <p>Pick one for your belt.</p>
      <div class="reward-cards">${options.map((o, i) => {
        const card = REWARD_CARDS[o.kind === 'tool' ? o.tool : 'bandwidth'];
        return `<button class="reward-card" data-index="${i}"
          data-reward-kind="${o.kind}" ${o.kind === 'tool' ? `data-tool="${o.tool}"` : ''}>
          ${card.icon()}<strong>${card.name}</strong><span>${card.line}</span>
        </button>`;
      }).join('')}</div>
      <div class="swap-row" hidden>
        <p>Your belt is full — tap what it replaces:</p>
        <div class="btn-row swap-choices"></div>
      </div>
    </div>`;
  for (const cardEl of document.querySelectorAll('.reward-card')) {
    cardEl.addEventListener('click', () => {
      const index = Number(cardEl.dataset.index);
      if (cardEl.dataset.rewardKind !== 'tool' || !beltFull) {
        onTake({ index });
        return;
      }
      const row = $('.swap-row');
      row.hidden = false;
      const choices = $('.swap-choices');
      choices.innerHTML = belt.map((t) =>
        `<button class="ghost-btn" data-replace="${t}">${BELT_TOOLS[t].label}</button>`).join('');
      for (const b of choices.querySelectorAll('button')) {
        b.addEventListener('click', () => onTake({ index, replace: b.dataset.replace }));
      }
    });
  }
}

// A "?" card (design/04): pure text + one choice, both options priced.
export function showEvent({ card, legalOptions, onChoose }) {
  $('#overlay').innerHTML = `
    <div class="screen event-screen">
      <h2>${card.title}</h2>
      <p>${card.text}</p>
      <div class="reward-cards">${card.options.map((option, i) =>
        `<button class="reward-card" data-event-option="${i}"
           ${legalOptions.includes(i) ? '' : 'disabled'}>
           <strong>${option.label}</strong>
         </button>`).join('')}
      </div>
    </div>`;
  for (const btn of document.querySelectorAll('[data-event-option]')) {
    btn.addEventListener('click', () => {
      $('#overlay').replaceChildren();
      onChoose(Number(btn.dataset.eventOption));
    });
  }
}

export function showLoss({ run, autopsy, onNewRun, onSameSeed, onHint }) {
  $('#overlay').innerHTML = `
    <div class="screen loss-screen">
      <svg width="64" height="64" viewBox="-14 -14 28 28" aria-hidden="true">
        <path d="M0 -10 Q3.5 -3.5 10 0 Q3.5 3.5 0 10 Q-3.5 3.5 -10 0 Q-3.5 -3.5 0 -10 Z"
          fill="var(--pip)" opacity="0.75" transform="scale(1.25)"/>
        <circle cx="-2.6" cy="-1" r="1.2" fill="#3a2c00"/>
        <circle cx="2.6" cy="-1" r="1.2" fill="#3a2c00"/>
        <path d="M-2.4 3.4 q2.4 -2.2 4.8 0" fill="none" stroke="#3a2c00"
          stroke-width="1.1" stroke-linecap="round"/>
      </svg>
      <p class="loss-line">${lossLine(run)}</p>
      <p class="stat-line">That was <strong>${CONCEPT_NAMES[autopsy.killerConcept]}</strong>.
        ${autopsy.toolLine}</p>
      <p class="stat-line concept-line">${autopsy.conceptLine}</p>
      <div class="btn-row">
        <button class="primary-btn hint-retry">Try with a hint</button>
        <button class="ghost-btn same-seed">Same seed</button>
        <button class="ghost-btn new-run">New run</button>
      </div>
      <span class="seed-note">SEED · ${run.seed}</span>
    </div>`;
  $('#overlay .new-run').addEventListener('click', onNewRun);
  $('#overlay .same-seed').addEventListener('click', onSameSeed);
  $('#overlay .hint-retry').addEventListener('click', onHint);
}
