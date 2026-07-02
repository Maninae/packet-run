// v0 numbers — mirrors design/02-core-loop.md and the Phase 1a build card
// (design/09-build-plan.md). Change BOTH together; EV-check the pricing
// table on paper whenever any value changes.

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

export const MAP_1A = {
  nodes: 8,
  shortRoad: { hops: 4, hazard: 'storm', threatens: [2, 4], bwPickup: { node: 3, amount: 2 } },
  longRoad: { hops: 7, hazard: 'drizzle', threatens: [3], bwPickup: { node: 4, amount: 2 } },
};

export const HAZARDS = {
  gustChance: 0.15, // each hazard: one extra, unnamed fragment swept on impact (recoverable)
};

export const FOG = {
  // revealed at the penultimate node; a consequence, not a decision
  revealAtNodesFromDock: 1,
  outcomes: [
    { deadlineCost: 0, p: 0.4 },
    { deadlineCost: 1, p: 0.4 },
    { deadlineCost: 2, p: 0.2 },
  ],
};

export const STARS = {
  // leftover Bandwidth at the dock (>=8 was >=7 until round-6 review
  // showed that let the mixed line dominate both neighbors)
  threeStar: 9,
  twoStar: 8,
};
