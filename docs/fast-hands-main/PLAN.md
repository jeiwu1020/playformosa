# Fast Hands main release plan

**Goal:** Release 鴨沒漏補, 彈無虛接 and 快手對決 on the existing production main branch without changing their current game settings.

**Architecture:** Start from main b09b4f841258bef41999bcc3b3684829b59a62c0. Import only the three games and required assets from preview/hurdles 037802320dc9317bc0ee02ea70fe790e999cd7b7. Keep production D1 configuration, existing games, scoring and repository implementations intact.

**Stack:** Static ES modules, Node test runner, Cloudflare Worker and existing D1 SQLite schema.

## Release gates

- Preserve exact source bytes for all 85 imported runtime assets. Exclude fast-hands-test and unrelated preview games.
- Add only the three homepage entries, four independent leaderboard categories and three play-count keys.
- Reuse existing D1 tables. No migration, binding, account or paid-plan changes.
- Run the complete main test suite, the selected Fast Hands behavior tests, build and strict output inventory/reference checks.
- Maintain the historical provenance chain, source pins and recoverable main preimages.
- Verify remote main still matches the pinned base before a non-force ref update. Verify the exact published commit and deployment afterward.

## Recovery

The release commit has the previous main as its sole parent. Restore the prior main tree with a new forward commit if rollback is needed; do not force-push or delete production data. No database rollback is needed because this release performs no schema mutation.
