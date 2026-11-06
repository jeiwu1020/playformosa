# Pole-vault paced ascent

Keep the real landmark heights, the 22 sky-stage thresholds, their order, and the existing four-limb controls. The user asked for buildings to remain readable and for space to stop having long empty stretches. The latest instruction prioritizes changing ascent speed over moving scenery into 4,000 km.

## Approach

Use a smooth, height-dependent travel pace that gives a stable successful flight about 6–9 seconds per city group and 8–12 seconds per sky subject. Lift must still be earned by the unchanged controls, energy and balance system. Zero or negative earned lift never creates upward movement. There is no time-triggered scenery or automatic flight. Close real-height pairs stay together in the existing scene.

Moving every stage below 4,000 km would discard the requested height order/meaning. A single global multiplier would make the early skyline even faster. Neither is used. A monotone time-versus-log-height curve retains the existing compressed visual travel and makes the travel speed continuous at every pacing knot.

## Fairness and scope

Changing earned metres is a new ruleset: real-altitude-v3. Local best uses a new key without migrating or deleting v1/v2. QA online ranking selects v3 only for pole-vault; production rules, other games, database schema and stored rows remain unchanged. The result carries its ruleset, and old or mismatched runs cannot submit as v3.

## Acceptance

Measure both ideal deterministic control and seeded finite-reaction, jittered/missed inputs; report them as simulations, never human typical times. Confirm bad input and stopping still end the attempt. Keep every real landmark/sky threshold unchanged. Test finite extreme heights, large frame deltas, finish locks, score snapshots, replay/capture and viewport composition. Inspect actual browser entry and explicit test-only renderer samples. Publish only preview/hurdles after verification and a fresh remote-head check; do not touch main or run remote database operations.

Source baseline is 9914e5f1f03235fd3decf9675e1e1a0767440418. The isolated materialization preserves verified remote hashes; unavailable large assets are not replaced and remain untouched in any remote overlay.

## Numeric upper-bound safeguard
The original numerical height cap remains 1e150. Because paced travel makes that limit practically reachable during an unusually long successful run, reaching it locks the score once and uses the normal finish and landing. Existing energy, balance and lift-failure checks retain their precedence.
