# V2 Game Menus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Ship the approved V2 shared UI for nine preview games with functional persistent dual-channel audio controls, without gameplay changes.

**Architecture:** Keep the existing dialog controller and explicit game-owned pause/input callbacks. A shared menu presenter owns entry/help/pause/auxiliary ranking views, while game adapters own simulation and result/replay state. Audio owner supplies the adapter; backend owner later adds seven real boards/counts via patches integrated by the single controller owner.

**Tech Stack:** Native ES modules, CSS, Node test/JSDOM; existing Cloudflare preview pipeline.

**Spec:** ../specs/2026-11-02-v2-game-menus.md

## Global Constraints
- Base preview 5763b4c255bff8a6c2559a98e8f74eb07e553bfd; sole publisher rechecks actual parent before each CAS.
- No main changes, physics/camera/RNG/score/PNG/replay algorithm edits or new paid services.
- Nine IDs: long-jump, hurdles, high-jump, pole-vault, shot-put, discus, reaction-rod, beer-slide, tower-climb.
- UI owner owns shared UI/CSS and all nine index/controller thin integrations. Audio and backend owners provide precise patches; never overwrite whole controllers.
- Preserve all historical provenance; append exact approved before/after ledger only. Missing unchanged local assets are never deletion candidates.

## Review Focus
- Native/fallback nested view transitions never leave two interactive dialogs or background inert after close.
- Held pointer/key, IME and queued native close events never resume, throw, or submit accidentally.
- Help/result/entry return preserves state and existing result image; repeated close/restart invalidates stale callbacks.
- Audio enabled/zero-volume/locked/loading/error states stay distinct; localStorage failure does not block play.
- 320px and short landscape retain readable labels, 44px targets, reachable footer and safe-area.

### Task 1: Shared menu presenter and audio controls
**Files:** modify `public/games/shared/entry-shell.mjs`, `help-coordinator.mjs`; create `menu-content.mjs`, `menu-audio.mjs`; test `tests/v2-menu.test.mjs`, `tests/v2-menu-audio.test.mjs`.
**Interfaces:** `createGameEntry(...).setAudio(adapter)`; adapter `getState()`, `subscribe(fn)`, `setMusicEnabled(bool)`, `setEffectsEnabled(bool)`, `setMusicVolume(0..1)`, `setEffectsVolume(0..1)`, `unlock()`. State includes enabled/volumes and per-channel locked/loading/ready/error, musicPlaying/suspended, optional partial/message. UI never calls setPlaying.
**Interfaces:** `entry.configurePause({onContinue,onRestart,canContinue})`, `entry.openPause()`, `entry.setRankingAction(fn|null)`. Existing `open`, `close`, `openView`, `closeView` remain compatible.
- [x] Write real DOM failing tests for pause→help/rank→pause, entry/result restore, one owner, no auto-resume and no redundant pause/result help.
- [x] Run `node --test tests/v2-menu.test.mjs tests/v2-menu-audio.test.mjs`; confirm expected RED.
- [x] Implement presenter and audio controls, preserving connected nodes for status/listeners.
- [x] Run new tests plus existing shared-entry/help/honor-view suites; fix regressions without weakening protections.
- [x] Save reviewable checkpoint with exact source and tests.

### Task 2: Explicit nine-game pause/audio integrations
**Files:** nine `public/games/<id>/game.mjs` and optional index/style loading only; `shared/leaderboard.mjs` presentation hooks; controller regression tests.
**Consumes:** Task1 API and audio-owner per-game adapters.
- [x] Add failing actual-controller tests for new menu opening, clear held input, restart and return across native/fallback.
- [x] Replace only presentation calls for pause with shared menu; retain original safe pause/resume functions and result lifecycle. Keep old nodes hidden when their listeners/status references remain required.
- [x] Integrate audio-owner patches exactly; make each new header/music and dual slider use the real adapter. No inactive controls shipped.
- [x] Move Jump/Hurdles menu board entries to `setRankingAction`; preserve result guard, submissions and stale-request protection. Do not add unbacked boards.
- [x] Run all affected controllers plus shared menu/audio tests.

### Task 3: Approved V2 visuals and bounded browser checks
**Files:** `shared/entry-shell.css`, `shared/game-ui.css`, `shared/leaderboard.css`, optional `shared/menu-v2.css`; scoped regression tests.
- [x] Write assertions pinning 44px actions, bounded scroll, retained safe-area and no scene/camera changes; observe RED.
- [x] Implement ticket header, actual game icon, cream/mint surfaces, orange tactile primary and matching menu rows. Header text explicitly reads music on/off; no fixed CSS overrides fighting board typography.
- [x] Run focused tests, then supported managed preview: 320/375/390 and short landscape, entry/pause/help/rank/result/resume, both sliders and unchanged replay/PNG. Report cloud WebGL limitations honestly.
- [x] Run full project `npm run check`, build, asset/release guards; name every failure including missing unchanged fixtures.

### Task 4: Review, backup, preview publication
**Files:** append-only provenance updates, release manifest/before overlay and QA report outside product where appropriate.
- [ ] Independent reviewer audits final exact diff, ownership, full test outcome and visual evidence.
- [ ] Freeze exact parent/file hashes; archive source/tests/logs and restore Library bytes independently before publishing.
- [ ] Sole publisher fresh-CAS preview only, observe exact CF build and live functional gates. Fix recoverable failures before claiming ready; main unchanged.
- [ ] Subsequent audio event and nine-board/count batches rebase onto actual published head and repeat these gates; never merge a stale full tree.

## Execution ruling (2026-11-02)
The audio and nine-game board owners delivered reviewed isolated overlays before UI completion, so their thin integrations are included in this single preview candidate rather than publishing dead controls or seven placeholder boards. No additional production authorization is implied. QA003 was confirmed successful by the user; do not rerun it. Main remains unchanged.

The original 194 integration failures were classified before repair:137 VM contract stubs,30 missing local fixtures,14 historical ledgers,4 approved audio/capture expectations,9 old pause presentation expectations. Actual controllers and independent native/fallback tests preserve freeze/resume, capture/replay, held-input and retry semantics; history is reversed and hash-checked rather than overwritten. Last full1119/1112/7 reflected six missing local MP3 failures and a hero image recovered after the run began; no skipped tests. Final build/visual gates follow.

Final available suite1119/1113PASS/6FAIL, all six the unchanged local missing Beer MP3; no skipped tests. Clean build444 references/383 output files. Preview release preflight passed after supplying its required --expect=preview argument. Independent narrow visual and source checks recorded in the release QA evidence; final publication remains gated.
