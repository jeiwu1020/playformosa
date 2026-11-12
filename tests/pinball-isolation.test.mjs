import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './helpers/leaderboard-sqlite.mjs';
import {LeaderboardRepository} from '../worker/leaderboard/repository.mjs';
import {handleRequest} from '../worker/leaderboard/index.mjs';

// Storage-contract fixtures only: final public rule names await verified game source.
const NOW = 1_800_000_000_000;
const OLD = NOW - 8 * 86400000;
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const rules = ['office-0826-60s-v1', 'office-0826-180s-v1', 'office-0826-unlimited-v1'];
const board = rule => ({rules: rule, unit: 'points', status: 'done', direction: 'desc', max: Number.MAX_SAFE_INTEGER, integer: true, isolateReceiptCleanup: true});
const submission = (n, rule = rules[0], extra = {}) => ({game: 'overtime-pinball', rules: rule, unit: 'points', status: 'done', score: 1000, nickname: 'QA fixture', deviceId: id(1), submissionId: id(n), ...extra});
const rows = (db, table) => db.raw.exec(`SELECT * FROM ${table} ORDER BY 1,2,3,4`)[0]?.values ?? [];
const unrelated = db => ({
  best: db.raw.exec("SELECT * FROM leaderboard_best WHERE NOT (scope='qa' AND game='overtime-pinball' AND rules='office-0826-60s-v1') ORDER BY scope,game,rules,device")[0]?.values ?? [],
  receipts: db.raw.exec("SELECT * FROM leaderboard_submissions WHERE NOT (scope='qa' AND game='overtime-pinball' AND rules='office-0826-60s-v1') ORDER BY scope,id")[0]?.values ?? []
});
function seed(db, {scope = 'qa', game = 'hurdles', rule = '110m-8h-v1', name = 'existing', count = 1, time = OLD} = {}) {
  db.raw.run('INSERT INTO leaderboard_best(scope,game,rules,device,nickname,score,updated_at,secondary_score) VALUES(?,?,?,?,?,?,?,?)', [scope, game, rule, name, name, 123, time, 0]);
  for (let i = 0; i < count; i++) db.raw.run('INSERT INTO leaderboard_submissions(scope,id,payload,device,game,rules,nickname,score,created_at,day,secondary_score) VALUES(?,?,?,?,?,?,?,?,?,?,?)', [scope, `${name}-${i}`, 'existing-payload', name, game, rule, name, 123, time, Math.floor(time / 86400000), 0]);
}

// Catches missing game/rules predicates in opt-in receipt cleanup.
test('pinball submit preserves other-game, other-mode, old-rule and production rows exactly', async () => {
  const db = await database();
  try {
    seed(db);
    seed(db, {game: 'long-jump', rule: 'journey-km-v1', name: 'jump'});
    seed(db, {game: 'overtime-pinball', rule: rules[1], name: 'three-minute'});
    seed(db, {game: 'overtime-pinball', rule: 'old-single-ball-v0', name: 'old-rules'});
    seed(db, {scope: 'production', game: 'overtime-pinball', rule: rules[0], name: 'production'});
    seed(db, {game: 'overtime-pinball', rule: rules[0], name: 'same-board', count: 150});
    const before = unrelated(db);
    const result = await new LeaderboardRepository(db, 'qa').submit(submission(1), board(rules[0]), NOW);
    assert.equal(result.accepted, true);
    assert.deepEqual(unrelated(db), before);
    assert.equal(db.raw.exec("SELECT count(*) FROM leaderboard_submissions WHERE id LIKE 'same-board-%'")[0].values[0][0], 50);
    assert.equal(db.raw.exec("SELECT score FROM leaderboard_best WHERE device='same-board'")[0].values[0][0], 123);
  } finally { db.raw.close(); }
});

