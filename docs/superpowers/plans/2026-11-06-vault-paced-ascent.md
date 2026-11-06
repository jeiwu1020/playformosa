# Pole-vault paced ascent implementation plan

> For agentic workers: use superpowers:executing-plans for the pacing task, with an independent focused scoreboard task and a whole-change review.

**Goal:** Make scenery arrive at readable intervals while preserving all reference heights and skill-based flight.

**Architecture:** A monotone cubic curve maps log altitude to planned travel time. Its derivative controls travelled metres, scaled only by positive earned lift. QA-only score rules isolate the changed physical distance progression.

**Tech Stack:** Existing ES modules, Three.js, Node test runner and Cloudflare Worker/D1 adapter.

**Spec:** ../specs/2026-11-06-vault-paced-ascent-design.md

## Global constraints
- Preserve all reference heights, 22 sky-stage thresholds and scene order.
- Preserve ASJK inputs, energy, torque, failure conditions and finish geometry.
- No main publication, schema/migration/deletion or production ranking change.
- New runs use real-altitude-v3; old local/remote scores stay intact and separate.

## Review focus
- Low positive and exhausted lift must not acquire automatic flight.
- Near-equal real building heights must not cause an abrupt speed jump or skipped scene.
- Huge heights must stay finite and remain usable at supported frame deltas.
- Stale result/client rules must not enter the new board or display mixed rankings.
- Small/mobile/landscape frames must retain the stage, player and controls during real pacing.

## Task 1: Smooth pace and earned-run identity
Files: public/games/pole-vault/flight-profile.mjs, physics.mjs; tests/pole-vault/paced-ascent.test.mjs and simulation helper/report.
- [x] Write tests for all 22 stage crossings within a bounded successful flight, 8–12 second intervals, unchanged thresholds, smooth positive speed, no lift/no flight and v2 best nonmigration.
- [x] Run new tests on baseline and observe the missing paced progression failures.
- [x] Implement plannedAscentSeconds(height), continuous ascentVelocity(liftVelocity,height), v3 local keys and run/snapshot ruleset stamps.
- [x] Run finite-reaction and imperfect-input simulations, adjust only pacing knots, and record elapsed times/visible intervals.
- [x] Verify all relevant pole-vault functional tests and keep changed expectations specific to the intended slower city passage.

## Task 2: QA ranking isolation
Files: shared leaderboard metrics/controller, Worker board selection, targeted ranking tests.
- [x] Write failing tests for QA v3 selection, unchanged production rules, old-row preservation/exclusion and mixed-version rejection.
- [x] Add scope-aware board resolution, result identity validation and any necessary stale-response guard. No SQL/config changes.
- [x] Run targeted API, repository and client tests using an in-memory database only.

## Task 3: Historical integrity and release validation
- [ ] Add a strictly verified outer provenance layer against the complete remote base tree, without relaxing old pins.
- [ ] Run npm test, npm run build, node scripts/verify.mjs and check-release --expect=preview; compare exact baseline failures if unrelated large assets remain unavailable.
- [x] Inspect browser entry, launch/result/pause, desktop/mobile/landscape renderer samples and continuous stage transitions; label any fixture-selected heights.
- [x] Obtain fresh independent review, fix blocking findings with failing regressions first, and recheck affected behavior.
- [ ] Back up the exact delta, verify remote head and authorized preview destination, publish the delta only, and verify commit deployment and live hashes. Never claim source publication as deployment evidence.

## Verification notes
- 8 finite-reaction/noisy-input simulations reach all 22 sky stages in about 359 seconds of airborne simulation. These are not claims about typical human completion.
- Geometry and real reference heights remain unchanged. Some aircraft/mountain caption intervals differ from model visibility because the existing scene ranges overlap.
- Browser smoke checks cover entry/start, no-input result, pause/resume and renderer snapshots at four frame sizes using the existing CPU fallback. WebGL and a full manual six-minute flight were not exercised.
- Independent review found and rechecked the numerical-ceiling edge: the existing 1e150 limit now locks once and uses the normal finish rather than leaving a long run frozen.
- Build and preview release preflight pass. The local static-reference check is blocked by an original large fast-hands asset unavailable through the source transport. Publication must preserve every remote original asset blob.
