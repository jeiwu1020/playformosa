# Named Sky Journey Implementation Plan


**Goal:** Make a richer high-altitude journey explicit through synchronized names and scenery.
**Architecture:** skyJourney(state) remains the single pure presentation selector. sky-models renders a fixed pool; a new journey-hud module displays and captures that same stage. An outer provenance layer protects all earlier branch work.
**Tech Stack:** Existing JavaScript, Three.js, Canvas, Node tests and browser UI.
**Spec:** docs/superpowers/specs/2026-11-05-vault-journey-stages-design.md

## Global Constraints
- Only preview/hurdles; retain every concurrent change and all remote binary files.
- No edits to physical/scoring formulas, input, ground landmark thresholds or order.
- Portrait labels must be visible independently of the hidden decorative canvas.
- Fixed model pool, at most two main subjects, no new asset requests.

## Review Focus
- Main name matches the dominant object at every threshold, descent and finish.
- Moon/planetary scenery is never mislabeled as measured height.
- Portrait and short landscape labels do not cover height, energy, athlete or controls.
- Capturing another frame restores both models and live stage HUD.
- Runtime inventory tests execute independently of unrelated missing binary reads.

## Task 1: Stage data and HUD
- [x] Write and observe failures for 22 monotonic stages, immediate dominant/name agreement, bounded extreme heights, frozen finish and no state mutation.
- [x] Extend sky-journey.mjs with stage records and deterministic selection; create journey-hud.mjs with createJourneyHud(host), update(journey,width,height), and paintJourneyCard(ctx,journey,width,height).
- [x] Add DOM tests for visible semantic stage names, categories, viewport placement and noninteractive behavior.

## Task 2: Scenery integration
- [x] Add failing real-scene tests for every stage, fixed mesh/geometry bounds and restoration.
- [x] Extend sky-models.mjs with reusable planetary and playful low-poly subjects. Integrate the DOM/capture card in render.mjs without gameplay changes.
- [x] Inspect native browser desktop, portrait and landscape samples, including transition and result states.

## Task 3: Protection and release
- [x] Integrate the latest concurrent preview head before sealing exact preimages and full-tree inventory.
- [x] Run focused and aggregate tests, compare all sparse-checkout failures, and separately assert full runtime inventories without requiring omitted binary bytes.
- [ ] Obtain fresh review, back up the delta, verify the new tree, CAS only preview/hurdles, and confirm matching deployment status and live game.
