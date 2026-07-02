// map.js — SVG region map: layout, roads, nodes, glyphs, fog-of-detail.
// Works on ANY map (config.js schema v2): the hand-tuned 1a region keeps its
// hand geometry; generated maps get a vertical-stack layout (portrait-first,
// source bottom → dock top, short roads bulge left / long roads right).
// Fog-of-detail: shape always visible; hazard clouds and junction chips only
// for the CURRENT segment; threat glyphs are FORECASTS (design/07).

import {
  stormIcon, drizzleIcon, staticIcon, rapidsIcon, jamIcon, snifferIcon,
  trenchIcon, satelliteIcon, swarmIcon, clockIcon,
} from './icons.js';

const HAZARD_ICONS = {
  storm: stormIcon, drizzle: drizzleIcon, static: staticIcon, rapids: rapidsIcon,
  congestion: jamIcon, sniffer: snifferIcon, trench: trenchIcon, satellite: satelliteIcon,
  ddos: swarmIcon, offline: clockIcon,
};

const NS = 'http://www.w3.org/2000/svg';
export const VIEWBOX = [0, 0, 390, 560];

// ---------- layout ----------

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

const layoutCache = new WeakMap();
export function layoutMap(map) {
  if (!layoutCache.has(map)) {
    layoutCache.set(map, map.id === 'act1-intro' ? HAND_NODES : genericNodes(map));
  }
  return layoutCache.get(map);
}

// Maps SVG viewBox coords → stage pixels (shared with the canvas live layer).
export function viewTransform(stageW, stageH) {
  const [, , vw, vh] = VIEWBOX;
  const scale = Math.min(stageW / vw, stageH / vh);
  const ox = (stageW - vw * scale) / 2;
  const oy = (stageH - vh * scale) / 2;
  return { scale, ox, oy, apply: (x, y) => [ox + x * scale, oy + y * scale] };
}

// ---------- drawing ----------

function el(name, attrs = {}) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function roadPointsOf(nodes, road) {
  return road.nodes.map((id) => `${nodes[id].x},${nodes[id].y}`).join(' ');
}

function midpointOf(nodes, aId, bId) {
  return { x: (nodes[aId].x + nodes[bId].x) / 2, y: (nodes[aId].y + nodes[bId].y) / 2 };
}

