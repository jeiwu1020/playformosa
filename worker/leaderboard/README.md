# Two-game production leaderboard candidate

Main base c1222d33, selective source from preview91a34d32. QA branch/database are not changed. User explicitly requested main promotion and confirmed the same Workers account is Free; no upgrade, new credential, paid fallback or Fighter/Sites database use.

## Confirmed isolated production setup — awaiting publication
User supplied production D1 UUID `8a0e7263-fe1a-4d98-a276-8603e50d6605`, name `playformosa-leaderboard`, and screenshot confirmation that the supplied two-table/four-index SQL succeeded (user message698451076e48819195dd5bb12a719faa, reviewed by root). We did not rerun schema or copy QA rows.

Root DB binding and production scope are enabled only for exact `https://playformosa.playformosa.workers.dev`. Preview91a34 remains separately QA-bound. No client environment selector or branch header can select a database. All non-API routes pass through ASSETS preserving404-page. This source has not yet been published; live validation remains mandatory.

## Preserved API and free boundaries
The exact reviewed Worker validates game/rules/unit/status, finite positive scores, UTF8/plain nickname, UUIDs, streaming2048byte cap and same Origin. Jump uses valid legalAdventureKm, Hurdles done time; these checks are not anti-cheat or authenticated identity. Unknown origins are denied before D1.
Atomic admission/receipt/best: max1000 accepted/day across scope,60s device cooldown,10000 best rows,7day receipts with bounded100 cleanup. Ranking reads use existing indexes, top20 linear competition ties and one indexed own-rank/gap query in a consistent read batch. Private personalized responses no-store; no exposed device/hash. Same UUID retry cannot add another entry or consume admission again.
Workers/D1 Free quota errors stop service; app caps reduce usage, not a paid-account cost guarantee. User confirmed Free. No polling or paid fallback; game/retry/share remains available when API fails.

## Selective game integration
Hurdles imports its reviewed leaderboard-only controller adapter. Jump keeps main original physics, camera, authored controls, original entry/result/PNG and no replay feature. A small production-Jump auxiliary adapter uses the existing single modal owner to suspend/restore original entry/result/pause. Header-height budgeting is optional and preserves original40px default, standalone control lift and camera extension formulas.
Catalog remains Jump/Hurdles; exact public/dist allowlist120 paths admits only five new shared board/adapter/chrome resources. Original P and three released app icon identities remain unchanged.

## Release gates
- Exact source/before ledger, artifact closure, main full tests/build.
- Independent review and Library source+before archive fresh restore.
- Real production UUID/schema evidence before enabling; no QA data migration.
- Sole publisher main CAS, exact full CF success, both production GET JSON from isolated empty DB, bounded manual UI/read/write gate as authorized, original routes/icons and unpublished-route nonplayability. Keep preview commit unchanged.
Tests use sql.js1.13.0 in-memory D1-shaped adapter, not real D1; no fixture rows sent to production. Browser/Jump WebGL limits must be reported, not disguised as full phone verification.
