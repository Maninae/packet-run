// road-view.js — the chase-cam's live layer + activation logic. The party
// stands in a staggered arc on the trunk (canvas, same drawFragment/drawPip
// characters as the map view); the hop surges them up the chosen arc with
// the same impact fates the map hop shows (swept / saved / straggle).
// Availability: Act 1, landscape stage, ?view=road (design/11 scope) — the
// classic map stays one toggle away as the tactical read.

import { drawFragment, drawPip } from '../party.js';
import { mapOrientation } from '../map-layout.js';
import { ROAD_W, ROAD_H, FORK, forkSpines, cubicAt } from './projection.js';

// Formation slots in road space, one per fragment id (the Gate P1 arc).
const SLOTS = [
  { x: 556, y: 688, s: 42 },
  { x: 602, y: 646, s: 37 },
  { x: 660, y: 632, s: 35 },
  { x: 718, y: 646, s: 37 },
  { x: 764, y: 688, s: 42 },
];
const PIP = { x: 640, y: 566 };

const urlWantsRoad = () =>
  new URLSearchParams(window.location.search).get('view') === 'road';

// The player can flip to the map mid-run; the preference survives re-renders.
let showRoad = true;
export function toggleRoad() { showRoad = !showRoad; }

export function roadAvailable(actId) {
  return urlWantsRoad() && actId === 1 && mapOrientation() === 'landscape';
}

export function roadActive(actId, phase) {
  return roadAvailable(actId) && showRoad && phase !== 'duel';
}

// Stage pixels ↔ road space under preserveAspectRatio="xMidYMax slice".
export function roadTransform(stageW, stageH) {
  const scale = Math.max(stageW / ROAD_W, stageH / ROAD_H);
  const ox = (stageW - ROAD_W * scale) / 2;
  const oy = stageH - ROAD_H * scale;
  return { scale, ox, oy, apply: (x, y) => [ox + x * scale, oy + y * scale] };
}

function setupCanvas(canvas) {
  const stage = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w, h, t: roadTransform(w, h) };
}

// The standing formation. `now` drives the idle bob.
export function renderRoadParty(canvas, { fragments }, now = 0) {
  const { ctx, w, h, t } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  for (const f of fragments) {
    if (f.status !== 'with-party' && f.status !== 'straggler') continue;
    const slot = SLOTS[(f.id - 1) % SLOTS.length];
    const bob = now ? Math.sin(now / 480 + f.id * 1.7) * 3 : 0;
    const behind = f.status === 'straggler' ? 26 : 0;
    const [x, y] = t.apply(slot.x, slot.y + bob + behind);
    ctx.globalAlpha = f.status === 'straggler' ? 0.6 : 1;
    drawFragment(ctx, x, y, slot.s * t.scale, f);
    ctx.globalAlpha = 1;
  }
  const pipBob = now ? Math.sin(now / 620) * 4 : 0;
  const [px, py] = t.apply(PIP.x, PIP.y + pipBob);
  drawPip(ctx, px, py, t.scale * 2.4);
}

let idleRaf = null;

export function startRoadIdle(canvas, getScene) {
  stopRoadIdle();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    renderRoadParty(canvas, getScene());
    return;
  }
  const loop = (now) => {
    renderRoadParty(canvas, getScene(), now);
    idleRaf = requestAnimationFrame(loop);
  };
  idleRaf = requestAnimationFrame(loop);
}

export function stopRoadIdle() {
  if (idleRaf) cancelAnimationFrame(idleRaf);
  idleRaf = null;
}

const cssCache = {};
function cssVar(name) {
  if (!cssCache[name]) {
    cssCache[name] = getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim();
  }
  return cssCache[name];
}

// The hop: the party surges from the formation up the chosen arc, shrinking
// with depth — impact fates resolve mid-surge, exactly like the map hop.
// racers: [{ id, hasCopy, fate: 'arrives' | 'swept' | 'saved' | 'straggle' }]
export function animateRoadHop(canvas, { map, segment, road, racers }, { duration = 900 } = {}) {
  const seg = map.segments[segment] ?? map.segments.at(-1);
  const spines = forkSpines({
    leftHops: seg.roads.short.nodes.length - 1,
    rightHops: seg.roads.long.nodes.length - 1,
  });
  const spine = road === 'short' ? spines.left : spines.right;
  const IMPACT_T = 0.55;
  const jitter = racers.map(() => Math.random() * 9);

  return new Promise((resolve) => {
    const start = performance.now();
    const frame = (now) => {
      const t01 = Math.min(1, (now - start) / duration);
      const { ctx, w, h, t } = setupCanvas(canvas);
      ctx.clearRect(0, 0, w, h);

      racers.forEach((f, i) => {
        const slot = SLOTS[(f.id - 1) % SLOTS.length];
        // slot → fork → a third of the way up the arc, then the camera
        // "catches up" (the scene re-renders at the new node)
        const wobble = Math.sin(t01 * Math.PI * 2 + jitter[i]) * 6 * (1 - t01);
        let p;
        if (t01 < 0.45) {
          const k = t01 / 0.45;
          p = {
            x: slot.x + (FORK.x - slot.x) * k + wobble,
            y: slot.y + (FORK.y + 26 - slot.y) * k,
          };
        } else {
          const k = (t01 - 0.45) / 0.55;
          const arcP = cubicAt(...spine, 0.34 * k);
          p = { x: arcP.x + wobble * 0.5, y: arcP.y };
        }
        const size = slot.s * (1 - 0.55 * t01);
        let alpha = 1;

        if (f.fate === 'swept' && t01 >= IMPACT_T) {
          const fall = (t01 - IMPACT_T) / (1 - IMPACT_T);
          if (fall > 0.6) return;
          p.y += fall * 90;
          p.x += (i % 2 ? 1 : -1) * fall * 40;
          alpha = 1 - fall / 0.6;
        }
        if (f.fate === 'straggle' && t01 >= IMPACT_T) {
          p = { x: FORK.x + wobble, y: FORK.y + 30 + Math.sin(t01 * 14) * 3 };
          alpha = 0.7;
        }
        const [px, py] = t.apply(p.x, p.y);
        ctx.globalAlpha = alpha;
        drawFragment(ctx, px, py, size * t.scale, {
          id: f.id, hasCopy: f.hasCopy && t01 < IMPACT_T,
        });
        ctx.globalAlpha = 1;

        if (f.fate === 'saved' && t01 >= IMPACT_T && t01 < IMPACT_T + 0.18) {
          const burst = (t01 - IMPACT_T) / 0.18;
          ctx.strokeStyle = cssVar('--copy');
          ctx.globalAlpha = 1 - burst;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(px, py, (14 + burst * 26) * t.scale, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      });

      // Pip rides ahead of the surge
      const pipP = t01 < 0.45
        ? { x: PIP.x, y: PIP.y - t01 * 60 }
        : cubicAt(...spine, 0.12 + 0.3 * ((t01 - 0.45) / 0.55));
      const [px, py] = t.apply(pipP.x, pipP.y);
      drawPip(ctx, px, py, t.scale * 2.4 * (1 - 0.45 * t01));

      if (t01 < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}
