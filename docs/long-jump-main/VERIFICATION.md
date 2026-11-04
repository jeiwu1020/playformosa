# Long Jump main promotion verification

Candidate only. Base main: `90e6690ca248752917955839d8c1ee2903a903d2`. Preview source: `b732a20962613de3fb286fb2a8dc798d615d408d`. Apply the independent loading and studio-attribution layers before this layer.

## Scope and preserved behavior

The preview Long Jump player experience is present: bounded landing replay, slow motion near landing, return-to-results controls, complete result preview, compact responsive result layout, common input controls, updated title and studio attribution. Four public modules are byte-identical to preview. Four integration files retain main-specific behavior:

- `game.mjs` uses the existing production leaderboard adapter, so production scoring, result-dialog ownership, native and standalone fallback flows remain intact.
- `style.css` adds a single scoped full-width rule for the production result’s “查看榮譽榜” button. Preview stretches this button as a direct flex child; production keeps it nested with the existing score-submission controls. No scoring or submission code changes.
- `layout.mjs` retains measured toolbar height and ResizeObserver while enabling the preview shared-controls layout.
- `index.html` retains the separately tested main loading-screen bootstrap, failure recovery and delayed-entry handling.

Thirty-seven other Long Jump source/artwork/audio files are byte-identical to main and preview, including physics, character, world and input rules. The production database binding, ranking service, worker, schema, count service and other games' runtime sources are unchanged. The public inventory admits only `games/long-jump/replay.mjs` in this layer; the separate studio layer owns its CSS.

Historical ledgers remain byte-identical. Test readers verify both current and restored bytes through Long Jump → Studio → Loading → Rod rather than weakening historical assertions.

## Checks completed

- Long Jump suite: 277 passed.
- Real production-controller and leaderboard tests: 14 passed, using native and fallback dialogs and an actual keyboard-driven physics round.
- Initial full `npm run check`: 733 tests passed, 0 failed; static build passed; 191 local references verified across 168 output files.
- Production tests cover settled-state and PNG preservation during replay, no replay physics/scoring/count calls, help/ranking interruption, explicit resume ownership, stale GET/POST cancellation, replay end/Escape and restart cleanup.
- A regression test first reproduced settled-state mutation when entering help during replay. The adapter now clears held input only while the real round is playing, preserving every settled-state field while retaining in-round interruption behavior.

## Restored original media

Four large files omitted by the source-read interface were recovered from existing source images and project backups. All match main's exact Git blob IDs, so none is a replacement or a repository change:

- `assets/hero-long-jump.png`: 2,290,523 bytes; `89d8dd2580a7b4c0842b6c7091bae7a8fa8fcc1f`; v8 checkpoint archive.
- `assets/hurdles-card.png`: 2,206,868 bytes; `db89fb323cfff286621308512a944ee2d62d9824`; original saved image.
- `assets/reaction-rod-card.png`: 1,612,035 bytes; `8405deb9228d1402625b2f9a1703f1c216e59126`; original saved image.
- `games/reaction-rod/audio/chill-menu.mp3`: 1,247,651 bytes; `50b833fcbec85ca8dd559aac6b09fdb05377aea9`; RodV9/BeerV7 preview archive. Its beer-slide copy is byte-identical to the main Rod audio.

A complete backup of all 362 original main source files was reconstructed and checked individually against the remote tree's Git blob IDs.

## Required before publication

A real WebGL browser check remains required for desktop, phone portrait and short landscape: entry/loading recovery, start and controls, landing/result photo, replay, pause/help/ranking/return, share image and studio marks. DOM and state-machine tests do not establish actual GPU rendering, browser focus behavior, touch behavior or screenshot appearance. Independent read-only code review found no new code-level blocker and separately passed 23 focused tests. The reviewer specifically requested browser checks of the mobile replay toolbar below the taller studio header, desktop/short-landscape result overflow and standalone rotation. Recheck both remote branch heads and apply the reviewed patch to genuine main history before publishing; comparison snapshots are not publishable history.

## Owner validation correction

The owner reported that all other manual checks passed and supplied two result-screen screenshots. The candidate screenshot has a content-width “查看榮譽榜” button; the preview screenshot has a full-row button. This concerns the result action, not the honor-board dialog itself. A single Long Jump-only CSS rule now matches the preview width at every viewport without moving production controls. Six regression tests failed before the change and passed after it, covering the exact CSS adaptation and computed full-width styling with the real production adapter. The test sets innerWidth to 320, 390, 430, 844 and 1280, but JSDOM does not perform layout or viewport/media-query rendering; these are not five real-browser viewport checks. The final full suite passed 739/739 tests, and build/reference verification also passed. Actual rendered width still awaits owner recheck of the updated private Site.
