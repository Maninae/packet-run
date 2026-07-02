// main.js — bootstrap + game-loop wiring only. No game rules live here:
// the engine decides what's legal and what happens; this file sequences the
// resulting events into beats (animate the hop, flash the notices, re-render)
// and routes taps back into engine actions.

import { MAP_1A } from './config.js';
import { createRun, legalActions, act } from './engine.js';
import { randomSeed } from './rng.js';
import { renderMap } from './map.js';
import { renderParty, renderPartyRow, animateHop } from './party.js';
import { renderMeters, setPrompt, flashPrompt, renderBelt, wireLegend } from './hud.js';
import { showStart, showWin, showLoss } from './screens.js';

const $ = (sel) => document.querySelector(sel);
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const delay = (ms) => (reduced() ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));

let run;
let pendingRoad = null; // junction two-tap preview (build card #9)
let armed = null;       // tool waiting for a fragment tap
let busy = false;       // input locked while beats resolve

// E2E tests and curious kids alike can inspect the run (rng excluded: not serializable)
window.packetRun = {
  get run() {
    const { rng, ...snapshot } = run;
    return structuredClone(snapshot);
  },
};

const TOOLTIPS = {
  duplicate: 'Send a spare copy of one fragment, just in case. The dock only keeps one of each number.',
  retransmit: 'A fragment got lost? Ask home to send it again. Costs 2 energy and a tick of the clock.',
};

const names = (ids) => ids.map((n) => `<strong>#${n}</strong>`).join(' and ');

function hazardOf(road) {
  return MAP_1A.roads[road].hazard;
}

function computePrompt() {
  if (armed) return ['copy', `${TOOLTIPS[armed]}<br>Tap a fragment below.`];
  if (run.phase === 'junction') {
    if (pendingRoad === 'short') {
      return ['storm', `The short road: 4 hops, but the storm is eyeing ${names([2, 4])}. Tap again to take it.`];
    }
    if (pendingRoad === 'long') {
      return ['drizzle', `The long road: 7 hops, only a drizzle eyeing ${names([3])}. Tap again to take it.`];
    }
    return ['storm', `The short road is quick, but a storm is eyeing ${names([2, 4])}. Tap a road to look closer.`];
  }
  if (run.phase === 'done') return ['bolt', ''];

  const hazard = hazardOf(run.road);
  const lost = run.fragments.filter((f) => f.status === 'lost').map((f) => f.id);
  if (!run.impactResolved) {
    const roadNodes = MAP_1A.roads[run.road].nodes;
    const approach = roadNodes[roadNodes.indexOf(hazard.impactNode) - 1];
    const icon = hazard.kind === 'storm' ? 'storm' : 'drizzle';
    if (run.node === approach) {
      return [icon, `The ${hazard.kind} is right ahead — it's eyeing ${names(hazard.threatens)}. Last chance for copies.`];
    }
    return [icon, `The ${hazard.kind} waits ahead, eyeing ${names(hazard.threatens)}. Duplicate now, or ride.`];
  }
  if (lost.length) {
    return ['retransmit', `Still missing ${names(lost)}. Retransmit calls them back — the clock is ticking.`];
  }
  if (run.fogCost !== null && run.fogCost > 0) {
    return ['clock', `Mud on the last stretch — it'll cost <strong>+${run.fogCost}</strong>. Onward!`];
  }
  return ['bolt', `Everyone's together. Onward to Grandma's!`];
}

function scene() {
  return {
    chosenRoad: run.road,
    highlightRoad: pendingRoad,
    showJunctionGlyphs: run.phase === 'junction',
    fogRevealed: run.fogCost !== null,
    fogCost: run.fogCost,
    dockFilled: run.outcome === 'rendered' ? 5 : 0,
    onRoadTap,
  };
}

