# 100m and javelin preview integration

Baseline: preview/hurdles 772d85e2cb063c4dbab38b7adf26956e13c22d57.
Frozen sources: sprint V6 88d1815488a251ca648b7e121664dee31b3a30c8; javelin V3 7c5e0d40d239bde46df5d75d2de40409fed44645.

Integrated platform entry, toolbar, controls framing, result capture/share and local best. Existing shared code, backend, physics and replay mechanisms are preserved. No new online leaderboard or play-count endpoint. Main is not a target.

Catalog now contains eight athletics prototypes; 400m and 1500m remain planned.

Verification: npm run check passed 1,288 tests, zero failures, 499 local references across 433 built files. Independent cross-review found no blocking defects. Desktop and 844x390, 390x844, 320x568 viewport layouts inspected in Chromium. Browser WebGL was unavailable, so visual validation used built-in 2D fallback; actual iOS devices, hardware 3D rendering, and native share dialogs were not verified.

New transparent card illustrations generated with OpenAI image generation, referencing the existing hurdles-card visual style: cute polished brown-haired athlete, orange shirt and navy shorts, sprinting / throwing javelin, no text. The generated PNG originals are copied unchanged to the catalog and entry icon paths; no external licensed art is introduced.

Baseline full source archive and final full source archive are retained separately. A normal revert of this isolated integration commit restores the preview baseline without removing its history.
