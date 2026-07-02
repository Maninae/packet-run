// map-layout.test.js — layoutMap/viewTransform orientation support (design/11
// step 2: landscape two-pane). Portrait stays the design target and must be
// byte-identical to the pre-landscape behavior; landscape flows west→east
// (source left, dock right) inside a transposed 560x390 viewBox.

import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutMap, viewTransform, viewBoxFor, VIEWBOX } from '../../js/map-layout.js';
import { MAP_1A } from '../../js/config.js';
import { generateMap } from '../../js/generator.js';

const GEN_MAP = generateMap('LAYOUT-TEST', { act: 3 });

function roadsOf(map) {
  return map.segments.flatMap((s) => Object.values(s.roads));
}

test('portrait: hand-map geometry is unchanged (src bottom, dock top)', () => {
  const nodes = layoutMap(MAP_1A, 'portrait');
  assert.deepEqual({ x: nodes.src.x, y: nodes.src.y }, { x: 195, y: 522 });
  assert.deepEqual({ x: nodes.dock.x, y: nodes.dock.y }, { x: 195, y: 56 });
});

test('portrait is the default orientation outside a browser', () => {
  assert.deepEqual(layoutMap(MAP_1A), layoutMap(MAP_1A, 'portrait'));
});

test('landscape: the hand map flows west→east on the centerline', () => {
  const nodes = layoutMap(MAP_1A, 'landscape');
  assert.ok(nodes.src.x < nodes.dock.x, 'source west of dock');
  assert.equal(nodes.src.y, 195, 'source on the vertical centerline');
  assert.equal(nodes.dock.y, 195, 'dock on the vertical centerline');
  assert.equal(nodes.src.kind, 'source');
  assert.equal(nodes.dock.kind, 'dock');
});

for (const [name, map] of [['hand', MAP_1A], ['generated', GEN_MAP]]) {
  test(`landscape: every ${name}-map node sits inside the 560x390 viewBox`, () => {
    const [, , vw, vh] = viewBoxFor('landscape');
    for (const [id, n] of Object.entries(layoutMap(map, 'landscape'))) {
      assert.ok(n.x >= 0 && n.x <= vw, `${id} x=${n.x} within 0..${vw}`);
      assert.ok(n.y >= 0 && n.y <= vh, `${id} y=${n.y} within 0..${vh}`);
    }
  });

  test(`landscape: ${name}-map roads march east (x increases every hop)`, () => {
    const nodes = layoutMap(map, 'landscape');
    for (const road of roadsOf(map)) {
      for (let i = 1; i < road.nodes.length; i++) {
        const [a, b] = [nodes[road.nodes[i - 1]], nodes[road.nodes[i]]];
        assert.ok(b.x > a.x, `${road.nodes[i - 1]}→${road.nodes[i]} heads east`);
      }
    }
  });
}

test('landscape: the dock is the easternmost node', () => {
  const nodes = layoutMap(GEN_MAP, 'landscape');
  for (const [id, n] of Object.entries(nodes)) {
    assert.ok(n.x <= nodes.dock.x, `${id} west of (or at) the dock`);
  }
});

test('landscape preserves node kinds and labels from portrait', () => {
  const portrait = layoutMap(GEN_MAP, 'portrait');
  const landscape = layoutMap(GEN_MAP, 'landscape');
  for (const id of Object.keys(portrait)) {
    assert.equal(landscape[id].kind, portrait[id].kind, `${id} kind`);
    assert.equal(landscape[id].label, portrait[id].label, `${id} label`);
  }
});

test('layouts are cached per orientation (stable identity)', () => {
  assert.equal(layoutMap(GEN_MAP, 'landscape'), layoutMap(GEN_MAP, 'landscape'));
  assert.equal(layoutMap(GEN_MAP, 'portrait'), layoutMap(GEN_MAP, 'portrait'));
  assert.notEqual(layoutMap(GEN_MAP, 'portrait'), layoutMap(GEN_MAP, 'landscape'));
});

test('viewBoxFor: portrait matches the legacy VIEWBOX, landscape transposes it', () => {
  assert.deepEqual(viewBoxFor('portrait'), VIEWBOX);
  const [, , vw, vh] = VIEWBOX;
  assert.deepEqual(viewBoxFor('landscape'), [0, 0, vh, vw]);
});

test('viewTransform: landscape letterboxes against the 560x390 box', () => {
  const t = viewTransform(1120, 780, 'landscape');
  assert.equal(t.scale, 2);
  assert.deepEqual(t.apply(0, 0), [0, 0]);
  assert.deepEqual(t.apply(560, 390), [1120, 780]);

  const wide = viewTransform(1400, 780, 'landscape'); // extra width centers
  assert.equal(wide.scale, 2);
  assert.deepEqual(wide.apply(280, 195), [700, 390]);
});

test('viewTransform: portrait behavior is unchanged', () => {
  const t = viewTransform(390, 560);
  assert.equal(t.scale, 1);
  assert.deepEqual(t.apply(195, 280), [195, 280]);
});
