# Nine Casual Boards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Preview-only real casual rankings and actual-start counters for nine existing games.
**Architecture:** Preserve existing DB records and old rules versions; additive secondary score for reaction-rod lexicographic caught/rating. Pure result adapters consume final engine snapshots, UI owner adds controller hooks. No UI/controller files are overwritten by this owner.
**Tech Stack:** Worker JavaScript, D1 SQLite, node tests/sql.js.
**Spec:** Parent-approved V2 contract: original gameplay/randomness, explicit valid results, manual opt-in, no old local upload.

## Global Constraints
- Preview 5763b4c255bff8a6c2559a98e8f74eb07e553bfd; main untouched.
- Only existing QA DB; user executes additive 003 once after review. 0001/002 unchanged.
- Zero scores remain completed results but cannot be uploaded; no fake DNF.
- Same-origin, bounds from actual rules only, finite numbers, anonymous device, no anti-cheat claims.
- Existing all-site admission limits, atomic best, idempotency, private personal responses remain.
- UI owner owns controllers/shell; this owner owns worker, pure metric/config/count modules and narrow tests.

## Review Focus
- Caught equal/rating differs: one winning tuple, not independent maxima.
- Concurrent same submission/conflicting body: one admission and no mixed best.
- Native game result errors/fouls/zero: no upload but normal result still usable.
- Rank ties use numeric tuple, never arrival time advantage; bounded index reads.
- Count only successfully begun new round, not replay/help/pause/renderer failure.

## Task 1: Additive schema
- [ ] Test seeded old 0001 rows survive 003 with secondary0; index query plan.
- [ ] Implement two ADD COLUMN + one index, no deletes/rebuild.
- [ ] Independent schema review; identical .txt Library attachment, fresh restore hash.

## Task 2: Worker API/SQL
Files: worker/leaderboard/index.mjs, repository.mjs; tests/leaderboard-nine.test.mjs.
- [ ] Red tests for seven new boards, strict secondary field, engine-derived bounds, ties1,1,3, true tuple best, gap metric, concurrent idempotency.
- [ ] Extend allowlist; same old two payload forms/version remain compatible; non-rod secondary must0.
- [ ] SQL tuple comparison/rank/nearest strict better with indexed queries; no per-top-row COUNT.
- [ ] Green existing/API/new tests, EXPLAIN cap fixtures; schema never auto-run remotely.

## Task 3: Pure client metric contracts and counters
Files: public/games/shared/leaderboard-metrics.mjs, leaderboard-config.mjs, play-counts.mjs; worker/play-counts/index.mjs; tests/nine-game-metrics.test.mjs.
- [ ] Read exact engine outputs before mapping; red fixtures for valid/foul/DNF/zero/random-route and legal distances.
- [ ] Export board config + resultToSubmission(game,result) returning null or metric payload; UI owner handles frozen round/submit state.
- [ ] Extend count allowlist to nine; same combined GET and global cap, home remains independent.
- [ ] Send hook contract to UI owner; true controller tests are integrated there, not duplicated synthetic proof.

## Task 4: Frozen handoff
- [ ] Source-only scope comparison, full relevant tests and independent review.
- [ ] Archive exact overlay/before/manifest to Library and independently restore/hash.
- [ ] Sole publisher receives merged preview candidate only after UI/audio owner integration and schema confirmation; no main publication.
