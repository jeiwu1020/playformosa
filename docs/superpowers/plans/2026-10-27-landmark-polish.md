# Landmark Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for this native execution. Steps use checkbox syntax.

**Goal:** Distinct local scenery and one recognisable world-anchored main landmark per stop without changing v9 gameplay.
**Architecture:** Split shared scenery art/landmark builders from streamed chunk assembly; batch small same-material details where useful. Landmarks have fixed region-owned anchors independent of repeating support props.
**Tech Stack:** Existing Three.js ES modules, node:test, existing offline Blender exporter.
**Spec:** docs/superpowers/specs/2026-10-27-landmark-polish.md

## Global Constraints
No input, physical equations, camera, route mileage, record or food-comment edits. Seven nearby chunks, bounded materials/geometries, no raster downloads or additional dependencies. No Codex invocation.

## Review Focus
- Opening negative-distance run-up must not generate repeated Taipei landmarks.
- Adjacent chunks and fractional floating-origin changes must not duplicate or shift landmark world anchors.
- Entire 101 outline must fit the existing landscape camera, with the athlete readable.
- Similar previous silhouette categories must gain genuinely different local structures.
- Far-space streaming must not accumulate meshes, materials or giant coordinates.

### Task 1: Anchors and local visual identity
Files: scenery.mjs, new landmarks.mjs, tests/long-jump/v10-scenery.test.mjs.
- [ ] Write and run failing real-geometry tests for unique Taipei, every stop identity, fixed rebase anchors and silhouette bounds.
- [ ] Implement fixed anchors and main landmarks with deterministic supporting scenery; retain chunk API and gameplay source bytes.
- [ ] Run all tests; migrate only obsolete repeated-landmark assumptions with explicit explanation.
- [ ] Commit code and tests.

### Task 2: Reference review and visual verification
Files: new scripts/render-v10-evidence.mjs, docs/landmark-art.md, evidence/scenery-v10/*.
- [ ] Use primary landmark/tourism references to refine distinguishing contours and support props.
- [ ] Export actual Three.js meshes and actual-input states, render a contact sheet, inspect representative Taiwan/world/space scenes.
- [ ] Check resource bounds, projections at phone/desktop aspect ratios and unchanged physics fixture; run npm run check.
- [ ] Independent review; fix verified findings with regression tests.

### Task 3: Durable candidate and authorised publication
- [ ] Reconstruct exact upstream delta, verify all unchanged files and original hero, save checkpoint to the existing Library item.
- [ ] Recheck main lease, publish focused delta through supported GitHub tools with ordinary fast-forward.
- [ ] Observe exact-commit Cloudflare terminal state and public asset hashes; retain limitations about unavailable live WebGL/device QA.
