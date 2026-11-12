import test from 'node:test';
import assert from 'node:assert/strict';
import {describeResult} from '../../public/games/fast-hands/result-copy.mjs';
import {NOTE_FLOOR_MS} from '../../public/games/fast-hands/challenge.mjs';
import {arm, move, newRun, snapshot} from '../../public/games/fast-hands/shuttle.mjs';
import {readBest, saveBest} from '../../public/games/fast-hands/records.mjs';

test('successful presentation uses the authoritative elapsed time, not event or animation clocks', () => {
  const state = Object.freeze({phase: 'success', elapsedMs: 654.321, startAt: 100, catchAt: 9999});
  const result = describeResult(state, {previousBest: 600, best: 600});
  assert.equal(result.success, true);
  assert.equal(result.timeText, '0.654');
  assert.equal(result.comment, '一手包辦，鈔鴨雙收。');
  assert.equal(result.bestText, '0.600 秒');
  assert.equal(result.modeText, '滑鼠');
  assert.equal(state.elapsedMs, 654.321);
});

test('saved improvement compares the previous best with the actual elapsed time', () => {
  const result = describeResult({phase: 'success', elapsedMs: 450}, {previousBest: 600, best: 450});
  assert.equal(result.newRecord, true);
  assert.equal(result.title, '刷新本機最佳！');
  assert.equal(result.comment, '鴨還沒反應過來，你已經回來了。');
  assert.equal(result.deltaText, '比上次最佳快 0.150 秒');
});

test('first saved success is distinguished from an improvement over an existing record', () => {
  const result = describeResult({phase: 'success', elapsedMs: 450}, {best: 450});
  assert.equal(result.newRecord, true);
  assert.equal(result.deltaText, '第一筆本機紀錄，下輪挑戰自己！');
});

test('slower success compares against the current best without claiming a new record', () => {
  const result = describeResult({phase: 'success', elapsedMs: 900}, {previousBest: 400, best: 400});
  assert.equal(result.newRecord, false);
  assert.equal(result.deltaText, '比本機最佳慢 0.500 秒');
});

test('matching the best is a tie, not a new record', () => {
  const result = describeResult({phase: 'success', elapsedMs: 400}, {previousBest: 400, best: 400});
  assert.equal(result.newRecord, false);
  assert.equal(result.deltaText, '追平本機最佳！');
});

test('blocked storage cannot turn a faster success into a saved record', () => {
  const blockedStorage = {getItem() {throw Error('blocked');}, setItem() {throw Error('blocked');}};
  const result = describeResult({phase: 'success', elapsedMs: 400}, {
    previousBest: 500,
    best: saveBest(blockedStorage, 'mouse', 400),
  });
  assert.equal(result.success, true);
  assert.equal(result.newRecord, false);
  assert.equal(result.bestText, '尚無紀錄');
  assert.equal(result.deltaText, '本輪完成，這次未能儲存本機紀錄。');
});

test('missing storage on the first success makes no first-record claim', () => {
  const result = describeResult({phase: 'success', elapsedMs: 400});
  assert.equal(result.newRecord, false);
  assert.equal(result.bestText, '尚無紀錄');
  assert.equal(result.deltaText, '本輪完成，這次未能儲存本機紀錄。');
});

test('an unchanged best cannot be presented as an improvement that was saved', () => {
  const result = describeResult({phase: 'success', elapsedMs: 400}, {previousBest: 500, best: 500});
  assert.equal(result.newRecord, false);
  assert.equal(result.bestText, '0.500 秒');
  assert.equal(result.deltaText, '本輪完成，本機最佳尚未更新。');
});

test('near-deadline copy uses the game deadline only above its eighty-percent boundary', () => {
  const boundary = describeResult({phase: 'success', elapsedMs: NOTE_FLOOR_MS * .8}, {best: 300});
  const late = describeResult({phase: 'success', elapsedMs: 1600}, {best: 300});
  assert.equal(boundary.comment, '一手包辦，鈔鴨雙收。');
  assert.equal(late.comment, '壓線救援！鈔票差點先下班。');
  assert.equal(late.timeText, '1.600');
});

test('a saved new best takes copy priority over a near-deadline success', () => {
  const result = describeResult({phase: 'success', elapsedMs: 1600}, {previousBest: 1700, best: 1600});
  assert.equal(result.comment, '鴨還沒反應過來，你已經回來了。');
  assert.equal(result.newRecord, true);
});

test('timeout before pickup explains the duck was not reached', () => {
  const result = describeResult({phase: 'failed', reason: 'note-floor', pickupAt: null, elapsedMs: NOTE_FLOOR_MS});
  assert.equal(result.success, false);
  assert.equal(result.timeText, '未完成');
  assert.equal(result.comment, 'Time up. No duck-zone entry detected.');
});

test('timeout after pickup explains the unfinished return instead of missing the duck', () => {
  for (const pickupAt of [0, 100]) {
    const result = describeResult({phase: 'failed', reason: 'note-floor', pickupAt, elapsedMs: NOTE_FLOOR_MS});
    assert.equal(result.success, false);
    assert.equal(result.newRecord, false);
    assert.equal(result.timeText, '未完成');
    assert.equal(result.comment, 'Time up. Return to bill zone not detected.');
  }
});

