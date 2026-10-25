# 四肢物理實驗 v2：獨立試玩原型

Route: `/experiments/long-jump-physics/`. This is an unlisted **public test route**, not a private page or a replacement for `/games/long-jump/`. The original game, homepage, catalog and their tests remain unchanged. The existing local Three.js vendor is imported read-only; no new dependency or duplicated vendor bundle.

## Scope
Desktop-first experimental feel: A/S independently control legs, J/K independently control arms; hold a limb to flex it, release to extend. Space holds jump compression and releases takeoff. Five pointer buttons permit basic phone previews, but five-action mobile ergonomics are not considered resolved. A backlink returns to the stable game. The experiment uses only `pf-longjump-physics-experiment-v2` (v1 remains stored) for local bests.

This is **deliberately exaggerated arcade physics**, not a claim that a real athlete can create forward energy or flight by moving limbs in midair.

## Continuous causes, not combos
- Fixed-length articulated bones follow independent spring-like target poses.
- Ground extension does work according to foot proximity/support and available energy. Support/center-of-mass offsets and asymmetric limb poses affect angular balance. Small-angle stabilization keeps the longer run usable, but fades quadratically toward loss of balance; extreme holds still fall.
- Loss of balance leads into a falling phase; gravity and body contact complete the fall. Corrective limb motion can recover before that loss of support. There is no random failure animation.
- Air joint velocities, pose area, energy, orientation and drag continuously influence lift, horizontal force and rotation. No named combinations, pose-threshold sequence or fixed two-reward counter.
- Differential movement creates arcade airflow; symmetric all-button mashing largely cancels it. Expenditure/recovery, drag and force bounds limit the motion. Maximum lift14 can briefly exceed gravity9.8. Flight energy never replenishes: integrated active work is bounded by starting energy/.42, so total active lift impulse is at most5.4×starting energy/.42. Passive lift is at most.009×16²=2.304, below gravity. Thus indefinite hovering is impossible even before the terminal safety bounds.
- Space has no hidden airborne function. There is no instant upright recovery. First landing contact and closest subsequent sand mark determine the outcome; fouls and pre-jump falls cannot set a valid best.

## v2 changes and CPU evidence
The runway is now **33m** (start−23, board10). Ground propulsion still requires real leg extension; combined traction is limited to4.5m/s² before drag, with less energy cost for the longer run. Resting controls do not accelerate. Track/sand/base-ground bounds follow the new constants; the sand ends at65. Air response has stronger movement-dependent lift/drive, increased angular response and less angular damping, but no automatic balance recovery.

Measured balanced-run speed after1/2/3/4seconds: **2.51 /5.89 /8.63 /10.65m/s**. v1 reached8.71m/s after1second and the12m/s limit after2seconds. These are actual integrated speeds, not an animation ramp.

The following comparison clones **the same takeoff state** into v1/v2 air physics (about10.17m/s forward,6.56m/s upward):

| Air policy | v1 distance / peak pelvis height | v2 distance / peak pelvis height |
|---|---|---|
| Balanced continuous motion |19.30m /4.38m|31.85m /7.05m|
| No further actions |11.16m /3.46m|10.83m /3.40m|
| Same-side alternating motion |16.86m /3.92m|20.00m /4.81m|
| One arm + same-side leg held |12.90m /3.72m|14.09m /4.25m; one rotation, hand contact|
| All limbs held |12.36m /3.32m|12.22m /3.30m|

This is not a universal speed/force buff: useful work and orientation determine the benefit; passive/held policies are not automatically stronger. The controlled v2 witness stays airborne about2.97seconds, consumes2.03 units of bounded work and genuinely experiences brief net-upward acceleration.

Six combinations of .28/.36/.44s between opposite-pose changes and .30/.38s Space compression beginning near x4 all produced valid **22.29–35.08m** jumps. This is regression evidence for a forgiving band, not a global optimum or on-screen technique guide.

The v1 fall/recovery tests remain: unilateral ground input can fall before takeoff; timely corrective arm input recovers over4seconds. Fixed bones, closest marks, settled-body clearance, cancellation and symmetric hold/spam comparisons remain tested.

## Verification and limits
`npm run check` passes119 tests, retaining all96 stable-game/platform tests and adding experiment input, interruption, physics, storage, finite-energy and camera checks. Static build automatically copies the new route; no build, catalog or routing changes are required. Existing game/homepage/catalog hashes are checked byte-for-byte.

No browser screenshots or real-device touch acceptance were performed. CPU projection/source checks are not visual playtesting. This remains a simplified2.5D support/joint-center collision model with spring target poses, not a general rigid-body ragdoll. Balance tuning, five-button mobile use and the actual fun/learnability must be judged by trying the prototype before any replacement is considered.
