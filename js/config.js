// v0 numbers — mirrors design/02-core-loop.md and the Phase 1a build card
// (design/09-build-plan.md). Change BOTH together; EV-check the pricing
// table whenever any value changes (tests/unit/economy.test.js runs it).

export const RUN = {
  partySize: 5,
  startBandwidth: 10,
  startDeadline: 8,
  deadlinePerHop: 1,
};

// Payloads are strategic identity (design/05): different KITS, not different
// thresholds. Thresholds are ratios so identity survives any party size.
// TCP/UDP are never named until the Act-5 reveal (design/06 vocabulary rule).
export const PAYLOADS = {
  'tcp-file': {
    renderRatio: 1.0,                  // 5/5 at the dock, correct, in order
    belt: ['duplicate', 'retransmit'], // discipline: every fragment matters
    freshness: null,                   // late is fine
  },
  'udp-call': {
    renderRatio: 0.6,                  // ≥3/5 fresh — the call plays with gaps
    belt: ['duplicate', 'skip'],       // tempo: abandon stragglers, ship the next
    freshness: 2,                      // a frame ≥2 beats behind is ALREADY too old
    // (expiry lands AT impact: lag-1 stragglers are worth one wait, lag-2 are
    //  born expired — that per-frame read is the wait-vs-skip decision)
  },
};

export const TOOLS = {
  retransmit: { bw: 2, deadline: 1 }, // recall one lost fragment; catches up next node
  duplicate: { bw: 3, deadline: 0 },  // preemptive, targeted; one copy per fragment; no copying copies
  checksum: { bw: 1, deadline: 0 },   // scan the party: reveals which fragment is scrambled
  repair: { bw: 2, deadline: 0 },     // fix one REVEALED scrambled fragment
  reroute: { bw: 1, deadline: 1 },    // sender reissue: rematerialize at the segment junction
  skip: { bw: 0, deadline: 0 },       // wave a straggler/lost/expired frame goodbye — free (UDP kit)
};

// The loadout layer (design/03: 3 slots → 5 by late campaign; 4 fits the
// K=3 1b maps — the corruption counter needs Checksum AND Repair, and two
// reward beats must be able to build it). Rewards at mid-map junctions:
// two unowned tools + an energy top-up (pick 1 of 3).
export const BELT = {
  slots: 4,
  // five tools now compete for four slots — loadout pressure is real.
  // cloak: the Encryption Cloak passive; its handshake costs 1 Deadline
  // when taken (design/03). Starting kits live in PAYLOADS.
  rewardPool: ['checksum', 'repair', 'buffer', 'reroute', 'cloak'],
  resourceReward: { bw: 3 },
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
  startDeadline: 14, // scarce but survivable: 13 starved the patient temperament
                     // once jammed pipes (beat-priced roads) joined the pool
  stars: { threeStar: 14, twoStar: 10 }, // 14: full-insurance play must not coin-flip into ★★★ (1b review)
};

export const HAZARDS = {
  gustChance: 0.15, // each hazard: one extra, unnamed fragment swept on impact (recoverable)
};

// The bottleneck (design/04): send-rate ladder, hidden pipe capacity.
// Success doubles the ceiling, overshoot halves it — slow start/AIMD by feel.
export const CONGESTION = {
  rates: [1, 2, 4],
  startMax: 1,        // slow start: the first beat probes with one
  capacities: [2, 3], // seeded, hidden until you overshoot (floor 2: the pipe
                      // road is safe-but-slow, never a 5-beat trap — sim-tuned)
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

// Acts are BIOMES (design/04): places with their own hazard mix — and the
// act ladder is the curriculum (cognitive-load gating: congestion Act 2 at
// the earliest, the ocean systems Act 3). Template letters index
// js/generator.js's TEMPLATES array. Wins climb the ladder (every 3) until
// Phase 4's campaign spine replaces the proxy.
export const ACTS = [
  { id: 1, name: 'Home & Neighborhood', cssClass: 'act-1', templates: [0, 1, 2, 4] },        // A B C E
  { id: 2, name: 'Backbone City', cssClass: 'act-2', templates: [0, 1, 2, 3, 4, 5] },        // + D static, F jam
  { id: 3, name: 'The Ocean Crossing', cssClass: 'act-3', templates: [1, 2, 3, 5, 6, 7, 8] },// + G sniffer, H trench, I satellite
];

export const STARS = {
  // leftover Bandwidth at the dock (>=8 was >=7 until round-6 review
  // showed that let the mixed line dominate both neighbors)
  threeStar: 9,
  twoStar: 8,
};
