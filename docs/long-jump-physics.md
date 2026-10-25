# 四肢物理實驗：獨立試玩原型

Route: `/experiments/long-jump-physics/`. This is an unlisted **public test route**, not a private page or a replacement for `/games/long-jump/`. The original game, homepage, catalog and their tests remain unchanged. The existing local Three.js vendor is imported read-only; no new dependency or duplicated vendor bundle.

## Scope
Desktop-first experimental feel: A/S independently control legs, J/K independently control arms; hold a limb to flex it, release to extend. Space holds jump compression and releases takeoff. Five pointer buttons permit basic phone previews, but five-action mobile ergonomics are not considered resolved. A backlink returns to the stable game. The experiment uses only `pf-longjump-physics-experiment-v1` for local bests.

This is **deliberately exaggerated arcade physics**, not a claim that a real athlete can create forward energy or flight by moving limbs in midair.

## Continuous causes, not combos
- Fixed-length articulated bones follow independent spring-like target poses.
- Ground extension does work according to foot proximity/support and available energy. Support/center-of-mass offsets and asymmetric limb poses affect angular balance. Mild stabilization fades with large lean.
- Loss of balance leads into a falling phase; gravity and body contact complete the fall. Corrective limb motion can recover before that loss of support. There is no random failure animation.
- Air joint velocities, pose area, energy, orientation and drag continuously influence lift, horizontal force and rotation. No named combinations, pose-threshold sequence or fixed two-reward counter.
- Differential movement creates arcade airflow; symmetric all-button mashing largely cancels it. Expenditure/recovery, drag and force bounds limit the motion. Maximum lift6.5 is below gravity9.8, so controls cannot maintain indefinite upward acceleration. Integration and terminal safety bounds also prevent runaway states.
- Space has no hidden airborne function. There is no instant upright recovery. First landing contact and closest subsequent sand mark determine the outcome; fouls and pre-jump falls cannot set a valid best.

## CPU witnesses
These are reproducible simulations, not a global optimum or a human playtest:
- Alternating opposite arm/leg holds about .32s each; begin .35s Space compression near x4 (6m before the board), releasing limbs during compression: valid takeoff.
- Same takeoff, continuous balanced air movement: **19.40m**; idle air: **12.64m**; holding one arm and same-side leg in air: **one genuine rotation,13.50m**. Other combinations visibly change rotation and landing.
- A unilateral ground pose can cause a fall before jumping. After a shorter .30s disturbance, corrective arm control evaluated at .12s intervals recovers and remains running for4s; ignoring the disturbance falls. This is a recovery-existence witness, not proof that a novice will discover it immediately.
- Symmetric hold/spam air policies do not beat the balanced witness. Random-control property trials remain finite and end; anatomical segment lengths stay fixed.

## Verification and limits
`npm run check` retains all96 stable-game/platform tests and adds experiment input, interruption, physics, storage and camera checks. Static build automatically copies the new route; no build, catalog or routing changes are required. Existing game/homepage/catalog hashes are checked byte-for-byte.

No browser screenshots or real-device touch acceptance were performed. CPU projection/source checks are not visual playtesting. This remains a simplified2.5D support/joint-center collision model with spring target poses, not a general rigid-body ragdoll. Balance tuning, five-button mobile use and the actual fun/learnability must be judged by trying the prototype before any replacement is considered.
