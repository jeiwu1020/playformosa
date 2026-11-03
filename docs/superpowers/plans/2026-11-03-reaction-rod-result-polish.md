# Reaction Rod Result Polish Implementation Plan

**Goal:** Remove the noninteractive heading focus border, tighten desktop results, and keep the original upload panel in the right column without changing gameplay or mobile order.

**Architecture:** A generic result-content wrapper forms one desktop stack and uses display:contents at narrow sizes. The existing upload panel mounts once into an optional resultUploadContainer; other games retain the default result container. Desktop photo boxes use the unchanged frozen canvas at its natural ratio with transparent letterboxing and bounded height.

**Tech Stack:** Existing HTML/CSS/ES modules, Node tests, JSDOM and PostCSS. No new dependencies.

## Constraints
- Base: preview/hurdles ba0145c3bad717474689090e3049c3905ba1fd08. Isolated source snapshot, not a Git checkout.
- No push or deployment until separately authorized; do not touch main.
- Physics, inputs, replay records, scoring, snapshot pixels and sharing remain byte-exact.
- Keep heading programmatic focus and dialog name, with visible keyboard focus on interactive controls.
- Keep one upload panel and its lifecycle, manual submission, nickname and scroll safeguards.
- Mobile portrait retains summary, photo, play actions, sharing and upload in that order. Short/zoomed viewports may scroll.

## Review Focus
- Heading focus remains accessible without looking like a button; interactive focus remains visible.
- Desktop canvas stays fully visible, including the floor rod, without green CSS letterboxing.
- A narrow/rotated viewport never duplicates or remounts input/upload state.
- Upload expansion scrolls only inside the result, including short landscape and keyboard input.
- Other eight leaderboard games keep their original placement and submission behavior.

## Tasks
- [x] Add failing real-DOM/CSS tests for focus, desktop stack/photo and mobile order; verify expected failures.
- [x] Add failing upload-container/state/scroll tests, including all nine defaults; verify expected failures.
- [x] Make four scoped runtime changes: reaction-rod index.html, game.mjs, result.css; shared leaderboard.mjs optional resultUploadContainer=result.
- [x] Run focused tests, reconcile historical exact-byte provenance through a new reversible polish layer without editing old manifests.
- [x] Obtain independent review, fix covered findings, run full check and preview preflight.
- [ ] Package full source/evidence, restore independently, repeat full checks, save private backup.

## Decisions
- User approved this design and direct execution; no additional design gate is needed.
- Green side rails are the shared resultPhoto background showing through contain letterboxing, not frozen scene pixels. Only wide-layout CSS changes the background/box sizing.
- No Git mutations are made in a snapshot workspace; publication remains a separate explicit approval.

- Review decision: retained the photo after right-content in DOM order while preserving narrow visual order. The static photo is supplementary; interactive tab order is unchanged. Cost: a screen reader encounters the photo after actions/upload. No speculative ARIA ordering or resize-time reparenting was added.
- First complete check: 1,409 tests passed with build and preview preflight; two additional keyboard-focus tests then passed. Final aggregate and restoration checks use the final 1,411-test suite.

- Final candidate check passed: 1,411 tests, 0 failures, 0 skipped; build passed, 506 references across 438 output files, preview preflight passed.
