// map.js — SVG region map: geometry, roads, nodes, glyphs, fog-of-detail.
// Responsibility: render the hand-authored Phase 1a map and the junction
// interaction (tap a road → highlight, tap again → commit; build card #9).
// Shape always visible; hazard glyphs only ~1 hop ahead. Threat glyphs are
// FORECASTS ("the storm is eyeing #2 and #4") — never prophecy (design/07).
//
// "8 nodes" in design/02 counts the MEANINGFUL nodes (home, storm, both
// pickups, drizzle, both fog penults, dock); hop counts (4 short / 7 long)
// are the binding numbers and include plain waypoints.

import { stormIcon, drizzleIcon, clockIcon } from './icons.js';

const NS = 'http://www.w3.org/2000/svg';

export const GEO = {
  viewBox: [0, 0, 390, 560],
  nodes: {
    src: { x: 195, y: 522, kind: 'source', label: 'Home' },
    s1: { x: 128, y: 452 },
    s2: { x: 78, y: 348 },                 // storm impact (short road node 2)
    s3: { x: 102, y: 220, kind: 'pickup' }, // +2 BW relay; penultimate → fog reveal
    l1: { x: 268, y: 486 },
    l2: { x: 322, y: 420 },
    l3: { x: 345, y: 336 },                 // drizzle impact (long road node 3)
    l4: { x: 330, y: 248, kind: 'pickup' }, // +2 BW relay (long road node 4)
    l5: { x: 296, y: 172 },
    l6: { x: 247, y: 118 },                 // penultimate → fog reveal
    dock: { x: 195, y: 56, kind: 'dock', label: "Grandma's" },
  },
  roads: {
    short: ['src', 's1', 's2', 's3', 'dock'],
    long: ['src', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'dock'],
  },
  // where each road's hazard cloud hovers: over the impact segment
  hazardSegments: { short: ['s1', 's2'], long: ['l2', 'l3'] },
};

// Maps SVG viewBox coords → stage pixels (shared with the canvas live layer).
export function viewTransform(stageW, stageH) {
  const [, , vw, vh] = GEO.viewBox;
  const scale = Math.min(stageW / vw, stageH / vh);
  const ox = (stageW - vw * scale) / 2;
  const oy = (stageH - vh * scale) / 2;
  return { scale, ox, oy, apply: (x, y) => [ox + x * scale, oy + y * scale] };
}

function el(name, attrs = {}) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function roadPoints(road) {
  return GEO.roads[road].map((id) => `${GEO.nodes[id].x},${GEO.nodes[id].y}`).join(' ');
}

