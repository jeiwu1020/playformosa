# Fast Hands visual polish verification

Baseline: `35b5bc6c6017b03bca5e4d62474446854456a298`, complete tree `2828ee75f558e714611b424fbd12764036ea8339`.

## Scope and acceptance

- The single homepage entry and all three direct game links stay intact.
- Only the normal duel renderer badge is hidden after choosing 3D or fallback. Pending/loading text, actionable art failures, retry controls and help remain available.
- Result captures still use contain-fit at 900×620. Unused pixels are transparent, rather than a baked contrasting background; the result picture has no border/shadow/background. The actual scene pixels, camera and characters are unchanged. Capture failures retain a readable caption.
- Two generated 1536×1024 illustrations replace only the two new-game intro pictures on all three HTML entry points. They match the existing duck cover. Full-size and 96×64/144×96 views were inspected. WebP conversion preserves dimensions and composition, with no crop or stretch.
- Rules, AI, speeds, timing, controllers, score data, backend, leaderboard forms, existing artwork and replay behavior remain byte-exact.

## Automated evidence

- Presentation RED: 7 failures/1 pass before the fix; GREEN: 37/37 including existing capture and finale regressions.
- Cover RED: 4 failures before adding the assets/card references; GREEN: 21/21 including the existing readable-intro contracts.
- Provenance GREEN: 51/51, including historical-layer tamper checks. Six edited runtime files and two image additions are the entire runtime delta. All 85 protected runtime/backend files, 16 historical manifests and 52 historical preimages are preserved.
- Independent focused review: 222/222 presentation, capture, sharing, result, navigation and UI checks; additional pixel probes confirm transparent padding becomes opaque on exported share cards. No actionable finding.
- Full suite: 2178 tests, 2164 pass and 14 pre-existing failures from 15 unrelated binary files absent in this minimal local reconstruction. Failure names exactly match the baseline; no new failure. This is not a full-green suite. Those remote files are retained through a delta on the complete parent tree, not deleted or replaced.
- `npm run build`: passed. `npm run check:release -- --expect=preview`: passed.

## Browser evidence

- Three-mode result regression: **1410/1410** across 1000×400, 1024×600, 1366×768, 1920×1080, 320×568, 360×640, 390×844, 430×932, 768×1024 and 844×390.
- Three-mode intro regression: **144/144** across 320×568, 360×640, 390×844, 844×390, 1024×600 and 1366×768.
- Visual inspection of 320×568 intro/duel result, 1024×600 intro/catch result and 390×844 duck result confirms recognisable covers, full characters and scene images without added side frames. Four result actions remain fixed. Expanded optional form/details stay internally scrollable.
- Fixture coverage also verifies repeated results, replay without rescoring, actual result image reuse, shared-image dimensions, upload consent and rank-outside-top-20 handling using local mock responses only. No real scores are submitted.

## Limits and rollback

The cloud browser cannot initialize hardware WebGL; browser interaction used the existing same-model fallback. This does not certify physical-device WebGL, iOS native share sheets or all GPU implementations. 3D source, shaders and animation are unchanged. Pixel tests cover real canvas capture and mock the renderer boundary, not a hardware GPU.

The original generated PNGs and an independent pre-change archive are retained outside runtime. The complete published baseline above is the rollback point. Publish only to `preview/hurdles`; `main` and the database are outside this change.
