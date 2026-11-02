# Nine casual boards and counters: backend handoff

Base exact preview5763b4c. No main changes. User confirmed QA003 SQL success; never run migration automatically. 003 is additive and non-idempotent: if a manual attempt reports an error, inspect both table schemas before any retry; do not rerun blindly. 0001/002 stay byte-identical. QA and production bindings remain separate.

## Ownership
Backend owner: worker/leaderboard + worker/play-counts, new shared/leaderboard-metrics.mjs, shared/play-counts.mjs, assets/play-counts.mjs allowlists, narrow tests.
UI owner: all controllers, leaderboard.mjs/view/CSS, entry shell, catalog count markers. Integrate backend overlay, not complete text-subset directory.

## Submission/result bridge
Import BOARD_METRICS and resultToSubmission from leaderboard-metrics.mjs. Keep existing profile/UUID/frozen attempt and bounded retry behavior; never read old best for a submission. Every adapter requires phase:'done'.
- long-jump: result(s) valid + legalAdventureKm (journey-km-v1 unchanged).
- hurdles: done s.t (110m-8h-v1 unchanged); DNF excluded.
- high-jump: successful s.height, never peak altitude.
- pole-vault: scoreSnapshot.height (locked maximum feet altitude), fallback maxHeight; bar collision does not invalidate this highest-height ranking.
- shot-put: final=result(s), phase done wrapper; valid distance including relay; seed unrestricted.
- discus: finalState foul===false, score includes actual wind/UFO outcome, no normalized weather/range.
- reaction-rod: physics result(world) + phase done; caught integer1..10 primary, original rating0..10 secondary. No synthetic composite score.
- beer-slide: scoreTen(state) raw (not rounded display/total), plus phase done/fallen/invalid/cancelled. Legal low-accuracy result may submit; no success-bullseye requirement.
- tower-climb: finished true/floor10/time<=60. DNF remains personal result only.
Zero scores complete normally but do not upload. No invented max-distance/height cap; finite positive numbers only. This is self-reported casual ranking, not verified anti-cheat.

## API compatibility
Old two boards keep old rules/unit/status and exact single-score entry/own fields. Seven new board keys listed in BOARD_METRICS. Rod alone requires POST secondaryScore, GET entries/own add secondaryScore; own.gapMetric is catches/rating/null. gap is nearest strictly better tuple: if caught differs display catch difference, otherwise rating difference; null means leader, not necessarily tied leader. Equal tuple rank is 1,1,3; stable device ordering only resolves display order, never ranking points. Device/hash never returned.
POST bestUpdated derives before/after tuple from one atomic transaction. Same UUID duplicates never claim improved. Nickname changes alone don't improve best. Personal responses stay private/no-store; anonymous Vary prevents shared-cache confusion.

## Counters
recordPlayStart(window,game) accepts all nine; call exactly once after successful actual new round/retry start. Never call on GPU failure, replay, help, pause/resume or internal cancel reset. Rod reset only prepares ready; count successful begin. Beer resetCurrent is called by cancellation too; explicit new-round admission must distinguish internal safety resets. One combined homepage GET now returns nine keys + home; only successful DB empty results mean0. No historical counts.

## Free limits / cost
No new service, no paid feature. Existing1000 leaderboard submissions/day and10000 stored bests/site remain shared across nine; caps aren't per-game. Count10000 admitted/day and100/device/day remain shared across nine+home. Aggregates now at most10 rows (not3). Receipt cleanup still max100/request, retained7days. Top20 derives tie ranks linearly; own rank does one indexed strict-better COUNT and nearest tuple seeks, not20 whole-board counts. UI may show quota/network failure without blocking retry/gameplay.
