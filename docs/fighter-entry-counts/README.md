# Fighter entry counts

Base: PlayFormosa preview/hurdles `6723ba4c25dcae45fccb81dc2d8606098b2dab32`
(tree `0cd186e16895467699d5b897df8517e129fdb68d`).

The Taiwanfighter card displays **開玩次數**. This is the cumulative number of
entry navigations received by the platform after enabling this feature, not
unique visitors and not rounds started inside Taiwanfighter. Historical clicks
are not fabricated or backfilled. The thirteen local game counters retain their existing
successful-start counters and labels.

The native card link opens `/api/play-counts/entries/taiwanfighter` in a new tab.
The Worker returns an uncacheable 302 to the fixed approved Fighter URL and
schedules one atomic increment using `waitUntil`. No click/pointer/keyboard
listeners or frontend beacon also count the same navigation. This design works
without JavaScript and does not await D1 before redirecting. Browser-native
modifier/middle clicks, keyboard activation and context-menu new-tab entry use
the same link. Context-menu display alone does not navigate and does not count.

HEAD, explicit prefetch/prerender, non-document requests and explicit cross-site
requests do not count. `Sec-Fetch-Site: none` is accepted for browser-UI new-tab
navigation. Older browsers without Fetch Metadata are supported. Opening the
entry URL directly can therefore also count; this is not an anti-fraud metric.
Browser retries may be counted separately. Requests lost before reaching the
Worker and failed background DB writes are not counted. Navigation takes priority
over telemetry. There is no offline queue or tracking of player identities.

## Data and isolation

No D1 migration, binding, scope, game schema or original game file changes.
Existing `play_count_totals` holds a `taiwanfighter` key separately for each scope.
The key is added to GET `/api/play-counts`. It uses one aggregate row per scope,
with no per-click receipt, device ID or cooldown. `day_total` remains zero so
Fighter navigation cannot consume the existing local-games daily quota.
The backend `/starts` allowlist still rejects `taiwanfighter`.

The existing `/api/play-counts*` Worker-first asset rule already includes this
route. Deploy the homepage and Worker together. Static-only hosting of the new
homepage is not supported because the counted entry route requires the Worker.
Counts use the existing 30-second public read cache; refresh to see the latest
value. The number does not optimistically increase before backend acceptance.

## Release and verification

Prepared as a minimal delta against the exact preview branch, not copied from main.
The preview catalog, all other portal destinations, QA database configuration and
local-game source remain unchanged. The generated homepage reverses byte-for-byte
to the baseline by removing the Fighter label and restoring its old direct href.

Local verification: 37 focused tests pass, including six new Fighter behavioral
tests and 31 existing counter, portal and leaderboard tests with only affected expectations
updated. Preview homepage build and release preflight pass. This is a partial
source checkout, not a complete deployment directory: 806 unchanged baseline
files were not retrieved. Full static validation stops on missing baseline game
files; the complete preview test suite was not run. The baseline commit also
reports two pre-existing nonterminating test files.

No remote commit, branch update, D1 write or deployment was performed during this
preparation. Publish the delta over the exact baseline tree and run CI on the
resulting complete repository. Deploy the homepage and Worker together. Preview
and production use separate existing D1 bindings and keep separate totals.

Real-browser/physical iPhone acceptance remains unverified. This executor cannot
launch Chromium (socket permission failure); mocked request headers do not prove
physical-device coverage.
