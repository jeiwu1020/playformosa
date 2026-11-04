# Fast Hands 3D art and survival revision

## Scope

Updates only the two new levels. Original duck entry/navigation, app, style, character rig, records and leaderboard files are byte-identical to preview commit `506de9e1480050f945da361965c4e16b28f62ce5`. Main is not a publication target.

- Catch: one unscored practice, then a survival run. First stage is 520 ms; subsequent flight duration is `220 + 300 * 0.86^(stage - 1)` ms. The lower limit is 220 ms. Each miss/early input ends the run. Practice is 650 ms with a 100 ms half-window; scored half-window is 15% of flight, bounded below at 35 ms. Tuning is explicit in `LEVEL_TUNING`.
- Duel: all ten rounds, ten unique items from sixteen. AI timing is preselected before the signal: 150–280 ms normally, with a 14% chance of an additional 80–160 ms stumble. The player's response never changes that draw. Exact ties remain ties.
- Both levels reuse the original king rig; duel also reuses the actual javelin sports athlete. Fixed-length arm solving, finger closure and item/dart attachment are presentation only. Input timestamps decide results.
- Scores are session-only. No new persistence, ranking APIs or data-schema changes.

## Artwork

`assets/duel-items-atlas.png` is a generated 4×4 collectible atlas. The sixteen objects are flying slipper, crowned toilet paper, heroic broccoli, alien, office lobster, sock, durian, plunger, toy crown, unicorn, brick, dumpling, UFO, duck, banana and detective bear. The intended style is dimensional sculpted clay toys on a clean ivory background, not emoji. Generation used the built-in image generation tool. The source is retained unchanged. Measured crop rectangles in `itemArtFrame` exclude the bear's hat from the preceding dumpling row and are shared by CSS and 3D texture sampling.

The five fallback PNGs were rasterized from the same actual Three meshes, not invented replacement characters. `scripts/render-fast-hands-levels.mjs` regenerates them; `assets/levels-pose-provenance.json` records cameras and attachment coordinates. When WebGL is unavailable, the interface explicitly says 2D compatibility mode. Generated-art errors pause the duel and expose a retry control rather than silently using a generic prize.

## Verification

- 49 focused levels/rules/UI/provenance/real-Three/rasterizer tests passed after review fixes.
- Ten browser fixture sizes (320×480, 320×568, 360×640, 390×844, 430×932, 568×320, 667×375, 844×390, 768×1024, 1280×900): 1,250 checks passed for navigation, target sizes, overflow, practice, survival progression beyond ten, duel ten unique items, summary and pause/resume. Original duck layout fixture: 260 checks passed.
- Native browser actions verified a successful catch practice, a duel win and failed-run summary. These are automated test timestamps, not human reaction records.
- Review added explicit failed-art handling, offscreen cue guards before input/frame scoring, and no false-start projectile in the fallback. Focused regressions pass. Final deployed smoke is still required before release completion.
- Full local suite: 1,791 tests, 1,769 passed, 22 failed. Remaining failures are unavailable pre-existing large assets or unavailable `sql.js`; these files are retained in the remote base tree and are not deleted by this change.
- `npm run build` passed; `npm run check:release -- --expect=preview` passed.

## Limits

The browser environment has WebGL disabled. Real Three mesh geometry, poses, reach, contacts and lifecycle were tested in Node, and source-mesh stills plus 2D browser fallback were inspected. This is not an actual WebGL browser/device acceptance test. No physical iOS/Android test was performed. Build success must not be described as a full remote test-suite pass unless that suite is separately observed.
