// road-scene.js — composes the chase-cam SVG from the same scene() the map
// view consumes (design/11). NO game rules here: hop counts, hazards, and
// forecasts all arrive via the scene. The current segment is the whole
// frame; the top-down map remains the multi-segment tactical read (toggle).

import {
  stormIcon, drizzleIcon, staticIcon, rapidsIcon, jamIcon, snifferIcon,
  trenchIcon, satelliteIcon, swarmIcon, clockIcon,
} from '../icons.js';
import { glyphLabel } from '../map.js';
import {
  ROAD_W, ROAD_H, forkSpines, cubicAt, ribbonPath, spineEdge, spineDots,
  trunkDots, trunkPath, trunkEdge, forkNotchPath,
} from './projection.js';
import {
  SCENE_DEFS, backLayers, treeLayers, frontLayers, destinationHouse, stormAtDepth,
} from './scenery.js';

const HAZARD_ICONS = {
  storm: stormIcon, drizzle: drizzleIcon, static: staticIcon, rapids: rapidsIcon,
  congestion: jamIcon, sniffer: snifferIcon, trench: trenchIcon, satellite: satelliteIcon,
  ddos: swarmIcon, offline: clockIcon,
};

const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

const SIGN_POS = { short: { x: 322, y: 452 }, long: { x: 976, y: 456 } };

// A diegetic signpost carrying the exact chip forecast (icon + label + one
// dot per hop). Same data-road-chip handle as the map view's chips.
function signpost(scene, glyph) {
  const { x, y } = SIGN_POS[glyph.road];
  const lbl = glyphLabel(glyph);
  const accent = glyph.kind ? 'var(--hazard)' : 'var(--safe)';
  const dots = Array.from({ length: glyph.hops }, (_, i) =>
    `<circle cx="${(i - (glyph.hops - 1) / 2) * 15}" cy="4" r="5.2" fill="#eafff2"/>`
  ).join('');
  const icon = glyph.kind
    ? `<g transform="translate(-72,-46)">${HAZARD_ICONS[glyph.kind](36)}</g>`
    : '';
  const picked = scene.highlightRoad === glyph.road;
  const g = el('g', {
    class: 'rv-sign',
    transform: `translate(${x},${y})`,
    opacity: scene.highlightRoad && !picked ? 0.55 : 1,
  });
  if (scene.onRoadTap && !scene.chosenRoad) {
    g.setAttribute('data-road-chip', glyph.road);
    g.setAttribute('cursor', 'pointer');
    g.addEventListener('click', () => scene.onRoadTap(glyph.road));
  }
  const w = Math.max(196, glyph.hops * 15 + 80);
  g.innerHTML = `
    <ellipse cx="0" cy="116" rx="20" ry="5" fill="#0c2c1e" opacity="0.55"/>
    <rect x="-5" y="-6" width="10" height="122" rx="4" fill="#1d4a38"/>
    <g transform="translate(0,-14)">
      <rect x="${-w / 2}" y="-58" width="${w}" height="76" rx="16" fill="#12352b"
            stroke="${picked ? 'var(--road-pick)' : accent}" stroke-width="${picked ? 5 : 4}"/>
      ${icon}
      <text x="${glyph.kind ? 26 : 0}" y="-20" text-anchor="middle"
            font-family="var(--font)" font-size="26" font-weight="800"
            fill="${lbl.color}">${lbl.text}</text>
      <g>${dots}</g>
    </g>`;
  return g;
}

// "?" event lantern / relay pickup, planted at depth on an arc.
function roadMarker(spine, t, kind) {
  const p = cubicAt(...spine, t);
  const g = el('g', { transform: `translate(${p.x},${p.y - 14})` });
  g.innerHTML = kind === 'event'
    ? `<circle r="11" fill="#12352b" stroke="var(--pip)" stroke-width="2.5"/>
       <text y="5" text-anchor="middle" font-size="13" font-weight="800"
             fill="var(--pip)" font-family="var(--font)">?</text>`
    : `<circle r="11" fill="#12352b" stroke="var(--wire-lit)" stroke-width="2.5"/>
       <path d="M0 6 V-3" stroke="var(--bw)" stroke-width="2.4" stroke-linecap="round"/>
       <circle cy="-5" r="2" fill="var(--bw)"/>`;
  return g;
}

function hazardT(road) {
  if (!road.hazard) return null;
  const idx = road.nodes.indexOf(road.hazard.impactNode);
  return Math.max(0.15, Math.min(0.85, idx / (road.nodes.length - 1)));
}

// Hazards that stain their road amber: the ones that take or scramble
// fragments. Mild slows (drizzle, rapids, satellite…) keep a mint road —
// their cloud and chip carry the warning, matching the map view's read.
const STAIN_KINDS = new Set(['storm', 'static', 'sniffer', 'ddos']);

