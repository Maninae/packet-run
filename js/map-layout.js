// map-layout.js — map geometry, no DOM: node placement (hand-tuned 1a region
// + generic layout for generated maps), orientation, viewBox, and the
// viewBox→stage-pixels transform shared by the SVG map and the canvas layer.
// Portrait is the design target: a vertical stack, source bottom → dock top,
// short roads bulge left / long roads right. Landscape (design/11 step 2)
// transposes it: the journey flows west→east across the desktop map pane.

export const VIEWBOX = [0, 0, 390, 560]; // portrait — the design target

export function viewBoxFor(orientation) {
  const [, , vw, vh] = VIEWBOX;
  return orientation === 'landscape' ? [0, 0, vh, vw] : [0, 0, vw, vh];
}

// The landscape breakpoint — keep in sync with css/landscape.css.
const LANDSCAPE_MQ = '(min-width: 900px) and (orientation: landscape)';
const landscapeMQL = typeof window !== 'undefined' ? window.matchMedia(LANDSCAPE_MQ) : null;

// Current map orientation: portrait everywhere except the desktop two-pane
// layout. Callers may pass an explicit orientation instead (tests, headless)
// — the default keeps SVG and canvas in agreement.
export function mapOrientation() {
  return landscapeMQL?.matches ? 'landscape' : 'portrait';
}

const HAND_NODES = {
  src: { x: 195, y: 522, kind: 'source', label: 'Home' },
  s1: { x: 128, y: 452 }, s2: { x: 78, y: 348 }, s3: { x: 102, y: 220, kind: 'pickup' },
  l1: { x: 268, y: 486 }, l2: { x: 322, y: 420 }, l3: { x: 345, y: 336 },
  l4: { x: 330, y: 248, kind: 'pickup' }, l5: { x: 296, y: 172 }, l6: { x: 247, y: 118 },
  dock: { x: 195, y: 56, kind: 'dock', label: "Grandma's" },
};

function genericNodes(map) {
  const K = map.segments.length;
  const yTop = 64;
  const yBottom = 520;
  const levelY = (i) => yBottom - ((yBottom - yTop) / K) * i;
  const nodes = {};
  const place = (id, x, y, kind, label) => { nodes[id] = { x, y, kind, label }; };

  map.segments.forEach((segment, i) => {
    const from = segment.roads.short.nodes[0];
    if (!nodes[from]) {
      place(from, 195, levelY(i),
        i === 0 ? 'source' : 'junction', i === 0 ? 'Home' : undefined);
    }
    for (const [key, road] of Object.entries(segment.roads)) {
      const side = key === 'short' ? -1 : 1;
      const bulge = key === 'short' ? 78 : 128;
      const hops = road.nodes.length - 1;
      road.nodes.slice(1, -1).forEach((id, n) => {
        const t = (n + 1) / hops;
        place(id, 195 + side * bulge * Math.sin(Math.PI * t),
          levelY(i) - (levelY(i) - levelY(i + 1)) * t,
          road.bwPickup?.node === id ? 'pickup' : undefined);
      });
    }
  });
  place('dock', 195, 56, 'dock', "Grandma's");
  // pickup kinds can also land on shared nodes
  for (const segment of map.segments) {
    for (const road of Object.values(segment.roads)) {
      if (road.bwPickup && nodes[road.bwPickup.node]) {
        nodes[road.bwPickup.node].kind ??= 'pickup';
      }
    }
  }
  return nodes;
}

// Landscape transposes the portrait layout: journey bottom→top becomes
// west→east (portrait y=560 bottom lands at x=0 west), roads that bulged
// left/right now bulge up/down. Portrait stays the hand-tuned source of truth.
function toLandscape(nodes) {
  const [, , , vh] = VIEWBOX;
  const out = {};
  for (const [id, n] of Object.entries(nodes)) {
    out[id] = { ...n, x: vh - n.y, y: n.x };
  }
  return out;
}

const layoutCache = new WeakMap();
export function layoutMap(map, orientation = mapOrientation()) {
  if (!layoutCache.has(map)) {
    const portrait = map.id === 'act1-intro' ? HAND_NODES : genericNodes(map);
    layoutCache.set(map, { portrait, landscape: toLandscape(portrait) });
  }
  return layoutCache.get(map)[orientation];
}

// Maps SVG viewBox coords → stage pixels (shared with the canvas live layer).
export function viewTransform(stageW, stageH, orientation = mapOrientation()) {
  const [, , vw, vh] = viewBoxFor(orientation);
  const scale = Math.min(stageW / vw, stageH / vh);
  const ox = (stageW - vw * scale) / 2;
  const oy = (stageH - vh * scale) / 2;
  return { scale, ox, oy, apply: (x, y) => [ox + x * scale, oy + y * scale] };
}
