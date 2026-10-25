# 四肢各有想法｜跳遠試作 v0.3

PlayFormosa Studio exploratory prototype. `dist/` is both source and deployable static output. No build/install/backend/accounts/external assets. The parent conversation alone handles source synchronization and publication.

## Controls and readable anatomy

**A left leg, S right leg; J left arm, K right arm.** Left-hand touch cluster = legs; right-hand cluster = arms. Hold flexes, release extends. **Hold A+S then release both to jump.** No extra stunt/jump key.

The four limbs are now fixed-length two-link chains: upper arm .34, forearm .32, thigh .55, shin .55 world units. Shoulder/hip swing and elbow/knee hinges have bounded ranges. Elbows bend forward and knees fold backward; neither hinge inverts. Rendered capsule rest lengths match the simulation. Joint markers, rotating face and feet stay attached to the pose. Ground support follows the lowest foot instead of stretching bones. This is simplified 2.5D articulated kinematics, not a medical anatomy model or full rigid-body ragdoll.

## Run and distance challenge

Start x=-9, board x=10 = **19 m run-up**. Follow-camera world scale is unchanged; camera bounds, track and progress now cover the start. Attempt timeout is 30 s. Current and captured takeoff speed are **km/h** (simulation remains m/s). Track speed cap is 8.5 m/s = 30.6 km/h; compression and launch reduce speed.

Practical technique: **A+K ↔ S+J**, around .30–.33 s per pair. Begin A+S compression around 4 m before the board, hold roughly .4 s, release. In air, continue opposite pairs around .2 s per pair; then hold A+S to bring feet forward and release arms for landing.

An earned air cycle requires one opposite arm/leg pair above .72 flexion and the other below .28 for at least .05 s, followed by the opposite full pose. At most two cycles, +.65 m/s horizontal each. Holding, subthreshold mashing, legs-only or ground imitation cannot earn cycles. No vertical thrust or gravity change. Actual shoe-position trails only appear after earned events.

## Optional risky flips

Same-side **A+J / S+K** drive opposite rotations; opposite pairs remain balanced. Leg tuck lowers effective inertia; extending legs slows rotation. Arm and leg asymmetry both apply bounded angular torque. Angular momentum is damped slightly, capped at ±8; spin capped at ±10 rad/s. There is no automatic upright recovery. Counter-steer with the opposite same-side pair to stop rotation.

Count only net complete signed 2π turns from the previous turn checkpoint, and only on steps confirmed free of contact. Partial reversals, ground motion and post-contact motion cannot manufacture turns. Stunt badges never add metres. All airborne forces/turns are deliberately exaggerated game physics, not a real-world training model.

## Scoring and persistence

Grounded rendered shoe toes beyond the board foul. All body/joint sample contacts can end flight; nearest simultaneous sand point wins, then later nearer contact updates both mark and part. Purple line = nearest scored mark, pale line = initial contact if different. Landing loss equals initial minus final mark. Head/hand/butt landings are not automatically rewarded as successful form.

Collision remains a joint-center approximation, not full mesh hull collision: the large head can partly penetrate the sand before detection. This is a known prototype limitation, not claimed visual acceptance.

Best record key is now `pf-longjump-best-v3`; v1 and v2 remain untouched. Invalid/unavailable storage is tolerated. Physical key codes, independent multi-pointer holds, release/cancel/lost-capture, blur/visibility/orientation pause and restart remain supported. Pause cancels incomplete compression/cycle but does not renew used boosts or erase angular momentum.

## Verification and reproducible witnesses

```sh
node --test tests/*.test.mjs
node --check dist/game.mjs
node --check dist/physics.mjs
node --check dist/controls.mjs
node --check dist/share.mjs
node --check dist/capture.mjs
node --check dist/layout.mjs
```

56 tests: fixed lengths and hinge signs, tuck inertia/no auto-right/no vertical thrust, genuine full turn and no phantom turn at/after contact, long run-up foot-landing flip, original no-input/held/mash versus rhythm, takeoff/foul/nearest contact, actual controls and persistence, two-boost cap, fixed-step equivalence at 30/60/144 render drivers, and CPU camera projection for balanced/boosted/rotating trajectories on portrait/landscape/short desktop viewports. Static source/assets and module syntax checked separately. The additional sharing tests cover synchronous native invocation, capability fallback, cancellation without download, errors, PNG capture ordering, null/tainted capture failures, and stale-result invalidation.

