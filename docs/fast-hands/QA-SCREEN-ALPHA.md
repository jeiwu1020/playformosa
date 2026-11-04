# Desktop screens, blue dart, and transparent collectibles

Baseline: preview/hurdles b732a20962613de3fb286fb2a8dc798d615d408d. This revision is presentation-only, apart from result-history pagination and restoring the scene into view on retry. The duck drag track, scoring, timing, ranking schema, local records, and server endpoints are unchanged.

## Changes
- Desktop at least 1000×560: catch/duel allocate scene height to the actual viewport. Scored results replace the game stage rather than extending the page. Ten duel results fit together; unlimited catch history is retained in ten-entry pages.
- The duck result ticket uses two columns on desktop. Its complete normal content, sharing actions, ranking buttons, and level navigation fit without internal scrolling.
- Mobile controls remain in normal flow, so they do not float over the scene or results. Mobile pages may scroll.
- Catch target rings are hidden in every 3D phase and removed from fallback markup and pose renders. Dart is a single short rounded bright-blue surface (#29a9ff), 65% of its former length, retaining identical tip/trajectory/contact coordinates.
- The collectible atlas was edited with built-in image generation using transparent_background=true. The original generated PNG is copied unchanged. It has real RGBA alpha, 66.92% fully transparent pixels, and no opaque ivory/checkerboard backdrop. There are trace alpha 1/255 background pixels, visually imperceptible on dark/white QA composites. All sixteen crops have more than 20px clear silhouette padding and border alpha at most 3/255. Measured cell boundaries avoid cutting the bear's hat. All scene/results CSS cards are transparent with no border or opaque fill.

## Verification
- 2,424/2,424 browser geometry assertions: 1000×560, 1024×600, 1280×720, 1366×768, 1440×900, 1920×1080; mobile/tablet 320×568, 360×640, 390×844, 430×932, 768×1024. Includes idle, waiting, live, feedback, full and paginated results, expanded help, and duck success/failure results. Desktop checks inspect full content, not only dialog outer bounds. Mobile checks horizontal bounds and no controls over the scene.
- Real browser flow: practice then ten scored duel rounds, ten distinct result cards, no page scroll at 1180×757; catch practice then scored failure, no circle, complete result and retry actions.
- Focused source tests: 61/61 passed, including complete alpha/crop inspection, history pagination, immutable mechanics, catch geometry, scene contacts, and all provenance layers.
- Full suite: 1,783/1,805 passed; the same 22 pre-existing failures in this minimal reconstruction are missing historical binary files or unavailable sql.js, not regressions from this patch. Build and preview release preflight passed.
- This cloud Chromium disables WebGL. Actual browser interactions therefore exercised the same-model 2D fallback. 3D model geometry, arm/contact animation, hidden rings and texture crops are covered by source tests; a real WebGL-capable device still needs visual confirmation.

## Reversibility
SCREEN-ALPHA-MANIFEST.json records every changed runtime hash and base Git blob. Its outer provenance helper restores b732 exactly before previous ledgers run. The three binary baseline assets are retained under docs/fast-hands/baselines/screen-alpha using their existing Git blob identities. All other runtime source bytes are preserved.
