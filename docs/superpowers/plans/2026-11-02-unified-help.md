# Unified Help Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give all nine games one reachable header help button and one modal owner, without restarting or resuming a round on help return.
**Architecture:** Extend the existing shared entry shell with explicit help lifecycle callbacks and a shared modal coordinator. Small game adapters separate safe pause from pause presentation, suspend existing entry/result/pause presentation through its proper controller, and restore only the appropriate state after help closes. Existing game state, scoring and rendering stay game-owned.
**Tech Stack:** Existing browser ES modules/CSS, Node tests/JSDOM/PostCSS; no dependencies.
**Spec:** User-approved help unification (Sentinel_eeff92620e7c8191a9e759d66d9ecac8), based on nine-game audit.

## Global Constraints
- Base f1a8ce126dafd975b4c7b2bcab56170162dcbd9d / tree f0aa03e3f320b61695e91407cc7fde1ce1a0395c; preview/hurdles only.
- Preserve portal, Soul, icons, URLs, saves, physics, camera, controls, score and PNG data.
- Header last action is common ? 說明, minimum44px; readable18px content, scrollable short screens.
- Entry stays entry; result stays same result; playing/help-return becomes paused, never auto-resumes.
- Keep volume/mute/audio retry and real renderer error recovery; remove player diagnostic output only.

## Review Focus
- Native/fallback/standalone modal transitions never leave help inert or multiple focus traps.
- Resize/orientation/visibility while help is open cannot reopen pause above help.
- Held keys/pointer captures cancel without synthetic release actions; clocks/replays remain stopped.
- Result/PNG/record identity survives repeated help visits; ready/help return never starts a round.
- Short landscape help and return remain reachable; audio controls retain genuine activation.

### Task 1: Shared help owner and regression
**Files:** shared/entry-shell.mjs, entry-shell.css, entry-content.mjs; new shared/help-coordinator.mjs; tests/shared-help.test.mjs.
**Interface:** createGameEntry accepts help lifecycle adapter {suspend,restore}; suspend returns a restore token, restores original presentation without starting/resuming. Common header control invokes shell.openHelp(); original entry open/start stays intact.
- [x] Reproduce dual fallback inert/focus bug and native+fallback stacking in bounded real-module tests.
- [x] Implement one coordinator with close-before-open transitions, explicit closing reason, idempotent open, key/focus containment and correct return target.
- [x] Test entry/help/back, paused/help/back, result identity, repeated transitions and fallback Tab.

### Task 2: Nine small game adapters and player diagnostics
**Files:** nine game.mjs and affected HTML; beer audio-ui.mjs; long-jump recovery predicate; shared CSS only.
- [x] Add failing adapter tests for no pause presentation during help, no start/rescore on return, no resize resurrection and cancel-held-input.
- [x] Separate safe pause from visual pause; register existing modal controllers/panels with shared help lifecycle. Remove duplicate help listeners/controls. Preserve live beer audio settings by moving original control nodes into shared help, not cloning listeners.
- [x] Remove LJ diagnostic script inclusion and beer raw diagnostics; remove technical renderer status from player-facing labels while retaining failure recovery.
- [x] Run relevant existing controller/dialog/audio/input suites plus new lifecycle tests; update only stale assertions tied to approved UI changes, never weaken core guards.

### Task 3: Verification, provenance and delivery
- [x] Supported desktop/narrow/short-landscape help flow; real native and forced fallback/standalone DOM tests. Report any WebGL/browser limitations honestly.
- [x] Update exact integrated UI provenance hashes with old/new records, source-origin/core hashes fixed; fresh base comparison includes portal/Soul/icons.
- [ ] Freeze exact overlay, independent review, private Library archive and independent restore/hash before publication.
- [ ] Sole publisher CAS preview, full Cloudflare gate and bounded live; no main.
