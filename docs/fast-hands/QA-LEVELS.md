# Fast Hands: foam catch and ten-round duel

## Scope

Base: `5538590df2c74eac2b161985cab0436556b576d2` on `preview/hurdles`.

Two independent static pages add foam-ball timing and an AI reaction duel. Each starts with one unscored practice round, followed by exactly ten scored rounds. The duel shuffles ten unique funny items from sixteen. AI timing is selected before the signal and is not changed by player input. Early input loses that round. Hidden tabs, width changes and detected long frame stalls pause the current round without adding a result.

The original duck game's only HTML delta is three level-navigation groups and their dedicated stylesheet link. Original gameplay modules, original style.css, character, local records, replay, sharing, leaderboard API and worker remain byte-identical. No new mode writes local storage or calls ranking endpoints. Current scores are session-only arcade scores, not real-person records.

## Local verification

- 24 new rules, UI and provenance tests pass. Three existing button-layout tests also pass in the focused 27-test combined run.
- Full Fast Hands directory: 313 tests, 312 passed. One protected cross-game asset test cannot read the missing original javelin apple-touch-icon.png in the reconstructed workspace.
- Complete repository run: 1,766 tests, 1,744 passed, 22 failed due to unavailable original assets and missing sql.js dependency. These are not silently skipped or called a full pass.
- `npm run build` passes. `npm run check:release -- --expect=preview` passes. `scripts/verify.mjs` is blocked by the missing original hero-long-jump.png reference.
- Browser deterministic integration: 1,110 checks pass across 320×480, 320×568, 360×640, 390×844, 430×932, 568×320, 667×375, 844×390, 768×1024 and 1280×900. Uses actual Chromium DOM/CSS, sized iframes, injected clock/randomness and synthetic pointer/keyboard events. Covers practice, successful catches, all ten rounds, unique objects, scores, repeated input, pause/resume, horizontal bounds, 44px targets and result lists.
- Original duck presentation regression: 260 checks pass across the same ten sizes, including entry, gameplay and result navigation, usable original controls, bounded result dialog and equal-column ranking buttons.
- Native browser interaction separately verifies keyboard false-start, returning to the original duck entry and starting its existing challenge. Visually inspected 390×844 views of both new levels and desktop catch view.
- Independent code review found a stalled-frame/input race; a failing regression test was added, then the handler was corrected and retested.

## Limits and publication

No physical iOS/Android testing. Browser WebGL is disabled, so original duck live rendering was checked through its existing 2D fallback, not as a new 3D acceptance test. The new modes use DOM/CSS and do not require WebGL.

The reconstructed workspace lacks fifteen existing assets larger than 1 MB because the GitHub contents connector returned an empty body for them. Publication must use an exact incremental tree on the pinned remote parent, preserving every other existing blob, rather than uploading this incomplete checkout as a full replacement. The original binary assets and sql.js are present in the remote repository/package lock and should be checked by its normal build pipeline. This document is a pre-publication QA record, not a deployment receipt or a claim that remote tests ran.

The additive `LEVELS-MANIFEST.json` reverses navigation to the exact pinned original bytes and records preservation hashes. Historical manifests stay unchanged; their readers reverse the new layer first. New runtime additions are explicitly admitted by the relevant directory-provenance checks.
