# 四肢各有想法－跳遠 — v9 adventure / v10 landmark art

Main game path stays `/games/long-jump/`. The released v8 base is GitHub commit `d674b77d9fcbe28798bbb70e88d69c60bfe5a8ff`; v9 expands its route and displayed mileage only. User authorized direct publication after checks. Prior versions and superseded route/test contracts are retained under `docs/history/`. The older comparison experiment and homepage hero are unchanged.

## Four movement keys, two thumbs

A/S remain left/right feet; J/K remain left/right hands. There is no Space movement action. Touch buttons pair left hand/foot on the left and right hand/foot on the right. Two thumbs can alternate opposite-side limbs or hold both feet; no four-finger chord is required.

A short foot hold/release flexes and extends that leg. Holding either foot for 0.34 s visibly arms takeoff; release attempts a jump, with stance, support, charge and speed affecting the outcome. Compression costs horizontal pace. Input cancellation, lost capture, pause, blur or hidden-page transitions cancel the intent instead of releasing a phantom jump. Browser key repeat cannot manufacture a new press.

In air, a new foot press held past the same threshold progressively braces that foot. A foot inherited from takeoff must be released before it can request landing. Both feet brace more strongly but do not reset the body angle or angular momentum. The actual joint motion still determines flight and contact. Pause/replay remain separate UI actions, not additional movement controls.

## Awkward running and renewable arcade flight

Actual leg extension against support supplies propulsion, bounded by traction; simultaneous leg extension is less efficient than alternating. Asymmetry, mass/support and momentum govern wobble. Bad sustained control can fall; an actual-input feedback witness recovers a wobble and resumes running. Idle input does not accelerate.

Flight is deliberately impossible arcade aerodynamics, not human biomechanics. Useful visible limb motion earns lift/propulsion; coordinated motion in a controlled posture replenishes usable energy. Static held inputs stop producing work and eventually land. Bracing's own interpolation is excluded from work. Instant forces, speed and step size are bounded, but there is no total-flight timer, total-distance cap, 65 m cut-off, or mandatory resource exhaustion. Thinner airflow at altitude and weaker lift during fast climbs keep the athlete and scenery readable; this does not end horizontal travel. Fixed input loops are not promised to be macro-proof.

Turns are credited per completed same-direction airborne revolution; a subsequent reverse revolution does not erase the first. Partial oscillations do not add phantom turns. First contact and nearest subsequent surface marks determine landing and distance; bracing is not a guaranteed upright landing.

## Taipei → Taiwan22 → world → space

Route data lives in `route-data.mjs`: all22 Taiwan counties/cities in the approved order, Okinawa/Seoul/Osaka/Tokyo, Southeast Asia/India/Dubai, Egypt/Europe, Americas/Hawaii/Australia/New Zealand, then an outward South-Pacific world-completion checkpoint. It does not return to Taipei, reset progress, or stop flight. Atmosphere, space, Moon, Mars, Saturn's rings and open-ended deep-space stages follow.

Raw physical metres remain private simulation coordinates. Displayed **冒險里程** is an approximate cumulative itinerary: Earth legs sum great-circle distances from rounded hand-selected landmark coordinates using radius6371km, with compressed visual segments interpolating between milestone totals. It is not straight-line distance from Taipei, driving distance, a continuous road, or Earth's circumference. The global itinerary is approximately61,920km; Taiwan22's final landmark is approximately1,591km along this chosen itinerary. Islands use direct connecting legs, not invented bridges. HUD/results/share say「航段」: destinations designate the most recently reached illustrated landmark chapter, not a live geolocation map. Moon-to-Mars progress therefore reads「月球航段」rather than claiming that every intervening kilometre is on the Moon.

Space legs are deliberately fictional connections:10km to the atmosphere stage,90km further to space,384,300km further to the Moon (384,400km reference from Earth's departure),78.3million km onward to Mars and1,205.6million km onward to Saturn, then onward star travel. The latter use differences in mean solar orbital radii only as scale references, NOT present-day planetary separation or actual orbital transfer distances. References: [NASA Moon comparison](https://science.nasa.gov/moon/by-the-numbers/), [NASA/JPL solar-system reference](https://www.jpl.nasa.gov/edu/pdfs/scaless_reference.pdf). The cumulative total also retains prior Earth travel.

The speed label is **助跑速度** on the ground and **起跳速度** after launch; it is not the derivative of the compressed adventure-mileage display. HUD, final legal score, exploration, and share output use the same route conversion. Legal score still uses the nearest contact mark; destination uses first contact, so backward settling can reduce score without pretending the body landed in a random country.

Seven48m raw-coordinate chunks are streamed. V10 visual refinement gives each of the47 stops exactly one fixed main landmark, with varied ordinary streets, vegetation and local terrain around it. Taipei101 has eight flared bamboo sections and appears once in the opening runway. Tokyo Tower, Liberty, Auckland Sky Tower and other distinct silhouettes replace generic shared placeholders. Shared construction shapes are batched into vertex-coloured meshes; discarded chunk geometry is disposed and the material remains shared. Sky transitions and the game camera remain unchanged. No input, balance, force, energy, gravity, wind, hold threshold, route mileage or record tuning is part of the visual refinement. See `docs/landmark-art.md` for references and test-contract migration.

## Results, jokes and records

Result: large legal score or explicit foul/invalid status, Taiwan → actual landing destination, one event-and-place joke, optional completed-turn badge. Foul does not enter the legal best but can retain exploration progress.

There are **108 unique legacy/event/place lines plus four neutral arrival templates**, combined only within matching event and place families. Event priority includes track fall, foul, loops, backwards landing loss, flip/feet, head, butt, hand, recovery and distance. The last 24 caption IDs are excluded while unused matching options remain. This is not a claim of thousands of individually authored jokes or infinite novelty.

`pf-longjump-best-v9`, `pf-longjump-journey-v9`, and `pf-longjump-verdicts-v9` are independent of v8/v7/v6/experiment records; old keys are not deleted. Disabled storage is tolerated. Native sharing/Threads/copy/download behavior is preserved; the PNG keeps the exact game title, actual final render, true score/status and journey. Sharing cancellation never silently downloads or claims a social post.

## Character and viewports

The original procedural character's orange singlet, navy shorts, brown hair, white eyes, worried brows, teeth, hands and shoes are preserved. Chest/head face partly toward travel; a bounded head glance toward the viewer occurs on wobble/landing. No 90-degree rotation of the movement plane is used.

The existing measured viewport shell remains, with four controls instead of five and no Space row. Source/layout budgets include 852×393 and 844×390 phone landscape, 390×844 portrait, tablet, 1280 CSS-pixel scaled-desktop and 1920×1080 desktop. Dialogs remain rooted outside the canvas and can scroll if needed. These are source/budget checks, not a browser or touch certification.

## Verification and known limits

`docs/verification.md` and `evidence/route-v9/` record exact tests, physics parity, review and publication receipts. A22409-step comparison against released v8 modules produced bit-identical physical state and joints while flying for181.65s, landing at the same raw5043.0221203m. This is a scripted input witness, not human playtesting.

Offline Blender images export real Three.js geometry and actual-input states; lighting differs and no browser HUD is shown. CloudCDP reports GL_VENDOR/GL_RENDERER Disabled and cannot execute WebGL, so live gameplay/layout/phone touch/native-share acceptance remains a user-device check. No flags, access-control or security bypass was used. The original hero remains Git blob `89d8dd2580a7b4c0842b6c7091bae7a8fa8fcc1f`.