function midpoint(aId, bId) {
  const a = GEO.nodes[aId];
  const b = GEO.nodes[bId];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function drawRoad(svg, road, scene) {
  const picked = scene.chosenRoad === road || scene.highlightRoad === road;
  const base = el('polyline', {
    points: roadPoints(road), fill: 'none',
    stroke: 'var(--wire)', 'stroke-width': 7,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  });
  const signal = el('polyline', {
    points: roadPoints(road), fill: 'none',
    stroke: picked ? 'var(--road-pick)' : 'var(--wire-lit)',
    'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'stroke-dasharray': '1 11',
    class: `road-signal${scene.chosenRoad === road ? ' flowing' : ''}`,
  });
  svg.append(base, signal);
  if (scene.onRoadTap && !scene.chosenRoad) {
    const hit = el('polyline', {
      points: roadPoints(road), fill: 'none', stroke: 'transparent',
      'stroke-width': 36, 'pointer-events': 'stroke', 'data-road': road,
    });
    hit.addEventListener('click', () => scene.onRoadTap(road));
    svg.append(hit);
  }
}

function drawHouse(svg, { x, y }) {
  const g = el('g', { transform: `translate(${x},${y})` });
  g.innerHTML = `
    <circle r="20" fill="var(--surface-2)" stroke="var(--wire-lit)" stroke-width="2"/>
    <path d="M-9 6 v-7 l9,-8 9,8 v7 z" fill="var(--surface)" stroke="var(--safe)"
          stroke-width="2" stroke-linejoin="round"/>
    <rect x="-2.5" y="0" width="5" height="6" rx="1" fill="var(--pip)"/>`;
  svg.append(g);
}

function drawDock(svg, { x, y }, scene) {
  const g = el('g', { transform: `translate(${x},${y})` });
  const slots = [-28, -14, 0, 14, 28].map((dx, i) => {
    const filled = i < (scene.dockFilled ?? 0);
    return `<rect x="${dx - 5.5}" y="-4" width="11" height="11" rx="3"
      fill="${filled ? 'var(--fragment)' : 'var(--surface)'}"
      stroke="${filled ? 'var(--fragment)' : 'var(--ink-faint)'}" stroke-width="1.6"/>`;
  }).join('');
  g.innerHTML = `
    <rect x="-40" y="-16" width="80" height="34" rx="10" fill="var(--surface-2)"
          stroke="var(--pip)" stroke-width="2"/>
    ${slots}
    <path d="M-6 -16 q6 -9 12 0" fill="none" stroke="var(--pip)" stroke-width="2"
          stroke-linecap="round"/>`;
  svg.append(g);
}

function drawRelay(svg, { x, y }) {
  const g = el('g', { transform: `translate(${x},${y})` });
  g.innerHTML = `
    <circle r="13" fill="var(--surface-2)" stroke="var(--wire-lit)" stroke-width="2"/>
    <path d="M0 8 V-4" stroke="var(--bw)" stroke-width="2" stroke-linecap="round"/>
    <circle cy="-6" r="2" fill="var(--bw)"/>
    <path d="M-4.5 -9.5 q-3.5 3.5 0 7 M4.5 -9.5 q3.5 3.5 0 7" fill="none"
          stroke="var(--bw)" stroke-width="1.5" stroke-linecap="round" opacity="0.85"/>`;
  svg.append(g);
}

function drawWaypoint(svg, { x, y }) {
  svg.append(el('circle', {
    cx: x, cy: y, r: 6, fill: 'var(--surface-2)',
    stroke: 'var(--wire-lit)', 'stroke-width': 2,
  }));
}

function drawHazardCloud(svg, road, kind) {
  const [a, b] = GEO.hazardSegments[road];
  const m = midpoint(a, b);
  const side = road === 'short' ? -1 : 1;
  // position on the outer g (attribute transform); the CSS bob animates the
  // inner g — a CSS transform would otherwise OVERRIDE the positioning
  const g = el('g', { transform: `translate(${m.x + side * 26},${m.y - 8})` });
  const bob = el('g', { class: 'hazard-cloud' });
  bob.innerHTML = `<g transform="translate(-14,-14)">${kind === 'storm' ? stormIcon(28) : drizzleIcon(28)}</g>`;
  g.append(bob);
  svg.append(g);
}

// Junction read chip: hazard icon + threatened fragment numbers + distance
// dots. Doubles as the road's big-friendly tap target (44px+ at any scale).
function drawGlyphChip(svg, { x, y, kind, threatens, hops, road, scene }) {
  const g = el('g', { transform: `translate(${x},${y})`, class: 'glyph-chip' });
  if (road && scene?.onRoadTap && !scene.chosenRoad) {
    g.setAttribute('data-road-chip', road);
    g.setAttribute('cursor', 'pointer');
    g.addEventListener('click', () => scene.onRoadTap(road));
  }
  const nums = threatens.map((n) => `#${n}`).join(' ');
  const dots = Array.from({ length: hops }, (_, i) =>
    `<circle cx="${(i - (hops - 1) / 2) * 8}" cy="13" r="2.4" fill="var(--ink-soft)"/>`
  ).join('');
  g.innerHTML = `
    <rect x="-37" y="-16" width="74" height="38" rx="10" fill="var(--surface)"
          stroke="var(--wire-lit)" stroke-width="2"/>
    <g transform="translate(-28,-11)">${kind === 'storm' ? stormIcon(20) : drizzleIcon(20)}</g>
    <text x="9" y="-1" text-anchor="middle" font-size="12" font-weight="800"
          fill="var(--hazard)" font-family="var(--font)">${nums}</text>
    ${dots}`;
  svg.append(g);
}

// Once the fog lifts: if the last stretch is slow, say so where it is —
// a consequence made visible, not a decision (build card #15).
function drawSlowStretch(svg, scene) {
  if (!scene.fogRevealed || !scene.fogCost || !scene.chosenRoad) return;
  const nodes = GEO.roads[scene.chosenRoad];
  const m = midpoint(nodes[nodes.length - 2], nodes[nodes.length - 1]);
  const g = el('g', { transform: `translate(${m.x + 30},${m.y})` });
  g.innerHTML = `
    <rect x="-24" y="-13" width="48" height="26" rx="9" fill="var(--surface)"
          stroke="var(--hazard)" stroke-width="2"/>
    <g transform="translate(-16,-8)">${clockIcon(16, 'var(--hazard)')}</g>
    <text x="8" y="4.5" text-anchor="middle" font-size="12" font-weight="800"
          fill="var(--hazard)" font-family="var(--font)">+${scene.fogCost}</text>`;
  svg.append(g);
}

function drawFog(svg, scene) {
  if (scene.fogRevealed) return;
  const g = el('g', { class: 'fog', filter: 'url(#fog-blur)' });
  g.innerHTML = `
    <ellipse cx="195" cy="96" rx="140" ry="52" fill="var(--fog)"/>
    <ellipse cx="140" cy="116" rx="52" ry="22" fill="var(--fog)"/>
    <ellipse cx="258" cy="86" rx="48" ry="20" fill="var(--fog)"/>`;
  svg.append(g);
}

// Ambient meadow: fixed positions (no per-render twinkle-jump), sparse and dim.
const AMBIENT_DOTS = Array.from({ length: 26 }, (_, i) => {
  const gold = ((i * 2654435761) >>> 0) / 4294967296;
  const gold2 = ((i * 40503 + 12345) % 65536) / 65536;
  return { x: 24 + gold * 342, y: 30 + gold2 * 500, r: 1 + (i % 3) * 0.6, glow: i % 5 === 0 };
});

function drawAmbient(svg) {
  const g = el('g', { class: 'ambient' });
  g.innerHTML = AMBIENT_DOTS.map((d) =>
    `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${d.r}"
       fill="${d.glow ? 'var(--safe)' : 'var(--wire-lit)'}" opacity="${d.glow ? 0.5 : 0.28}"/>`
  ).join('');
  svg.append(g);
}

export function renderMap(svg, scene) {
  svg.setAttribute('viewBox', GEO.viewBox.join(' '));
  svg.replaceChildren();

  const defs = el('defs');
  defs.innerHTML =
    `<filter id="fog-blur" x="-30%" y="-30%" width="160%" height="160%">
       <feGaussianBlur stdDeviation="10"/>
     </filter>`;
  svg.append(defs);

  drawAmbient(svg);
  drawRoad(svg, 'short', scene);
  drawRoad(svg, 'long', scene);
  drawFog(svg, scene); // mist covers the final stretch's wires, never the nodes

  for (const [id, node] of Object.entries(GEO.nodes)) {
    if (node.kind === 'source') drawHouse(svg, node);
    else if (node.kind === 'dock') drawDock(svg, node, scene);
    else if (node.kind === 'pickup') drawRelay(svg, node);
    else drawWaypoint(svg, node);
    if (node.label) {
      svg.append(Object.assign(el('text', {
        x: node.x, y: node.y + (id === 'dock' ? 34 : 36),
        'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700,
        fill: 'var(--ink-soft)', 'font-family': 'var(--font)',
      }), { textContent: node.label }));
    }
  }

  drawHazardCloud(svg, 'short', 'storm');
  drawHazardCloud(svg, 'long', 'drizzle');
  drawSlowStretch(svg, scene);

  if (scene.showJunctionGlyphs) {
    drawGlyphChip(svg, { x: 64, y: 480, kind: 'storm', threatens: [2, 4], hops: 4, road: 'short', scene });
    drawGlyphChip(svg, { x: 322, y: 530, kind: 'drizzle', threatens: [3], hops: 7, road: 'long', scene });
  }
}
