// hud.js — the chrome around the map: meters, seed chip, prompt strip,
// toolbelt, glyph legend. Pure rendering + callbacks; no game rules.

import { RUN } from './config.js';
import {
  boltIcon, clockIcon, copyIcon, retransmitIcon, stormIcon, drizzleIcon,
  staticIcon, checksumIcon, repairIcon, rerouteIcon, bufferIcon, rapidsIcon,
  speakerIcon,
} from './icons.js';
import { isMuted, toggleMute } from './sound.js';

const $ = (sel) => document.querySelector(sel);

export function renderMeters(run) {
  const meter = (elm, icon, total, current) => {
    elm.innerHTML = `${icon}<span class="pips">${Array.from({ length: total },
      (_, i) => `<span class="pip ${i < current ? 'full' : 'spent'}"></span>`).join('')}</span>`;
  };
  meter($('#meter-bandwidth'), boltIcon(16),
    Math.max(RUN.startBandwidth, run.bandwidth), run.bandwidth);
  meter($('#meter-deadline'), clockIcon(16),
    Math.max(RUN.startDeadline, run.deadline), Math.max(0, run.deadline));
  $('#seed-chip').textContent = `SEED · ${run.seed}`;
}

const PROMPT_ICONS = {
  storm: () => stormIcon(22),
  drizzle: () => drizzleIcon(22),
  static: () => staticIcon(22),
  bolt: () => boltIcon(22),
  clock: () => clockIcon(22),
  copy: () => copyIcon(22, 'var(--copy)'),
  retransmit: () => retransmitIcon(22),
  checksum: () => checksumIcon(22),
  repair: () => repairIcon(22),
};

export function setPrompt(icon, html) {
  $('#prompt').innerHTML =
    `<span class="prompt-icon">${PROMPT_ICONS[icon]?.() ?? ''}</span><span>${html}</span>`;
}

// A transient notice: flashes the prompt border to draw the eye.
export function flashPrompt(icon, html) {
  setPrompt(icon, html);
  const p = $('#prompt');
  p.classList.remove('flash');
  void p.offsetWidth; // restart the animation
  p.classList.add('flash');
}

// The belt is icon-first (design/06): icon + cost badges; the tool's name and
// tooltip land in the prompt when armed. Disabled state comes from the
// engine's legal actions (unaffordable/no-target = greyed, build card #11).
export const BELT_TOOLS = {
  duplicate: {
    label: 'Duplicate', icon: () => copyIcon(22, 'var(--copy)'),
    costs: () => `<span>${boltIcon(11)}3</span>`,
  },
  retransmit: {
    label: 'Retransmit', icon: () => retransmitIcon(22),
    costs: () => `<span>${boltIcon(11)}2</span><span>${clockIcon(11)}1</span>`,
  },
  checksum: {
    label: 'Checksum', icon: () => checksumIcon(22),
    costs: () => `<span>${boltIcon(11)}1</span>`,
  },
  repair: {
    label: 'Repair', icon: () => repairIcon(22),
    costs: () => `<span>${boltIcon(11)}2</span>`,
  },
  reroute: {
    label: 'Re-route', icon: () => rerouteIcon(22),
    costs: () => `<span>${clockIcon(11)}1</span>`,
  },
  buffer: {
    label: 'Buffer', icon: () => bufferIcon(22),
    costs: () => `<span>on</span>`,
    passive: true,
  },
};

export { rapidsIcon }; // re-exported for the prompt icon map

export function renderBelt({ tools, legal, armed, canGo, onArm, onGo, onWait }) {
  const buttons = tools.map((name) => {
    const tool = BELT_TOOLS[name];
    if (tool.passive) {
      return `<button class="tool-btn passive" id="tool-${name}" disabled
        aria-label="${tool.label} — always on" title="${tool.label} — always on">
        ${tool.icon()}<span class="cost">${tool.costs()}</span>
      </button>`;
    }
    const enabled = legal.some((a) => a.type === name);
    return `<button class="tool-btn ${armed === name ? 'armed' : ''}" id="tool-${name}"
      aria-label="${tool.label}" title="${tool.label}" ${enabled ? '' : 'disabled'}>
      ${tool.icon()}<span class="cost">${tool.costs()}</span>
    </button>`;
  }).join('');
  const canWait = legal.some((a) => a.type === 'wait');
  const waitBtn = canWait
    ? `<button class="go-btn wait-btn" id="wait">Wait</button>` : '';
  $('#belt').innerHTML =
    `${buttons}${waitBtn}<button class="go-btn" id="go" ${canGo ? '' : 'disabled'}>Onward</button>`;
  for (const name of tools) {
    if (!BELT_TOOLS[name].passive) {
      $(`#tool-${name}`).addEventListener('click', () => onArm(name));
    }
  }
  if (canWait) $('#wait').addEventListener('click', onWait);
  $('#go').addEventListener('click', onGo);
}

export const REWARD_CARDS = {
  checksum: { icon: () => checksumIcon(26), name: 'Checksum', line: 'Find a scrambled fragment.' },
  repair: { icon: () => repairIcon(26), name: 'Repair', line: 'Fix a scrambled fragment.' },
  buffer: { icon: () => bufferIcon(26), name: 'Buffer', line: 'Waiting for stragglers costs half.' },
  reroute: { icon: () => rerouteIcon(26), name: 'Re-route', line: 'Go back and try the other road.' },
  bandwidth: { icon: () => boltIcon(26), name: '+3 Energy', line: 'A top-up, right now.' },
};

export function wireMute() {
  const btn = document.querySelector('#mute');
  const paint = () => { btn.innerHTML = speakerIcon(18, !isMuted()); };
  btn.addEventListener('click', () => { toggleMute(); paint(); });
  paint();
}

// The glyph legend: a tap-toggled popover, never a modal (design/06).
export function wireLegend() {
  const chip = $('#glyph-legend');
  chip.addEventListener('click', () => {
    const existing = $('.legend-pop');
    if (existing) { existing.remove(); return; }
    const pop = document.createElement('div');
    pop.className = 'legend-pop';
    pop.innerHTML = [
      [stormIcon(20), 'Storm — the fragments it names are at risk'],
      [drizzleIcon(20), 'Drizzle — a lighter storm, one fragment at risk'],
      ['<svg width="20" height="8" viewBox="0 0 40 8">' +
        [0, 1, 2, 3].map((i) => `<circle cx="${5 + i * 10}" cy="4" r="3" fill="var(--ink-soft)"/>`).join('') +
        '</svg>', 'Dots — how many hops the road takes'],
      [boltIcon(20), 'Relay — a friendly antenna tops up your energy'],
      ['<svg width="20" height="14" viewBox="0 0 20 14">' +
        '<ellipse cx="10" cy="7" rx="9" ry="6" fill="var(--fog)"/></svg>',
        'Mist — the last stretch is a mystery until you get close'],
    ].map(([icon, text]) => `<div class="row">${icon}<span>${text}</span></div>`).join('');
    $('#stage').append(pop);
  });
}
