# Preview upload and toolbar repair

Base: preview/hurdles `037802320dc9317bc0ee02ea70fe790e999cd7b7` (tree `993db78e2486fac40d77690cc85451556ffe3e92`). This is a focused patch, not a merge or replacement with the production tree.

- Every registered game has a separate 60-second scope/device/game upload cooldown. Duck mouse/touch share their game cooldown. Keep the existing shared 1,000 accepted submissions per UTC day and 10,000 best-record capacity.
- HTTP 429 reports cooldown seconds or the specific daily/capacity reason. Upload areas show a disabled countdown; 429 does not spend network-error retries. Expiry permits manual retry only, retaining the frozen result and submission ID. No automatic upload.
- Fast Hands three pages use consistent Home, Ranking, Settings and Help controls and level navigation. Tools pause safely and restore the prior paused/result view. Nested views and BFCache releases preserve results without resuming gameplay automatically.
- Remove user-facing test wording from the three Fast Hands ranking interfaces; retain public-submission/privacy and measurement caveats.
- Preserve all preview-only games, the test console, catalogs, score rules, secondary-score ranking, QA-only Fast Hands API gate, D1 schema and QA binding. No database migration or live test score is included.
- The generic preview repository and nine-game shared upload component were patched in place. Production's separate Rod repository/client were not copied into this branch.
- Preserve every historical ledger and fixed fixture. A new reversal layer restores this patch's exact prior bytes for historic provenance tests; the only new public runtime is `games/shared/upload-cooldown.mjs`.

The user requested testing on this existing preview branch before deciding whether to publish main. Main must remain unchanged. Rollback anchor is the base commit above.
