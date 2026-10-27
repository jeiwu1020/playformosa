# 四肢各有想法－跳遠 — v8 candidate

Main game path stays `/games/long-jump/`. This candidate is implemented locally from GitHub base `68685a8282a2143ff72832de03e4f6d06cf1adc9`; it has not been pushed, merged or deployed by this task. Previous v7 documentation and superseded test contracts are retained under `docs/history/`. The older comparison experiment is unchanged.

## Four movement keys, two thumbs

A/S remain left/right feet; J/K remain left/right hands. There is no Space movement action. Touch buttons pair left hand/foot on the left and right hand/foot on the right. Two thumbs can alternate opposite-side limbs or hold both feet; no four-finger chord is required.

A short foot hold/release flexes and extends that leg. Holding either foot for 0.34 s visibly arms takeoff; release attempts a jump, with stance, support, charge and speed affecting the outcome. Compression costs horizontal pace. Input cancellation, lost capture, pause, blur or hidden-page transitions cancel the intent instead of releasing a phantom jump. Browser key repeat cannot manufacture a new press.

In air, a new foot press held past the same threshold progressively braces that foot. A foot inherited from takeoff must be released before it can request landing. Both feet brace more strongly but do not reset the body angle or angular momentum. The actual joint motion still determines flight and contact. Pause/replay remain separate UI actions, not additional movement controls.

## Awkward running and renewable arcade flight

Actual leg extension against support supplies propulsion, bounded by traction; simultaneous leg extension is less efficient than alternating. Asymmetry, mass/support and momentum govern wobble. Bad sustained control can fall; an actual-input feedback witness recovers a wobble and resumes running. Idle input does not accelerate.

Flight is deliberately impossible arcade aerodynamics, not human biomechanics. Useful visible limb motion earns lift/propulsion; coordinated motion in a controlled posture replenishes usable energy. Static held inputs stop producing work and eventually land. Bracing's own interpolation is excluded from work. Instant forces, speed and step size are bounded, but there is no total-flight timer, total-distance cap, 65 m cut-off, or mandatory resource exhaustion. Thinner airflow at altitude and weaker lift during fast climbs keep the athlete and scenery readable; this does not end horizontal travel. Fixed input loops are not promised to be macro-proof.

Turns are credited per completed same-direction airborne revolution; a subsequent reverse revolution does not erase the first. Partial oscillations do not add phantom turns. First contact and nearest subsequent surface marks determine landing and distance; bracing is not a guaranteed upright landing.

## Cartoon world

Taiwan → Pacific → Japan → Egypt → France → USA → Taiwan repeats on a **720 game-metre cartoon itinerary**, not a real geographic scale. A return to Taiwan credits a loop and does not finish play. First foreign scenery is visible during early successful flights; repeated loops require continued control.

Seven nearby 48 m chunks are streamed, removed groups are released, and shared geometries/materials are reused. World landmarks include lantern shops, sea islands/boats, torii/cherry trees, pyramids, a tower/café, and a city skyline. Sky color blends at region transitions; a readable place cue and optional synthesized chime mark arrivals. Wind is continuous and deterministic with a next-direction hint, not an unannounced random failure.

Rendering/physics use local coordinates that rebase at 512 m while total distance, first-contact location, marks and journey history remain world-relative. World ground extends beyond the old pit. Ocean contact is labeled Pacific, not a random country. The landing destination comes from the actual first-contact point; explored/flyover distance is stored separately.

## Results, jokes and records

Result: large legal score or explicit foul/invalid status, Taiwan → actual landing destination, one event-and-place joke, optional completed-turn badge. Foul does not enter the legal best but can retain exploration progress.

There are **102 unique authored event/place lines**, combined only within matching event and place families. Event priority includes track fall, foul, loops, backwards landing loss, flip/feet, head, butt, hand, recovery and distance. The last 24 caption IDs are excluded while unused matching options remain. This is not a claim of thousands of individually authored jokes or infinite novelty.

`pf-longjump-best-v8`, `pf-longjump-journey-v8`, and `pf-longjump-verdicts-v8` are independent of v7/v6/experiment records; old keys are not deleted. Disabled storage is tolerated. Native sharing/Threads/copy/download behavior is preserved; the PNG keeps the exact game title, actual final render, true score/status and journey. Sharing cancellation never silently downloads or claims a social post.

## Character and viewports

The original procedural character's orange singlet, navy shorts, brown hair, white eyes, worried brows, teeth, hands and shoes are preserved. Chest/head face partly toward travel; a bounded head glance toward the viewer occurs on wobble/landing. No 90-degree rotation of the movement plane is used.

The existing measured viewport shell remains, with four controls instead of five and no Space row. Source/layout budgets include 852×393 and 844×390 phone landscape, 390×844 portrait, tablet, 1280 CSS-pixel scaled-desktop and 1920×1080 desktop. Dialogs remain rooted outside the canvas and can scroll if needed. These are source/budget checks, not a browser or touch certification.

## Verification and known limits

See `evidence/engine-traces.json`, `evidence/review-manifest.json` and `docs/verification.md` for final counts and exact receipts. CPU gameplay witnesses use only input arrays after a fresh state; they are not human playtests. Offline Blender CPU images export the real Three.js scene meshes and camera, but their lighting differs from live WebGL and they contain no browser UI.

The unchanged homepage `public/assets/hero-long-jump.png` was ultimately recovered from the verified public deployment, after supported GitHub binary readers failed. Its 2,290,523 bytes exactly match remote Git blob `89d8dd2580a7b4c0842b6c7091bae7a8fa8fcc1f`; no replacement artwork was made. All 113 aggregate tests, static build and 41 local reference checks pass. The focused game suite contains 86 passing tests. No browser screenshot, native-share device test, or actual touch acceptance has been performed.
