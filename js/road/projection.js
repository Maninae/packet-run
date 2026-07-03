// projection.js — road-view geometry, pure math, no DOM (design/11 build
// spec). The composition lives in a fixed 1280x800 stage space (the Gate P1
// mock's frame): a trunk the party stands on, forking into two cubic arcs
// that arrive on either side of the destination door at the horizon.
// The geometry itself teaches: MORE HOPS = a visibly wider, longer sweep,
// and the centerline dashes ARE the hops — the distance read is exact.

export const ROAD_W = 1280;
export const ROAD_H = 800;

const CX = ROAD_W / 2;
export const FORK = { x: CX, y: 524 };            // where the trunk splits
export const DEST = { x: 742, y: 314 };           // the doorstep, horizon band
const TRUNK_TOP_HALF = 34;                        // trunk half-width at the fork
const END_HALF = 8;                               // ribbon half-width at arrival

export function cubicAt(p0, c1, c2, p1, t) {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * c1.x + c * c2.x + d * p1.x,
    y: a * p0.y + b * c1.y + c * c2.y + d * p1.y,
  };
}

function cubicTangent(p0, c1, c2, p1, t) {
  const u = 1 - t;
  return {
    x: 3 * u * u * (c1.x - p0.x) + 6 * u * t * (c2.x - c1.x) + 3 * t * t * (p1.x - c2.x),
    y: 3 * u * u * (c1.y - p0.y) + 6 * u * t * (c2.y - c1.y) + 3 * t * t * (p1.y - c2.y),
  };
}

// sweep breadth grows with hop count (capped so huge roads stay in frame)
const breadth = (hops) => Math.min(40 + 24 * hops, 250);

// A fork arc: [p0, c1, c2, p1] for cubicAt. side: -1 left, +1 right.
// c1 carries the sweep; c2 pulls back toward the door so the arc lands as a
// gentle S instead of a hook (the two ribbons must never cross).
function arc(hops, side) {
  const b = breadth(hops);
  return [
    FORK,
    { x: CX + side * b, y: 468 },
    { x: CX + side * b * 0.55, y: 380 },
    { x: DEST.x + side * 16, y: DEST.y + 4 },
  ];
}

export function forkSpines({ leftHops, rightHops }) {
  return {
    left: arc(leftHops, -1),
    right: arc(rightHops, 1),
    fork: FORK,
    dest: DEST,
  };
}

// Offset polyline along one side of a spine (for edge-light strokes).
function edgePoints(spine, w0, w1, side, samples = 14) {
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = cubicAt(...spine, t);
    const tan = cubicTangent(...spine, t);
    const len = Math.hypot(tan.x, tan.y) || 1;
    const half = (w0 + (w1 - w0) * t) / 2;
    pts.push({
      x: p.x + (-tan.y / len) * half * side,
      y: p.y + (tan.x / len) * half * side,
    });
  }
  return pts;
}

const pt = (p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;

export function spineEdge(spine, w0, w1, side) {
  const pts = edgePoints(spine, w0, w1, side);
  return `M${pts.map(pt).join(' L')}`;
}

// Closed ribbon polygon: down one edge, back the other.
export function ribbonPath(spine, w0 = TRUNK_TOP_HALF * 2, w1 = END_HALF * 2) {
  const a = edgePoints(spine, w0, w1, -1);
  const b = edgePoints(spine, w0, w1, 1).reverse();
  return `M${[...a, ...b].map(pt).join(' L')} Z`;
}

// Centerline dashes along an arc: one per hop, shrinking with depth.
export function spineDots(spine, hops) {
  const dots = [];
  for (let i = 0; i < hops; i++) {
    const t = (i + 0.5) / hops;
    const p = cubicAt(...spine, t);
    dots.push({ x: p.x, y: p.y, r: 6.2 - 3.8 * t });
  }
  return dots;
}

// Dashes on the trunk beneath the party, marching toward the fork.
export function trunkDots(n = 4) {
  const dots = [];
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0 : i / (n - 1);
    dots.push({ x: CX, y: 754 - 192 * f, r: 13 - 5.5 * f });
  }
  return dots;
}

// The trunk the party stands on (fixed composition, edges flow into the arcs).
export function trunkPath() {
  return `M470 800 Q520 645 ${CX - TRUNK_TOP_HALF} ${FORK.y + 8} L${CX + TRUNK_TOP_HALF} ${FORK.y + 8} Q760 645 810 800 Z`;
}

export function trunkEdge(side) {
  return side < 0
    ? `M470 800 Q520 645 ${CX - TRUNK_TOP_HALF} ${FORK.y + 8}`
    : `M810 800 Q760 645 ${CX + TRUNK_TOP_HALF} ${FORK.y + 8}`;
}

// Fills the notch where the two arcs leave the trunk.
export function forkNotchPath() {
  return `M${CX - TRUNK_TOP_HALF} ${FORK.y + 8} L${CX} ${FORK.y - 2} L${CX + TRUNK_TOP_HALF} ${FORK.y + 8} Q${CX} ${FORK.y + 34} ${CX - TRUNK_TOP_HALF} ${FORK.y + 8} Z`;
}
