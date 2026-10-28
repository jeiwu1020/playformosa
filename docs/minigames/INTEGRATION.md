# PlayFormosa minigames import — 2026-10-28

## Scope and release status

Adds **接棒啦！** (`/games/reaction-rod/`) and **別灑啊！** (`/games/beer-slide/`) to a separate **小遊戲** homepage shelf. They do not count as decathlon events: the existing ten-event series remains **2 / 10**. All URLs point to the current host; no private prototype hostname is embedded. Intended branch: **preview/hurdles only**. This document describes the source candidate, not a deployment receipt. No `main` publication is part of this batch.

Platform baseline: remote preview commit `d84b7fd0b0828319701fd35dc8a73ac0b762a58f`, including the four-file passive long-jump viewport-diagnostics overlay. Local snapshot commit `b291d4d` represents that overlay on the restored source checkout, not the remote commit identity. Existing long-jump, hurdles, orientation recovery, touch controls, homepage hero crop and diagnostics remain unchanged by this minigame delta.

## Source identity and preservation

- Rod: `reaction-rod-source-v9-full-body-20261027.tar.gz`, Library `libfile_df30c39cd5d881919b52067820183c15`, Library version **10**. Package revision is **v9 full-body crouch**; it is not the older standing-only design described in the historical README. The accepted full body, neck, equal-length limbs, crouch, grounded seated recovery, ten rods, gravity, finite palms and `reaction-rod-best-v4-crouch` storage namespace are preserved.
- Beer: `beer-slide-v7-source-e1bad980-20261027.tar.gz`, Library `libfile_7122c38e784c8191a086aefdcbcd0402`, Library version **0**. Package revision **v7** includes the native-fetch receiver hotfix. Its v6 compact dot eyes/smile/tears and side-mounted handle, one-cup 500 mL / 10.0 scoring, recorded replay, camera, input, storage, trusted-gesture audio and licensed sound files are preserved.
- `SOURCE-MANIFEST.json` records source archive hashes and each original runtime file's imported hash. Rod adaptation is limited to `index.html`, appended platform CSS, branded share copy in `share.mjs`, and user-facing share copy in `game.mjs`. Beer adaptation is limited to `index.html`, appended platform CSS and a new independent `platform.mjs`. All original Beer JavaScript bytes are unchanged; all Rod physics/scene/camera/snapshot/vendor bytes are unchanged.
- Existing Three.js MIT license copies and Beer CC0 music/effects, authors, source URLs, transformations, originals' hash records, and full legal texts remain in each game's runtime tree. Original full source archives remain in Library; no new external runtime CDN is introduced.

## Platform UX and sharing

Both games provide a clear home control, result return link and unsupported-WebGL return path to `/#minigames`.

Rod retains its existing generated PNG result-card workflow: mobile native file share, cancellation, long-press image fallback, desktop PNG download, text/link copy fallback and Threads. Only branding/private-site copy changes.

Beer receives a read-only platform adapter: native **text and URL** sharing, copy with selectable-text dialog fallback, and Threads text intent. It does **not** generate or attach a result image, and the UI says so. It reads the committed result display; it never changes simulation, score, replay or records. Threads href is prepared as the result appears, including middle-click/context-menu navigation; hidden/retry state clears stale links. Late asynchronous share completion cannot overwrite a newer result. Mobile share rows span the original result grid, retaining its scrollable result panel and touch rules.

Homepage thumbnails reuse original source geometry previews. Rod uses the v9 full-body scene proof. Beer SVG embeds the original v6 comparison-sheet PNG unchanged and clips only the accepted v6 smile panel. Neither thumbnail is a browser screenshot or actual game-result capture; no character mesh is redrawn or regenerated.

## Verification and limits

Run `npm run check` for the full platform suite, build and local-reference verification. Imported tests exercise original physical rules, input/rotation/interruption flows, image-share state, Beer audio/replay behavior, storage isolation, asset hashes and face/handle projections. New tests cover separate catalog counts, safe local routes, platform returns, same-host text/link payloads, sharing cancellation/denial/fallback, duplicate native-share clicks, retry generation guards, and precomputed Threads links.

Two original Rod tests required Git objects not present in the source archive (`v8 physics` and `v5 game`). The unchanged source package therefore has 73/75 portable tests, not 75/75 in this extracted environment. These two tests were intentionally migrated to an explicit current-v9 physics SHA guard and a bundled unmodified source-v9 game fixture for event/frame parity. This is **v9 integration-preservation coverage, not reproduction of the old v5/v8 historical checkpoints**. Original historical hash metadata remains in `tests/reaction-rod/art-v4-baseline.json`; the source packages are retained unchanged.

Node DOM adapters model only unavailable browser/GPU/audio boundaries. They are not real-device, GPU, Web Audio listening or native share-sheet acceptance. In this run supported CUA localhost navigation reported connection refused. A native local-file attempt was explicitly blocked by the browser organization policy; testing stopped, with no flags, alternate browser/transport or policy bypass. Browser/mobile layout and touch feel remain unverified locally. Publication and normal live-preview checks require separate release receipts.
