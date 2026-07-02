// hud.js — the chrome around the map: meters, seed chip, prompt strip,
// toolbelt, glyph legend. Pure rendering + callbacks; no game rules.

import { RUN } from './config.js';
import {
  boltIcon, clockIcon, copyIcon, retransmitIcon, stormIcon, drizzleIcon,
} from './icons.js';

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
  bolt: () => boltIcon(22),
  clock: () => clockIcon(22),
  copy: () => copyIcon(22, 'var(--copy)'),
  retransmit: () => retransmitIcon(22),
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

// Belt: Duplicate + Duplicate targets / Retransmit / Onward. Disabled state
// comes from the engine's legal actions (unaffordable = greyed, build card #11).
export function renderBelt({ legal, armed, canGo, onArm, onGo }) {
  const canDup = legal.some((a) => a.type === 'duplicate');
  const canRetx = legal.some((a) => a.type === 'retransmit');
  $('#belt').innerHTML = `
    <button class="tool-btn ${armed === 'duplicate' ? 'armed' : ''}" id="tool-duplicate"
      ${canDup ? '' : 'disabled'}>
      ${copyIcon(20, 'var(--copy)')}<span>Duplicate</span>
      <span class="cost"><span>${boltIcon(11)}3</span></span>
    </button>
    <button class="tool-btn ${armed === 'retransmit' ? 'armed' : ''}" id="tool-retransmit"
      ${canRetx ? '' : 'disabled'}>
      ${retransmitIcon(20)}<span>Retransmit</span>
      <span class="cost"><span>${boltIcon(11)}2</span><span>${clockIcon(11)}1</span></span>
    </button>
    <button class="go-btn" id="go" ${canGo ? '' : 'disabled'}>Onward</button>`;
  $('#tool-duplicate').addEventListener('click', () => onArm('duplicate'));
  $('#tool-retransmit').addEventListener('click', () => onArm('retransmit'));
  $('#go').addEventListener('click', onGo);
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
      [stormIcon(20), 'Storm — sweeps away the fragments it names'],
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
