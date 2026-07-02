// main.js — bootstrap + game-loop wiring only. No game rules live here:
// the engine decides what's legal and what happens; this file sequences the
// resulting events into beats (animate the hop, flash the notices, re-render)
// and routes taps back into engine actions.

import { EASY, MAP_1A } from './config.js';
import { createRun, legalActions, act, segmentRoads, roadDef } from './engine.js';
import { generateMap } from './generator.js';
import { randomSeed } from './rng.js';
import { logRun, deriveAutopsy } from './autopsy.js';
import { renderMap } from './map.js';
import { renderParty, renderPartyRow, animateHop, startIdle, stopIdle } from './party.js';
import { renderMeters, setPrompt, flashPrompt, renderBelt, wireLegend, wireMute } from './hud.js';
import { showStart, showWin, showLoss } from './screens.js';
import { unlockAudio, sfx } from './sound.js';

const $ = (sel) => document.querySelector(sel);
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const delay = (ms) => (reduced() ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));

let run;
let pendingRoad = null; // junction two-tap preview (build card #9)
let armed = null;       // tool waiting for a fragment tap
let busy = false;       // input locked while beats resolve
let hintText = null;    // autopsy tool-line carried into a hint retry

// Protected first session (design/06, the Balatro move): world RNG runs easy
// until the first win. Silent — no training-wheels label.
const winsCount = () => Number(localStorage.getItem('packet-run-wins') ?? '0');

// E2E tests and curious kids alike can inspect the run (rng excluded: not serializable)
window.packetRun = {
  get run() {
    const { rng, ...snapshot } = run;
    return structuredClone(snapshot);
  },
};

const TOOLTIPS = {
  duplicate: '<strong>Duplicate</strong>: send a spare copy of one fragment, just in case. The dock only keeps one of each number.',
  retransmit: '<strong>Retransmit</strong>: a fragment got lost? Ask home to send it again. Costs 2 energy and a tick of the clock.',
  repair: '<strong>Repair</strong>: fix the scrambled fragment the Checksum found. Costs 2 energy.',
};

// Checksum enters the belt only on maps the Static haunts (vocabulary gating:
// the tutorial region keeps its two-tool simplicity — design/03 curriculum)
function beltToolsFor(map) {
  const hasStatic = map.segments.some((s) =>
    Object.values(s.roads).some((r) => r.hazard?.kind === 'static'));
  return hasStatic
    ? ['duplicate', 'retransmit', 'checksum', 'repair']
    : ['duplicate', 'retransmit'];
}

const names = (ids) => ids.map((n) => `<strong>#${n}</strong>`).join(' and ');

function hazardOf(road) {
  return segmentRoads(run)[road]?.hazard ?? null;
}

// junction read, derived from the current segment (works on any map)
function describeRoad(key) {
  const road = segmentRoads(run)[key];
  const hops = road.nodes.length - 1;
  if (!road.hazard) return `${hops} hops and quiet — the long way around`;
  if (road.hazard.kind === 'static') {
    return `${hops} hops, static that scrambles one fragment`;
  }
  return `${hops} hops, a ${road.hazard.kind} eyeing ${names(road.hazard.threatens)}`;
}

function scaryRoad() {
  const roads = segmentRoads(run);
  const threat = (k) => roads[k].hazard
    ? (roads[k].hazard.threatens?.length ?? 1) : 0;
  return threat('short') >= threat('long') ? 'short' : 'long';
}

function iconFor(key) {
  const kind = hazardOf(key)?.kind;
  return kind === 'drizzle' ? 'drizzle' : kind === 'static' ? 'static' : 'storm';
}

