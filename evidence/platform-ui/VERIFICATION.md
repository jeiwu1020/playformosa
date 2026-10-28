# Shared UI candidate verification

- Baseline source tree: `d9f2d51ed2541c0e98a0836eb948492066eb82e6` (source-only local snapshot `3457f03`). No publication from this checkout.
- Final `npm run check`: **542 passed, 0 failed**, build successful, **137 local references across 126 output files** verified. Full output: `node-check.log`.
- `git diff --check`: clean. Four HTML documents parsed with no duplicate IDs. Beer/Rod result dialogs are direct body children, not stage descendants.
- Tests cover actual controller state at browser/GPU boundaries, real Three.js geometry/math, capture pixels surviving resize, per-round generation, cancel/reject/manual-copy/retry, failed encode and duplicate shares, music gesture gating, focus targets, pause/replay clocks and held-input cancellation.
- All original game physics/art/camera/audio assets, Long Jump cosmic/viewport/layout/root-origin modules are unchanged. Original imported minigame hashes remain in SOURCE-MANIFEST; only exact named controller/markup deltas are recorded separately in UI-STANDARD-MANIFEST.
- Independent review findings were fixed through failing regressions then passing tests: unavailable renderer controls; Hurdles failed encoding/duplicate share; Beer help/pause keyboard lifecycle; audio-status title overlap; named/44px fallback dialogs; landscape safe-area margins; visible result focus.
- Browser and real-device acceptance **not run**: see `BROWSER-BLOCKED.md`. No screenshot or native-share claim is inferred from Node tests.

## Implementation rulings

- Isolate via a source-only snapshot with a new local Git database, rather than registering a worktree in the publication checkout. This keeps the parent's active publication directory completely untouched. Cost: parent applies the exact diff, not local commit ancestry.
- Reuse the existing bundled CC0 Not Jam track for Rod's new genuine music toggle, with attribution in Help. No new external asset, download or license dependency. Cost: Rod and Beer intentionally share a music source.
- Cancel an unreleased Beer gesture without scoring when pausing, matching existing interruption behavior; freeze released slide/replay exactly. Cost: an in-progress hand drag is restarted after resume, which the pause dialog explains.
- Keep the existing Long Jump standalone/native recovery controller and its viewport/root-origin modules untouched. Cost: modal internals are not unified; only platform semantics/layout/actions are shared.

No deferred functional minor findings are known. Browser acceptance remains an explicit verification limit, not a passed check.

## Final additive integration

Preserves sandpit preview commit `9e0ea9a4c214311622c7b0738f0ad0e8105d69a1`, tree `5f1b37786f6906a89699c6ec837f3f7d7d1ad8b1`. Imported only its six changed paths, retaining UI changes in game.mjs and merging the lifecycle harness to exercise both real sandpit geometry/capture and WebGL-failure controls. All sandpit regression tests remain present. Final Beer held-P regression prevents repeat key events from toggling pause after resume. No publication performed.
