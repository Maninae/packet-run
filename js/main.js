// main.js — bootstrap + game-loop wiring only. No game rules live here:
// the engine decides what's legal and what happens; this file sequences the
// resulting events into beats (animate the hop, flash the notices, re-render)
// and routes taps back into engine actions.

import { EASY, MAP_1A, BELT, ACTS, EVENTS } from './config.js';
import { createRun, legalActions, act, segmentRoads, roadDef } from './engine.js';
import { generateMap } from './generator.js';
import { randomSeed } from './rng.js';
import { logRun, deriveAutopsy } from './autopsy.js';
import { renderMap } from './map.js';
import { renderParty, renderPartyRow, animateHop, startIdle, stopIdle } from './party.js';
import { renderMeters, setPrompt, flashPrompt, renderBelt, wireLegend, wireMute } from './hud.js';
import { showStart, showWin, showLoss, showReward, showEvent } from './screens.js';
import { computePrompt, hazardOf, scaryRoad } from './prompts.js';
import { playNotices } from './notices.js';
import { unlockAudio, sfx } from './sound.js';

const $ = (sel) => document.querySelector(sel);
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const delay = (ms) => (reduced() ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));

let run;
let pendingRoad = null; // junction two-tap preview (build card #9)
let armed = null;       // tool waiting for a fragment tap
let busy = false;       // input locked while beats resolve
let hintText = null;    // autopsy tool-line carried into a hint retry
let payload = 'tcp-file';

// Protected first session (design/06, the Balatro move): world RNG runs easy
// until the first win. Silent — no training-wheels label. Gentle mode is the
// same softening as an explicit, persistent choice (carries the 9-and-unders).
const winsCount = () => Number(localStorage.getItem('packet-run-wins') ?? '0');
const gentleOn = () => localStorage.getItem('packet-run-gentle') === '1';
const playEasy = () => gentleOn() || winsCount() === 0;

// DNS cache: the address book's answer is remembered for 8 runs — the
// lookup beat is rare BECAUSE caching is real (design/04)
const dnsNeededNow = () => Number(localStorage.getItem('packet-run-dns') ?? '0') <= 0;
const dnsSpend = () => {
  const left = Number(localStorage.getItem('packet-run-dns') ?? '0');
  if (left > 0) localStorage.setItem('packet-run-dns', String(left - 1));
};

