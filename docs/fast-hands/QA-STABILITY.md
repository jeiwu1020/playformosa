# Fast Hands stability and grab motion QA

Base: `d4a63fe65358d15b5c232e67767a57bcfce292b7` on `preview/hurdles`.

## Changes

- Start behind a loading cover. Select WebGL only after its first ready frame, otherwise select the fallback. A late WebGL result cannot replace an already selected fallback. This removes the original offline-image-to-WebGL lighting swap after page entry.
- Reserve the primary action, secondary practice action, status, hint and progress rows. Game-phase controls retain their bounds through waiting, live, feedback, practice completion and the next round. The final match summary intentionally remains its separate result screen.
- Scored catch stage 1 is exactly old stage 5: `220 + 300 * 0.86 ** 4 = 384.102448 ms`. Subsequent stages retain the 0.86 decay, 220 ms floor and existing timing-window rule. Practice remains 650 ms. Inclusive endpoint checks use direct bounds to avoid floating-point subtraction excluding an exact endpoint.
- The receiving hand begins below the table. Pressing initiates the reach. A successful dart attaches only on palm contact and returns to the body; an unpressed miss leaves the hand down.
- The duel winner reaches the item, attaches it to the palm and retracts it to their body. The losing hand retreats. Both 3D and fallback use the same motion sampler and projected item coordinates.
- Result scoring is unchanged and immediate. The next-round controls and final summary wait for the 520 ms presentation motion to finish. No artificial delay is added to the reaction-time result.
- Fifteen fallback pose files use the same character meshes and camera as WebGL. Transparent prizes and the blue dart are overlaid rather than baked into the pose frames. Frame blends keep an opaque base to avoid darkening.

## Verification

A local browser fixture exercised catch and duel at 1000×560, 1024×600, 1280×720, 1366×768, 1440×900, 1920×1080, 320×568, 360×640, 390×844, 430×932, 768×1024 and 844×390. It checked practice, scored rounds, reach/contact/return, and full results: **2,820 / 2,820 assertions passed**. The old desktop layout moved its primary control by 50 px; the candidate has zero movement during game phases. No horizontal overflow or overlapping mobile scene/control bounds was found. Desktop results fit in one page.

Actual browser interaction verified repeated practice/round controls and the AI-held prize at the body. The successful catch return pose was visually inspected. Initial renderer readiness, late-loader rejection, precise old-stage-5 speed, visual-only delay, shared 3D/fallback projection and grip contacts have automated coverage.

The cloud browser has no working WebGL context. Browser screenshots and interactive runs therefore used the 2D fallback. Three-dimensional joint and contact geometry, world projection, mesh-generated fallback poses and renderer selection were tested in code; this is **not** a claim of GPU/device visual verification. A real WebGL desktop/mobile visual review remains advisable.

The local reconstruction lacks some pre-existing binary assets and the `sql.js` worker dependency. The aggregate suite's inherited missing-resource failures are reported separately; build/release preflight and affected feature tests are checked independently. Publication is incremental over the verified remote tree so missing local files are never deleted remotely.

Final command results: aggregate suite 1,805/1,827 passed; its 22 failure names exactly match the prior revision's inherited missing-resource failures. Fast Hands suite 373/374 passed; the single failure is the unchanged missing javelin icon baseline read. Stability/historical provenance 13/13 and motion/world/rasterizer/dart 25/25 passed. Static build and preview release preflight passed.
