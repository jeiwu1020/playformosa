import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { database } from './helpers/leaderboard-sqlite.mjs';
import { handleRequest, validateSubmission } from '../worker/leaderboard/index.mjs';
import { handlePlayCounts, validateStart } from '../worker/play-counts/index.mjs';
import { PlayCountsRepository } from '../worker/play-counts/repository.mjs';
import { catalog } from '../src/catalog.mjs';
import { renderPage } from '../src/render.mjs';

const now = 1800000000000;
const origin = 'https://playformosa.playformosa.workers.dev';
const id = (n) => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;
const env = (db) => ({
  DB: db,
  LEADERBOARD_ENABLED: 'true',
  PLAY_COUNTS_ENABLED: 'true',
  LEADERBOARD_SCOPE: 'production',
  LEADERBOARD_ORIGIN: origin,
});

const parkBoards = [
  ['swing', 'swing-flight-m-v1', 'm', 42.5],
  ['horizontal-bar', 'horizontal-bar-loops-v1', 'loops', 6],
  ['turbo-slide', 'turbo-slide-m-v1', 'm', 58.3],
];

const entry = ([game, rules, unit, score], n = 1) => ({
  game,
  rules,
  unit,
  status: 'done',
  score,
  nickname: '公園勇者' + n,
  deviceId: id(n),
  submissionId: id(n + 50),
});

const postScore = (data) =>
  new Request(origin + '/api/leaderboard/submissions', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

test('park games production leaderboard contracts validate cleanly and reject QA scope', () => {
  for (const b of parkBoards) {
    assert.deepEqual(validateSubmission(entry(b), 'production'), entry(b));
    assert.throws(() => validateSubmission(entry(b), 'qa'));
    for (const bad of [{ rules: 'wrong' }, { score: 0 }, { score: -3 }, { score: NaN }, { nickname: '<b>hi</b>' }]) {
      assert.throws(() => validateSubmission({ ...entry(b), ...bad }, 'production'));
    }
  }
  assert.throws(() => validateSubmission({ ...entry(parkBoards[1]), score: 2.5 }, 'production'));
});

test('park games production D1 leaderboard ranks, enforces cooldown & idempotency, and preserves existing boards', async () => {
  const db = await database();
  try {
    db.raw.run(
      'INSERT INTO leaderboard_best VALUES(?,?,?,?,?,?,?)',
      ['production', 'long-jump', 'journey-km-v1', 'old', '原榜選手', 123, now - 100000],
    );

    for (let i = 0; i < parkBoards.length; i++) {
      const b = parkBoards[i];
      const first = entry(b, i + 1);
      const r1 = await handleRequest(postScore(first), env(db), now);
      assert.equal(r1.status, 200);
      const d1 = await r1.json();
      assert.equal(d1.accepted, true);
      assert.equal(d1.bestUpdated, true);
      assert.equal(d1.own.rank, 1);

      // Idempotent duplicate submissionId
      const dup = await handleRequest(postScore(first), env(db), now + 1000);
      assert.equal(dup.status, 200);
      assert.equal((await dup.json()).duplicate, true);

      // Same device within 60s cooldown -> 429
      const cool = await handleRequest(
        postScore({ ...first, submissionId: id(i + 200), score: first.score + 5 }),
        env(db),
        now + 5000,
      );
      assert.equal(cool.status, 429);
      assert.equal((await cool.json()).reason, 'cooldown');

      // Higher score from another device -> rank 1
      const second = { ...first, deviceId: id(i + 300), submissionId: id(i + 350), score: first.score + 10 };
      const r2 = await handleRequest(postScore(second), env(db), now);
      assert.equal(r2.status, 200);

      const boardRes = await handleRequest(
        new Request(origin + '/api/leaderboard?game=' + b[0], {
          headers: { 'X-Leaderboard-Device': first.deviceId },
        }),
        env(db),
        now,
      );
      assert.equal(boardRes.status, 200);
      const board = await boardRes.json();
      assert.equal(board.entries.length, 2);
      assert.equal(board.entries[0].score, second.score);
      assert.equal(board.entries[1].isMe, true);
      assert.equal(board.own.rank, 2);
      assert.equal(board.own.gap, 10);
    }

    assert.deepEqual(
      db.raw.exec("SELECT nickname, score FROM leaderboard_best WHERE game='long-jump'")[0].values,
      [['原榜選手', 123]],
    );
  } finally {
    db.raw.close();
  }
});

test('park games play-counts work on production schema without touching existing totals', async () => {
  const db = await database();
  try {
    db.raw.run(readFileSync(new URL('../worker/play-counts/002.sql', import.meta.url), 'utf8'));
    for (const [i, game] of ['swing', 'horizontal-bar', 'turbo-slide'].entries()) {
      const payload = { game, deviceId: id(i + 10), runId: id(i + 80), startedAt: now };
      assert.equal(validateStart(payload, now).game, game);
      const res = await handlePlayCounts(
        new Request(origin + '/api/play-counts/starts', {
          method: 'POST',
          headers: { Origin: origin, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        env(db),
        now,
      );
      assert.equal(res.status, 200);
      const totals = await new PlayCountsRepository(db, 'production').totals();
      assert.equal(totals[game].count, 1);
    }
  } finally {
    db.raw.close();
  }
});

test('homepage renders 3 park game cards with play-count slots and bundle has no dev artifacts', () => {
  const doc = new JSDOM(renderPage(catalog)).window.document;
  for (const gameId of ['swing', 'horizontal-bar', 'turbo-slide']) {
    assert.ok(doc.querySelector(`#park [data-play-count="${gameId}"]`), gameId);
  }
  const bundle = readFileSync(new URL('../public/games/shared/park-app/park-app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(bundle, /jsxDEV|process\.env\.NODE_ENV/);
  assert.match(bundle, /\/api\/leaderboard\/submissions/);
  assert.match(bundle, /\/api\/play-counts\/starts/);
});
