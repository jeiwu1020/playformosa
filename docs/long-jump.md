# 四肢各有想法－跳遠 — main v7

Main route: `/games/long-jump/`. This version promotes the33m-runup continuous-limb experiment into the existing main game interface. `/experiments/long-jump-physics/` remains the older v2 comparison. Homepage/catalog and social URLs are unchanged.

## Controls and landing preparation
- A / S independently flex left / right leg; release to extend.
- J / K independently flex left / right arm; release to extend.
- Space: hold/release for ground takeoff; **release and freshly press in air** to hold a gradual landing preparation pose.

The airborne pose is a55% bias toward legs forward and arms prepared, leaving45% of each independent limb's influence. Releasing Space removes the bias gradually. It never resets body angle, angular momentum or altitude. Ground-held Space, edge-fall inheritance and interrupted input cannot activate it without a fresh airborne press.

Only player-driven, visible joint travel earns active aerodynamic work. The assist's own motion is excluded from force/work calculations. Space-only cycling produces exactly zero active work; cycling during an existing limb relaxation cannot add work. Posture can still alter passive drag/area and inertia: preparing to land is not a guarantee of upright or feet-first contact.

## Continuous arcade motion
The33m runway starts at−23 with the board at10. Actual foot extension supplies ground propulsion, bounded by traction/inertia; no-input rest cannot accelerate. Small-angle ground assistance fades at larger lean. Bad control can lose balance and hit the track; timely correction can recover.

In flight, limb positions/velocities, energy, orientation and drag continuously affect motion. No named combos or two-reward counter. Strong useful motion may briefly create14m/s² of arcade lift; flight energy cannot replenish. Integrated active work is bounded by starting energy/.42, while passive lift remains at most2.304m/s² below gravity9.8. Thus the higher ceiling does not allow indefinite hovering. These are deliberately exaggerated game forces, not a claim about real athletes creating flight by moving their limbs.

Fixed bone lengths, genuine airborne turns, fouls, actual first contact and nearest subsequent sand marks remain. Render-aligned shoe orientation and head/hand skin envelopes are used for support/contact/settled clearance rather than hiding penetration by rotating upright. Existing distance/body-part verdicts remain. `pf-longjump-best-v7` keeps this main version's best separate from v6 and experimental records, without deleting them.

## Character
The procedural model follows the homepage character's identity: brown tufted hair, worried eyebrows, white eyes/pupils, ears/nose and toothy expression; orange singlet with white bib, navy short shorts, exposed thighs, white/orange socks, navy/orange shoes with pale soles, and simplified hands/fingers. Anatomical anchor lengths stay unchanged.

The helper uses92 meshes,14,199 vertex instances,13 shared geometries and11 materials. It is a simplified procedural interpretation, not a pixel-identical recreation of the detailed hero illustration. Actual exported meshes were viewed in labelled offline Blender CPU renders; lighting/camera differ from the live browser game.

## Interface and sharing preserved
The measured one-page layout, root dialog and large basic rules remain. There are five action buttons: AS/JK plus a separate Space slot. Short-landscape Space sits below the central arena; portrait uses five bottom controls. This is viewport-budget/source verification, not proof of five-button mobile ergonomics.

Results retain score/status, a short verdict, replay and sharing. PNG includes the exact game title, actual final canvas view, result and studio identity. Native mobile sharing offers PNG+text+public URL; receiving apps may omit fields, so copy-text/URL remains available. Desktop keeps PNG download. Threads is explicitly text+URL compose, not an automatic image post. Cancellation never silently downloads. Stale asynchronous captures after replay are rejected, and UI does not claim a completed social post or photo-library save.

References: [MDN Web Share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share), [WebKit activation](https://webkit.org/blog/13862/the-user-activation-api/), [Three.js screenshots](https://threejs.org/manual/pages/tips.html).

## Verification
`npm run check`: **124 tests pass**, build passes,33 local references across23 output files verified. The unchanged sharing/capture/dialog/platform tests are retained; obsolete v6 event-step/two-glide contracts were migrated to continuous motion, finite work, fall/recovery, collision, FPS consistency and five-key control coverage.

Actual mesh vertices are tested through normal, high and rotating trajectories, and against the ground after normal, flipped and track-fall landings. Fresh stance also clears the floor before the first tick. CPU camera checks include athlete, ground and nearest mark; root layout budgets cover1280×600CSS,1920×1080,667×320 safe-area landscape,390×844 portrait and1024×768 tablet.

Current same-takeoff CPU witnesses: coordinated motion **31.92m**, no further limb action **10.97m**, single-sided motion **13.37m with one turn and head-first contact**. These are reproducible examples, not global maxima or human playtest acceptance. Separate tests retain a genuine one-turn, feet-first landing using timely Space preparation.

No live browser screenshot or real-device touch/native-share acceptance was performed. Contact remains an approximate articulated skin-envelope model rather than a full mesh/rigid-body solver. Offline model previews and CPU/source checks do not establish live-game visual acceptance.
