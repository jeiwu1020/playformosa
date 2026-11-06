# Runner Hair and Arms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Restore complete rear hair and readable, stable, playful running arms in 400 m and 1500 m, including compatibility sprites.
**Architecture:** Existing procedural Three.js character copies, two render-only pose adapters and a shared arm-articulation helper where appropriate. Baked sprites are generated from the same updated meshes and appropriate game pose adapter, not hand-painted substitutes.
**Tech Stack:** JavaScript modules, Three.js, Node test runner, existing @napi-rs/canvas offline rasterizer.
**Spec:** docs/superpowers/specs/2026-11-06-runner-hair-arm-design.md

## Global Constraints
- Only 400 m and 1500 m visual characters and necessary visual generation/tests/provenance may change.
- Do not change 100 m, race rules, physics, timing, scores, leaderboard contracts, audio or platform layouts.
- No live score or database writes. No new Codex task. Publish only preview/hurdles; main unchanged.
- Preserve all unrelated assets and unavailable original remote blobs.
- Do not claim hardware WebGL, real mobile touch or video-motion measurements not actually verified.

## Review Focus
- Lean immediately below/above .2 must not teleport hands.
- Fatigue from full to zero must not shorten/lengthen limbs or detach hands.
- Rear-view arm silhouette must not hide both forearms inside the torso.
- Crouch/fall/finish must keep the rig connected and avoid ground penetration.
- Each game must regenerate every sprite family it actually uses, including 400 m crouch/fall.

## Task 1: Correct and export the visual rig
Files: public/games/run-400m/{character3d,pose3d,render,fallback}.mjs; public/games/run-1500m/{character3d,pose,render}.mjs; public/games/shared/runner-arm-pose.mjs if useful; tests/runners/rig.test.mjs; tools/render-runner-rig.mjs; tools/runner-sprite-renderer.mjs; both runner-atlas.png; 400 m extra-poses.png.
Interfaces: keep existing createCharacter, sprintPose, runnerPose and createView contracts. Shared helper is render-only and does not mutate race input. Keep atlas dimensions/frame interpretation compatible unless renderer and tests change together.
- [ ] Write failing geometry/pose tests. Assert rear raycasts hit hair at mid/lower rear scalp while facial features remain uncovered; running segment lengths remain .34/.32 within 1e-6; wrists do not collapse onto shoulders; sampled elbow angles remain readable and finite; joints remain continuous across lean .2; input state is unchanged.
- [ ] Run node --test tests/runners/rig.test.mjs and record expected failures.
- [ ] Implement complete rear/side hair, coherent fixed-length arms, hand orientation/mirroring and gradual fatigue/lean transitions. Adapt the high-forearm reference without copying robot appearance. Preserve existing face, lower-body race movement, banking and game rules.
- [ ] Run tests and all existing runner tests. Investigate any failure; do not delete old assertions merely to go green.
- [ ] Add a reproducible offline generator using actual updated meshes and game poses; regenerate both atlases and 400 m extra poses. Render front/side/back review images and representative normal/tired/lean/crouch/fall views outside runtime assets.
- [ ] Self-review and commit only owned files. Report every changed path, red/green evidence, reference interpretation and limits.

## Task 2: Preserve provenance and verify the batch
Files: exact provenance helper/test/manifest inventory necessary to describe the approved visual revision; new docs/runners/VISUAL-REVISION-MANIFEST.json and review documentation.
- [ ] Pin fresh remote baseline and all 100 m/physics/audio/score hashes.
- [ ] Add tests that reject unknown visual paths, missing sprite variants, hash drift, protected-source edits and dishonest changes to original import source hashes.
- [ ] Record the authorized revision with before/after hashes and update the integration's current inventory without falsifying original source provenance.
- [ ] Run full tests against baseline; preserve and identify any pre-existing unavailable-asset failures. Build and preview release preflight; do not call a partial suite a full pass.
- [ ] Independently review the whole change and visually inspect normal/tired/finish poses, game starts and mobile-sized views. Fix critical or important findings and recheck.
- [ ] Re-read the remote head, publish only the exact reviewed delta with expected SHA, verify remote tree and main unchanged, wait for exact-head deployment, and verify live pages/assets without posting scores.
