// main.js — bootstrap + wiring only. No game rules live here.
// CURRENT STATE: Gate 1 portrait mock — renders the hardest screen (junction
// beat: meters, map with both roads' glyph chips, prompt, party, belt) with
// mock-level interactivity (road tap → highlight). Engine wiring is Phase 1a.

import { createRun } from './engine.js';
import { renderMap } from './map.js';
import { renderParty, renderPartyRow } from './party.js';
import { boltIcon, clockIcon, copyIcon, retransmitIcon, stormIcon } from './icons.js';

const $ = (sel) => document.querySelector(sel);

// Seeded runs from day one (design/09): seed shown in UI, shareable.
const state = createRun({ seed: 'DEV1' });

// --- meters ---
function renderMeter(elm, icon, total, filled) {
  elm.innerHTML = `${icon}<span class="pips">${Array.from({ length: total },
    (_, i) => `<span class="pip ${i < filled ? 'full' : 'spent'}"></span>`).join('')}</span>`;
}

function renderMeters() {
  renderMeter($('#meter-bandwidth'), boltIcon(16), 10, state.bandwidth);
  renderMeter($('#meter-deadline'), clockIcon(16), 8, state.deadline);
  $('#seed-chip').textContent = `SEED · ${state.seed}`;
}

// --- prompt strip ---
function setPrompt(iconHTML, html) {
  $('#prompt').innerHTML =
    `<span class="prompt-icon">${iconHTML}</span><span>${html}</span>`;
}

// --- belt (Phase 1a kit: Duplicate + Retransmit; build card #2, #11) ---
function toolButton({ id, label, icon, costs }) {
  const costHTML = costs
    .map(([ic, n]) => `<span>${ic}${n}</span>`)
    .join('');
  return `<button class="tool-btn" id="tool-${id}">
    ${icon}<span>${label}</span><span class="cost">${costHTML}</span>
  </button>`;
}

function renderBelt() {
  $('#belt').innerHTML = [
    toolButton({
      id: 'duplicate', label: 'Duplicate', icon: copyIcon(20, 'var(--copy)'),
      costs: [[boltIcon(11), 3]],
    }),
    toolButton({
      id: 'retransmit', label: 'Retransmit', icon: retransmitIcon(20),
      costs: [[boltIcon(11), 2], [clockIcon(11), 1]],
    }),
    `<button class="go-btn" id="go" disabled>Onward</button>`,
  ].join('');
}

// --- the mock scene: the junction beat (the run's hardest screen) ---
const scene = {
  chosenRoad: null,
  highlightRoad: null,
  showJunctionGlyphs: true,
  fogRevealed: false,
  dockFilled: 0,
  onRoadTap(road) {
    scene.highlightRoad = road;
    $('#go').disabled = false;
    const name = road === 'short' ? 'short road' : 'long road';
    setPrompt(stormIcon(22),
      `The ${name} it is? Tap <strong>Onward</strong> to commit.`);
    renderMap($('#map-layer'), scene);
  },
};

function renderAll() {
  renderMeters();
  renderMap($('#map-layer'), scene);
  renderParty($('#live-layer'), { nodeId: 'src', fragments: state.fragments });
  renderPartyRow($('#party'), state.fragments, { threatened: new Set([2, 4]) });
  renderBelt();
  setPrompt(stormIcon(22),
    'The left road is short, but a storm is eyeing <strong>#2</strong> and <strong>#4</strong>. Pick your road.');
}

renderAll();
window.addEventListener('resize', () =>
  renderParty($('#live-layer'), { nodeId: 'src', fragments: state.fragments }));
