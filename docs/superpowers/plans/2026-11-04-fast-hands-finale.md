# Fast Hands Finale Implementation Plan

> **For agentic workers:** Use executing-plans or subagent-driven-development to implement each bounded component and test it before integration.

**Goal:** Give all three Fast Hands games readable, consistent result tickets with a real current-round picture, faithful replay, distinct QA rankings and appropriate sound/finishing motion.

**Architecture:** Keep scoring reducers and existing duck ranking data unchanged. Add presentation-only sound, last-round replay and snapshot modules; new game boards use existing QA tables with separate rules. Result tickets reuse shared presentation styles; original desktop scene-left layout and full-width duck gesture remain.

**Tech Stack:** Browser ES modules, CSS, Three.js models, CPU-rendered fallback PNGs, Node test runner/JSDOM, existing Cloudflare QA leaderboard.

**Spec:** User approved launch/cue sound without music, simplified common tickets, last-stage/last-round replay, independent count rankings, straight dart and separate overall-winner celebration. Existing preview/hurdles publication is authorized; main and remote DB schema/data administration are excluded.

## Global Constraints
- No music, no scoring or reaction-window changes, no automatic leaderboard submission.
- Preserve original duck game, leaderboard rules and records.
- New zero-count results remain visible but cannot submit to positive-score tables.
- Replay is original-event presentation only; never call scoring, record saving, sound or upload.
- All added visuals must have matching 3D and fallback behavior; existing source models stay intact.
- Preserve one-page overview, readable detail text, fixed primary controls and current desktop/mobile game layout.
- Back up b444877 before editing. Publish only preview/hurdles after verification, with guarded expected-head update.

## Review Focus
- A replay of a timeout or early press must not fabricate a press or a launch.
- A last-round loser may still be the overall winner; ceremony and replay must distinguish them.
- Closing/reopening a result or starting a newer match must not attach an old image, upload or replay.
- Unavailable audio, image encoding or WebGL must not block play or silently show another round's picture.
- Missing rank network response and repeated submission must retain the same consented frozen payload.

## Tasks
### 1. Motion and fallback assets
- Files: levels-motion.mjs, levels-world.mjs, render-fast-hands-levels.mjs, relevant tests and PNG frames.
- Test straight flight, fixed bone lengths/contact, deposited props, catch double lowered hands and conflicting last/overall winners.
- Implement levelMotionDuration(state), revealStage, overallWinner, celebrationWinner and suppressCelebration replay flag.
- CPU-render actual model frames and inspect their transitions.

### 2. Read-only replay and audio
- Files: new levels-replay.mjs, levels-sound.mjs and tests.
- Test actual waiting/live/press/settle/pause sequence recording, memory bounds, immutable normalized clips and no side effects.
- Implement createLevelReplayRecorder, recordLevelReplay, finishLevelReplay, sampleLevelReplay.
- Implement createLevelSound unlock/cue/setMuted/destroy; trigger once on actual live onset from app, never in replay.

### 3. Separate QA count boards
- Files: worker/leaderboard/index.mjs, new levels-leaderboard.mjs / levels-ranking.css and tests.
- Test completed real catch/duel count admission, zero/practice/replay rejection, integer bounds, QA-only scope, preserved duck board and idempotent retry.
- Use existing tables with independent game/rule identifiers; no schema migration or remote DB action.
- Implement mountLevelLeaderboard captureResult/showBoard/showUpload/reset/destroy; explicit nickname/publication consent remains mandatory.

### 4. Current-scene image and common result ticket
- Files: new finale-image.mjs / finale.css, three HTML pages, duck app.mjs, levels-app.mjs, optional level stage force-render parameter, focused tests.
- Test same-round freezing and stale asynchronous completion rejection; render WebGL frame before copy; compose fallback poses and actual prop crop at matching coordinates.
- Retain duck sharing but use captured image. New levels offer saved result image and copy under folded share controls.
- Hero picture and score first; replay/rank/retry primary group; details/share folded, larger single-column detail rows.
- Use identical overview structure and responsive styles without changing game main layout.

### 5. Integration and release
- Add new outer provenance manifest without editing previous ledger bytes.
- Run focused tests, full suite versus b444877 baseline, build and preview release preflight.
- Browser QA: all modes at 320/360/390 widths, landscape and 1000/1366/1920 desktop; repeat results/replay/return/retry, zero-score board and network failures.
- Verify actual generated frames, snapshots and desktop/mobile geometry. State GPU/physical-device limits.
- Back up final delta, recheck remote head, publish incrementally to preview/hurdles, follow exact Cloudflare commit to success and verify live UI.
