# High-jump coordination verification

## Scope

This revision changes only high-jump flight articulation, its fixed takeoff clearance reference, collision-envelope coverage, and local help text, plus focused tests and a reversible audit overlay. It targets `preview/hurdles` only. The source baseline is commit `6c7cb39d7bf7beadf41818efa155627b7c777df7`. Other games, scores, input bindings and the ballistic center-of-mass equations are unchanged.

## Behavior

- Raising both hands earns head/shoulder/back rotation. Lowering them does not rewind rotation already earned. Passive rotation remains possible; no hand-button requirement is added.
- The reference clearance uses hands first, then legs after the hips cross. It is planned once at takeoff, not adjusted to a player's later mistakes.
- The planner and live contact share the same torso, hip, head, limb and foot envelopes. The torso includes the singlet, the hip includes the shorts, and the bar radius covers the visible square bar and painted stripe corners.
- Shorter beginner jumps retain extra room. An easy no-hand clearance and a lower fixed-height no-hand clearance are regression-tested.
- All airborne comparison traces retain exactly identical center-of-mass coordinates and target heights. There is no added lift, hidden timing score or mandatory hand gate.

## Controlled evidence

A 63-launch deterministic grid uses charges `[.4,.5,.6,.65,.7,.8,.9]`, gait cadences `[.16,.18,.2]` and aim positions `[-2.3,-1.8,-1.3]`. Each launch snapshot is replayed with identical takeoff and only airborne inputs changed. Hands begin at 0.12 seconds; correctly sequenced legs begin after the hip crosses the bar. Early legs begin at 0.12 seconds; late hands begin at 1.15 times the apex time.

- Coordinated: 63/63 clears.
- Early all-held tuck: 37/63 clears.
- No hands: 26/63 clears.
- No legs: 24/63 clears.
- Late hands: 26/63 clears.

These are designed simulation cases, not estimates of player success rates. The committed regression matrix covers 27 of these launches and compares trajectories exactly. A marginal `.7/.18/-1.8` launch rewards coordination; a stronger `.8/.18/-1.8` launch can still clear without hands at its fixed 10.4 m target. This is intentional tolerance, not a hand gate. Taking off beyond the green zone remains capable of failing.

## Regressions and visual evidence

- The original release-of-hands rewind and marginal coordination tests were observed failing before implementation.
- Review found actual shorts and singlet triangles overlapping the bar during scored clears. Dedicated regressions were observed failing before fixing the shared envelopes; they use the real transformed Three.js meshes, not just their joint centers.
- An independent sweep after the correction checked 68 successful flights and 23,027 near-bar frames with zero mesh intersections. This finite sweep is not a proof for every possible input sequence.
- Mesh tests check successful coordinated, early-tuck, no-hand and no-leg flights frame by frame against the visible bar volume, including clothing and cosmetic meshes. Fixed original-height cases prove that visible shorts/singlet overlap generates contact.
- Input tests exercise the actual action-input and control-binding modules: four simultaneous pointer owners, mixed keyboard/pointer release orders, cancellation, lost capture, pause/resume, stale restart events, replay/input gating, repeats and editable fields. A deliberately broken owner-release mutation made two ownership tests fail.
- Actual character endpoint/axis tests and software-rendered contact sheets were inspected. This is not hardware WebGL certification.
- Cloud browser checks at 320×568 confirmed all four controls fit with no document overflow, a held leg button launches, pause/resume works, a failed result is shown, and replay is marked non-scoring with disabled controls. The updated instructions were also visible at 390×844. A full browser keyboard-script jump was interrupted by focus-triggered auto-pause, so it is not counted as a verified browser clear. Real phone multitouch and a full hardware keyboard run remain device checks.

## Verification status and limits

All 56 high-jump tests passed after the mesh fix. Build and preview-channel release preflight passed. The local asset verifier stops at a baseline missing Fast Hands atlas. Whole-project test results and exact-commit deployment are checked and reported with the release; this source report does not claim a deployed URL is live.

The frozen local baseline is incomplete: 19 existing remote binary assets are unavailable locally. Its full test run had 58 failures: 57 attributable to those missing assets and one undiagnosed process failure. The latter file passed all 29 tests when rerun alone. The publication process must overlay only the reviewed files on the existing remote tree, preserving every unavailable asset. No missing-file exception is broadened and no unrelated historical manifest is repinned.

`COORDINATION-BASELINE.json` pins the original remote tree; `COORDINATION-MANIFEST.json` records exact new hashes and reversible preimages of changed files. Three older temporary-fixture tests now copy the new audit helper and its two pinned data files; their assertions and historical manifests are unchanged. These fixture-list edits also have exact reversible preimages. Negative tests verify that forged, extra, missing or modified paths fail validation. Historical audits reconstruct the original view through this exact overlay instead of weakening their checks.
