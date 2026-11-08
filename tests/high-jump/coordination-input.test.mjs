import test from 'node:test';
import assert from 'node:assert/strict';
import {createActionInputs} from '../../public/games/high-jump/action-inputs.mjs';
import {bindControls} from '../../public/games/high-jump/control-bindings.mjs';
import * as P from '../../public/games/high-jump/physics.mjs';

// Only the browser boundary is simulated. The real binding, ownership and physics
// implementations run below. This does not replace real-device multi-touch QA.
class Target extends EventTarget {
  constructor(tagName = 'BUTTON') { super(); this.tagName = tagName; this.disabled = false; this.captured = new Set(); }
  setPointerCapture(id) { this.captured.add(id); }
  releasePointerCapture(id) {
    if (this.captured.delete(id)) this.fire('lostpointercapture', {pointerId: id});
  }
  fire(type, props = {}) {
    const event = new Event(type, {cancelable: true});
    for (const [key, value] of Object.entries(props)) Object.defineProperty(event, key, {value});
    this.dispatchEvent(event);
    return event;
  }
}
function setup() {
  const fresh = () => { const state = P.createRound(); P.advance(state, 3); return state; };
  let state = fresh(), active = true, replay = false;
  const buttons = Object.fromEntries(P.KEYS.map(key => [key, new Target()]));
  const global = new Target('WINDOW');
  const input = createActionInputs(() => state);
  const available = () => active && !state.paused && !replay;
  const binding = bindControls({buttons, global, input, available});
  const paint = () => { for (const button of Object.values(buttons)) button.disabled = !available(); };
  return {
    get s() { return state; }, buttons, global, input, binding,
    // These are the lifecycle boundary calls used by game.mjs, not a mock of
    // binding.release or of ownership. Browser dialog/clock wiring is separate.
    pause(value) { binding.release(); state.paused = value; paint(); },
    restart() { binding.release(); state = fresh(); active = true; replay = false; paint(); },
    enterReplay() { binding.release(); replay = true; paint(); },
    finish() { binding.release(); active = false; paint(); },
  };
}
const pointer = (h, key, type, id) => h.buttons[key].fire(type, {pointerId: id});
const keyboard = (h, key, type, props = {}) => h.global.fire(type, {code: `Key${key}`, ...props});
const held = h => P.KEYS.map(key => h.input.isHeld(key));
function assertReleased(h) {
  assert.deepEqual(held(h), [false, false, false, false]);
  assert.deepEqual(h.s.held, [false, false, false, false]);
  assert.deepEqual(h.s.holdTimes, [0, 0]);
  assert.equal(h.s.pendingRelease, -1);
  for (const button of Object.values(h.buttons)) assert.equal(button.captured.size, 0);
}

test('four touch pointers independently hold both legs and hands; hands never trigger takeoff', () => {
  const h = setup();
  P.KEYS.forEach((key, i) => pointer(h, key, 'pointerdown', i + 1));
  P.advance(h.s, .7);
  assert.deepEqual(h.s.held, [true, true, true, true]);
  pointer(h, 'J', 'pointerup', 3);
  pointer(h, 'K', 'pointerup', 4);
  assert.deepEqual(h.s.held, [true, true, false, false]);
  assert.equal(h.s.pendingRelease, -1);
  pointer(h, 'A', 'pointerup', 1);
  P.advance(h.s, 1 / 240);
  assert.equal(h.s.launches, 1);
  assert.equal(h.s.phase, 'air');
  assert.deepEqual(h.s.held, [false, true, false, false]);
  pointer(h, 'J', 'pointerdown', 5);
  pointer(h, 'K', 'pointerdown', 6);
  assert.deepEqual(h.s.held, [false, true, true, true]);
});

test('touch and keyboard ownership of each hand survives either release order', () => {
  for (const key of ['J', 'K']) for (const touchFirst of [true, false]) {
    const h = setup(), index = P.KEYS.indexOf(key);
    pointer(h, key, 'pointerdown', 10);
    keyboard(h, key, 'keydown');
    if (touchFirst) pointer(h, key, 'pointerup', 10); else keyboard(h, key, 'keyup');
    assert.equal(h.s.held[index], true);
    assert.equal(h.input.isHeld(key), true);
    if (touchFirst) keyboard(h, key, 'keyup'); else pointer(h, key, 'pointerup', 10);
    assert.equal(h.s.held[index], false);
    assert.equal(h.input.isHeld(key), false);
    assert.equal(h.s.pendingRelease, -1);
  }
});

