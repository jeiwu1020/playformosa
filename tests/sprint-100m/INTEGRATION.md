# Sprint 100m preview integration

Source: frozen V6 commit `88d1815488a251ca648b7e121664dee31b3a30c8`, source ZIP SHA256 `ccde07464125deb851ef09a47a213372a4d2b3cd4e8e7921d9ddf483b24d67ce`.

## Scope
- Copied approved source into `/games/sprint-100m/`; no changes to race/AI, body pose, renderer, camera, runout, recorder, audio engine/assets or record modules.
- Shared platform Home/start/help/pause/audio menu; keyboard and touch mappings retained. Header controls remain >=44px; landscape uses side controls and portrait uses lower controls.
- Intro has two primary operation lines; extended instructions and licenses live under a disclosure. Removed prototype/version-calibration clutter from the visible scene.
- Result preserves actual immutable finish canvas. Same score/verdict branded PNG plus Threads/current-origin link/manual copy and supported fallback. Sharing never writes a new score.
- Records remain local to the browser. Existing V6 storage is preserved; no new online score service.
- Pause/help/blur/rotation release held inputs; explicit resume rebases animation timestamps. P/Escape can resume the common pause menu; form fields ignore gameplay shortcuts.

## Checks
`node --test tests/sprint-100m/*.test.mjs` covers original V6 physics/replay/audio tests plus approved-source hashes, actual DOM shell/controller lifecycle, keyboard/pointer cancellation, real simulated race completion, replay score stability, next round reset, file sharing/cancellation/denial/late completion and encoding retries.

Node DOM/canvas adapters do not establish real GPU, Safari or native mobile touch/share acceptance. Parent integration owns aggregate platform tests and browser visual verification.
