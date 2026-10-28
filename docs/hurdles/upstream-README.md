# 四肢各有想法－跨欄 | PlayFormosa

Standalone, owner-private 110m hurdles time trial. Buildless static ES modules; no external runtime dependencies, accounts, analytics or server storage.

## Run
Serve `dist/` over HTTP. In this managed environment: `sites-preview start <checkout>` uses `.openai/hosting.json`. Run `npm test` for deterministic physics/input/share tests. Production source belongs to a new Sites project, not the PlayFormosa GitHub repository.

## Play
- J / K: left / right arm. Swing to balance and recover from stumbles.
- A / S: left / right leg. Short alternating taps accelerate.
- Hold a leg (0.24s+), release to jump. Release soon after the ready outline for a low fast crossing; longer holds arc higher. Hold legs while airborne to raise them. A fresh short tap within the final 100ms before landing can connect one stride; old held air input never queues a jump.
- Eight hurdles (18m first, then 11.5m gaps; final at 98.5m) topple on actual limb/bar contact. Stumbles are recoverable; timing beats simply knocking everything over. Finish time is the score, optional humorous distinctions do not alter it.
- Each start/replay has a 3–2–1–開始 countdown; race time and movement remain frozen until GO.
- Escape pauses; rotating or hiding the page pauses and clears input. Resume does not launch a stale charged jump.
- Local best lives only in browser localStorage, in a new eight-hurdle namespace separate from the old ten-hurdle record. The finish picture is generated locally. Desktop downloads PNG; supporting mobile browsers open native file share, with download fallback. Threads opens a text/link composer only; image attachment is manual and private links remain private.

## Architecture
- `dist/physics.mjs`: fixed-step pure simulation, pose-driven collision and fact-based ratings.
- `dist/character.mjs`: original PlayFormosa mesh/material construction, with 3D joint helpers for the outward trail leg.
- `dist/render.mjs`: Three.js course, camera and exact frozen-state photo.
- `dist/software-renderer.mjs`: same scene graph triangles for WebGL-disabled browsers, not substituted art.
- `dist/input.mjs`: multi-pointer/keyboard and assistive source tracking.
- `dist/result-guard.mjs`: physical-contact boundary, quiet release, fresh result gestures and accessible keyboard activation.
- `dist/game.mjs`: accessible UI, pause/orientation, audio/event, result lifecycle.
- `dist/share.mjs`: mobile/desktop image actions and 1080×1280 card composition.
- `dist/audio/`, `source-assets/`, `docs/audio/`: deployable audio, retained originals and licensing evidence.

## Verification limits
See `docs/QA.md`. The cloud browser disables WebGL; the actual browser pass used the exact-mesh software renderer. WebGL and physical mobile native-share testing are not claimed. All six audio files actually decoded in browser and AudioContext reached running after user input; audio wasn't subjectively listened to. Attribution/license evidence retained. Some historical pre-encoding action WAV originals were absent from upstream Library backup; unchanged released encodings are included.