test('canceling one touch retains other owners, and last cancellation never launches', () => {
  for (const cancel of ['pointercancel', 'lostpointercapture']) {
    const h = setup();
    pointer(h, 'A', 'pointerdown', 11);
    pointer(h, 'A', 'pointerdown', 12);
    pointer(h, 'J', 'pointerdown', 13);
    P.advance(h.s, .7);
    pointer(h, 'A', cancel, 11);
    assert.deepEqual(h.s.held, [true, false, true, false]);
    pointer(h, 'A', cancel, 12);
    P.advance(h.s, 1 / 240);
    assert.equal(h.s.phase, 'run');
    assert.equal(h.s.launches, 0);
    assert.deepEqual(h.s.held, [false, false, true, false]);
    assert.equal(h.s.holdTimes[0], 0);
  }
});

test('pause clears charged touch and keyboard owners; stale releases cannot launch after resume', () => {
  const h = setup();
  P.KEYS.forEach((key, i) => { pointer(h, key, 'pointerdown', i); keyboard(h, key, 'keydown'); });
  P.advance(h.s, .7);
  h.pause(true);
  assertReleased(h);
  P.KEYS.forEach((key, i) => { pointer(h, key, 'pointerdown', 20 + i); keyboard(h, key, 'keydown'); });
  assertReleased(h);
  h.pause(false);
  P.KEYS.forEach((key, i) => { pointer(h, key, 'pointerup', i); keyboard(h, key, 'keyup'); });
  P.advance(h.s, 1 / 240);
  assertReleased(h);
  assert.equal(h.s.launches, 0);
  keyboard(h, 'K', 'keydown');
  assert.equal(h.s.held[3], true);
});

test('restart uses the new round and stale pointerup cannot release its new hand owner', () => {
  const h = setup();
  pointer(h, 'A', 'pointerdown', 1);
  pointer(h, 'J', 'pointerdown', 2);
  P.advance(h.s, .7);
  const old = h.s;
  h.restart();
  assertReleased(h);
  assert.notEqual(h.s, old);
  pointer(h, 'J', 'pointerdown', 3);
  pointer(h, 'J', 'pointerup', 2);
  pointer(h, 'A', 'pointerup', 1);
  assert.deepEqual(h.s.held, [false, false, true, false]);
  assert.deepEqual(old.held, [false, false, false, false]);
  P.advance(h.s, 1 / 240);
  assert.equal(h.s.launches, 0);
});

test('replay and inactive gates reject touch, physical keys and native button activation', () => {
  for (const transition of ['enterReplay', 'finish']) {
    const h = setup();
    pointer(h, 'A', 'pointerdown', 1);
    keyboard(h, 'K', 'keydown');
    P.advance(h.s, .7);
    h[transition]();
    const before = P.snapshot(h.s);
    for (const key of P.KEYS) {
      pointer(h, key, 'pointerdown', 10);
      keyboard(h, key, 'keydown');
      h.buttons[key].fire('keydown', {code: 'Space'});
      keyboard(h, key, 'keyup');
      pointer(h, key, 'pointerup', 10);
    }
    assertReleased(h);
    assert.deepEqual(h.s, before);
  }
});

test('disabled buttons reject pointer and native keys even if the global gate is open', () => {
  const h = setup();
  for (const key of P.KEYS) {
    h.buttons[key].disabled = true;
    pointer(h, key, 'pointerdown', 1);
    h.buttons[key].fire('keydown', {code: 'Enter'});
  }
  assertReleased(h);
});

test('physical keys ignore repeats and editable fields without adding hidden owners', () => {
  const h = setup();
  for (const key of P.KEYS) {
    keyboard(h, key, 'keydown', {repeat: true});
    for (const tagName of ['INPUT', 'SELECT', 'TEXTAREA']) keyboard(h, key, 'keydown', {target: {tagName}});
  }
  assertReleased(h);
  for (const key of P.KEYS) keyboard(h, key, 'keydown');
  assert.deepEqual(h.s.held, [true, true, true, true]);
  for (const key of P.KEYS) keyboard(h, key, 'keyup');
  assertReleased(h);
});