// today's shared seed — same map and rolls for everyone (design/06)
const dailySeed = () => {
  const d = new Date();
  return `DAY-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

// E2E tests and curious kids alike can inspect the run (rng excluded: not serializable)
window.packetRun = {
  get run() {
    const { rng, ...snapshot } = run;
    return structuredClone(snapshot);
  },
};

function scene() {
  const atJunction = run.phase === 'junction';
  return {
    map: run.map,
    segment: run.segment,
    takenRoads: run.events.filter((e) => e.type === 'road-chosen').map((e) => e.road),
    chosenRoad: run.road,
    highlightRoad: pendingRoad,
    showJunctionGlyphs: atJunction,
    junctionGlyphs: atJunction
      ? Object.entries(segmentRoads(run)).map(([road, def]) => ({
          road,
          kind: def.hazard?.kind ?? null,
          threatens: def.hazard?.threatens ?? [],
          hops: def.nodes.length - 1,
        }))
      : null,
    fogRevealed: run.fogCost !== null,
    fogCost: run.fogCost,
    dockFilled: run.outcome === 'rendered' ? 5 : 0,
    onRoadTap,
  };
}

function threatenedSet() {
  if (run.impactResolved) return new Set();
  const road = (run.phase === 'junction' && !run.road && !pendingRoad)
    ? scaryRoad(run)
    : (run.road ?? pendingRoad ?? 'short');
  return new Set(hazardOf(run, road)?.threatens ?? []);
}

function targetableSet() {
  if (!armed) return new Set();
  return new Set(legalActions(run)
    .filter((a) => a.type === armed)
    .map((a) => a.fragment));
}

function renderAll() {
  renderMeters(run);
  renderMap($('#map-layer'), scene());
  if (run.phase !== 'done') {
    startIdle($('#live-layer'), () => ({ map: run.map, nodeId: run.node, fragments: run.fragments }));
  } else {
    stopIdle();
    renderParty($('#live-layer'), { map: run.map, nodeId: run.node, fragments: [] });
  }
  renderPartyRow($('#party'), run.fragments, {
    threatened: threatenedSet(),
    targetable: targetableSet(),
    onChipTap,
  });
  renderBelt({
    tools: run.belt,
    legal: busy ? [] : legalActions(run),
    armed,
    canGo: !busy && (run.phase === 'node' || run.phase === 'dns'
      || (run.phase === 'junction' && pendingRoad !== null)),
    goLabel: run.phase === 'dns' ? 'Look it up' : 'Onward',
    onArm, onGo,
    onWait: () => { if (!busy) dispatch({ type: 'wait' }); },
    onSend: (rate) => { if (!busy) dispatch({ type: 'send', rate }); },
  });
  const [icon, html] = computePrompt(run, { armed, hintText, pendingRoad });
  if (html) setPrompt(icon, html);
}

// --- input handlers ---

function onRoadTap(road) {
  if (busy || run.phase !== 'junction') return;
  if (pendingRoad === road) {
    pendingRoad = null;
    dispatch({ type: 'choose-road', road });
  } else {
    pendingRoad = road;
    renderAll();
  }
}

function onArm(tool) {
  if (busy) return;
  if (tool === 'skip') {
    // targeted like duplicate/retransmit — arm, then tap the frame to wave off
    armed = armed === 'skip' ? null : 'skip';
    renderAll();
    return;
  }
  if (tool === 'checksum' || tool === 'reroute') {
    // untargeted verbs fire immediately (checksum scans; reroute recalls all)
    if (legalActions(run).some((a) => a.type === tool)) {
      armed = null;
      dispatch({ type: tool });
    }
    return;
  }
  armed = armed === tool ? null : tool;
  renderAll();
}

function onChipTap(id) {
  if (busy || !armed) return;
  const action = { type: armed, fragment: id };
  if (!legalActions(run).some((a) => a.type === armed && a.fragment === id)) return;
  armed = null;
  dispatch(action);
}

function onGo() {
  if (busy) return;
  if (run.phase === 'dns') {
    dispatch({ type: 'lookup' });
    return;
  }
  if (run.phase === 'junction') {
    if (pendingRoad) onRoadTap(pendingRoad); // commit the previewed road
    return;
  }
  dispatch({ type: 'onward' });
}

// --- beat sequencing ---

async function animateBatch(batch) {
  const hop = batch.find((e) => e.type === 'hop');
  const impact = batch.find((e) => e.type === 'impact');
  const rejoin = batch.find((e) => e.type === 'rejoin');

  if (hop && !reduced()) {
    sfx.whoosh();
    // static/rapids impacts carry no swept/saved fields — default them
    const sweptIds = impact?.swept
      ? [...impact.swept, ...(impact.gust && !impact.gust.saved ? [impact.gust.fragment] : [])]
      : [];
    const savedIds = impact?.saved
      ? [...impact.saved, ...(impact.gust?.saved ? [impact.gust.fragment] : [])]
      : [];
    const rejoined = new Set(rejoin?.fragments ?? []);
    const straggled = new Set((impact?.stragglers ?? []).map((s) => s.fragment));
    const racers = run.fragments
      .filter((f) => (f.status === 'with-party' && !rejoined.has(f.id))
        || sweptIds.includes(f.id) || straggled.has(f.id))
      .map((f) => ({
        id: f.id,
        hasCopy: f.hasCopy || savedIds.includes(f.id),
        fate: sweptIds.includes(f.id) ? 'swept'
          : straggled.has(f.id) ? 'straggle'
            : savedIds.includes(f.id) ? 'saved' : 'arrives',
      }));
    await animateHop($('#live-layer'), { map: run.map, from: hop.from, to: hop.to, racers });
    // settle into the standing cluster while the notices play
    renderParty($('#live-layer'), { map: run.map, nodeId: hop.to, fragments: run.fragments });
  }

  await playNotices(run, batch);
}

// The payoff beat: fragments slot in BY NUMBER, one rising note each —
// the auto-sort is the lesson (numbering makes reassembly possible).
async function fillDock() {
  flashPrompt('bolt', 'Slotting in by number — that\'s how the message rebuilds.');
  for (let i = 1; i <= 5; i++) {
    renderMap($('#map-layer'), { ...scene(), dockFilled: i });
    sfx.slot(i - 1);
    await delay(240);
  }
  await delay(400);
}

async function dispatch(action) {
  busy = true;
  renderAll();
  stopIdle();
  const start = run.events.length;
  act(run, action);
  await animateBatch(run.events.slice(start));
  busy = false;
  renderAll();
  if (run.phase === 'event') {
    showEvent({
      card: EVENTS[run.eventCard],
      legalOptions: legalActions(run).map((a) => a.option),
      onChoose: (option) => dispatch({ type: 'choose-event', option }),
    });
    return;
  }
  if (run.phase === 'reward') {
    showReward({
      options: run.rewardOptions,
      belt: run.belt,
      beltFull: run.belt.length >= BELT.slots,
      onTake: (pick) => {
        $('#overlay').replaceChildren();
        dispatch({ type: 'take-reward', ...pick });
      },
    });
    return;
  }
  if (run.phase === 'done') {
    logRun(run); // every run, win or lose (design/06)
    const handlers = {
      onNewRun: () => newRun(randomSeed()),
      onSameSeed: () => newRun(run.seed),
    };
    if (run.outcome === 'rendered') {
      localStorage.setItem('packet-run-wins', String(winsCount() + 1));
      await fillDock();
      sfx.win();
      showWin({ run, ...handlers });
    } else {
      const autopsy = deriveAutopsy(run);
      await delay(500);
      sfx.fail();
      showLoss({
        run, autopsy, ...handlers,
        onHint: () => newRun(run.seed, { easy: true, hint: autopsy.toolLine }),
      });
    }
  }
}

// --- run lifecycle ---

// Map choice: the hand-authored 1a region until the first win (it doubles as
// the tutorial region), seeded generated maps after. ?map=act1 pins the
// tutorial region — used by shared tutorial seeds and the E2E suite.
// Wins climb the act ladder (a biome every 3 wins) until Phase 4's campaign.
const pinnedMap = new URLSearchParams(window.location.search).get('map');

const actFor = () => ACTS[Math.min(ACTS.length - 1, Math.floor(winsCount() / 3))];

function applyBiome(act) {
  document.body.className = act.cssClass;
  const chip = $('#act-chip');
  if (chip) chip.textContent = `Act ${act.id} · ${act.name}`;
}

function mapFor(seed) {
  if (pinnedMap === 'act1' || winsCount() === 0) return MAP_1A;
  return generateMap(seed, { act: actFor().id });
}

function newRun(seed, { easy = playEasy(), hint = null } = {}) {
  applyBiome(actFor());
  const dnsNeeded = dnsNeededNow();
  if (!dnsNeeded) dnsSpend();
  run = createRun({ seed, mods: easy ? EASY : null, map: mapFor(seed), payload, dnsNeeded });
  hintText = hint;
  pendingRoad = null;
  armed = null;
  busy = false;
  $('#overlay').replaceChildren();
  const url = new URL(window.location);
  url.searchParams.set('seed', seed);
  history.replaceState(null, '', url);
  renderAll();
}

const urlParams = new URLSearchParams(window.location.search);
const initialSeed = urlParams.get('seed') || randomSeed();
payload = urlParams.get('payload') === 'call' ? 'udp-call' : 'tcp-file';
// boot only PEEKS at the dns cache — newRun (via the start screen) is the
// single place the cache is spent, so a reload never double-decrements
run = createRun({
  seed: initialSeed,
  mods: playEasy() ? EASY : null,
  map: mapFor(initialSeed),
  payload,
  dnsNeeded: dnsNeededNow(),
});
wireLegend();
wireMute();
applyBiome(actFor());
renderAll();
// after the first win, the start screen offers the payload choice —
// unless the URL already pinned one (shared links, tests)
showStart({
  seed: initialSeed,
  showPicker: winsCount() > 0 && !urlParams.get('payload'),
  payload,
  gentle: gentleOn(),
  onGentle: (on) => localStorage.setItem('packet-run-gentle', on ? '1' : '0'),
  onDaily: () => {
    unlockAudio();
    newRun(dailySeed());
  },
  onPlay: (chosen) => {
    unlockAudio();
    if (chosen && chosen !== payload) payload = chosen;
    newRun(initialSeed);
  },
});
window.addEventListener('resize', () => { if (!busy) renderAll(); });
