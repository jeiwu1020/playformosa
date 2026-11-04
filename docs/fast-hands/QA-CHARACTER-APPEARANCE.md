# Character appearance revision

Parent: `c38057d8c187c70b51ef88295d88161eace42169`, preview/hurdles only.

## Requested scope

- The Fast Hands king wears fitted, slightly tapered grey-khaki trousers with a black belt. His face, shirt, hands, shoes and arm choreography remain unchanged.
- The duel athlete uses the reaction-rod body's proportions, inset hip connections, near-upright fixed-length legs and flat soles. The shared sports character and reaction-rod game are unchanged.
- Re-rendered 22 fallback keyframes from the actual source meshes, plus the original seven-second duck demo and its poster. No substitute character illustrations were introduced.
- Gameplay rules, speed, AI reaction selection, hand/item contact points, URL identifiers, rankings, play counts and database configuration remain unchanged.

## Verification

- Independent parent/current comparison: all 701 duck timeline samples and 468 level states preserve the protected upper body, hands, arm IK, motion and contacts.
- Independent focused review: 66 passing tests, with one strict historical-fixture check blocked by an unavailable old atlas in the minimal local reconstruction.
- Full local Fast Hands invocation: 780 tests, 765 passed, 15 blocked by missing unchanged historical assets or unrelated game/manifests. No check was disabled or loosened. The complete repository CI remains required before calling the release verified.
- Static build and preview release preflight pass.
- Browser inspection used isolated network responses, without posting scores or play counts. Verified 390x844 duel, 320x568 catch, 844x390 catch, and 1366x768 duel/duck. Document dimensions matched each iframe viewport; both practice retry buttons remained usable. The duck demo loaded at 720x560, 24 fps, 168 frames, exactly seven seconds.
- Reviewed actual front/side model renders and ready, grasp, return and final poses. The king's cloth covers the knees and shins; athlete legs connect within the shorts rather than being forced into the former crouch.

## Verification limits and rollback

The cloud browser reports GL_VENDOR and GL_RENDERER Disabled. Browser checks therefore exercised the same-model fallback, while 3D geometry and contacts were verified directly from source meshes. Native GPU lighting/performance and physical iOS touch behavior are not claimed as tested.

The appearance manifest strictly bounds 28 runtime changes. Thirty complete parent preimages cover those files and two historical test adapters. The adapters preserve every original assertion, comparing archived eye/model geometry and the archived cover to the exact prior bytes. Original cover artwork remains preserved. The parent commit is the rollback point; no main branch changes or database changes are part of this release.
