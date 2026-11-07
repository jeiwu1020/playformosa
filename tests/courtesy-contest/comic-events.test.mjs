import test from 'node:test';
import assert from 'node:assert/strict';

import * as comic from '../../public/games/courtesy-contest/comic-events.js';

test('courtesy movement stays identical at every exchange count', () => {
 const opening=comic.courtesyMotion(0);
 for(const count of [0,4,7,10,29,999])assert.deepEqual(comic.courtesyMotion(count),opening);
 assert.deepEqual(opening,{level:0,angle:3,hop:0,reach:.025});
});

test('movement treats malformed exchange counts as opening poses and returns independent data', () => {
  assert.equal(typeof comic.courtesyMotion, 'function');
  const opening = comic.courtesyMotion(0);
  for (const count of [-1, NaN, Infinity, undefined, '10']) {
    assert.deepEqual(comic.courtesyMotion(count), opening);
  }
  const changed = comic.courtesyMotion(7);
  changed.angle = 500;
  assert.ok(comic.courtesyMotion(7).angle <= 18);
});

const eligible = {count: 3, remaining: 6, busy: false, threat: false, used: 0, lastAt: 0};

test('harmless incidents wait three exchanges and never start with under six seconds left', () => {
  assert.equal(typeof comic.canStartComicEvent, 'function');
  assert.equal(comic.canStartComicEvent(eligible), true);
  assert.equal(comic.canStartComicEvent({...eligible, count: 2}), false);
  assert.equal(comic.canStartComicEvent({...eligible, remaining: 5.999}), false);
  assert.equal(comic.canStartComicEvent({...eligible, remaining: 0}), false);
});

test('busy scenes and real threats always suppress harmless incidents', () => {
  assert.equal(typeof comic.canStartComicEvent, 'function');
  assert.equal(comic.canStartComicEvent({...eligible, busy: true}), false);
  assert.equal(comic.canStartComicEvent({...eligible, threat: {type: 0}}), false);
});

test('at most two harmless incidents run in one round with three exchanges between them', () => {
  assert.equal(typeof comic.canStartComicEvent, 'function');
  const state = {...eligible, remaining: 15};
  const starts = [];
  for (let count = 0; count < 30; count++) {
    state.count = count;
    if (!comic.canStartComicEvent(state)) continue;
    starts.push(count);
    state.lastAt = count;
    state.used++;
  }
  assert.deepEqual(starts, [3, 6]);
  assert.equal(comic.canStartComicEvent({...eligible, count: 5, used: 1, lastAt: 3}), false);
  assert.equal(comic.canStartComicEvent({...eligible, count: 6, used: 1, lastAt: 3}), true);
});

test('invalid event state fails closed without changing gameplay data', () => {
  assert.equal(typeof comic.canStartComicEvent, 'function');
  for (const state of [undefined, null, {}, {...eligible, count: NaN},
    {...eligible, remaining: Infinity}, {...eligible, used: -1},
    {...eligible, used: .5}, {...eligible, lastAt: -1},
    {...eligible, lastAt: 4}, {...eligible, used: 2}]) {
    assert.equal(comic.canStartComicEvent(state), false);
  }
  const state = Object.freeze({...eligible, score: 10, seatReady: false, stolen: false});
  assert.equal(comic.canStartComicEvent(state), true);
  assert.deepEqual(state, {...eligible, score: 10, seatReady: false, stolen: false});
});

test('sampled incidents include both types, skip most rolls and avoid immediate repeats', () => {
  assert.equal(typeof comic.chooseComicEvent, 'function');
  assert.equal(comic.chooseComicEvent(0), 'fake-sit');
  assert.equal(comic.chooseComicEvent(.1999), 'fake-sit');
  assert.equal(comic.chooseComicEvent(.2), 'passenger-urge');
  assert.equal(comic.chooseComicEvent(.3999), 'passenger-urge');
  assert.equal(comic.chooseComicEvent(.4), null);
  assert.equal(comic.chooseComicEvent(.9999), null);
  assert.equal(comic.chooseComicEvent(0, 'fake-sit'), 'passenger-urge');
  assert.equal(comic.chooseComicEvent(.2, 'passenger-urge'), 'fake-sit');
  assert.equal(comic.chooseComicEvent(.8, 'fake-sit'), null);
  assert.equal(Array.from({length: 100}, (_, index) => comic.chooseComicEvent(index / 100)).filter(Boolean).length, 40);
});

test('invalid random samples never manufacture an incident', () => {
  assert.equal(typeof comic.chooseComicEvent, 'function');
  for (const sample of [NaN, Infinity, -1, 1, '0.1', undefined]) {
    assert.equal(comic.chooseComicEvent(sample), null);
  }
});

test('spectator quips vary by courtesy level and incident without revealing departure timing', () => {
  assert.equal(typeof comic.passengerQuip, 'function');
  const generic = [0, 4, 7, 10].map(count => comic.passengerQuip(count, 'courtesy'));
  assert.equal(new Set(generic).size, 4);
  const kinds = ['courtesy', 'fake-sit', 'passenger-urge'];
  for (const count of [0, 4, 7, 10, 999]) {
    const lines = kinds.map(kind => comic.passengerQuip(count, kind));
    assert.equal(new Set(lines).size, 3);
    for (const line of lines) {
      assert.match(line, /[\u4e00-\u9fff]/u);
      assert.ok([...line].length <= 20);
      assert.doesNotMatch(line, /[0-9０-９]|倒數|倒数|發車|发车|秒|剩下|最後|最后|快到站/u);
    }
  }
  assert.equal(comic.passengerQuip(NaN, 'unknown'), generic[0]);
});
