# Promote the complete preview Long Jump experience

Goal: Promote preview/hurdles Long Jump to the existing main release without replacing production databases, ranking services or unrelated games. Source preview: b732a20962613de3fb286fb2a8dc798d615d408d. Base main: 90e6690ca248752917955839d8c1ee2903a903d2, with the separately reviewed loading and studio-attribution layers applied first.

- [x] Preserve a source backup of the loading candidate and verify the preview/main file identities.
- [x] Add failing replay, complete result-photo and responsive result tests before importing the eight scoped game files.
- [x] Promote replay, result composition, shared controls and title changes, preserving the main production ranking adapter and native/standalone dialog ownership.
- [x] Retain actual toolbar-height measurement and ResizeObserver while adding preview's shared-controls breakpoint.
- [x] Integrate the studio attribution layer without duplicating its shared stylesheet or rewriting its provenance.
- [x] Add a new exact provenance layer above studio/loading and retain historical assertions against verified previous bytes.
- [x] Extend the production inventory only for long-jump/replay.mjs. Keep the three released games, database, worker and scoring rules unchanged.
- [x] Verify real production-controller replay/help/ranking/return, final state and PNG preservation, no duplicate scores/starts, and cancellation of stale requests.
- [x] Run the full test suite, build and reference verification, reporting every failure and any missing media.
- [ ] Perform desktop/phone portrait/short landscape browser checks with genuine WebGL. No publication until missing original assets and browser checks are resolved.

Review focus: replay never changes the settled game state; returning from ranking/help never resumes automatically; held input is cleared on interruption; pending captures cannot overwrite a new round; loading failure and delayed recovery preserve real entry ownership.
