# Fast Hands Split Entries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Three clear entrances and true future-only recorded starts, plus a restrained reference-informed duck setting.
**Architecture:** Extend the existing catalog, club controller and anonymous count service. Decorate only the duck renderer while preserving gameplay and historical sources.
**Tech Stack:** Vanilla JS/CSS, Three.js, canvas, Node/JSDOM, SQLite mocks and cloud browser.
**Spec:** docs/superpowers/specs/2026-11-04-fast-hands-split-entries-design.md

## Global Constraints
- preview/hurdles only; no main, remote SQL, production DB, live count POSTs or score submissions.
- Keep old direct routes, controls, speeds, AI, scoring, replay, sharing and board data.
- Preserve historical pins and preimages. Add only a reversible outer layer.
- Count actual formal starts, never visitors/unique people or historical inferred totals.

## Review Focus
- Reopened help, storage-denied navigation and browser back/forward must not redirect to the wrong game or reset a live match.
- Duplicate clicks, failed/retried network requests and paused-current-round retries must not double count.
- A failed count service must not block gameplay or display fabricated zero.
- Homepage href/image validation must permit only the exact three Fast Hands destinations, not arbitrary nested paths or external URLs.
- Scene decoration must leave identity, input geometry, trajectories and mobile readability intact.

### Task 1: Separate entrances
- [x] RED: Add direct/home/tab entry tests and exact catalog/security assertions.
- [x] GREEN: Update src/catalog.mjs, src/render.mjs, club.mjs, three HTML intros and scoped club.css; regenerate public/index.html.
- [x] Adapt superseded current UI expectations while preserving historical provenance tests; run focused navigation/layout tests.

### Task 2: Recorded starts
- [x] RED: Add isolated reporter and actual-controller start-boundary tests; backend additive-key/rate/dedupe tests.
- [x] GREEN: Add dedicated Fast Hands reporting helper and minimal app/controller hooks; extend backend accepted/returned keys only.
- [x] Verify zero starts before play and no practice/demo/replay/stage increment, paused retry dedupe, errors/timeouts, exact existing caps and unchanged DB schema/config.

### Task 3: Duck setting
- [x] View public reference without copying its media; document what was actually visible.
- [x] RED: Freeze gameplay/character transforms and test restrained duck-only decoration plus fallback.
- [x] GREEN: Add duck-room module, duck-only stage hook and corresponding canvas decor; inspect actual rendered visuals and performance budget.

### Task 4: Approved display and identity follow-ups
- [x] Regenerate duel cover from the actual homepage athlete pixels; inspect full and card size.
- [x] Rename first-game visible labels, sharing and download image to 鴨沒漏補 without changing IDs/URLs/data.
- [x] Expand duck share scene preserving all pixels/aspect ratio and studio credit; test real PNG text and image bounds.
- [x] Protect gameplay UI against long-press selection while retaining editing/copy/image-save exceptions.
- [x] Reproduce reviewer-found first-entry settings detour; restore initial intro safely and retain interrupted-run count.

### Task 5: Integrate and publish
- [x] Seal outer provenance on 0e3456e; review exact changed paths and preserve unrelated remote blobs.
- [x] Run fresh full suite with exact known-baseline comparison, build/preflight, independent review and isolated multi-size browser flows.
- [ ] Back up exact candidate; verify branch lease, commit/push preview/hurdles, wait for Cloudflare and perform non-mutating live checks.
- [ ] Record rollout time, rollback commit, counts verification boundary, main unchanged and WebGL/physical-device limitations; release preview.
