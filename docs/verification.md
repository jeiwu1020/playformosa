# V9 route verification

Base: published v8 d674b77d9fcbe28798bbb70e88d69c60bfe5a8ff. Scope: Taiwan/world/space route, mileage transformation, scenery and presentation; no controls or flight tuning. User authorized direct publication after verification.

- All input/landing/foul/model/physics contracts retained. Five old hardcoded six-country-route/storage assertions migrated by new semantics; the mapping is documented in `docs/history/long-jump-v8-route.md`.
- New tests cover exact22 county/city order, nearby-Asia order, boundary continuity, outward world checkpoint, no post-Saturn wrap/end, cumulative estimated mileage, astronomical-fiction caveat, result/share consistency, v9 persistence separation, destination-aware comments and bounded real geometry/material streaming.
- Actual-input parity: released v8 versus v9 compared22409 steps with identical x/y/origin/velocity/lean/spin/momentum/energy/phase/takeoff/airtime/distance/rebase/rotation and all four joint positions. Airborne181.65s; raw landing5043.022120305911m in both. Route labels and display mileage differ intentionally. Receipt: `evidence/route-v9/physics-parity.json`.
- Offline CPU scene exports show actual-input Taipei/Nantou/Tokyo/Paris/Moon/Saturn states. Rendered images are real Three mesh/camera exports with different CPU lighting, not live browser screenshots or canned gameplay.
- Root's cloud browser has WebGL disabled (GL_VENDOR/GL_RENDERER Disabled); the existing unsupported-context fallback works. This is not gameplay/HUD visual acceptance. Source/layout budgets, CPU images and engine tests do not certify real phone/thumb ergonomics, sound, or native receiving-app sharing.
- Original homepage and hero are preserved exactly. Hero Git blob89d8dd2580a7b4c0842b6c7091bae7a8fa8fcc1f,2290523bytes.

Final aggregate counts, independent review findings, exact remote commit/deployment and served-file checks are recorded in the route-v9 release receipt. No Codex or user-computer actions; no access/security bypass.

## V10 landmark-only refinement
Published v9 source base: `b5ceae76e282c63e1d1b73b24f23742cd0f2c06c`. Owner authorised full-route landmark refinement and direct publication. Seven new real-geometry checks cover single101, unique fixed anchors, complete opening silhouette in existing phone/desktop camera, distinguishing geometry, disposal/revisit, coloured bounded batches and visible sky. The old resource assertion is migrated to tighter draw-call/vertex bounds in `docs/landmark-art.md`. Physical/input/game-camera/route/score source bytes and the golden physical fixture remain unchanged. CPU contact sheets cover47 actual source landmark scenes; four separately labelled frames use actual input states and the actual gameplay camera. They are not live WebGL screenshots. Exact final checks and deployment/asset receipts are under `evidence/scenery-v10/`.
