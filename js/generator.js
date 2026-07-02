// generator.js — seeded multi-segment maps (Phase 1b). Template STITCHING:
// three hand-tuned segment archetypes with seeded variation (which fragments
// are threatened, where relays sit). The balanced procedural generator proper
// is Phase 4 (design/09); this pool is small enough to verify by simulation.
//
// The generator burns its own rng stream (`seed + ':map'`) so map drawing
// never disturbs gameplay rolls for the same seed.

import { seededRng } from './rng.js';
import { RUN, GEN } from './config.js';

// Archetypes. Every junction keeps the 1a dichotomy: short = quicker/riskier,
// long = slower/milder — and the tension rule holds: a hazard-free road is
// priced in hops instead (never two clear roads at one junction).
const TEMPLATES = [
  { // A — the 1a read: big telegraphed storm vs long drizzle
    short: { hops: 2, hazard: 'storm', threat: 2 },
    long: { hops: 3, hazard: 'drizzle', threat: 1 },
  },
  { // B — tempo: light risk quick vs clear-but-longer with a relay
    short: { hops: 2, hazard: 'drizzle', threat: 1 },
    long: { hops: 3, hazard: null, pickup: true },
  },
  { // C — paid risk: stormy shortcut with a relay vs mild long road
    short: { hops: 3, hazard: 'storm', threat: 2, pickup: true },
    long: { hops: 4, hazard: 'drizzle', threat: 1 },
  },
  { // D — the Static's domain: hidden corruption quick vs mild long road
    short: { hops: 2, hazard: 'static' },
    long: { hops: 3, hazard: 'drizzle', threat: 1 },
  },
];

function shuffled(rng, array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRoad(rng, spec, { segment, key, from, to }) {
  const inner = Array.from({ length: spec.hops - 1 }, (_, n) => `s${segment}${key[0]}${n + 1}`);
  const nodes = [from, ...inner, to];
  let hazard = null;
  if (spec.hazard) {
    // impact sits mid-road: hop 1 on 2-hop roads, hop 2 otherwise
    const impactNode = nodes[Math.min(2, spec.hops - 1)];
    if (spec.hazard === 'static') {
      hazard = { kind: 'static', impactNode, corrupts: 1 };
    } else {
      const threatens = shuffled(rng, Array.from({ length: RUN.partySize }, (_, i) => i + 1))
        .slice(0, spec.threat)
        .sort((a, b) => a - b);
      hazard = { kind: spec.hazard, impactNode, threatens };
    }
  }
  const bwPickup = spec.pickup ? { node: nodes.at(-2), amount: 2 } : null;
  return { nodes, hazard, bwPickup };
}

export function generateMap(seed, { segments = GEN.segments } = {}) {
  const rng = seededRng(`${seed}:map`);
  // pacing + economy constraint: at most 2 heavy (storm) segments per map —
  // a full-insurance temperament must stay affordable at these budgets
  const picks = Array.from({ length: segments },
    () => Math.floor(rng() * TEMPLATES.length));
  const stormy = picks.filter((p) => TEMPLATES[p].short.hazard === 'storm').length;
  if (stormy === segments) picks[1] = 1; // swap the middle for the tempo segment

  const built = [];
  for (let i = 0; i < segments; i++) {
    const template = TEMPLATES[picks[i]];
    const from = i === 0 ? 'src' : `j${i}`;
    const to = i === segments - 1 ? 'dock' : `j${i + 1}`;
    built.push({
      roads: {
        short: buildRoad(rng, template.short, { segment: i, key: 'short', from, to }),
        long: buildRoad(rng, template.long, { segment: i, key: 'long', from, to }),
      },
    });
  }
  // budget guarantee: at least one relay on the map
  const hasPickup = built.some((s) => s.roads.short.bwPickup || s.roads.long.bwPickup);
  if (!hasPickup) {
    const road = built.at(-1).roads.long;
    road.bwPickup = { node: road.nodes.at(-2), amount: 2 };
  }
  return {
    id: `gen-${seed}`,
    startBandwidth: GEN.startBandwidth,
    startDeadline: GEN.startDeadline,
    stars: { ...GEN.stars },
    segments: built,
  };
}
