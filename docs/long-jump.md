# 四肢各有想法－跳遠 — v0.6

Static game: `public/games/long-jump/`, copied by the platform build to `dist/games/long-jump/`. No new backend, libraries, accounts or assets. Homepage and catalog unchanged.

## Four actions
- **A / S:** initiate a left / right footstep on press.
- **J:** initiate a reciprocal arm swing, linked to the actual step/support side.
- **Space:** hold to charge on the ground, release to jump; a **fresh press in air** holds a landing pose until released.

K is inactive. Touch has exactly the same four actions: left foot, right foot, arms and jump/landing. Two thumbs can operate these sequentially; charging does not require continued foot or arm actions. Rules show mappings/actions only, not optimal-score choreography. The two legs are independent; arms are a combined action, not four fully independent limbs.

## Motion model
Press-to-action intents replace holding a joint bent and releasing it for thrust. Each accepted foot press visibly initiates a .32 s articulated stroke; ground extension does work over the latter portion. Foot recovery and minimum action spacing bound repeated input. Holding a button or OS key-repeat does not autoplay. Alternating feet alone provide useful acceleration; correctly timed J adds at most one bonus per step within a forgiving ±.16 s window. One early arm action can wait for the next step; it cannot accumulate unlimited queued actions.

Space charging preserves forward momentum with small drag, without automatically accelerating. Releasing an insufficient charge does not jump. Ground-held Space cannot become a landing pose through an edge fall, pause or inherited key state. Air landing pose suppresses new step/swing actions and pending glide rewards, changes limb pose/inertia and does **not** rotate the body upright.

Air footsteps impart bounded angular momentum; matching arm motion counteracts it. Single-sided or mistimed repeated movements can rotate the body naturally. Two coordinated alternating air rewards maximum: each +.65 m/s horizontal and .22 s at35% gravity, total .44 s reduced-gravity budget. No upward velocity kick, infinite flight or automatic recovery. Reward eligibility waits for visible stroke travel and is checked only after contact checks. Pause cannot refresh used rewards.

Fixed-length anatomical chains, gravity, momentum, genuine full airborne rotation counts, first contact and the nearest scoring sand mark are retained. Head/butt/hand/foot verdicts are deterministic and distance-sensitive; fouls still receive a performance verdict but no valid score. Grounded toe crossing is checked even on the release-to-jump frame. New local key `pf-longjump-best-v6` preserves older records without comparing incompatible physics.

## Layout and sharing
The accepted measured one-page layout and root dialog remain. Camera follows a bounded .65 m upward offset near the higher apex, without zooming the athlete smaller; ground/landing marks remain in automated projection bounds.

Threads opens a text-plus-public-URL compose intent, not an attached PNG or automatic publication. Mobile image sharing offers the prepared PNG, result text and URL to the OS share sheet. Receiving apps may omit fields or offer different save targets; a separate copy-text-and-URL action is available. Desktop PNG download remains. Native cancellation never silently downloads. Messages report hand-off or requested download, never guaranteed publication/photo saving. Official Threads documentation could not be retrieved during verification; the actual app flow is not device-verified.

The image includes the exact event title, actual final game screenshot, score/status, verdict and studio name. Rendering and canvas copy are adjacent; stale asynchronous images after replay are discarded. No external image hosting or social-account token.

References: [MDN Web Share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share), [WebKit activation](https://webkit.org/blog/13862/the-user-activation-api/), [Three.js screenshots](https://threejs.org/manual/pages/tips.html).

## Verification
`npm run check`: **96 tests**, static build and25 local references across17 files. Coverage includes new action semantics, same-foot input comparisons for good/bad arm timing, repeat/hold limits, two-pointer operation, charge/release, fresh airborne input, edge fall, interruption, finite rewards, fixed bones, flips, actual landing/foul/verdicts, storage, render-frame independence, camera projection, root dialogs/layout and sharing/capture lifecycle. Obsolete paired-four-joint tests were replaced with motion-intent tests rather than retaining their old assumptions.

CPU examples, not a global maximum or human playtest:
- Feet-only running with Space takeoff/landing: valid **10.14 m**.
- Matched takeoff: coordinated air approximately **15.5 m**, no air actions approximately **10.0 m**.
-12 combinations of .28/.36/.44 s between step presses, .28/.36 s charge and0/.10 s arm delay: all valid, **13.78–16.22 m**, two glides.
- A pulse every .36 s, delayed J at .18 s, then landing pose after roughly4 radians of rotation: **one genuine flip, right-foot mark,9.816 m**. A stunt is not a distance multiplier.

Viewport checks include1280×600CSS scaled desktop,1920×1080,667×320 with safe areas, portrait390×844 and tablet1024×768. No new browser screenshot, real-device touch/native-share or OS-scaled visual acceptance was performed. CPU/source checks are not visual proof. Contact remains a simplified joint-center model rather than full mesh hull collision.
