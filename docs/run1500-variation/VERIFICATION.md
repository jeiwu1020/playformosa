# 1500m bounded AI plans (preview only)

Base: `f5c0d1a52b4ff393b0775d365820e288a0805822` on `preview/hurdles`.

The former dot candidate directory was not accessible through the available managed environment tools. The exact candidate name was absent from the accessible workspace, GitHub branch names and the current Library title search. This is a reconstruction; those observations do not establish that the original candidate was deleted.

Four fixed schedules shift rival attack distances by at most 18m and passing commitment by at most 0.2s, keeping all existing cadence values, recovery policy, lane-clearance constraints and player physics. The red rival uses offsets 0/+18 (ending its opening attack at 220m/202m). Preliminary coverage excluded offset -18, which prolonged that attack to 238m and could create a multi-second supply-route disadvantage. Each browser restart samples one complete schedule. The engine accepts an explicit plan index for exact reproduction. Plans do not depend on player performance. Supplies stay at 340/740/1140m in their existing lanes.

Rules `1500m-bounded-plans-v4` are shared by the engine, frozen results, client submission contract and QA backend. Local records use a new versioned key; the previous key is untouched. Database schema and existing rows are unchanged; rankings remain partitioned by scope/game/rules. Old uploads are rejected rather than relabelled. The seed and plan index survive the frozen result and local record path. The new board starts separately from v3; previous bests are retained in storage.

The original imported source and historical manifests remain byte-identical. A new complete parent-tree baseline and reversible manifest validate this change before older provenance layers run. No historical hash is rewritten. Tests compare isolated player trajectories against the exact parent engine, exercise the live SQLite API contract, and check all plans on matched inputs including inner/outer lanes, supply seeking and delayed starts.

Reproduce the extended fixed-step experiment with `node scripts/check-run1500-variation.mjs /tmp/run1500-report.json`. These are scripted simulations, not a universal bound for every possible input and not iPhone validation. No physical-device validation is claimed.


## Completed verification

- Extended simulation: 1,200 races across four pacing scripts, five lane/supply routes and fifteen start delays. Matched-input maximum spreads: cruise 0.750820s, attack 0.449585s, recovery 0.781442s, late attack 0.205902s. Full results are in `SIMULATION.json`.
- Focused engine, local records, QA API and provenance tests: 67/67 passed.
- Full `npm run check` passed (tests, build, local-reference verification).
- Independent Astra high read-only review: 10/10 selected tests passed; all 1,200 races reproduced byte-for-byte as JSON; parent tree and all nine beforeText records matched Git. No blocking findings. Its documentation correction is incorporated above.
- Real headless Chromium with SwiftShader: 3D startup ready; all four plan selections through actual app restart; pause stable; finished result dialog open; v4 local record held plan 3 / seed 150520; no runtime exceptions. This was a scripted desktop-browser check, not an iPhone or touch-device test.

Only `preview/hurdles` is authorised for publication. Recheck its HEAD immediately before a normal fast-forward push; never force push or update main.