// Catches a missing rules key in best selection or upsert conflict handling.
test('one device keeps independent 60s, 180s and unlimited best scores and ranks', async () => {
  const db = await database();
  try {
    const repo = new LeaderboardRepository(db, 'qa');
    for (const [i, score] of [600, 1800, 4200].entries()) {
      assert.equal((await repo.submit(submission(i + 1, rules[i], {score}), board(rules[i]), NOW + i * 60001)).accepted, true);
    }
    await repo.submit(submission(4, rules[0], {score: 900}), board(rules[0]), NOW + 180003);
    assert.deepEqual(await repo.top('overtime-pinball', board(rules[0])), [{nickname: 'QA fixture', score: 900}]);
    assert.deepEqual(await repo.top('overtime-pinball', board(rules[1])), [{nickname: 'QA fixture', score: 1800}]);
    assert.deepEqual(await repo.top('overtime-pinball', board(rules[2])), [{nickname: 'QA fixture', score: 4200}]);
    for (const [i, scores] of [[1200, 900], [1500, 2100], [4500, 4500]].entries()) {
      for (const [j, score] of scores.entries()) await repo.submit(submission(10 + i * 2 + j, rules[i], {score, deviceId: id(j + 2)}), board(rules[i]), NOW + (4 + i) * 60001);
    }
    const expectedRanks = [[[1200, 1], [900, 2], [900, 2]], [[2100, 1], [1800, 2], [1500, 3]], [[4500, 1], [4500, 1], [4200, 3]]];
    for (const [i, rule] of rules.entries()) {
      assert.deepEqual((await repo.board('overtime-pinball', board(rule))).entries.map(({score, rank}) => [score, rank]), expectedRanks[i]);
      assert.deepEqual(await repo.own('overtime-pinball', board(rule), id(1)), {nickname: 'QA fixture', score: [900, 1800, 4200][i], rank: [2, 2, 3][i], gap: 300});
    }
    assert.deepEqual(await new LeaderboardRepository(db, 'production').top('overtime-pinball', board(rules[0])), []);
  } finally { db.raw.close(); }
});

// Catches accidental new receipts or cross-mode overwrites on duplicate/reused IDs.
test('same payload is idempotent and UUID reuse for another mode or game conflicts', async () => {
  const db = await database();
  try {
    const repo = new LeaderboardRepository(db, 'qa');
    assert.equal((await repo.submit(submission(1), board(rules[0]), NOW)).accepted, true);
    const before = {best: rows(db, 'leaderboard_best'), receipts: rows(db, 'leaderboard_submissions')};
    assert.equal((await repo.submit(submission(1), board(rules[0]), NOW + 1)).duplicate, true);
    assert.equal((await repo.submit(submission(1, rules[1]), board(rules[1]), NOW + 60001)).error, 'conflict');
    assert.equal((await repo.submit(submission(1, rules[0], {game: 'hurdles'}), board(rules[0]), NOW + 60001)).error, 'conflict');
    assert.deepEqual({best: rows(db, 'leaderboard_best'), receipts: rows(db, 'leaderboard_submissions')}, before);
  } finally { db.raw.close(); }
});

// Catches cleanup that writes unrelated records even when admission is rejected.
test('cooldown rejection leaves other-game expired receipts and best records unchanged', async () => {
  const db = await database();
  try {
    const repo = new LeaderboardRepository(db, 'qa');
    await repo.submit(submission(1), board(rules[0]), NOW);
    seed(db);
    const before = unrelated(db);
    const result = await repo.submit(submission(2, rules[0], {score: 2000}), board(rules[0]), NOW + 1);
    assert.equal(result.error, 'limited');
    assert.equal(result.reason, 'cooldown');
    assert.deepEqual(unrelated(db), before);
    assert.equal((await repo.top('overtime-pinball', board(rules[0])))[0].score, 1000);
  } finally { db.raw.close(); }
});

// Catches cross-game cleanup on the shared daily-cap rejection path.
test('global daily quota still applies without pruning another game on rejection', async () => {
  const db = await database();
  try {
    seed(db, {name: 'daily', count: 1000, time: NOW});
    seed(db, {game: 'long-jump', rule: 'journey-km-v1', name: 'expired-jump'});
    const before = unrelated(db);
    const result = await new LeaderboardRepository(db, 'qa').submit(submission(1), board(rules[0]), NOW);
    assert.equal(result.error, 'limited');
    assert.equal(result.reason, 'daily_limit');
    assert.deepEqual(unrelated(db), before);
    assert.equal(db.raw.exec("SELECT count(*) FROM leaderboard_best WHERE game='overtime-pinball'")[0].values[0][0], 0);
  } finally { db.raw.close(); }
});