function threatenedSet() {
  if (run.impactResolved) return new Set();
  const road = run.road ?? pendingRoad ?? 'short';
  return new Set(hazardOf(road).threatens);
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
    renderParty($('#live-layer'), { nodeId: run.node, fragments: run.fragments });
  }
  renderPartyRow($('#party'), run.fragments, {
    threatened: threatenedSet(),
    targetable: targetableSet(),
    onChipTap,
  });
  renderBelt({
    legal: busy ? [] : legalActions(run),
    armed,
    canGo: !busy && (run.phase === 'node' || (run.phase === 'junction' && pendingRoad !== null)),
    onArm, onGo,
  });
  const [icon, html] = computePrompt();
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
    const sweptIds = impact
      ? [...impact.swept, ...(impact.gust && !impact.gust.saved ? [impact.gust.fragment] : [])]
      : [];
    const savedIds = impact
      ? [...impact.saved, ...(impact.gust?.saved ? [impact.gust.fragment] : [])]
      : [];
    const rejoined = new Set(rejoin?.fragments ?? []);
    const racers = run.fragments
      .filter((f) => (f.status === 'with-party' && !rejoined.has(f.id)) || sweptIds.includes(f.id))
      .map((f) => ({
        id: f.id,
        hasCopy: f.hasCopy || savedIds.includes(f.id),
        fate: sweptIds.includes(f.id) ? 'swept' : savedIds.includes(f.id) ? 'saved' : 'arrives',
      }));
    await animateHop($('#live-layer'), { from: hop.from, to: hop.to, racers });
  }

  for (const e of batch) {
    switch (e.type) {
      case 'impact': {
        if (e.swept.length) {
          flashPrompt(e.kind === 'storm' ? 'storm' : 'drizzle',
            `The ${e.kind} hit! It swept ${names(e.swept)}.`);
          await delay(900);
        }
        if (e.saved.length) {
          flashPrompt('copy', `A copy stepped in — ${names(e.saved)} ${e.saved.length > 1 ? 'are' : 'is'} safe!`);
          await delay(900);
        }
        if (e.gust) {
          flashPrompt(e.gust.saved ? 'copy' : 'storm', e.gust.saved
            ? `A gust hit <strong>#${e.gust.fragment}</strong> — its copy took the hit!`
            : `A gust swept <strong>#${e.gust.fragment}</strong> too!`);
          await delay(900);
        }
        break;
      }
      case 'rejoin':
        flashPrompt('retransmit', `${names(e.fragments)} caught back up!`);
        await delay(700);
        break;
      case 'pickup':
        flashPrompt('bolt', `A friendly relay tops you up — <strong>+${e.amount} energy</strong>.`);
        await delay(700);
        break;
      case 'fog-reveal': {
        const line = e.cost === 0
          ? 'The mist clears — the last stretch looks smooth!'
          : e.cost === 1
            ? 'The mist clears — a muddy stretch ahead will cost <strong>+1 tick</strong>.'
            : 'The mist clears — deep mud ahead: <strong>+2 ticks</strong>.';
        flashPrompt('clock', line);
        await delay(900);
        break;
      }
    }
  }
}

async function dispatch(action) {
  busy = true;
  renderAll();
  const start = run.events.length;
  act(run, action);
  await animateBatch(run.events.slice(start));
  busy = false;
  renderAll();
  if (run.phase === 'done') {
    await delay(600);
    const handlers = {
      onNewRun: () => newRun(randomSeed()),
      onSameSeed: () => newRun(run.seed),
    };
    if (run.outcome === 'rendered') showWin({ run, ...handlers });
    else showLoss({ run, ...handlers });
  }
}

// --- run lifecycle ---

function newRun(seed) {
  run = createRun({ seed });
  pendingRoad = null;
  armed = null;
  busy = false;
  $('#overlay').replaceChildren();
  const url = new URL(window.location);
  url.searchParams.set('seed', seed);
  history.replaceState(null, '', url);
  renderAll();
}

const initialSeed = new URLSearchParams(window.location.search).get('seed') || randomSeed();
run = createRun({ seed: initialSeed });
wireLegend();
renderAll();
showStart({ seed: initialSeed, onPlay: () => renderAll() });
window.addEventListener('resize', () => { if (!busy) renderAll(); });
