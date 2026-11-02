# Selective production leaderboard implementation plan
> Native dot-cloud implementation, independent audit and sole publisher.
**Goal:** Release online Jump/Hurdles boards to main, separately bound to a new empty Free production D1.
**Architecture:** Exact preview worker/shared ranking files; minimal main Jump adapter (not replay/controls-frame promotion); Hurdles known leaderboard adapter. Main catalog and public artifact allowlist remain exactly two games.
**Spec:** User7a27d63f37b88191aa8bc02e7d1d91c4; Free-only confirmed. Mainc1222d33, preview91a34d32. No QA-data copying, no credentials/paid resources.

- [ ] Test production gate/independent DB scope, artifact closure and original main invariants before imports.
- [ ] Import exact worker/board/aux shell from preview with SQL tests. New production UUID stays pending/off until user provides exact UUID and successful schema execution.
- [ ] Jump keeps original #overlay entry/result and main physics/camera/PNG/retry. Aux shell only owns board/help, original controller closes/restores; clear input/cancel pending motion, pause recovery respects active owner. Add entry board and result opt-in, use done+valid legalAdventureKm. No replay promotion.
- [ ] Narrow Jump chrome gives 44px toolbar; optional actual headerHeight budget preserves original standalone lift and camera bounds. Hurdles exact preview leaderboard-only changes. No other game/portal source.
- [ ] Native/fallback/standalone, queued close, stale read, result PNG preservation, keyboard/IME, real controllers, both API metrics/scope/atomic SQL tests. Full main check, exact dist allowlist/import/assets closure. Supported bounded browser.
- [ ] Retain original ledgers and append exact production leaderboard adaptation; freeze/checkpoint in Library + fresh restore, independent review.
- [ ] Only when real production DB ready: sole publisher main CAS/full CF/live empty production boards, manual clearly labelled production QA verification if authorized; preview unchanged. No fake completion on binding failure.

## Final prerequisite evidence
User supplied production UUID8a0e7263-fe1a-4d98-a276-8603e50d6605 and schema success screenshot698451076e48819195dd5bb12a719faa (root reviewed). Config now targets only that production DB with true gates. No schema rerun or QA score migration. Live publication remains pending.
