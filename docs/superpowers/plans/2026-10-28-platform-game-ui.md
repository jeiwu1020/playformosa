# Platform Game UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Approved task is inline dot cloud work; no new Codex task or publication.

**Goal:** Normalize the four preview game interfaces and fix Beer result/share without changing their mechanics.
**Architecture:** Shared native CSS and small toolbar/dialog helpers; game-owned state machines remain authoritative. Beer owns its frozen result capture and uses common file-share operations.
**Tech Stack:** Vanilla ESM, native dialog, Canvas2D, existing Three.js, Node test runner.
**Spec:** `docs/superpowers/specs/2026-10-28-platform-game-ui-design.md`

## Global Constraints
- `← 遊戲首頁`, href `/`; music, restart, pause/resume; targets >=44px.
- Preserve keyboard, audio unlock, scores, physics, diagnostic files and live canvas dimensions.
- Preview-only source snapshot of tree d9f2d51; parent review before any publication.

## Review Focus
- Resize/zoom while results or share are pending must not capture a blank/stale canvas.
- Cancelled/denied native and clipboard APIs must allow retry/manual-copy, never false success.
- Pause must freeze simulation and replay time; release pointer/keys and avoid duplicate scores.
- Mobile/landscape result text/actions must remain scroll-reachable, not under stage clipping.
- Modal focus and toolbar state must match actual game lifecycle, including WebGL failure.

### Task 1: Shared platform chrome
Files: shared `public/games/shared/game-ui.{css,mjs}`, four `index.html`, four game UI wiring; `tests/platform-game-ui.test.mjs`.
Interfaces: `syncPauseButton(button,{paused,available})`; `createResultDialog(dialog,{focusTarget,returnFocus})`; `createMusicController({src,notify,createAudio})`.
- [x] Write failing structural and helper tests; run focused Node tests, expect missing contract/helper failures.
- [x] Implement shared layout and true state bindings. Keep engines and route/diagnostics untouched.
- [x] Run toolbar/modal/music tests and existing suite.

### Task 2: Beer viewport result, pause and PNG
Files: Beer `game.mjs`, `platform.mjs`, new `share.mjs`, Beer markup/CSS; Beer UI/share tests.
Interfaces: frozen round capture from `renderState(finalFrame.state, finalFrame)` then explicit render+copy; `prepareResult(snapshot)` asynchronous PNG export with epoch; sync native `navigator.share` invocation inside click.
- [x] Add failing pause/replay, snapshot freshness, modal/focus, native cancel/reject/stale/copy tests.
- [x] Implement viewport result and production pause with clock correction; integrate result capture independent of canvas resize.
- [x] Run focused and full tests; score/storage invariance and no hidden-diagnostic changes.

### Task 3: Admission and verification
Files: `docs/GAME-UI-STANDARD.md`, browser regression harness/evidence and README reference.
- [x] Record exact reusable standard and admission regression checklist.
- [x] Run `npm run check` (523/523), prepare bounded browser portrait/landscape/zoom checks; browser launch is BLOCKED, exact evidence recorded.
- [x] Inspect full diff, review with parent, report pass/fail/never-run. No push.
