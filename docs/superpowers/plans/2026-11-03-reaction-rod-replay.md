# Reaction Rod Replay and Result Controls Implementation Plan

**Goal:** Add the approved full-round read-only replay and compact two-row result actions, plus expansion-only manual-upload scrolling for all nine current leaderboard games.

**Architecture:** Preserve the published 9e5edbf5 source as an untouched baseline. The recorder observes rendered state without replaying physics; replay never enters scoring, persistence, or upload paths. Shared upload scrolling stays inside the result viewport and is cancelled by lifecycle changes. All work is an isolated local candidate until separate branch publication approval.

**Tech stack:** Existing ES modules, Three.js, Node test runner, JSDOM and PostCSS. No new dependency.

## Constraints
- Do not alter physics.mjs, input commands, fall thresholds/recovery, gameplay timing or scoring.
- Preserve the same frozen final photo and share image across replay and result return.
- No automatic score submission, nickname focus or external communications.
- Default result aims to fit one screen; expanded content and small/zoomed views remain safely scrollable with 44px controls.
- Do not modify baseline ledgers to hide drift; add a hash-checked reversible change layer.

## Tasks
- [x] Shared leaderboard: failing tests for user expansion, safe container geometry, no accidental scroll or submit, stale lifecycle cancellation and optional ranking-action slot; minimal implementation; all nine integration checks.
- [x] Replay data/scene: failing tests for detached recording, full-span bounded storage, event endpoints, particle reconstruction and pause/end; minimal recorder and visual-only scene helpers.
- [x] Rod controller/layout: failing tests for replay start/stop/pause/repeat/restart, unchanged world/results/files/counts, rotation/background/help and compact action rows. Integrate recorder after actual render and before event draining where needed. Keep gameplay handlers unchanged.
- [x] Add exact reversible provenance manifest. Check all unrelated runtime sources and unchanged physics, input and scoring boundaries.
- [x] Run complete npm run check and preview release preflight; review and fix findings. Final candidate: 1,395 tests pass, build and 506 references pass.
- [ ] Package source+diff+evidence, restore and rerun, save private backup. Completion is recorded separately with the archive identity; no publication is authorized.

## Review focus
- Recording must not mutate the live state or block gameplay if a frame cannot be captured.
- Dense event streams and very long rounds must not grow unbounded or silently lose the start of a purported full replay.
- Fast replay/retry and pending image/upload operations must not leak old data into a new round.
- Result/menu transitions must preserve the original score/photo and return focus without reopening the result every replay frame.
- Browser rotation, keyboard opening and reduced-motion preferences must not recreate the prior viewport bug.
