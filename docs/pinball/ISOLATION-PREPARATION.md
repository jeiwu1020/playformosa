# Pinball leaderboard isolation preparation

Historical preparation report, recorded before source integration. The complete source has since been restored and the three actual QA boards are registered in the local candidate; see `INTEGRATION-LEDGER.md` and `frontend-integration.md`.

Status at this preparation checkpoint: local preparation only. No remote branch, deployment or D1 data was changed.

## Source identity and scope

Source files were read from `jeiwu1020/playformosa`, `preview/hurdles`, commit `3e499fc21c4e71e655cebe669dcd4204ab6720c9` through the connected GitHub reader. This directory contains only the modules and tests needed for this preparation. It is not a full checkout or deployment archive. Its local baseline commit is synthetic and must never be pushed over the real platform history.

The v0.8.26 pinball source is still pending. All pinball game/rules identifiers in tests are storage fixtures, not live API registrations.

## Change

`LeaderboardRepository.submit()` accepts a server-owned board option `isolateReceiptCleanup: true`. This adds game and rules predicates to the existing scope and expiry predicates when pruning at most 100 expired submission receipts. Existing boards without this option keep their previous retention behavior. Best-score rows and schema are unchanged.

The protection is one-way: pinball submissions with this option cannot prune another game/mode/ruleset. Existing legacy submissions can still prune any expired receipt in their scope. The patch does not claim permanent submission-ID retention or universal database isolation.

## Verified locally

- New actual-SQLite tests initially reproduced three preservation failures: successful submit, cooldown rejection and daily-cap rejection each removed other-game expired receipts.
- The candidate passes ten isolation tests, including three independent mode bests, multi-device ranks and gaps, identical/reused IDs, production-scope preservation, cooldown/daily/capacity rejection, bounded cleanup, exact seven-day boundary and explicit false behavior.
- The materialized legacy API, repository, Fast Hands, general board and upload-cooldown tests also pass. `npm test` in this partial directory: 69 tests, 69 pass, zero failures.
- Independent code review found no blocker in the SQL patch. Added the reviewer's requested rank/capacity/boundary/false-option coverage.
- `git diff --check` is required before handoff.

`npm test` here does not exercise missing platform tests. Full `npm run check`, release preflight, game/browser/lifecycle tests, live D1 write checks and publication remain pending the complete platform checkout and verified pinball source.

## Remaining integration requirements

Register all three new boards in QA only with the isolation option enabled. Do not accept the option or scope from a client. Bind a finalized round snapshot and freeze one submission ID per manual upload; reentries and local historical bests must not upload. Verify changed settings, restart/late responses, unavailable service and both timed modes. Do not run schema initialization or clear existing scores. Publish only preview/hurdles after complete checks and backup verification, using a fresh remote-head guard.