// state: 'faint' (future / untaken past) | 'idle' | 'picked' (chosen or previewed)
function drawRoad(svg, nodes, road, key, state, scene, interactive) {
  const points = roadPointsOf(nodes, road);
  const opacity = state === 'faint' ? 0.4 : 1;
  svg.append(el('polyline', {
    points, fill: 'none', stroke: 'var(--wire)', 'stroke-width': 7, opacity,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  }));
  svg.append(el('polyline', {
    points, fill: 'none',
    stroke: state === 'picked' ? 'var(--road-pick)' : 'var(--wire-lit)',
    'stroke-width': 2, opacity, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'stroke-dasharray': '1 11',
    class: `road-signal${state === 'picked' && scene.chosenRoad ? ' flowing' : ''}`,
  }));
  if (interactive) {
    const hit = el('polyline', {
      points, fill: 'none', stroke: 'transparent',
      'stroke-width': 36, 'pointer-events': 'stroke', 'data-road': key,
    });
    hit.addEventListener('click', () => scene.onRoadTap(key));
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

function drawJunctionNode(svg, { x, y }) {
  const g = el('g', { transform: `translate(${x},${y})` });
  g.innerHTML = `
    <circle r="11" fill="var(--surface-2)" stroke="var(--wire-lit)" stroke-width="2"/>
    <path d="M0 6 V0 M0 0 L-5 -6 M0 0 L5 -6" fill="none" stroke="var(--ink-soft)"
          stroke-width="2" stroke-linecap="round"/>`;
  svg.append(g);
}

function drawWaypoint(svg, { x, y }) {
  svg.append(el('circle', {
    cx: x, cy: y, r: 6, fill: 'var(--surface-2)',
    stroke: 'var(--wire-lit)', 'stroke-width': 2,
  }));
}

function drawHazardCloud(svg, nodes, road, key) {
  if (!road.hazard) return;
  const idx = road.nodes.indexOf(road.hazard.impactNode);
  const m = midpointOf(nodes, road.nodes[idx - 1], road.nodes[idx]);
  const side = key === 'short' ? -1 : 1;
  const g = el('g', { transform: `translate(${m.x + side * 26},${m.y - 8})` });
  const bob = el('g', { class: 'hazard-cloud' });
  bob.innerHTML = `<g transform="translate(-14,-14)">${HAZARD_ICONS[road.hazard.kind](28)}</g>`;
  g.append(bob);
  svg.append(g);
}

// Junction read chip: hazard icon + threatened numbers + distance dots.
// Doubles as the road's big-friendly tap target.
function drawGlyphChip(svg, { x, y, kind, threatens, hops, straggles, road, scene }) {
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
  const icon = kind
    ? `<g transform="translate(-28,-11)">${HAZARD_ICONS[kind](20)}</g>`
    : '';
  const label = !kind
    ? `<text x="0" y="-1" text-anchor="middle" font-size="11" font-weight="700"
         fill="var(--safe)" font-family="var(--font)">quiet</text>`
    : kind === 'static' || kind === 'sniffer'
      ? `<text x="9" y="-1" text-anchor="middle" font-size="13" font-weight="800"
           fill="var(--danger)" font-family="var(--font)">#?</text>`
      : kind === 'rapids'
        ? `<text x="9" y="-1" text-anchor="middle" font-size="12" font-weight="800"
             fill="var(--fragment)" font-family="var(--font)">x${straggles ?? 2}</text>`
        : kind === 'congestion'
          ? `<text x="9" y="-1" text-anchor="middle" font-size="11" font-weight="800"
               fill="var(--hazard)" font-family="var(--font)">jam</text>`
        : kind === 'trench'
          ? `<text x="9" y="-1" text-anchor="middle" font-size="11" font-weight="800"
               fill="var(--safe)" font-family="var(--font)">+3</text>`
        : kind === 'satellite'
          ? `<text x="9" y="-1" text-anchor="middle" font-size="11" font-weight="800"
               fill="var(--hazard)" font-family="var(--font)">slow</text>`
          : `<text x="9" y="-1" text-anchor="middle" font-size="12" font-weight="800"
               fill="var(--hazard)" font-family="var(--font)">${nums}</text>`;
  g.innerHTML = `
    <rect x="-37" y="-16" width="74" height="38" rx="10" fill="var(--surface)"
          stroke="var(--wire-lit)" stroke-width="2"/>
    ${icon}${label}${dots}`;
  svg.append(g);
}

function chipAnchor(nodes, road, key) {
  const first = nodes[road.nodes[1]];
  const side = key === 'short' ? -1 : 1;
  return {
    x: Math.max(42, Math.min(348, first.x + side * 58)),
    y: Math.max(42, Math.min(532, first.y + 14)),
  };
}

function drawSlowStretch(svg, nodes, scene, lastRoad) {
  if (!scene.fogRevealed || !scene.fogCost || !lastRoad) return;
  const m = midpointOf(nodes, lastRoad.nodes.at(-2), lastRoad.nodes.at(-1));
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

// Ambient meadow: fixed positions (no per-render twinkle-jump), sparse, dim.
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

// scene: { map, segment, chosenRoad, highlightRoad, takenRoads, dockFilled,
//          showJunctionGlyphs, junctionGlyphs, fogRevealed, fogCost, onRoadTap }
export function renderMap(svg, scene) {
  svg.setAttribute('viewBox', VIEWBOX.join(' '));
  svg.replaceChildren();
  const nodes = layoutMap(scene.map);

  const defs = el('defs');
  defs.innerHTML =
    `<filter id="fog-blur" x="-30%" y="-30%" width="160%" height="160%">
       <feGaussianBlur stdDeviation="10"/>
     </filter>`;
  svg.append(defs);
  drawAmbient(svg);

  scene.map.segments.forEach((segment, s) => {
    for (const [key, road] of Object.entries(segment.roads)) {
      let state = 'faint';
      if (s < scene.segment) state = scene.takenRoads?.[s] === key ? 'idle' : 'faint';
      else if (s === scene.segment) {
        state = (scene.chosenRoad === key || scene.highlightRoad === key) ? 'picked'
          : scene.chosenRoad ? 'faint' : 'idle';
      }
      const interactive = s === scene.segment && scene.onRoadTap && !scene.chosenRoad;
      drawRoad(svg, nodes, road, key, state, scene, interactive);
    }
  });

  drawFog(svg, scene); // mist covers the final stretch's wires, never the nodes

  for (const node of Object.values(nodes)) {
    if (node.kind === 'source') drawHouse(svg, node);
    else if (node.kind === 'dock') drawDock(svg, node, scene);
    else if (node.kind === 'pickup') drawRelay(svg, node);
    else if (node.kind === 'junction') drawJunctionNode(svg, node);
    else drawWaypoint(svg, node);
    if (node.label) {
      svg.append(Object.assign(el('text', {
        x: node.x, y: node.y + (node.kind === 'dock' ? 34 : 36),
        'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700,
        fill: 'var(--ink-soft)', 'font-family': 'var(--font)',
      }), { textContent: node.label }));
    }
  }

  // "?" nodes are part of the SHAPE: visible from the start, mystery intact
  for (const segment of scene.map.segments) {
    for (const road of Object.values(segment.roads)) {
      if (!road.event) continue;
      const n = nodes[road.event.node];
      if (!n) continue;
      const q = el('g', { transform: `translate(${n.x},${n.y})` });
      q.innerHTML = `
        <circle r="9" fill="var(--surface-2)" stroke="var(--pip)" stroke-width="2"/>
        <text y="4" text-anchor="middle" font-size="11" font-weight="800"
              fill="var(--pip)" font-family="var(--font)">?</text>`;
      svg.append(q);
    }
  }

  // hazard details are fog-of-detail: current segment only (design/07)
  const current = scene.map.segments[scene.segment];
  if (current) {
    for (const [key, road] of Object.entries(current.roads)) {
      drawHazardCloud(svg, nodes, road, key);
    }
    drawSlowStretch(svg, nodes, scene,
      scene.segment === scene.map.segments.length - 1 && scene.chosenRoad
        ? current.roads[scene.chosenRoad] : null);
    if (scene.showJunctionGlyphs && scene.junctionGlyphs) {
      for (const glyph of scene.junctionGlyphs) {
        const anchor = chipAnchor(nodes, current.roads[glyph.road], glyph.road);
        drawGlyphChip(svg, { ...anchor, ...glyph, scene });
      }
    }
  }
}