// Catches accidental opt-in changes to existing callers' retention behavior.
test('legacy boards retain their existing bounded cleanup behavior', async () => {
  const db = await database();
  try {
    seed(db, {count: 150});
    const legacy = {rules: 'journey-km-v1', direction: 'desc'};
    const result = await new LeaderboardRepository(db, 'qa').submit(submission(1, legacy.rules, {game: 'long-jump', unit: 'km', status: 'valid'}), legacy, NOW);
    assert.equal(result.accepted, true);
    assert.equal(db.raw.exec("SELECT count(*) FROM leaderboard_submissions WHERE id LIKE 'existing-%'")[0].values[0][0], 50);
  } finally { db.raw.close(); }
});

// Catches the same cross-game side effect in the capacity rejection branch.
test('capacity rejection preserves all unrelated rows with isolation enabled', async () => {
  const db = await database();
  try {
    seed(db);
    const insert = db.raw.prepare('INSERT INTO leaderboard_best(scope,game,rules,device,nickname,score,updated_at) VALUES(?,?,?,?,?,?,?)');
    for (let i = 1; i < 10000; i++) insert.run(['qa', 'hurdles', '110m-8h-v1', `capacity-${i}`, 'existing', 123, NOW]);
    insert.free();
    const before = unrelated(db);
    const result = await new LeaderboardRepository(db, 'qa').submit(submission(1), board(rules[0]), NOW);
    assert.equal(result.error, 'limited');
    assert.equal(result.reason, 'capacity');
    assert.deepEqual(unrelated(db), before);
  } finally { db.raw.close(); }
});

// Catches premature pruning exactly at the retention boundary.
test('isolated cleanup preserves receipts exactly seven days old and newer', async () => {
  const db = await database();
  try {
    const boundary = NOW - 7 * 86400000;
    for (const [name, time] of [['too-old', boundary - 1], ['exactly-seven-days', boundary], ['newer', boundary + 1]]) seed(db, {game: 'overtime-pinball', rule: rules[0], name, time});
    await new LeaderboardRepository(db, 'qa').submit(submission(1), board(rules[0]), NOW);
    assert.deepEqual(db.raw.exec("SELECT id FROM leaderboard_submissions WHERE id NOT LIKE '00000000-%' ORDER BY id")[0].values, [['exactly-seven-days-0'], ['newer-0']]);
    assert.equal(db.raw.exec("SELECT count(*) FROM leaderboard_best WHERE device IN ('too-old','exactly-seven-days','newer')")[0].values[0][0], 3);
  } finally { db.raw.close(); }
});

// Catches treating an explicit false option as enabled merely because it exists.
test('explicit false leaves legacy retention behavior unchanged', async () => {
  const db = await database();
  try {
    seed(db, {count: 150});
    await new LeaderboardRepository(db, 'qa').submit(submission(1), {...board(rules[0]), isolateReceiptCleanup: false}, NOW);
    assert.equal(db.raw.exec("SELECT count(*) FROM leaderboard_submissions WHERE id LIKE 'existing-%'")[0].values[0][0], 50);
  } finally { db.raw.close(); }
});

// Catches a client trying to supply QA scope in a production/unavailable environment.
test('disabled and wrong-origin requests cannot touch seeded data', async () => {
  const db = await database();
  try {
    seed(db);
    const before = {best: rows(db, 'leaderboard_best'), receipts: rows(db, 'leaderboard_submissions')};
    const request = origin => new Request('https://qa.example/api/leaderboard/submissions', {method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json'}, body: JSON.stringify(submission(1))});
    const env = {DB: db, LEADERBOARD_ENABLED: 'true', LEADERBOARD_SCOPE: 'qa', LEADERBOARD_ORIGIN: 'https://qa.example'};
    assert.equal((await handleRequest(request('https://other.example'), env, NOW)).status, 403);
    assert.equal((await handleRequest(request('https://qa.example'), {...env, LEADERBOARD_ENABLED: 'false'}, NOW)).status, 503);
    assert.deepEqual({best: rows(db, 'leaderboard_best'), receipts: rows(db, 'leaderboard_submissions')}, before);
  } finally { db.raw.close(); }
});
