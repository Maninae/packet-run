// v0 numbers — mirrors design/02-core-loop.md and the Phase 1a build card
// (design/09-build-plan.md). Change BOTH together; EV-check the pricing
// table whenever any value changes (tests/unit/economy.test.js runs it).

export const RUN = {
  partySize: 5,
  startBandwidth: 10,
  startDeadline: 8,
  deadlinePerHop: 1,
  renderThresholdRatio: 1.0, // TCP file payload: 5/5 at the dock, Deadline >= 0
};

export const TOOLS = {
  retransmit: { bw: 2, deadline: 1 }, // recall one lost fragment; catches up next node
  duplicate: { bw: 3, deadline: 0 },  // preemptive, targeted; one copy per fragment; no copying copies
};

// Map schema (v2, Phase 1b): a run map = stacked SEGMENTS, each a 2-road
// junction. Road keys keep the 1a dichotomy at every junction: 'short' =
// quicker/riskier, 'long' = slower/milder. The last segment's roads end at
// 'dock'; fog reveals at that road's second-to-last node (as in 1a).
// Budgets and star thresholds ride on the map. hazard may be null (a road
// priced purely in hops), but never on both roads of one junction.
//
// MAP_1A is the hand-authored Phase 1a region — still the default map and
// the protected first run's tutorial region (design/06). Node ids match
// js/map.js GEO coordinates. hops = nodes.length − 1 (4 short / 7 long).
export const MAP_1A = {
  id: 'act1-intro',
  startBandwidth: 10,
  startDeadline: 8,
  stars: { threeStar: 9, twoStar: 8 },
  segments: [{
    roads: {
      short: {
        nodes: ['src', 's1', 's2', 's3', 'dock'],
        hazard: { kind: 'storm', impactNode: 's2', threatens: [2, 4] },
        bwPickup: { node: 's3', amount: 2 }, // node 3 (build card #16), a relay tops you up
      },
      long: {
        nodes: ['src', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'dock'],
        hazard: { kind: 'drizzle', impactNode: 'l3', threatens: [3] },
        bwPickup: { node: 'l4', amount: 2 }, // node 4 (build card #16)
      },
    },
  }],
};

// Generated-map budgets (Phase 1b, K=3 segments) — v0, tuned against the
// generated-economy simulation in tests/unit (same method as the 1a table).
export const GEN = {
  segments: 3,
  startBandwidth: 16,
  startDeadline: 13, // scarcity is the point: recovery must COST something vs insurance
  stars: { threeStar: 13, twoStar: 10 },
};

export const HAZARDS = {
  gustChance: 0.15, // each hazard: one extra, unnamed fragment swept on impact (recoverable)
};

export const FOG = {
  // roll thresholds: 40% nothing / 40% slow (−1 Deadline) / 20% bad stretch (−2)
  outcomes: [
    { deadlineCost: 0, p: 0.4 },
    { deadlineCost: 1, p: 0.4 },
    { deadlineCost: 2, p: 0.2 },
  ],
};

// The "hint" / protected-first-session tier (design/06): world RNG softens —
// no gust, clear fog — but the storm still sweeps what it names, so the core
// lesson (insure or recover) is untouched.
export const EASY = {
  gustChance: 0,
  fogOutcomes: [{ deadlineCost: 0, p: 1 }],
};

export const STARS = {
  // leftover Bandwidth at the dock (>=8 was >=7 until round-6 review
  // showed that let the mixed line dominate both neighbors)
  threeStar: 9,
  twoStar: 8,
};
