# High-jump compact desktop entry implementation plan

> For agentic workers: implement natively in the existing authorized task and obtain independent final review.

**Goal:** Restore a compact 500px vertical desktop opening without changing mobile, results, or gameplay.
**Architecture:** Add a high-jump-only compact instruction node, hidden outside the existing desktop media gate. Change only opening rules in high-jump CSS. Preserve published provenance through a new reversible outer layer.
**Tech Stack:** Existing ES modules, CSS, Node tests/JSDOM, Chromium viewport QA.
**Spec:** ../specs/2026-11-07-high-jump-compact-entry-design.md

## Global constraints
- No main, physics, input, result, mobile layout, image, backend, or deployment-setting changes.
- Preserve every published historical manifest and baseline. Compare failed-test reasons, not only their names.

## Review focus
- 1280×544 browser height: collapsed card and Start fit without scrolling.
- Expanded details and very short windows: scrollbar and Start remain reachable.
- Coarse pointer/tablet and sub-900px width: old copy and layout remain active.
- Results, pause, and honor views: unchanged presentation.
- Historical raw readers and isolated helper copies: complete reversal dependencies and exact hashes.

## Implementation
- [ ] Add failing desktop width/stacking/mobile/result tests and independent compact-copy tests.
- [ ] Add compact instructions in high-jump/game.mjs; scope opening CSS to desktop only.
- [ ] Add the outer provenance layer and isolated-copy dependencies; preserve earlier ledgers.
- [ ] Run all tests, compare baseline failure signatures, build, and preview preflight.
- [ ] Verify viewport matrix and disclosures in the browser, seal/review the delta, recheck remote head, publish only preview/hurdles, and verify exact-commit deployment and live bytes.
