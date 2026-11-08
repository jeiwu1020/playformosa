# Fighter entry counts

Base: PlayFormosa production main `79af5bedbbbc3eee5b03132fb5f693a97f27840b`.

The Taiwanfighter card displays **開玩次數**. This is the cumulative number of
entry navigations received by the platform after enabling this feature, not
unique visitors and not rounds started inside Taiwanfighter. Historical clicks
are not fabricated or backfilled. The seven local games retain their existing
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

The authorized release sequence is `preview/hurdles` first, then `main`.
`main` uses production D1; `preview/hurdles` uses the distinct QA D1. Apply
only this feature independently to each branch, never merge unrelated preview
changes into main. Deployment commit IDs and live verification are recorded
separately after publication; source contents alone do not prove deployment.

Unit/integration tests cover the rendered link, count label, rapid concurrent
entries, fixed redirect, background execution lifetime, DB failure, filtering,
zero initial value, scope separation and unchanged local-game quota/schema.
Real-browser/physical iPhone acceptance remains a separate step: this executor
cannot launch Chromium (socket permission failure), and the cloud browser
cannot reach the local test server. Do not treat mocked request headers as proof
of physical-device coverage.

`SOURCE-MANIFEST.json` records the exact local delta. Independently pinned main
inventory and reversible provenance preserve all earlier release evidence.
