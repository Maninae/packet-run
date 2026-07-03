// road-projection.test.js — the road view's geometry (design/11 build spec):
// cubic spines for the fork arcs, ribbon polygons with perspective width
// taper, and hop-dot placement. Pure math, no DOM. The fork geometry itself
// teaches: MORE HOPS = a visibly wider, longer sweep; dashes = real hops.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROAD_W, ROAD_H, cubicAt, forkSpines, ribbonPath, spineDots, trunkDots,
} from '../../js/road/projection.js';

test('cubicAt: endpoints and midpoint behave like a Bézier', () => {
  const p0 = { x: 0, y: 0 };
  const c1 = { x: 0, y: 100 };
  const c2 = { x: 100, y: 100 };
  const p1 = { x: 100, y: 0 };
  assert.deepEqual(cubicAt(p0, c1, c2, p1, 0), { x: 0, y: 0 });
  assert.deepEqual(cubicAt(p0, c1, c2, p1, 1), { x: 100, y: 0 });
  const mid = cubicAt(p0, c1, c2, p1, 0.5);
  assert.equal(mid.x, 50, 'symmetric control net → x midway');
  assert.equal(mid.y, 75, 'pulled toward the controls');
});

test('forkSpines: both arcs start at the fork and end beside the destination', () => {
  const { left, right, fork, dest } = forkSpines({ leftHops: 4, rightHops: 7 });
  assert.deepEqual(cubicAt(...left, 0), fork);
  assert.deepEqual(cubicAt(...right, 0), fork);
  const lEnd = cubicAt(...left, 1);
  const rEnd = cubicAt(...right, 1);
  assert.ok(lEnd.x < dest.x && rEnd.x > dest.x, 'arcs arrive on either side of the door');
  assert.ok(Math.abs(lEnd.y - rEnd.y) < 12, 'both arrive at the horizon line');
});

test('forkSpines: more hops sweeps wider — length is telegraphed by geometry', () => {
  const { left, right } = forkSpines({ leftHops: 4, rightHops: 7 });
  const leftReach = Math.min(...[0.25, 0.5, 0.75].map((t) => cubicAt(...left, t).x));
  const rightReach = Math.max(...[0.25, 0.5, 0.75].map((t) => cubicAt(...right, t).x));
  const cx = ROAD_W / 2;
  assert.ok(rightReach - cx > cx - leftReach,
    `7-hop arc (reach ${Math.round(rightReach - cx)}) sweeps wider than 4-hop (${Math.round(cx - leftReach)})`);
});

test('forkSpines: swapping hop counts swaps the sweep widths', () => {
  const a = forkSpines({ leftHops: 7, rightHops: 4 });
  const cx = ROAD_W / 2;
  const leftReach = cx - Math.min(...[0.25, 0.5, 0.75].map((t) => cubicAt(...a.left, t).x));
  const rightReach = Math.max(...[0.25, 0.5, 0.75].map((t) => cubicAt(...a.right, t).x)) - cx;
  assert.ok(leftReach > rightReach, 'now the LEFT arc is the long one');
});

test('ribbonPath: a closed SVG path that spans start and end widths', () => {
  const { left } = forkSpines({ leftHops: 4, rightHops: 7 });
  const d = ribbonPath(left, 34, 14);
  assert.match(d, /^M/);
  assert.match(d, /Z$/);
  // it samples the spine — both endpoints must appear within the path bounds
  const start = cubicAt(...left, 0);
  const end = cubicAt(...left, 1);
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  assert.ok(Math.min(...xs) <= Math.min(start.x, end.x) + 1);
  assert.ok(Math.max(...xs) >= Math.max(start.x, end.x) - 1);
});

test('spineDots: one dot per hop, marching along the arc, shrinking with depth', () => {
  const { right } = forkSpines({ leftHops: 4, rightHops: 7 });
  const dots = spineDots(right, 7);
  assert.equal(dots.length, 7, 'dashes ARE the hops — the distance read is exact');
  for (let i = 1; i < dots.length; i++) {
    assert.ok(dots[i].r < dots[i - 1].r, 'farther dots are smaller');
  }
});

test('trunkDots: centered on the trunk, tapering toward the fork', () => {
  const dots = trunkDots(4);
  assert.equal(dots.length, 4);
  assert.ok(dots.every((d) => d.x === ROAD_W / 2));
  for (let i = 1; i < dots.length; i++) {
    assert.ok(dots[i].y < dots[i - 1].y, 'marching away from the camera');
    assert.ok(dots[i].r < dots[i - 1].r);
  }
});

test('the stage space is the mock composition: 1280x800, horizon at 0.39H', () => {
  assert.equal(ROAD_W, 1280);
  assert.equal(ROAD_H, 800);
  const { dest } = forkSpines({ leftHops: 4, rightHops: 7 });
  assert.ok(dest.y > 280 && dest.y < 330, 'destination sits on the horizon band');
});
