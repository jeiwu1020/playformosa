# Fighter entry counts

Base: PlayFormosa preview/hurdles `6723ba4c25dcae45fccb81dc2d8606098b2dab32`
(tree `0cd186e16895467699d5b897df8517e129fdb68d`).

The Taiwanfighter card displays **已開玩 N 次**. This is the cumulative number of
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

The first preview publication exposed a missing provenance boundary: 47 historical
source/hash/inventory assertions rejected the new feature files. The follow-up
adds a separately pinned complete pre-feature preview tree and reversible Fighter
boundary outside the existing mobile-gesture boundary. No historical manifest,
baseline, game file, SQL schema or binding is rewritten. All original assertions
remain enabled; the new tests also reject tampered current/preimage bytes, missing
additions, unknown inventory and forged parent trees.

Run `npm run check` on the complete repository before publication. The exact
feature is independently integrated into main; do not merge preview-only games
or historical ledgers into main. Preview and production retain their existing
separate D1 bindings and totals. The existing 37 focused feature/portal/counter
checks are supplemented by the entire preview suite and strict source inventory.

Real-browser acceptance is verified against the deployed preview where available.
Physical iPhone acceptance requires a physical-device check and is not implied by
mocked mobile request headers.
