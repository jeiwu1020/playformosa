# Fast Hands QA refinement verification

Baseline: `preview/hurdles` at `4cb67f2f56be12e66c3f1669249ac2f33f40cc12`.
Verified 2026-11-04 UTC. This change is for the existing preview branch and QA database only.

## Scope

- Preserve the approved character, blue eyes, game rules, successful closing pose, download renderer, audio, and previous startup readiness/attribution changes.
- Add manual, consent-based QA leaderboard submission. Mouse and touch use distinct immutable rules. Production rejects Fast Hands before accessing a database. Existing nine leaderboards retain their contracts.
- Replay the actual current round's accepted path and timestamps at original speed, without rescoring, sound, local-best mutation, or leaderboard submission. Failed rounds can replay; no clip means replay remains disabled.
- Use the platform header, remove the entry home button and unnecessary front-view label, enlarge instructions, emphasize starting at the bill.
- Use two approved generated promotional covers. Both are new 768×512 WebP files under 64KB; keep old assets.

## Automated verification

- 311 focused game/API/provenance/startup/studio checks passed.
- 49 replay/app/leaderboard integration checks passed.
- Independent review: 93 focused checks passed; no actionable P0/P1/P2 findings.
- Full local suite: 1,736 tests, 1,728 passed. Eight failures all result from the previously unavailable `public/games/beer-slide/audio/chill-menu.mp3` in this materialized checkout. No file was fabricated and no test was disabled. The unchanged file remains in the remote base tree; the exact commit's remote CI is required for final verification.
- Build, 621 local-reference checks across 475 output files, and preview release guard passed.
- Reversible ledger checks verify six modified runtime files, four new assets/modules, and unchanged older manifests/configuration/schema/core gameplay.

## Cloud browser verification

- 240 fixture checks passed at 12 sizes: 320×568, 360×640, 320×700, 360×740, 390×844, 430×932, 568×320, 667×375, 844×390, 667×600, 680×600, and 1280×900.
- Coverage includes single-pointer handling, mode separation, cancellation/blur/resize/timeouts, result delay, replay invariants, mock API upload/raw score/idempotency/category locking, modal return paths, header geometry, overflow, readable controls and bounded dialog scrolling.
- Fixture API calls were mocked. They did not write QA or production records.
- Native desktop mouse drag completed a real round in 0.480 seconds. Its original-speed replay returned the same 0.480-second result. The download generated a visually inspected 1080×1350 PNG with the character and attribution.
- The screenshot's 0.009-second local best came from the synthetic fixture, not a human performance. It is not a leaderboard record.
- Both replacement homepage images loaded successfully in the browser.

## Limits and deployment follow-through

Cloud Chrome did not provide WebGL, so UI/native mouse checks used the disclosed 2D gameplay fallback and prerecorded 3D demonstration. Physical phones/tablets, real touch input, iOS downloads, and GPU performance were not tested. Responsive fixture sizes are not physical-device validation.

Before completion, verify the exact commit's Cloudflare build, deployed assets, actual-round replay, and one explicitly authorized, clearly labelled QA test score through the UI. No production DB changes, new credentials, paid services, or main-branch changes are included.
