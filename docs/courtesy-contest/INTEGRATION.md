# Courtesy Contest: preview integration

## Approved scope
Import the verified private 客氣大賽 frontend into the existing PlayFormosa `preview/hurdles` branch, with platform chrome, a separate playable catalog entry and independent play-count key. Preserve private Site, private ranking records, existing platform games, historical counters and `main`. Platform leaderboard integration is a later stage; this release clearly says it is unavailable and does not load the private ranking client or any private backend/authentication.

## Design
The existing Phaser game retains its rules, actor art, responsive carriage proportions, 30-to-20 visible countdown, late-game threat behavior, touch guard, licensed music and original effects. A game-local platform adapter connects the shared entry shell, toolbar state and native result dialog. Restart and pause call the real scene lifecycle. Results have three platform sharing actions, backed by a frozen actual result frame and generation-scoped callbacks. Only the existing play-count API accepts the new `courtesy-contest` key; schema, old keys, quotas and leaderboard routes remain unchanged.

## Verification plan
1. Fail new catalog/count/isolation and lifecycle tests before implementation, then pass them against the actual adapter and engine.
2. Import the final verified private source and record source hashes/licenses. No ranking requests, data or server files are imported.
3. Test desktop/mobile entry, repeated touch, 30→20→hidden countdown, pause/resume, interruption, restart, success/failure and second round. Verify sharing fallbacks and stale callback invalidation.
4. Run full tests, build, asset verification and preview release gate. Compare any baseline failures without hiding them.
5. Publish an additive Git tree over the verified remote base, prove all unlisted paths unchanged, fast-forward `preview/hurdles` with an expected-head lease and verify the exact Cloudflare preview deployment. Do not change main or database contents.

## Source and release
Source manifest and final verification/deployment receipts accompany the release. Browser emulation is not native iOS/Safari/share-sheet acceptance.

## Browser verification record (2026-11-07)
- Nine viewports passed 63/63 checks: entry, playing, timer hidden, pause, results, result snapshot, and a clean second round.
- A real elapsed-time round displayed 30, 29 through 20, then hid the clock at about 11 seconds. Canvas bounds stayed identical. Offer → pause froze remaining time → Continue → Thanks produced a seated result with one completed offer.
- A request spy observed only the independent courtesy play-count request. Shared native result presentation and prepared PNG bytes were verified.
- The browser QA fixture switches Phaser's RAF scheduler to a 60 Hz setTimeout scheduler because the cloud test browser’s visible-tab RAF was throttled to approximately 1 fps. This is test-only; production scheduling is unchanged. The repeatable fixture is stored at `tests/browser/courtesy-platform.html` and must be served only in a local test session on the same origin as the public game. It is not a runtime route.
- The download button reported handing the image to the browser. The downloaded filesystem file was not verified because the browser event was unsupported. Native iOS/Safari and operating-system share completion were not tested.
- Intruder artwork is 10% smaller in waiting, running, seated, and repelled poses. Seventy-two new focused checks passed after failing first. Original tap-target bounds, foot/seat anchors, and game timing remain unchanged. Independent math review found no issue. A total of 195 focused and related tests passed. Browser inspection compared actual same-candidate Phaser renders with the original scale/anchor reapplied as a reference: 390×844 waiting/seated grandpa (360×200 canvas), and 1280×800 running student (934×352 canvas). The 0.9 ratio was verified; the original tap rectangle stayed 129.624×130 px on phone and 262.122×262.122 px on desktop. These were not comparisons against a separate live production deployment. Postrender screenshots were inspected in the browser; a final full-page capture timed out, so no saved screenshot deliverable is claimed.
- Original artwork, music, licensing text, and source game rules remain preserved except the documented integration and intruder visual scaling changes.
- The historical local baseline had 51 failing tests associated with seven unavailable binary assets. Final serial full-corpus verification ran 3,511 tests: 3,460 passed and 51 failed, with zero skipped or cancelled tests. The failure multiset exactly matches the prior baseline: zero new failures and zero omitted historical failures. The run used a 1,536 MiB Node heap and serial test scheduling to avoid sandbox memory pressure; no assertions were disabled. A full green suite is not claimed. The complete remote tree pins all seven assets for preservation.
