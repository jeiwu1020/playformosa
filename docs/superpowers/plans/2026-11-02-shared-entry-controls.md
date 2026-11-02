# Shared Entry and Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver one genuine entry shell for nine games and one responsive ASJK frame for seven, then stop at user preview confirmation.
**Architecture:** Reusable shared DOM/CSS modules plus explicit content/selectors and small original-controller callbacks; preserve scene and button identities. Do not replace game engines or native input semantics.
**Tech Stack:** Existing static HTML/CSS/ES modules, node:test, project-pinned jsdom/postcss/canvas. No new dependencies.
**Spec:** docs/superpowers/specs/2026-11-02-shared-entry-controls-design.md

## Global Constraints
- Exact verified baseline b482956d; preview/hurdles only, dot only.
- Nine entries identical shell; seven ASJK left/right wide, bottom narrow; rod/beer retain drag controls.
- Preserve physics/input identities/save keys/routes/camera design/native activation;18px primary instructions, no font-shrink workaround.
- No HUD/pause/result redesign; stop after coherent phase1 preview for user.
- Each usable checkpoint archived to private Library and independently restored before waiting/publication.

## Review Focus
- Held pointer/key during modal transition must cancel without a throw/jump/release.
- Beer ready time/physics and tower/hurdle countdown must remain frozen until actual start.
- Start gesture must unlock audio synchronously and cannot activate underlying game with Space/Enter/pointer release.
- Short viewport/zoom/standalone dialog focus and scene projection must remain valid, with no stretched pixels or pointer drift.
- Existing retry/replay/help/render-error paths must not reintroduce intro or auto-advance paused state.

### Task1: Shared entry lifecycle and nine adapters
**Files:** Create public/games/shared/entry-shell.mjs,entry-shell.css,entry-content.mjs; modify nine index.html/game.mjs and only necessary original lifecycle helper; test tests/shared-entry.test.mjs and relevant game controller tests.
**Interfaces:** createEntryShell({document,title,goal,operations,advanced,onStart,onEnter,canStart,forceFallback}) returns {open(),close(),get active(),destroy()}. onEnter cancels original input; onStart is synchronous originalstart/unlock; canStart reflects renderer readiness. Content map has nine explicit IDs; never derives controls from translated strings.
- [ ] Write failing DOM/lifecycle tests: all9 descriptors, page-level card, collapsed advanced, start-once, click/keyboard isolation, focus/fallback, no asynchronous boundary before onStart.
- [ ] Run node --test tests/shared-entry.test.mjs; observe missing-feature red.
- [ ] Implement common shell; adapt each controller's initial-open path and pre-start gate, especially beer. Keep retries and existing result/pause paths unchanged. Preserve existing license content/access.
- [ ] Run shared tests plus affected controller/input/audio tests; inspect per-game diffs and existing source assertions.
- [ ] Save usable private Library checkpoint with exact source/notes and fresh restored hash.

### Task2: Shared seven-game control frame
**Files:** Create public/games/shared/controls-shell.mjs,controls-shell.css; modify seven index.html/game.mjs imports/selectors, narrow sizing adapters only if measured necessary; test tests/shared-controls.test.mjs.
**Interfaces:** mountControlsFrame({document,scene,controls,keys:{a,s,j,k},onResize}) returns {frame,destroy()}; moves original nodes, marks explicit keys, retains listeners/IDs/input identity. Shared900px breakpoint; no new input state machine.
- [ ] Write red tests for all7 explicit mappings, original-node identity, exact AS|JK DOM order, shared stylesheet/targets/pressed selectors, no fake rod/beer controls.
- [ ] Implement shared frame/CSS and seven selectors, keep original scene descendants/camera math intact; use original measured resize functions.
- [ ] Run node tests and existing viewport/camera/pointer tests. Add regression for any required sizing adaptation, never change engine baseline expectations.
- [ ] Supported desktop and390px iframe visual proof: shared entry+keys, shortheight scroll, actualstart/heldinput/retry, representative projection/pointer positioning. No DevTools or realphone claim.
- [ ] Save usable checkpoint with source/provenance and fresh restore/hash.

### Task3: Final integration and delivery gate
**Files:** Existing docs/batch1/SOURCE-MANIFEST.json,docs/batch2/SOURCE-MANIFEST.json,docs/minigames/UI-STANDARD-MANIFEST.json for narrowly changed UI files; direct structural expectation tests where design truly changed; release manifest/evidence outside runtime.
- [ ] Verify all9 runtime entry adapters and all7 layout maps, scan all available143 test texts for stale affected structure assumptions; run affected suites and existing npm test once, report missing local fixture/media failures explicitly.
- [ ] Update exact approved integrated UI hashes with old/new/source origins; physics/render algorithm files fixed unless narrowly documented viewport adaptation authorized by spec.
- [ ] Independent audit_all_game_interfaces whole diff review; fix material issues with red/green evidence.
- [ ] Freeze exact overlay against fresh actual parent, Library source+manifest+logs archive and independent fresh restore SHA/cmp.
- [ ] Publisher normal text-tree/CAS preview only; full CF success and bounded live check. Diagnose precise failures, never blind retry.
- [ ] Report preview URL, stage completion and verification limits; STOP for user confirmation before any next shared-shell phase.