// One fork's full drawing: ribbon, stain if stormy, edge light, dots, markers.
function drawArc(svg, scene, spine, road, key, hops) {
  const chosen = scene.chosenRoad;
  const faded = (chosen && chosen !== key)
    || (!chosen && scene.highlightRoad && scene.highlightRoad !== key);
  const g = el('g', { class: `rv-arc rv-arc-${key}`, opacity: chosen && chosen !== key ? 0.18 : faded ? 0.5 : 1 });

  const hazardous = STAIN_KINDS.has(road.hazard?.kind);
  g.append(el('path', { d: ribbonPath(spine), fill: 'url(#rv-road)' }));
  if (hazardous) {
    g.append(el('path', { d: ribbonPath(spine), fill: '#f4a259', opacity: 0.2 }));
  }
  const edge = el('path', {
    d: spineEdge(spine, 68, 16, key === 'short' ? -1 : 1),
    fill: 'none', 'stroke-linecap': 'round', 'stroke-width': 4.5,
    stroke: hazardous ? '#ffc48a' : '#b8ffd1',
    opacity: 0.9,
  });
  g.append(edge);

  const dots = spineDots(spine, hops);
  for (const d of dots) {
    g.append(el('ellipse', {
      cx: d.x, cy: d.y, rx: d.r, ry: d.r * 0.48, fill: '#dffffb', opacity: 0.95,
    }));
  }
  if (road.event) {
    const idx = road.nodes.indexOf(road.event.node);
    if (idx > 0) g.append(roadMarker(spine, idx / (road.nodes.length - 1), 'event'));
  }
  if (road.bwPickup) {
    const idx = road.nodes.indexOf(road.bwPickup.node);
    if (idx > 0) g.append(roadMarker(spine, idx / (road.nodes.length - 1), 'pickup'));
  }

  // wide invisible tap target along the arc (mirrors the map's hit polyline)
  if (scene.onRoadTap && !scene.chosenRoad) {
    const hit = el('path', {
      d: spineEdge(spine, 0, 0, 1), fill: 'none', stroke: 'transparent',
      'stroke-width': 60, 'pointer-events': 'stroke', 'data-road': key, cursor: 'pointer',
    });
    hit.addEventListener('click', () => scene.onRoadTap(key));
    g.append(hit);
  }
  svg.append(g);
}

// scene: the same object main.js builds for renderMap, PLUS road extras
// (dnsPending, address, dockLabel already there).
export function renderRoad(svg, scene) {
  svg.setAttribute('viewBox', `0 0 ${ROAD_W} ${ROAD_H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
  svg.replaceChildren();

  const defs = el('defs');
  defs.innerHTML = SCENE_DEFS;
  svg.append(defs);

  const back = el('g');
  back.innerHTML = backLayers();
  svg.append(back);

  const segment = scene.map.segments[scene.segment] ?? scene.map.segments.at(-1);
  const lastSegment = scene.segment >= scene.map.segments.length - 1;
  const shortRoad = segment.roads.short;
  const longRoad = segment.roads.long;
  const spines = forkSpines({
    leftHops: shortRoad.nodes.length - 1,
    rightHops: longRoad.nodes.length - 1,
  });

  // destination: Grandma's on the final stretch, a relay junction before it
  const house = el('g');
  house.innerHTML = lastSegment
    ? destinationHouse({
      state: scene.dnsPending ? 'unknown' : 'known',
      dockFilled: scene.dockFilled,
      address: scene.address,
      label: scene.dockLabel,
    })
    : `<circle cx="742" cy="308" r="60" fill="url(#rv-homeGlow)" opacity="0.4"/>
       <g transform="translate(742,306)">
         <ellipse cx="0" cy="16" rx="22" ry="4" fill="#0e2f42" opacity="0.6"/>
         <circle r="14" fill="#12352b" stroke="var(--wire-lit)" stroke-width="2.5"/>
         <path d="M0 8 V0 M0 0 L-6 -8 M0 0 L6 -8" fill="none" stroke="#9dbcaa"
               stroke-width="2.6" stroke-linecap="round"/>
       </g>`;
  svg.append(house);

  // the road: trunk + both arcs (drawn under hazards and signs)
  const trunk = el('g');
  trunk.innerHTML = `
    <path d="${trunkPath()}" fill="url(#rv-road)"/>
    <path d="${forkNotchPath()}" fill="url(#rv-road)"/>
    <path d="${trunkEdge(-1)}" fill="none" stroke="#b8ffd1" stroke-width="4.5"
          stroke-linecap="round" opacity="0.9"/>
    <path d="${trunkEdge(1)}" fill="none" stroke="#b8ffd1" stroke-width="4.5"
          stroke-linecap="round" opacity="0.9"/>
    ${trunkDots(4).map((d) =>
    `<ellipse cx="${d.x}" cy="${d.y}" rx="${d.r}" ry="${d.r * 0.5}" fill="#dffffb"/>`).join('')}`;
  svg.append(trunk);

  drawArc(svg, scene, spines.left, shortRoad, 'short', shortRoad.nodes.length - 1);
  drawArc(svg, scene, spines.right, longRoad, 'long', longRoad.nodes.length - 1);

  // hazards at depth, on their own road (fog-of-detail: current segment only)
  for (const [key, road] of Object.entries(segment.roads)) {
    const t = hazardT(road);
    if (t === null) continue;
    if (scene.chosenRoad && scene.chosenRoad !== key) continue;
    const spine = key === 'short' ? spines.left : spines.right;
    const p = cubicAt(...spine, t);
    const hz = el('g', { class: 'rv-hazard' });
    if (road.hazard.kind === 'storm') {
      // only a real storm gets the big amber thunderhead
      hz.innerHTML = stormAtDepth(p.x, p.y - 100, 1.1);
    } else {
      hz.innerHTML = `
        <ellipse cx="${p.x}" cy="${p.y + 6}" rx="70" ry="16" fill="url(#rv-hazardLight)"/>
        <g class="rv-bob"><g transform="translate(${p.x - 27},${p.y - 74})">
          ${HAZARD_ICONS[road.hazard.kind](54)}
        </g></g>`;
    }
    svg.append(hz);
  }

  // trees sit between the road and the signs (sign in front = depth)
  const trees = el('g');
  trees.innerHTML = treeLayers();
  svg.append(trees);

  // signposts appear at the decision moment, same rule as the chips
  if (scene.showJunctionGlyphs && scene.junctionGlyphs) {
    for (const glyph of scene.junctionGlyphs) svg.append(signpost(scene, glyph));
  }

  const front = el('g');
  front.innerHTML = frontLayers();
  svg.append(front);
}