test('released input describes the missing observed zone', () => {
  const result = describeResult({phase: 'cancelled', reason: 'released', elapsedMs: 200}, {best: 400});
  assert.equal(result.comment, 'No duck-zone entry detected before release.');
  assert.equal(result.timeText, '未完成');
  assert.equal(result.bestText, '0.400 秒');
  assert.equal(result.deltaText, '本輪不列入紀錄');
});

test('interruptions never turn a partial time into a success or overwrite the displayed best', () => {
  for (const reason of ['blur', 'resize', 'hidden', 'pointercancel', 'lostpointercapture', 'cancelled']) {
    const result = describeResult({phase: 'cancelled', reason, elapsedMs: 200}, {best: 400});
    assert.equal(result.success, false, reason);
    assert.equal(result.newRecord, false, reason);
    assert.equal(result.timeText, '未完成', reason);
    assert.equal(result.comment, ({blur:'Game window inactive. Round interrupted.',hidden:'Game window inactive. Round interrupted.',resize:'Screen size changed. Round interrupted.',pointercancel:'Input interrupted. Please try again.',lostpointercapture:'Input interrupted. Please try again.'})[reason] || 'Round incomplete. Please try again.', reason);
    assert.equal(result.bestText, '0.400 秒', reason);
  }
});

test('invalid success durations never produce a numeric successful result', () => {
  for (const elapsedMs of [undefined, null, NaN, Infinity, -Infinity, 0, -1, '400', {}]) {
    const result = describeResult({phase: 'success', elapsedMs}, {best: 400});
    assert.equal(result.success, false, String(elapsedMs));
    assert.equal(result.newRecord, false, String(elapsedMs));
    assert.equal(result.timeText, '未完成', String(elapsedMs));
  }
});

test('invalid local best values do not produce numbers or saved-record claims', () => {
  for (const best of [undefined, null, NaN, Infinity, -Infinity, 0, -1, '400', {}]) {
    const result = describeResult({phase: 'success', elapsedMs: 400}, {previousBest: 500, best});
    assert.equal(result.bestText, '尚無紀錄', String(best));
    assert.equal(result.newRecord, false, String(best));
    assert.equal(result.deltaText, '本輪完成，這次未能儲存本機紀錄。', String(best));
  }
});

test('invalid previous best is treated as absent rather than an improvement baseline', () => {
  for (const previousBest of [NaN, Infinity, 0, -1, '500']) {
    const result = describeResult({phase: 'success', elapsedMs: 400}, {previousBest, best: 400});
    assert.equal(result.deltaText, '第一筆本機紀錄，下輪挑戰自己！');
  }
});

test('absent and nonterminal states cannot produce a numeric success', () => {
  for (const state of [undefined, null, {}, {phase: 'armed', elapsedMs: 100}, {phase: 'returning', elapsedMs: 200}]) {
    const result = describeResult(state);
    assert.equal(result.success, false);
    assert.equal(result.timeText, '未完成');
    assert.equal(result.comment, 'Round incomplete. Please try again.');
  }
});

test('real snapshots and terminal runs produce the same successful presentation', () => {
  let run = arm(newRun(), {x: .1, at: 100, id: 7});
  run = move(run, {x: .9, at: 300, id: 7});
  run = move(run, {x: .1, at: 500, id: 7});
  assert.equal(describeResult(run).timeText, '0.180');
  assert.deepEqual(describeResult(snapshot(run, 10000)), describeResult(run));
});

test('mode-specific bests remain isolated when switching mouse and touch presentations', () => {
  const values = new Map();
  const storage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value))};
  saveBest(storage, 'mouse', 300);
  saveBest(storage, 'touch', 800);
  const state = {phase: 'success', elapsedMs: 500};
  const mousePrevious = readBest(storage, 'mouse');
  const mouse = describeResult(state, {mode: 'mouse', previousBest: mousePrevious, best: saveBest(storage, 'mouse', 500)});
  const touchPrevious = readBest(storage, 'touch');
  const touch = describeResult(state, {mode: 'touch', previousBest: touchPrevious, best: saveBest(storage, 'touch', 500)});
  assert.equal(mouse.modeText, '滑鼠');
  assert.equal(mouse.bestText, '0.300 秒');
  assert.equal(mouse.deltaText, '比本機最佳慢 0.200 秒');
  assert.equal(mouse.newRecord, false);
  assert.equal(touch.modeText, '觸控');
  assert.equal(touch.bestText, '0.500 秒');
  assert.equal(touch.deltaText, '比上次最佳快 0.300 秒');
  assert.equal(touch.newRecord, true);
  assert.equal(readBest(storage, 'mouse'), 300);
});

test('unknown input mode follows the existing records mouse fallback', () => {
  assert.equal(describeResult({phase: 'cancelled'}, {mode: 'pen'}).modeText, '滑鼠');
});

test('failed save preserves readable old best and clearly explains the unsaved improvement',()=>{const r=describeResult({phase:'success',elapsedMs:400},{previousBest:500,best:500,saveFailed:true});assert.equal(r.bestText,'0.500 秒');assert.match(r.deltaText,/未能儲存/);assert.equal(r.newRecord,false);});
