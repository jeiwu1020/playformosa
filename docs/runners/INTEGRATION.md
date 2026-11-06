# 400m / 1500m preview integration

## Scope and routes

- `/games/run-400m/`: 四肢各有想法｜400公尺. Flavor: 腿先不要下班.
- `/games/run-1500m/`: 四肢各有想法｜1500公尺戰術賽. Always labeled arcade actual game seconds, not real athletics time.
- Existing `preview/hurdles` only. No main, schema/config/database changes, paid services or live score submissions are part of this candidate.

## Protected originals and provenance

`SOURCE-MANIFEST.json` lists every source runtime SHA-256 before editing. Original private prototypes are untouched at commits c9c12ec05158b63f664e5ccad4246761e8860908 (400m) and 0ceca612cbc651c5d358be49f3510cc78cc4e710 (1500m). All imported race, pose, renderer, rig, atlas, software fallback, clock, source audio, audio clips/credits and Three.js/license bytes remain exact. Only new platform HTML/controllers and presentation assets differ from the originals. Source controller tests that asserted private/local-only copy were adapted to platform copy and route paths; engine assertions remain intact.

`ART-PROVENANCE.json` identifies separately generated homepage illustrations and menu/install icon crops. Runtime character art remains unchanged. Covers were generated with OpenAI image_gen using the existing orange-shirted curly-haired runner/curved-track visual conventions. 1500m includes the truthful four-runner pack and yellow supply can. `tools/render-runner-covers.mjs <generated-art-directory>` copies the approved originals and derives icons.

`INTEGRATION-MANIFEST.json` is an additive outer layer. It stores exact frozen preimages of the reviewed existing-path changes and hashes every added file. `tests/fixtures/runner-integration-baseline.json` pins the complete 1326-blob remote parent and reconstructed tree. The historical reader restores original bytes before older provenance assertions run. All earlier ledgers and frozen preimages remain unchanged. No broad game/source exclusions or historical hash repinning.

## Runtime boundaries

- `shared/runner-platform.mjs` owns only UI/lifecycle/input presentation. Both original deterministic engines and their difficulty, geometry, bank/rhythm, lane tactics, supplies and time scale are unchanged.
- Reuses `entry-shell`, `controls-shell`, `game-ui` pause/modal helpers, menu audio view and the existing manual `leaderboard.mjs` controller.
- `runner-result.mjs` freezes player finish time, crossing-time rank, metrics, verdict, opponent state and rules identity once, before later 1500m AI runout. Screen, share text and PNG use the same deterministic verdict. Nine distinct factual verdict conditions per game are tested. Secondary opponent rows honestly retain the finish snapshot's unfinished runners.
- `runner-replay.mjs` stores an explicit allowlist of authoritative render/HUD state only, omitting input history, RNG functions/seed and simulation accumulator. Both engines’ runner/supply arrays have fixed course bounds. Snapshot serialized size is tested independent of 10,000 original-engine input events. It retains a rolling five seconds before crossing plus at most one second after, 30 snapshots/second and a maximum183 snapshots. Seeking/playback clones recorded data and never calls the engine or RNG. 400m safely ends at crossing matching its original controller’s stop-at-crossing behavior (the unchanged engine itself supports further runout). 1500m records its original one-second runout, while all score/share/upload data stays frozen. Interruption can end the runout early, honestly retaining only the recorded segment.
- Replay preserves the same result DOM, frozen PNG/object URLs, local record and manual upload snapshot. It cannot produce a second score or local save. No whole-race replay or unbounded replay recording is exposed; the unchanged source engine may retain its own input audit history independently.
- `runner-audio.mjs` adapts persistent independent music/effects settings to the common menu. `runner-sound.mjs` plays the preserved licensed samples and reports real resume/decode failures, with retry of missing samples. It is isolated from physics. Original audio modules are retained unchanged, but their success-only loading limitation is not reused.
- The existing 100m share controller gained optional title/gameId/cardTitle/timeBasis presentation fields. Defaults preserve 100m behavior. Both runners use that same failure-tested implementation, including synchronous prepared-file native share, cancel/retry/manual fallback, generation checks and URL revocation.

## Records and QA boards

- Exact retained rules identities: `400m-prototype-v3` and `1500m-ccw-tactics-v3`.
- Existing private source local-record namespaces and validators remain intact. There is no automatic old-record upload or migration.
- New QA-only Worker board definitions use ascending seconds. Production GET/POST cannot resolve them. Existing production boards and QA pole-vault rules remain unchanged. No SQL/migration or configuration edits.
- The existing anonymous manual submit panel only receives the new immutable completed-round adapter; invalid, incomplete or mismatched-rules snapshots are rejected. Clicking submit publishes the entered nickname and current result under the existing UI disclosure. The implementation did not submit any live scores.
- No play-count expansion was added: the current 100m/javelin admission also does not participate in the nine-game counter contract. Existing count keys/semantics are preserved.

## Acceptance and limits

Automated suites cover real ordinary-input full rounds, pause/resume/help/interrupt/restart, replay pause/seek/return, bounded history-independent snapshots, auxiliary pause/help/ranking/audio shortcut isolation, result immutability, board isolation and sharing failures/stale callbacks. They do not claim native iOS/Safari share, real touch or hardware GPU acceptance. Rendered acceptance requires desktop/320×568/390×844/844×390/zoom/focus checks before publication.

A local-only ignored `/__runner-qa/` fixture drives the real controller using ordinary input at original speed and blocks score POSTs. It contains no engine-state mutations or runtime debug query. It must be removed before build/publication. The local preview hosting manifest is likewise not part of the product.

The partial checkout inherits19 unavailable binary assets and57 baseline test failures. Publication must overlay the complete remote tree, never replace it from the partial local checkout. Final automated verification: 152 focused tests pass (86 retained engine/view tests and66 integration tests). The full suite runs3021 tests:2964 pass and57 fail, matching all57 inherited baseline failure identities exactly by file, line and test name (baseline2867 total/2810 pass). Separate build and preview release preflight pass. Static reference verification stops at the inherited missing Fast Hands duel-items-atlas.png. No aggregate green pass is claimed.
