# Pinball Platform Isolation Implementation Plan

> **For agentic workers:** Use the existing delegated engineering task to implement this plan task-by-task. No new Codex task is authorized by this plan.

**Goal:** Prepare and prove independent leaderboard storage for the approved pinball integration without changing any other game's records.

**Architecture:** Use the current preview/hurdles Worker and its real SQLite schema in an isolated local fixture. Add opt-in board-scoped receipt cleanup, leaving legacy callers unchanged. Integrate final-round snapshots and UI only after the verified v0.8.26 source arrives.

**Tech Stack:** Node.js 24, node:test, sql.js 1.13.0, current Cloudflare Worker/D1 adapter.

**Spec:** Parent assignment and approved transcript: v0.8.26 into preview/hurdles, three separate modes (60 seconds, 180 seconds, unlimited), no main changes or other-game data deletion.

## Global Constraints

- Base source is jeiwu1020/playformosa preview/hurdles at 3e499fc21c4e71e655cebe669dcd4204ab6720c9; this local subset is not a complete deployable checkout.
- Tests use fresh in-memory SQLite only. Do not execute remote SQL or send test scores yet.
- Keep all other games' best rows, receipt rows, production scope and play-count rows unchanged.
- Source integration, full build, browser tests and publication remain pending verified source and complete platform materialization.

## Review Focus

- Expired receipts of another game or an earlier pinball rule must remain byte-for-byte unchanged.
- Three modes on the same device must have separate best values and rankings.
- Duplicate and conflicting UUIDs must not overwrite another game or mode.
- A quota/cooldown rejection must not mutate other-game rows as a cleanup side effect.
- QA writes must leave production rows unchanged; existing legacy cleanup behavior must still pass its tests.

## Task 1: Reproduce and isolate receipt cleanup

Files: tests/pinball-isolation.test.mjs; worker/leaderboard/repository.mjs.

Interface: board options may set isolateReceiptCleanup: true; such boards only prune receipts matching scope, game and rules. Omitted/false preserves existing behavior.

- [x] Add actual SQLite tests for cross-game/rule/scope preservation, independent mode bests/ranks, UUID reuse/conflicts, cooldown, daily quota and capacity rejection.
- [x] Run the new tests against the unchanged repository and verify the intended cleanup-preservation failures (three failures in isolation-red.log).
- [x] Add the minimal opt-in cleanup condition to the real repository SQL.
- [x] Run the new tests plus the materialized existing leaderboard API/repository tests (69/69 local subset tests after the review additions).
- [x] Review the diff and record exact source/test coverage. No blocking defect in independent review; this is not a full platform pass.

## Task 2: Integrate verified game source (in progress)

- [x] Obtain and restore v0.8.26 source, compare its source commit and hashes to the Sites 33 receipt, and preserve recoverable backups.
- [x] Select three unique versioned rule keys and bind finalized round results, never reentry or historical local records, to manual upload.
- [x] Register QA-only Worker boards with isolateReceiptCleanup: true, implement validated mode selection, and preserve the existing same-origin gate, rate limits and failure behavior.
- [x] Add platform catalog/game UI, result sharing and game-specific regression tests without replacing shared simulation or unrelated game files.
- [ ] Restore complete platform dependencies/assets, run npm run check and npm run check:release -- --expect=preview, then browser/lifecycle/real-round checks.
- [ ] Back up and independently verify the exact candidate, update only preview/hurdles using a fresh-head comparison, and verify the actual deployed commit and live read/write behavior under authorization.
