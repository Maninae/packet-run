// prompts.js — every steady-state kid-facing prompt line, derived from run
// state. Copy rules (design/06): ≤2 short sentences, ≤6th-grade, icon-first.
// Pure: (run, ui) → [icon, html]. Transient notices live in notices.js.

import { segmentRoads, roadDef } from './engine.js';
import { EVENTS } from './config.js';

export const TOOLTIPS = {
  duplicate: '<strong>Duplicate</strong>: send a spare copy of one fragment, just in case. The dock only keeps one of each number.',
  retransmit: '<strong>Retransmit</strong>: a fragment got lost? Ask home to send it again. Costs 2 energy and a tick of the clock.',
  repair: '<strong>Repair</strong>: fix the scrambled fragment the Checksum found. Costs 2 energy.',
  skip: '<strong>Skip</strong>: wave goodbye to a late fragment. A live call can\'t wait for stragglers.',
};

export const names = (ids) => ids.map((n) => `<strong>#${n}</strong>`).join(' and ');

export function hazardOf(run, road) {
  return segmentRoads(run)[road]?.hazard ?? null;
}

// junction read, derived from the current segment (works on any map)
function describeRoad(run, key) {
  const road = segmentRoads(run)[key];
  const hops = road.nodes.length - 1;
  if (!road.hazard) return `${hops} hops and quiet — the long way around`;
  if (road.hazard.kind === 'static') {
    const unkitted = !run.belt.includes('checksum') || !run.belt.includes('repair');
    return `${hops} hops, static that scrambles one fragment${unkitted ? " — your belt can't fix that" : ''}`;
  }
  if (road.hazard.kind === 'rapids') {
    return `${hops} hops, rapids — ${road.hazard.straggles} fragments will fall behind`;
  }
  if (road.hazard.kind === 'congestion') {
    return `${hops} hops, a jammed pipe — it only fits a few at a time`;
  }
  if (road.hazard.kind === 'sniffer') {
    return run.belt.includes('cloak')
      ? `${hops} hops, a sniffer listening — your Cloak seals you`
      : `${hops} hops, a sniffer listening — it can tamper with bits`;
  }
  if (road.hazard.kind === 'trench') {
    return `${hops} hops through the deep-sea cable — a huge pipe, and big pipes can snap`;
  }
  if (road.hazard.kind === 'satellite') {
    return `${hops} hops by satellite — the long way up always costs a beat`;
  }
  return `${hops} hops, a ${road.hazard.kind} eyeing ${names(road.hazard.threatens)}`;
}

export function scaryRoad(run) {
  const roads = segmentRoads(run);
  const threat = (k) => roads[k].hazard
    ? (roads[k].hazard.threatens?.length ?? roads[k].hazard.straggles ?? 1) : 0;
  return threat('short') >= threat('long') ? 'short' : 'long';
}

const HAZARD_PROMPT_ICONS = {
  drizzle: 'drizzle', static: 'static', rapids: 'rapids', storm: 'storm',
  congestion: 'jam', sniffer: 'sniffer', trench: 'trench', satellite: 'satellite',
};

function iconFor(run, key) {
  return HAZARD_PROMPT_ICONS[hazardOf(run, key)?.kind] ?? 'storm';
}

// the one-line junction hooks, per hazard kind
const JUNCTION_HOOKS = {
  static: (road) => ['static', `The Static haunts the ${road} road — it scrambles bits. Tap a road to look closer.`],
  rapids: (road) => ['rapids', `Rapids on the ${road} road — the party will scatter. Tap a road to look closer.`],
  congestion: (road) => ['jam', `A jammed pipe on the ${road} road — slow, but nothing gets lost. Tap a road to look closer.`],
  sniffer: (road) => ['sniffer', `A sniffer lurks on the ${road} road. Tap a road to look closer.`],
  trench: (road) => ['trench', `The ${road} road dives through the deep-sea cable. Tap a road to look closer.`],
  satellite: (road) => ['satellite', `The ${road} road goes up and over by satellite. Tap a road to look closer.`],
};

