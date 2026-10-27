# Adventure Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the approved jump game from all22 Taiwan counties/cities through the world into space without changing its controls/physics feel.
**Architecture:** Keep v8 physics equations and wind fixed; supply a contiguous ordered route table, metadata and procedural landmarks. Route progress uses the same accumulated game-world coordinate throughout UI, landing destination, achievements and records.
**Tech Stack:** Existing vanilla ES modules, Three.js, Node test runner; no dependencies/services.
**Spec:** docs/superpowers/specs/2026-10-27-adventure-route-design.md

## Global Constraints
- No new food commentary; no Codex; direct main publication authorized after verification.
- A/S feet, J/K hands, .34s hold threshold and all motion/energy equations unchanged.
- v9 record namespace; preserve old keys, homepage, original hero and other games.
- Seven streamed chunks, floating-origin support and unbounded continued flight.

## Review Focus
- Exact22 Taiwan stops including the separately named Hsinchu and Chiayi county/city pairs.
- Boundary contacts and fouls must report the actual region, not flyover or Taiwan fallback.
- Space stages must not wrap to Taiwan or terminate flight; wind remains identical.
- Far progress/rebase must not allocate ever-growing scenery/materials.
- Long destination/mileage/result text must fit existing mobile/score-card contracts.

### Task1: Route data and preservation contract
- [x] Write route-order, contiguous-boundary, space continuation, wind parity and v9-storage tests; run and observe failures.
- [x] Implement world.mjs metadata, region lookup, stage/achievement/mileage helpers; minimally adapt physics metadata/storage.
- [x] Run tests and compare real-input state traces with saved v8 modules; commit.

### Task2: Scenery and presentation
- [x] Write geometry-family, bounded streaming and destination/mileage presentation tests; observe failures.
- [x] Extend scenery silhouettes and stage colors; connect HUD/cue/result/share-card labels without input changes.
- [x] Test real meshes and render selected actual scenes offline if browser WebGL remains unavailable; commit.

### Task3: Review and publication
- [ ] Run aggregate tests, focused review and exact-upstream patch tests; preserve source/receipt backup.
- [ ] Recheck remote HEAD, create focused tree/commit and expected-parent fast-forward; preserve all unrelated blobs.
- [ ] Monitor exact Cloudflare check to terminal, verify public hashes and record durable receipts/Library replacement.
