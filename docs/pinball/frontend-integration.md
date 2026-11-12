# Pinball frontend integration candidate

Source: v0.8.26, commit `6e7ad7a8661349a14607866f8dffae47bc2919c0`; ZIP SHA-256 `cca63446ba25137c484d8d542b93a58b3f9023fb416b593e776f8a4060cbdc40`. Only `game-build/` is imported. No hosting configuration, archive, previous score import, or remote operation is included.

## Integration boundary

68 imported files remain byte-identical, including every physics, camera, artwork, audio, vendor and round-options file, and the original side-rotation iframe entry/shell. The only imported-file deltas are:

- `index.html`: adds the shared scrollbar theme to the unchanged same-origin iframe shell.

- `game.html`: common chrome, actual platform Home link, native result/ranking dialogs, share/upload mounting points.
- `main.js`: explicit platform reset/settle/after-render hooks, actual restart/pause controls, truthful audio status, dialog/text-input keyboard exclusion and WebGL failure controls. Capture occurs immediately after `renderer.render(scene,camera)` before any subsequent resizing.
- `touch-policy.js`: native dialogs, header and editable fields are exempt from the original gesture/context-menu prevention so scrolling, text selection and image saving remain possible.

Additive platform files also measure the header with ResizeObserver, coordinate fixed HUD/intro regions and clip the existing intro frame below the header without shifting the canvas or changing physics. Dialogs preserve readable cream surfaces, and sharing fallbacks update in place without an asynchronous close race.

Additive platform files own snapshot eligibility, leaderboard mounting, independent settled canvas capture, sharing and UI-only styles. Shared `leaderboard-metrics.mjs` adds three strict adapters. Shared `leaderboard.mjs` adds labels and default-preserving `headerButton`/`resultButton` options and validates mode response metadata. Existing callers retain their defaults.

## Submission/lifecycle contract

Actual `game.score` and settled `game.round.limit` are frozen once per engine round. Only `game.state === 'over'` and `reason === 'time'` for 60/180 seconds, or `reason === 'drain'` for unlimited, qualify. Scores are safe integer points from 0 through `Number.MAX_SAFE_INTEGER - 1`. No best-score/local-record storage is consulted.

Boards are `overtime-pinball-60s`, `overtime-pinball-180s`, and `overtime-pinball-unlimited`, with rules `office-v0826-reentry-60-v1`, `office-v0826-reentry-180-v1`, and `office-v0826-drain-unlimited-v1`. All use `points` and status `done`. Three independent shared controllers reuse existing manual disclosure, nickname, cooldown and frozen payload/UUID behavior. Only the settled board's upload is visible. Browsing other rankings/settings cannot retarget it. Cancel/reopen retains that receipt; restart invalidates previous UI callbacks and clears the prior round's offer. These are player-reported casual rankings, not verified anti-cheat results.

The PNG copies actual just-rendered WebGL pixels synchronously to an independent canvas. Encoding occurs from that canvas. Resize cannot change the captured pixels. Exactly three share actions use the current-origin canonical `/games/overtime-pinball/` route. Delayed encode/share/clipboard callbacks are generation-guarded; native dialogs provide manual fallback.

## Verification and remaining acceptance

Focused frontend tests cover snapshots/bounds/mode separation, native chrome structure and capture ordering, duplicate settlement, browsing during submission, cancel/reopen UUID retention, restart/late callbacks, network failure, capture/encode retry, native-share success/cancellation/failure/unsupported and clipboard denial. Existing shared leaderboard upload/cooldown and nine-board tests are also run separately. These DOM/static checks are not full browser or real-device acceptance.

Still required before claiming UI fully verified: original game's real start/pause/resume/reentry flows with platform chrome; 320×568 and 390×844 portrait, 844×390 landscape, 1366×768 desktop and 200% zoom; playing/paused/result rotation in the retained iframe; all targets >=44px without overlap; native focus containment and scrolling; inspect real PNG pixels from two different rounds; iOS/Safari audio activation, file-share cancellation/retry and long-press image save. Run the full platform check after restoration and all integration edits; a focused pass is not a full pass.