export function computePrompt(run, { armed, hintText, pendingRoad }) {
  if (armed) return ['copy', `${TOOLTIPS[armed]}<br>Tap a fragment below.`];
  if (run.phase === 'dns') {
    return ['bolt', `Where does Grandma's live? Ask the address book — it costs a tick.`];
  }
  if (run.phase === 'junction') {
    if (hintText && !pendingRoad) return ['storm', `Hint: ${hintText}`];
    if (pendingRoad) {
      return [iconFor(run, pendingRoad),
        `The ${pendingRoad} road: ${describeRoad(run, pendingRoad)}. Tap again to take it.`];
    }
    const scary = scaryRoad(run);
    const hazard = hazardOf(run, scary);
    const hook = JUNCTION_HOOKS[hazard.kind];
    if (hook) return hook(scary);
    return [iconFor(run, scary),
      `A ${hazard.kind} on the ${scary} road is eyeing ${names(hazard.threatens)}. Tap a road to look closer.`];
  }
  if (run.phase === 'done') return ['bolt', ''];
  if (run.phase === 'reward') {
    return ['bolt', 'A relay station! Pick one reward for your belt.'];
  }
  if (run.phase === 'event') {
    return ['bolt', EVENTS[run.eventCard].title];
  }
  if (run.congestion) {
    const alive = run.fragments.filter((f) => f.status === 'with-party').length;
    return ['jam', `The pipe is jammed — <strong>${run.congestion.crossed}/${alive}</strong> across. How many do you push this beat?`];
  }

  const def = roadDef(run);
  const hazard = def.hazard;
  const lost = run.fragments.filter((f) => f.status === 'lost').map((f) => f.id);
  const stragglers = run.fragments.filter((f) => f.status === 'straggler');
  if (stragglers.length) {
    const list = stragglers
      .map((f) => `<strong>#${f.id}</strong> ${f.lag} beat${f.lag > 1 ? 's' : ''}`)
      .join(', ');
    return ['rapids', `Behind: ${list}. Wait for them, or press on without them.`];
  }
  const gaps = run.fragments.filter((f) => f.status === 'expired'
    || (f.status === 'lost' && run.payload === 'udp-call'));
  if (gaps.length && run.belt.includes('skip')) {
    return ['rapids', `The call is stuttering over ${names(gaps.map((f) => f.id))}. Skip to steady it — a live call keeps moving.`];
  }
  if (!run.impactResolved && hazard) {
    if (hazard.kind === 'static') {
      return ['static', `The Static is ahead — it scrambles one fragment's bits. Copies won't help; Checksum will, after.`];
    }
    if (hazard.kind === 'rapids') {
      return ['rapids', `Rapids ahead — some of the party will fall behind. Waiting costs time; leaving them costs more.`];
    }
    if (hazard.kind === 'congestion') {
      return ['jam', `A jam ahead — the pipe only fits so many per beat. Start small and feel it out.`];
    }
    if (hazard.kind === 'sniffer') {
      return run.belt.includes('cloak')
        ? ['cloak', `A sniffer ahead — let it look. Your seal holds.`]
        : ['sniffer', `A sniffer ahead — it can scramble what it touches. A Cloak or the Checksum kit answers it.`];
    }
    if (hazard.kind === 'trench') {
      return ['trench', `The deep-sea cable ahead — most of the internet crosses oceans this way. Ride it.`];
    }
    if (hazard.kind === 'satellite') {
      return ['satellite', `The satellite pass ahead — space is far, and the clock knows it.`];
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
    if (!run.belt.includes('checksum')) {
      return ['static', `Something's scrambled — and nothing on your belt can find it. The dock will catch it.`];
    }
    return ['checksum', `Something's scrambled — you can't tell which. Checksum finds it for 1 energy.`];
  }
  const glitched = run.fragments.filter((f) => f.corrupted && f.revealed).map((f) => f.id);
  if (glitched.length) {
    return ['repair', `${names(glitched)} is scrambled. Repair fixes it — the dock rejects garbled fragments.`];
  }
  if (lost.length && run.belt.includes('retransmit')) {
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
