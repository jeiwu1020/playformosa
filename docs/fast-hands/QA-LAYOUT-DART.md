# Desktop layout and toy dart refinement

Base: 440e37c35d5ef7a73a024a492544c3a0935c530b (preview/hurdles). Main is outside scope.

## Requested change

The user selected a larger left-side desktop stage with supporting information and actions on the right, while retaining the continuous full-width drag track. The toy dart should receive a small same-color, one-piece rounded refinement. No ring removal, animation changes, additional dialogs or duel object changes were authorized for this revision.

Desktop layout activates at viewport width >=1000px and height >=680px. It leaves the main max-width (1080px), pad height, percentage gates, input code, original camera and all records unchanged. Existing mobile and short-landscape styles remain byte-equivalent before the appended desktop media query. Result-state actions use one full-row retry and two smaller actions so all three fit at the minimum desktop size.

The dart uses one orange LatheGeometry mesh with a flat tail and smoothly rounded tip no wider than the body. The former swollen green tip and white band are removed. The contact anchor and flight curve remain identical. The fallback CSS silhouette and caught-pose raster are updated; ready-pose and all duel images remain byte-exact.

## Reference

- [Hasbro Elite A0351 official product page](https://consumercare.hasbro.com/en-us/product/nerf-official-30-dart-elite-refill-pack-for-nerf-n-strike-elite-accustrike-zombie-strike-modulus-toy-blasters/CCCE147C-5056-900B-1055-3FA593C070AD). Official description identifies a foam body and flexible hollow tip. The official photo was visually inspected in the browser: straight cylindrical body, rounded cap at approximately body width.
- [Hasbro N1 F8640 official product page](https://consumercare.hasbro.com/en-us/product/nerf-n-series-n-1-darts-20-darts-compatible-only-with-nerf-n-series-blasters-outdoor-games/7C42038A-BBD3-40EB-B7EF-7DACBACC5F05). Additional foam-dart reference.

Only the common toy silhouette is referenced. No brand image/logo was copied. Same-color styling follows the user's request, not the reference product's two-color paint.

## Checks

- TDD: desktop layout and dart geometry/fallback assertions failed before implementation and passed afterward.
- Focused layout, dart, world, input, rules and provenance suite: 77/77 passed.
- Entire Fast Hands suite: 343/344 passed; one pre-existing unavailable old javelin icon blocked its unrelated preserved-assets assertion.
- Full project suite: 1,797 tests, 1,775 passed, 22 failed due to inherited missing old binary assets or unavailable sql.js. This is not a full-suite pass. Publication uses a remote base-tree incremental update so missing local historical assets are retained remotely.
- npm run build: passed.
- npm run check:release -- --expect=preview: passed.
- Independent review: five runtime paths only; exact reverse ledger restores every changed runtime file to the actual baseline backup. Original input/timing/ranking and duel sources/assets unchanged.

## Browser checks

580/580 baseline/candidate comparisons passed at 16 viewport sizes: 320x480, 320x568, 360x640, 390x844, 430x932, 568x320, 667x375, 844x390, 768x1024, 999x900, 1000x680, 1024x768, 1280x720, 1280x900, 1440x900, 1920x1080. Checks cover exact pad/gate horizontal position, width and height, unchanged non-desktop rectangles, taller desktop stage, all three result-state actions without overlap, native entry/result/ranking dialog bounds and the two ranking actions remaining equal width in one row.

At 1280x900 the character viewport grows from 308.8px to 459.6px high; the pad remains 1080x122px. At 1280x720 it grows from 128.8px to 279.6px. The original continuous gesture remains required.

Native browser flow: entered original duck challenge, dragged from left toward duck and released, observed the original unfinished-result dialog and unchanged no-record behavior, closed it, verified all three right-side actions. Catch practice loaded its real fallback asset and matching one-color CSS dart; no horizontal overflow or image load failure.

This browser disables WebGL. Layout, native controls, fallback scenes and deterministic 3D geometry/contact tests were verified, but actual WebGL rendering and physical iOS/Android devices were not tested. Small mobile/short-landscape inherited layout limitations are unchanged, not claimed fixed.
