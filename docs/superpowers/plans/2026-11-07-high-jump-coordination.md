# High-jump Coordination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Give hands and legs distinct, readable clearance roles without hidden button gates.

**Architecture:** Preserve ballistic motion and the four-input controller. Tune shared anatomical pose and a fixed coordinated reference plan; expose phase-appropriate feedback without altering scores or other games.

**Tech Stack:** JavaScript ES modules, Three.js, Node test runner.

**Spec:** docs/superpowers/specs/2026-11-07-high-jump-coordination.md

## Global Constraints
- Only high-jump gameplay, instructions and focused tests/docs may change.
- No airborne lift, mandatory hand-press gate, live score submissions, new paid services, main edits or new Codex tasks.
- Publish only the existing preview/hurdles branch with an expected-head check.
- Preserve unrelated remote assets, including unavailable local baseline files.

## Review Focus
- Four-key holding or never using hands must not be a universal winning input.
- Late limb transitions must not teleport the athlete or alter center-of-mass trajectory.
- Head, hands, hips and feet must all genuinely clear the visible bar.
- Keyboard and multi-touch cancellation must not create launches or stuck limbs.
- Replays, pause/resume and short mobile views must retain usable controls and honest results.

## Task 1: Articulated clearance and reference plan
Files: public/games/high-jump/physics.mjs; tests/high-jump/coordination.test.mjs; tests/high-jump/helpers/coordination-trace.mjs.
Interfaces: preserve createRound, setLimb, advance, pose and planBar. Helpers drive actual inputs and snapshot a single takeoff for controlled comparisons.
- [x] Add failing behavioral tests for coordinated near-limit clearance versus no-hand and all-held traces, retaining at least one forgiving no-hand clear.
- [x] Run the new tests and record the expected red result.
- [x] Implement continuous body articulation and a sequenced fixed reference plan; preserve the same ballistic trajectory for every airborne input variation.
- [x] Check early/late/one-hand/no-leg controls, fixed-target clears, collision geometry, snapshot independence and bar locking. Run focused and full tests and compare baseline failures.
- [x] Prepare the isolated owned physics/test changes for a guarded commit.

## Task 2: Player feedback, visual/input validation and release
Files: public/games/high-jump/{game.mjs,index.html}; tests/high-jump/coordination-input.test.mjs; docs/high-jump/COORDINATION-VERIFICATION.md.
Interfaces: use shared pose and existing controller; do not mutate state through rendering.
- [x] Add input lifecycle regressions before any needed controller fix. Update concise instructions to explain hands-first, legs-after-hips coordination.
- [x] Render actual character and bar for controlled traces; inspect desktop/mobile views and ordinary input through the supported browser path when available. Do not claim real-device or hardware-WebGL coverage from simulation.
- [x] Run all tests, build and preview release preflight. Record inherited missing-asset failures separately.
- [x] Obtain a fresh whole-delta code review, fix important findings with failing tests, and verify the final scope.
- [ ] Release gate after the source is frozen: re-read remote head, overlay only owned files, verify exact tree, update preview/hurdles using the expected SHA, and check exact-commit deployment and main unchanged. Publication evidence is recorded with the release result, not self-referentially inside this commit.
