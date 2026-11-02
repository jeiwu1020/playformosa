# Unified Game Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all nine existing games independent persisted music/SFX settings and truthful playback availability, and fill missing authoritative action sounds.

**Architecture:** Pure preferences plus one shared audio runtime. Existing game-owned start/pause/results remain authoritative; thin compatibility adapters and read-only event observers consume their state. The UI owner exclusively integrates controller patches and visible controls.

**Tech Stack:** Browser ES modules, Web Audio, localStorage, Node test runner; existing licensed audio only.

**Spec:** User approval 805f0db988b48191bd3a373c64d6c70c, V2 discussion; root audio-owner assignment 2026-11-02. API agreement with audit_all_game_interfaces.

## Global Constraints
- Preview/hurdles only, baseline 5763b4c255bff8a6c2559a98e8f74eb07e553bfd; sole publisher handles commits/publication.
- No physics/input/RNG/score/replay mutations. No game save-key changes. No new paid services or audio downloads.
- First visit music and SFX ON; preference key pf-audio-preferences-v1 is separate from saves. Music 50%, SFX 70%; fixed per-source trims calibrate assets.
- Adapter getState returns musicEnabled/effectsEnabled, musicVolume/effectsVolume (0..1), musicStatus/effectsStatus (locked/loading/ready/error), musicPlaying/suspended; subscribe returns unsubscribe.
- setMusicEnabled, setEffectsEnabled, setMusicVolume, setEffectsVolume; unlock resumes synchronously inside real gesture before awaiting.
- Audio owner never writes game.mjs, index.html, existing shared UI files; delivers exact before-hash controller patches to UI owner.

## Review Focus
- Disabling music must not disable action cues, including after reload or while music fails.
- Pending loads after pause/hide/restart must never resurrect old music or old result sounds.
- Repeated simulation snapshots/replays cannot duplicate cues; audio never writes game state.
- Storage/network/context failures cannot prevent gameplay; failed loads are explicitly retryable.
- Voice/timer counts remain bounded and effects stop on interruption.

### Task 1: Shared settings and runtime
**Files:** create public/games/shared/audio-preferences.mjs, audio-runtime.mjs; tests/unified-audio.test.mjs.
**Interfaces:** createAudioPreferences({storage}), createAudioRuntime({music,effects,preferences,createContext,fetcher,notify,document}); runtime implements agreed UI API plus legacy enabled/ready/pending/setEnabled/setVolume/setPlaying/play/stopEffects.
- [ ] Write failing tests for persisted separated channels, corrupt storage, synchronous unlock, independent failures, race cancellation, bounded sources.
- [ ] Run Node tests and record RED; implement smallest runtime and verify GREEN.

### Task 2: Existing engines and new event adapters
**Files:** modify long-jump/audio.mjs, hurdles/audio.mjs, pole-vault/audio.mjs, beer-slide/audio.mjs, beer-slide/audio-ui.mjs, shot-put/relay-audio.mjs, discus/gust-audio.mjs; create shared/game-audio-events.mjs and shared/scene-audio.mjs; tests/game-audio-events.test.mjs.
**Interfaces:** createSceneAudio({game,notify}) returns runtime; createGameAudioEvents(game,play) returns reset/update consuming immutable authoritative state. Existing sampled/procedural effects retain intent but use effects gain independently.
- [ ] Write failing event tests for high-jump, shot-put, discus, rod, tower; pause/replay/repeated-snapshot silence and result once.
- [ ] Implement adapters and source-relative licensed asset catalog; run tests GREEN.
- [ ] Write Beer parity and independent gain/race tests; implement and verify GREEN.

### Task 3: Controller integration handoff and verification
**Files:** review/controller-patches.json outside payload; docs/audio/unified-audio-v1.md; integration tests owned collaboratively.
- [ ] Provide UI owner exact replace patches with original blob hashes; integration only after API agreement.
- [ ] Run existing audio tests plus complete candidate suite through UI owner. Distinguish baseline missing-asset failures.
- [ ] Verify provenance paths/credits untouched; browser audible checks only if supported and available, disclose listening limits.
- [ ] Independent reviewer checks runtime/events/prefs; hand release hashes and backup to sole publisher. No direct push.
