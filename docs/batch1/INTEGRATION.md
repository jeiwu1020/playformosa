# Jump integration batch 1 — 2026-11-01

## Scope

Base: `jeiwu1020/playformosa`, `preview/hurdles`, `f1c443a52aafda5b93d47ba4a922ef30deae46db`.

- High jump: approved Site v16 source commit `935c1419d78db38888a5da69facfabd209a0213f`, project `appgprj_6ae27dab1fc48191b828dc064c3fda0e`.
- Pole vault: approved Site v13 source commit `74053fb5a560addcfe2cb8ddc8b0e99099e843ab`, project `appgprj_6ae1aa41e6e48191922182a555ac42b0`.
- Both originals opened with the official Sites source helper and retained unchanged. No source push or deployment to either prototype.
- Imports are local bundles, not redirects or iframes. Only the local QA wrapper uses an iframe; it is not source-controlled or published.
- Decathlon entries: long-jump, hurdles, high-jump, pole-vault. Minigames unchanged: reaction-rod, beer-slide. No shot put, discus or climb in this batch.

## Changes and preservation

High jump: same-origin home link, shared platform stylesheet/controller import and fixed current-origin canonical sharing path. Its game-owned physics, character, render/camera, score/storage namespaces, input controller, replay and audio bytes are unchanged.

Pole vault: replace branded header with the shared home/title/music/restart/pause toolbar; use the existing real audio enable control (detailed volume/credits remain accessible from the footer), shared truthful pause labels, a visible audio status and same-origin canonical sharing URLs without query/hash. Unknown platform audience is no longer described as owner-only in user-facing prototype copy. Ordered Threads/image/copy controls use shared sizing. A small scoped stylesheet accommodates the actual toolbar height. The original character, camera, renderer, physics, height/scoring rules, input, audio and result-frame selection are unchanged. Existing result capture and share implementation are retained.

`SOURCE-MANIFEST.json` records all original runtime source/imported SHA-256 hashes; only named controller/markup/share deltas differ. Original runtime licenses are included. New transparent card PNGs were user-approved; the original jump hero and Beer SVG bytes are retained. The user also approved generated Hurdles and Reaction Rod covers, included as art-only updates.

## Verification

- Added admission tests first, observed 3 expected failures before import, then all 3 passed.
- 87 focused tests pass: catalog separation/counts, same-origin routes, shared chrome/share ordering, full-body card rendering, imported original physics/input/replay/share tests, actual pole-vault controller pause/resume/restart and per-file preservation.
- `node scripts/build.mjs` passes. Syntax checked for both new runtime module sets.
- Full `npm test` was actually run in the connector-materialized checkout: the later run had 563 passes and 19 failures, caused by absent existing Beer audio and old Long Jump vendor files (not changed or removed remotely). It is NOT a full green aggregate. The full local-reference verifier also stops on the absent old Long Jump vendor module. Publication overlays only the named delta onto the verified remote base tree, retaining those remote assets.
- CUA managed preview: desktop 1181×745, both games enter/start/pause/resume/restart and return to same-origin home. Header controls at least 44px, no horizontal overflow. Pole-vault simulation time remained exactly 0.542 across paused observations; original real-controller test independently confirms frozen state, resume and reset.
- 390×844 same-origin iframe: both games start and pause, header controls at least 44px and no horizontal overflow. Narrow pole-vault result shows full score, verdict, actual frame and three sharing controls. Browser focus changes can trigger the intended safety pause; this is not real-device restart, touch, audio-listening or native-share validation.
- Preview uses software fallback, not GPU acceptance. No claim of physical iOS/Android or native share-sheet verification.

No publication receipt yet; this document describes the reviewed source candidate only.

## Local preview SVG limitation

The unchanged Beer SVG matches remote Git blob `134f2c595a903257a51d12d271fad5c10e2032a2`. It parses as XML locally and its embedded PNG is readable. Managed-preview browser access reports an unterminated comment at line 32, although the source SVG is a single line. Direct access shows the cup before that injected-response parse error; the homepage image element cannot decode that preview response. The original SVG is not modified to compensate. This limits local full-homepage visual verification and needs confirmation on the existing deployed host.