Matched takeoff policy in `air-stride.test.mjs`: .30 s ground cadence; begin .425 s compression at x=5.75; air pairs .22 s until .90 s then both legs held. Results: **10.055 m coordinated**, **9.102 m no cycle**, **9.144 m legs-only**, **9.102 m mash**. These are deterministic samples, not a global maximum or human playtest.

Optional controlled-flip policy in `anatomy-flips.test.mjs`: .33 s ground cadence; start .425 s compression at x=5.25; after launch hold A+J, switch to S+K around 250° rotation (~.775 s airborne), then A+S when spin falls below .5 rad/s (~1.25 s airborne). Result: **one genuine turn, left-foot nearest mark, 7.179 m**, takeoff **25.28 km/h**. It intentionally trades distance and ease for a stunt. Human players should watch body orientation rather than chase exact millisecond timings.

Independent read-only source review found no blocking geometry/physics/input issue and confirmed renderer rest lengths; it noted the joint-center collision approximation above. **No browser, screenshot or real-device visual/touch acceptance was performed. Previously denied browser/socket access was not retried or bypassed.**

## Large short rules and result sharing

The entry rules are three short large-type steps (17–18 px) with optional advanced tips in a closed details panel. Live prompts are shortened, secondary hints enlarged, and the mobile prompt is moved to the right to avoid the central athlete. The bounded card scrolls internally on short screens; result details are optional.

After a completed attempt, the game renders the actual final landing scene and immediately copies the WebGL canvas into an original 1080×1180 PNG score card. The card contains the real landing screenshot crop, actual distance or invalid-attempt status, stunt badge, takeoff km/h, nearest-mark body part and studio branding. It contains **no private playable URL**.

PNG/File preparation completes before share is enabled, so the player's click can invoke native `navigator.share` synchronously while user activation is live. Unsupported file sharing falls back to PNG download; there is also a separate always-visible save button once the image is ready. Native cancellation stays cancellation, and other native errors offer explicit saving instead of silently downloading. Nothing auto-posts to a social account. On a browser without File construction, the prepared Blob still supports saving.

Capture tokens prevent delayed encoding callbacks from replacing the image after a reset/replay. Null PNG encoding, taint/context/encoder errors and unsupported capture produce a retry action, not a false success. Render-before-copy avoids a blank default WebGL buffer without enabling persistent drawing buffers.

Official references reviewed by the parent: [MDN Navigator.share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share), [WebKit user activation](https://webkit.org/blog/13862/the-user-activation-api/), [Three.js screenshot guidance](https://threejs.org/manual/pages/tips.html). Tests use adapters/source checks; actual native share sheets, download dialogs and PNG visual appearance have **not** been browser/device-tested here.

## v0.3.1 touch-landscape layout only

Touch/coarse-pointer landscape uses a measured visible-viewport frame: compact title, central arena, **two large leg buttons on the left and two arm buttons on the right**. `visualViewport` resizing follows browser URL-bar changes; CSS environment insets protect notches/home indicators. Portrait and fine-pointer/hover desktop keep the previous layout. Pinch zoom does not rescale the game to the smaller zoom viewport. Cards may scroll internally; the landscape page itself is fixed to the available viewport.

The seven additional layout tests cover 667×320, 844×390, 932×430 and 1024×768, including conservative 44 px left/right and 21 px bottom safe areas, URL-bar height changes, portrait exit, desktop opt-out, adapter cleanup and DOM/share-control preservation. With those insets the smallest case budgets a 387×257 arena and 88×110 touch buttons. Touch targets stay at least 56 px tall. These are layout-budget, DOM and source checks—not browser-rendered proof of no scrolling.

Physics, keyboard/touch input handling, scores, best-record key and screenshot sharing are byte-for-byte unchanged from the published v0.3 baseline. All assets/imports are relative, so the complete `dist/` directory can be mounted at `/games/long-jump/` without changing source. No Site, repository or Cloudflare publication was performed by this layout task. No browser/socket path was retried.

## Assets

Original geometry-defined athlete/stadium/UI. Local Three.js 0.180.0, unmodified MIT license in `dist/vendor/THREE-LICENSE.txt`. No official sporting-event branding, borrowed athlete likenesses, autoplay or audio.