function computePrompt() {
  if (armed) return ['copy', `${TOOLTIPS[armed]}<br>Tap a fragment below.`];
  if (run.phase === 'junction') {
    if (hintText && !pendingRoad) return ['storm', `Hint: ${hintText}`];
    if (pendingRoad) {
      return [iconFor(pendingRoad),
        `The ${pendingRoad} road: ${describeRoad(pendingRoad)}. Tap again to take it.`];
    }
    const scary = scaryRoad();
    const hazard = hazardOf(scary);
    if (hazard.kind === 'static') {
      return ['static', `The Static haunts the ${scary} road — it scrambles bits. Tap a road to look closer.`];
    }
    return [iconFor(scary),
      `A ${hazard.kind} on the ${scary} road is eyeing ${names(hazard.threatens)}. Tap a road to look closer.`];
  }
  if (run.phase === 'done') return ['bolt', ''];

  const def = roadDef(run);
  const hazard = def.hazard;
  const lost = run.fragments.filter((f) => f.status === 'lost').map((f) => f.id);
  if (!run.impactResolved && hazard) {
    if (hazard.kind === 'static') {
      return ['static', `The Static is ahead — it scrambles one fragment's bits. Copies won't help; Checksum will, after.`];
    }
    const approach = def.nodes[def.nodes.indexOf(hazard.impactNode) - 1];
    const icon = hazard.kind === 'storm' ? 'storm' : 'drizzle';
    if (run.node === approach) {
      return [icon, `The ${hazard.kind} is right ahead — it's eyeing ${names(hazard.threatens)}. Last chance for copies.`];
    }
    return [icon, `The ${hazard.kind} waits ahead, eyeing ${names(hazard.threatens)}. Duplicate now, or ride.`];
  }
  const hidden = run.fragments.some((f) => f.corrupted && !f.revealed);
  if (hidden) {
    return ['checksum', `Something's scrambled — you can't tell which. Checksum finds it for 1 energy.`];
  }
  const glitched = run.fragments.filter((f) => f.corrupted && f.revealed).map((f) => f.id);
  if (glitched.length) {
    return ['repair', `${names(glitched)} is scrambled. Repair fixes it — the dock rejects garbled fragments.`];
  }
  if (lost.length) {
    return ['retransmit', `Still missing ${names(lost)}. Retransmit calls them back — the clock is ticking.`];
  }
  const returning = run.fragments.filter((f) => f.status === 'returning').map((f) => f.id);
  if (returning.length) {
    return ['retransmit', `${names(returning)} is catching up. Onward to Grandma's!`];
  }
  if (run.fogCost !== null && run.fogCost > 0) {
    return ['clock', `Mud on the last stretch — it'll cost <strong>+${run.fogCost}</strong>. Onward!`];
  }
  return ['bolt', `Everyone's together. Onward to Grandma's!`];
}

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
    ? scaryRoad()
    : (run.road ?? pendingRoad ?? 'short');
  return new Set(hazardOf(road)?.threatens ?? []);
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
    tools: beltToolsFor(run.map),
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
  if (tool === 'checksum') {
    // a scan, not a targeted verb: fires on the whole party immediately
    if (legalActions(run).some((a) => a.type === 'checksum')) {
      armed = null;
      dispatch({ type: 'checksum' });
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
    await animateHop($('#live-layer'), { map: run.map, from: hop.from, to: hop.to, racers });
    // settle into the standing cluster while the notices play
    renderParty($('#live-layer'), { map: run.map, nodeId: hop.to, fragments: run.fragments });
  }

  for (const e of batch) {
    switch (e.type) {
      case 'impact': {
        if (e.kind === 'static') {
          sfx.static();
          const stage = $('#stage');
          stage.classList.remove('shake');
          void stage.offsetWidth;
          stage.classList.add('shake');
          flashPrompt('static',
            'Kzzt! The Static scrambled one of your fragments — you can\'t tell which.');
          await delay(1000);
          break;
        }
        if (e.swept.length) {
          sfx.sweep();
          const stage = $('#stage');
          stage.classList.remove('shake');
          void stage.offsetWidth;
          stage.classList.add('shake');
          flashPrompt(e.kind === 'storm' ? 'storm' : 'drizzle',
            `The ${e.kind} hit! It swept ${names(e.swept)}.`);
          await delay(900);
        }
        if (e.saved.length) {
          sfx.pop();
          flashPrompt('copy', `A copy stepped in — ${names(e.saved)} ${e.saved.length > 1 ? 'are' : 'is'} safe!`);
          await delay(900);
        }
        if (e.gust) {
          if (e.gust.saved) sfx.pop(); else sfx.sweep();
          flashPrompt(e.gust.saved ? 'copy' : 'storm', e.gust.saved
            ? `A gust hit <strong>#${e.gust.fragment}</strong> — its copy took the hit!`
            : `A gust swept <strong>#${e.gust.fragment}</strong> too!`);
          await delay(900);
        }
        break;
      }
      case 'rejoin':
        sfx.chime();
        flashPrompt('retransmit', `${names(e.fragments)} caught back up!`);
        await delay(700);
        break;
      case 'checksum':
        sfx.scan();
        flashPrompt('checksum', `Found it — ${names(e.found)} is scrambled! Repair can fix it.`);
        await delay(900);
        break;
      case 'repair':
        sfx.chime();
        flashPrompt('repair', `<strong>#${e.fragment}</strong> is clean again.`);
        await delay(700);
        break;
      case 'pickup':
        sfx.chime();
        flashPrompt('bolt', `A friendly relay tops you up — <strong>+${e.amount} energy</strong>.`);
        await delay(700);
        break;
      case 'fog-reveal': {
        if (e.cost > 0) sfx.mud();
        const line = e.cost === 0
          ? 'The mist clears — the last stretch looks smooth!'
          : e.cost === 1
            ? 'The mist clears — a muddy stretch ahead will cost <strong>+1 tick</strong>.'
            : 'The mist clears — deep mud ahead: <strong>+2 ticks</strong>.';
        flashPrompt('clock', line);
        await delay(900);
        break;
      }
      case 'copies-discarded':
        flashPrompt('copy',
          `The dock keeps one of each number — spare ${names(e.fragments)} not needed.`);
        await delay(800);
        break;
    }
  }
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
const pinnedMap = new URLSearchParams(window.location.search).get('map');

function mapFor(seed) {
  if (pinnedMap === 'act1' || winsCount() === 0) return MAP_1A;
  return generateMap(seed);
}

function newRun(seed, { easy = winsCount() === 0, hint = null } = {}) {
  run = createRun({ seed, mods: easy ? EASY : null, map: mapFor(seed) });
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

const initialSeed = new URLSearchParams(window.location.search).get('seed') || randomSeed();
run = createRun({
  seed: initialSeed,
  mods: winsCount() === 0 ? EASY : null,
  map: mapFor(initialSeed),
});
wireLegend();
wireMute();
renderAll();
showStart({ seed: initialSeed, onPlay: () => { unlockAudio(); renderAll(); } });
window.addEventListener('resize', () => { if (!busy) renderAll(); });
