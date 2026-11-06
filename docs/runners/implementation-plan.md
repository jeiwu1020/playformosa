# Runner platform integration implementation plan

Goal: admit the preserved 400m v3 and 1500m v3 engines to preview/hurdles with the platform interface, finish-only replay, immutable contextual results, manual QA boards and complete sharing.

Architecture: keep every imported engine/render/rig/audio/atlas byte-identical. A small shared runner controller owns lifecycle, common entry/pause/audio adapters, input, viewport result and replay presentation. Pure runner result and bounded replay modules isolate immutable result/replay data from mutable simulation. Reuse the existing 100m sharing controller through optional presentation parameters, preserving its defaults.

Approved scope: preview/hurdles only, with common menus/chrome/mobile controls, immutable contextual results, finish-only replay, manual QA boards, three sharing actions and homepage entries/art/loading. No main, schema/config changes, paid services or original-source edits.

Review focus: delayed PNG/share callbacks after restart; help after a result must never start a new race; replay must never mutate engine state or upload a second record; 1500m AI runout must not rebuild the finish result; all viewport controls and result exits must remain reachable.

1. Add failing tests for bounded authoritative replay, eight deterministic truthful verdict cases per game, immutable completed-round adapters, QA-only Worker boards, route/catalog assets and common UI contracts. Record RED evidence.
2. Import runtime files and engine tests with a SHA-256 provenance manifest. Keep physics and assets byte-identical. Add pure result/replay modules and pass their focused tests.
3. Implement common controller and thin game adapters. Reuse entry-shell, controls-shell, game-ui result/pause helpers and manual leaderboard. Add lifecycle/share failure tests and a deterministic full-round integration test.
4. Add titles/covers/icons/startup/catalog and package test admission. Verify imported hashes and whole diff.
5. Run focused tests, full npm run check, build and preview release checks separately, disclose inherited missing-asset failures. Commit locally. Independent code review and rendered browser acceptance are required before publication.
