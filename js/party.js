// party.js — the party's two views:
//   1. Canvas live layer: Pip + fragments as visible bodies on the map
//      (Integrity = who's still with you). Fragments scatter onto different
//      wires and regroup SHUFFLED at nodes — never an in-order train
//      (design/07-accuracy.md). Racing animation lands with Phase 1a wiring.
//   2. DOM party row: one 44px chip per fragment — also the tap target for
//      tool aiming on mobile (arm a tool, then tap the fragment).

import { layoutMap, viewTransform } from './map.js';
import { PIP_SPARK_D, pipAvatar, copyIcon } from './icons.js';

const cssCache = {};
function cssVar(name) {
  if (!cssCache[name]) {
    cssCache[name] = getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim();
  }
  return cssCache[name];
}

// Hand-placed cluster offsets (viewBox units) for a party standing at a node:
// Pip hovers highest, fragments float in a loose arc above the node. Loose on
// purpose — they're a scatter, not a train.
const PIP_OFFSET = { x: 0, y: -48 };
const FRAG_OFFSETS = [
  { x: -24, y: -12 }, { x: -13, y: -27 }, { x: 0, y: -32 },
  { x: 13, y: -27 }, { x: 24, y: -12 },
];

function drawPip(ctx, x, y, scale) {
  const r = 1.15 * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r, r);
  ctx.shadowColor = cssVar('--pip-glow');
  ctx.shadowBlur = 14;
  ctx.fillStyle = cssVar('--pip');
  ctx.fill(new Path2D(PIP_SPARK_D));
  ctx.shadowBlur = 0;
  // face — two dot eyes + a smile, dark on the spark
  ctx.fillStyle = '#3a2c00';
  ctx.beginPath();
  ctx.arc(-2.4, -0.8, 1.05, 0, Math.PI * 2);
  ctx.arc(2.4, -0.8, 1.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a2c00';
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 1.6, 2.4, 0.25 * Math.PI, 0.75 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawFragment(ctx, x, y, size, fragment) {
  const half = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (fragment.hasCopy) {
    // the duplicate rides along as a translucent twin (design/08)
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = cssVar('--copy');
    ctx.beginPath();
    ctx.roundRect(-half + 4, -half - 4, size, size, 5);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  const glitched = fragment.corrupted && fragment.revealed;
  ctx.shadowColor = glitched ? cssVar('--fragment-corrupt') : cssVar('--fragment-glow');
  ctx.shadowBlur = 10;
  ctx.fillStyle = glitched ? cssVar('--fragment-corrupt') : cssVar('--fragment');
  ctx.beginPath();
  ctx.roundRect(-half, -half, size, size, 5);
  ctx.fill();
  ctx.shadowBlur = 0;
  if (glitched) {
    // dithered noise flecks (design/08): the bits are visibly wrong
    ctx.fillStyle = 'rgba(10, 16, 13, 0.55)';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(-half + ((i * 7 + 2) % size), -half + ((i * 11 + 3) % size), 3, 1.6);
    }
  }
  ctx.fillStyle = glitched ? '#2b0713' : '#062733';
  ctx.font = `800 ${size * 0.62}px ${cssVar('--font') || 'system-ui'}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(fragment.id), 0, 1);
  ctx.restore();
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
  return { ctx, w, h, t: viewTransform(w, h) };
}

// Draw the party standing at a node. `fragments` uses the engine shape:
// [{ id, status: 'with-party' | 'lost' | 'returning', hasCopy }]
// `now` drives a gentle idle bob — the party feels alive while you think.
export function renderParty(canvas, { map, nodeId, fragments }, now = 0) {
  const { ctx, w, h, t } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);

  const node = layoutMap(map)[nodeId];
  const present = fragments.filter((f) => f.status === 'with-party');

  for (const f of present) {
    const off = FRAG_OFFSETS[(f.id - 1) % FRAG_OFFSETS.length];
    const bob = now ? Math.sin(now / 480 + f.id * 1.7) * 2.2 : 0;
    const [x, y] = t.apply(node.x + off.x, node.y + off.y + bob);
    drawFragment(ctx, x, y, 17 * t.scale, f);
  }
  const pipBob = now ? Math.sin(now / 620) * 3.5 : 0;
  const [px, py] = t.apply(node.x + PIP_OFFSET.x, node.y + PIP_OFFSET.y + pipBob);
  drawPip(ctx, px, py, t.scale);
}

// Idle loop: keeps the standing party bobbing between beats. The hop
// animation owns the canvas while it runs — callers stop the idle first.
let idleRaf = null;

export function startIdle(canvas, getScene) {
  stopIdle();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    renderParty(canvas, getScene());
    return;
  }
  const loop = (now) => {
    renderParty(canvas, getScene(), now);
    idleRaf = requestAnimationFrame(loop);
  };
  idleRaf = requestAnimationFrame(loop);
}

export function stopIdle() {
  if (idleRaf) cancelAnimationFrame(idleRaf);
  idleRaf = null;
}

// The hop: fragments scatter onto lanes and RACE — different speeds, arriving
// shuffled (the visual itself teaches independent, out-of-order travel;
// design/07). Impact fates resolve mid-wire: 'swept' fragments flash and drop,
// 'saved' ones flare violet as their copy absorbs the hit.
// racers: [{ id, hasCopy, fate: 'arrives' | 'swept' | 'saved' }]
export function animateHop(canvas, { map, from, to, racers }, { duration = 850 } = {}) {
  const nodes = layoutMap(map);
  const a = nodes[from];
  const b = nodes[to];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const perp = { x: -dy / len, y: dx / len };

  // visual-only randomness (never the engine rng): lanes shuffle every hop
  const lanes = [-16, -8, 0, 8, 16].sort(() => Math.random() - 0.5);
  const jitter = racers.map(() => 0.5 + Math.random());
  const IMPACT_T = 0.55;

  return new Promise((resolve) => {
    const start = performance.now();
    const frame = (now) => {
      const t01 = Math.min(1, (now - start) / duration);
      const { ctx, w, h, t } = setupCanvas(canvas);
      ctx.clearRect(0, 0, w, h);

      racers.forEach((f, i) => {
        // progress wobbles per-racer mid-hop but everyone lands at t=1
        const race = Math.min(1, t01 + Math.sin(t01 * Math.PI) * 0.12 * Math.sin(jitter[i] * 9 + i));
        const lane = lanes[i % lanes.length] * Math.sin(Math.PI * Math.min(1, race * 1.15));
        let x = a.x + dx * race + perp.x * lane;
        let y = a.y + dy * race + perp.y * lane;
        let alpha = 1;

        if (f.fate === 'swept' && t01 >= IMPACT_T) {
          const fall = (t01 - IMPACT_T) / (1 - IMPACT_T);
          if (fall > 0.6) return; // gone
          y += fall * 46;
          alpha = 1 - fall / 0.6;
        }
        if (f.fate === 'straggle' && t01 >= IMPACT_T) {
          // caught in the rapids: frozen mid-wire, still yours
          const hold = IMPACT_T;
          const lane2 = lanes[i % lanes.length] * Math.sin(Math.PI * Math.min(1, hold * 1.15));
          x = a.x + dx * hold + perp.x * lane2;
          y = a.y + dy * hold + perp.y * lane2 + Math.sin(t01 * 14) * 2;
          alpha = 0.7;
        }
        const [px, py] = t.apply(x, y);
        ctx.globalAlpha = alpha;
        drawFragment(ctx, px, py, 15 * t.scale, { id: f.id, hasCopy: f.hasCopy && t01 < IMPACT_T });
        ctx.globalAlpha = 1;

        if (f.fate === 'saved' && t01 >= IMPACT_T && t01 < IMPACT_T + 0.18) {
          // the copy pops: a violet burst ring
          const burst = (t01 - IMPACT_T) / 0.18;
          ctx.strokeStyle = cssVar('--copy');
          ctx.globalAlpha = 1 - burst;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(px, py, (8 + burst * 16) * t.scale, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      });

      // Pip glides ahead on the center line
      const [px, py] = t.apply(a.x + dx * t01, a.y + dy * t01 - 14);
      drawPip(ctx, px, py, t.scale * 0.95);

      if (t01 < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

// The DOM party row: Pip's avatar + one chip per fragment (44px targets).
// opts.threatened: Set of ids the current forecast names.
// opts.onChipTap(id): tool-aiming callback (Phase 1a wiring).
export function renderPartyRow(container, fragments, opts = {}) {
  container.replaceChildren();
  const avatar = document.createElement('div');
  avatar.className = 'pip-avatar';
  avatar.innerHTML = pipAvatar(44);
  container.append(avatar);

  for (const f of fragments) {
    const chip = document.createElement('button');
    chip.className = 'fragment-chip';
    chip.dataset.fragment = f.id;
    chip.textContent = `#${f.id}`;
    if (f.status === 'lost') {
      chip.classList.add('lost');
      chip.setAttribute('aria-label', `Fragment ${f.id} — lost`);
    }
    if (f.status === 'expired') {
      chip.classList.add('expired');
      chip.setAttribute('aria-label', `Fragment ${f.id} — too old for the call`);
    }
    if (f.status === 'skipped') {
      chip.classList.add('skipped');
      chip.setAttribute('aria-label', `Fragment ${f.id} — skipped`);
    }
    if (f.status === 'pushed') {
      chip.classList.add('pushed');
      chip.setAttribute('aria-label', `Fragment ${f.id} — through the flood`);
    }
    if (f.corrupted && f.revealed) {
      chip.classList.add('glitched');
      chip.setAttribute('aria-label', `Fragment ${f.id} — scrambled`);
    }
    if (f.status === 'straggler') {
      chip.classList.add('straggler');
      chip.setAttribute('aria-label', `Fragment ${f.id} — ${f.lag} beat${f.lag > 1 ? 's' : ''} behind`);
      const badge = document.createElement('span');
      badge.className = 'lag-badge';
      badge.textContent = f.lag;
      chip.append(badge);
    }
    if (opts.threatened?.has(f.id)) chip.classList.add('threatened');
    if (opts.targetable?.has(f.id)) chip.classList.add('targetable');
    if (f.hasCopy) {
      const badge = document.createElement('span');
      badge.className = 'copy-badge';
      badge.innerHTML = copyIcon(10, 'var(--bg)');
      badge.title = 'Has a spare copy';
      chip.append(badge);
    }
    if (opts.onChipTap) chip.addEventListener('click', () => opts.onChipTap(f.id));
    container.append(chip);
  }
}
