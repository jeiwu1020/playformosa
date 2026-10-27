# Landmark polish — approved visual-only revision

Owner approved the proposed one-main-landmark-per-stop plus local streets/terrain direction and direct production publication on 2026-10-27. They explicitly delegated implementation choices. Continue the existing isolated game workspace; native execution, no Codex invocation.

## Intent
Keep the funny athlete and current game feel, but make places worth discovering. Replace repeated generic landmark stamps with one recognisable, thoughtfully composed landmark per itinerary stop and varied ordinary surrounding buildings, vegetation and terrain.

## Decisions
- Preserve v9 controls, physics, camera, route coordinates/progression, mileage, scores and all food comments byte-for-byte.
- Retain lightweight stylised Three.js geometry. Photoreal imported models would add download/runtime cost and conflict with the character. Painted-only backdrops would flatten the existing 3D scene. Prefer a detailed miniature/diorama aesthetic using shared geometry and vertex-colour batches.
- Landmark identity uses the route stop ID, not the old shared silhouette category. Each has one deterministic world anchor and one owning chunk. Taipei's single 101 is placed in the opening run-up, with eight flared bamboo sections, base, crown and spire.
- No camera zoom to accommodate buildings. Landmark models are deliberately scaled to show their silhouette behind the athlete within the existing orthographic view. Depth alone does not shrink orthographic objects.
- Layer ground-side props, local middle-distance buildings, and low-contrast far terrain. Repeat ordinary props with deterministic variation, never the unique main landmark. Rebase and cull groups exactly with the bounded seven-chunk world.
- No downloaded photos or raster art are runtime assets. Official references inform silhouettes, not claims of geographic reconstruction.

## Acceptance
One landmark per stop across chunk creation/recycling/rebase, no duplicate 101 on the run-up, all route identities covered with distinct important silhouettes, meaningful local supporting scenery, no clipping of the opening 101 in representative landscape views, bounded resources and finite coordinates far into deep space. Actual-source CPU contact sheet is evidence of mesh design only, not live WebGL/device gameplay QA.
