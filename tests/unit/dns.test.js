// dns.test.js — the DNS crossroads (design/04): an interactive lookup ONLY
// for a new destination (1 Deadline); known destinations skip it because
// caching is real ("your device remembers the address for a while").

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, legalActions, act, DEST_ADDRESS } from '../../js/engine.js';

test('a new destination opens with the lookup beat: one action, one tick', () => {
  const run = createRun({ seed: 'D1', dnsNeeded: true });
  assert.equal(run.phase, 'dns');
  assert.deepEqual(legalActions(run), [{ type: 'lookup' }]);
  assert.throws(() => act(run, { type: 'onward' }), /illegal/i);
  const before = run.deadline;
  act(run, { type: 'lookup' });
  assert.equal(run.deadline, before - 1);
  assert.equal(run.phase, 'junction');
  const e = run.events.find((ev) => ev.type === 'dns-lookup');
  assert.equal(e.address, DEST_ADDRESS);
});

test('a known destination skips the lookup entirely', () => {
  const run = createRun({ seed: 'D2' });
  assert.equal(run.phase, 'junction');
  assert.ok(!run.events.some((e) => e.type === 'dns-lookup'));
});

test('tools stay quiet during the lookup (address first, then the journey)', () => {
  const run = createRun({ seed: 'D3', dnsNeeded: true });
  assert.ok(!legalActions(run).some((a) => a.type === 'duplicate'));
});
