# Named sky journey verification

Base: `79b8c1cbe3377f387855199d3b178550b6448009`, tree `6928753315f32252665cd75d06ccda7fbec8ff5e`.

## Scope

- One height-selected record drives each of 22 named sky stages and its principal model, from airglow through the Kármán line, satellites and Moon to four planets and playful Taiwanese space scenes.
- Every card distinguishes scenery reference from fantasy travel. These authored stations do not redefine physical altitude or real astronomical distances.
- Current player pose, physics, input, score calculation, building heights/order, all other game runtime and the incoming Javelin humor restoration remain unchanged.
- The sky pool contains 204 meshes sharing six geometries. At most two principal subjects blend at a transition. Repeated fantasy cycles allocate no additional geometry.
- Card placement avoids conservative projected athlete bounds and measured HUD boxes. Full, compact and single-line modes retain the stage name and category. An impossible-space fallback places a separate row after the control frame. Reset hides the card; image capture leaves live DOM intact.
- Short landscape subjects sit below the top HUD instead of behind the card.

## Verification

- Exact materialized parent baseline: 2,818 tests, 2,798 passed, 20 failed.
- Candidate sequential full suite: 2,838 tests, 2,818 passed, the same 20 failures. Names, error codes and normalized complete error messages matched individually; no new failures.
- Those failures stem from the same 12 remote PNGs unavailable in the connector's local materialization. No failed test was skipped, repinned or relaxed. The remote tree retains all 12 original blob SHAs.
- Nineteen focused functional checks passed. Real-camera overlap regressions include 320×280, 320×440, 390×600, 600×170, 632×480 and 814×170 scenes, wrapped height HUD, leaning/finish poses, capture, cache and fallback restoration. Final short-landscape model tests and exact history checks were rerun after the visual adjustment.
- Build and `check-release --expect=preview` passed. Local reference verification remains blocked only by the absent `/assets/high-jump-card.png`; it is not reported as passing.
- Real Chromium visual QA used the actual renderer inside explicit test-only 320×568, 390×844, 844×390 and 1000×700 frames. Checked readable named stages, height/energy, athlete and operation buttons, including airglow, Moon, Saturn, cat, lunch and gateway. The test fixture directly selects rendering heights and is not evidence of manually earned gameplay scores.
- The unchanged actual game entry, keyboard input and a no-takeoff result/retry screen were also exercised. No score was uploaded or shared.
- One shared Chromium tab encountered error 9 / CDP timeout. After reload, the remaining visual checks completed. This does not establish long-duration stability or physical-phone frame rates; those were not measured.

## History protection

The exact reversible layer pins all 1,301 parent blobs. All modified preimages must equal those verified Git blobs; new files have explicit path and hash allowlists. Old manifests and preimage pins are unchanged. Runtime inventory validates the added HUD independently of missing binary reads, including a complete remote-inventory regression. Unknown runtime paths are never silently filtered.

Publication is limited to `preview/hurdles` using a fresh expected-head check and a base-tree overlay; `main` is not part of this revision. Deployment success must be checked separately for the resulting commit.
