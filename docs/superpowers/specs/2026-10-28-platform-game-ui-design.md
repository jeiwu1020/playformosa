# Approved PlayFormosa game UI standard

User approved the four-game preview-only design at 2026-10-28 16:27 UTC. This implements the existing native HTML/CSS/module architecture, not a framework rewrite.

## Intent and approach
Use a shared platform chrome and result action contract while retaining each game's distinctive artwork, typography and game engine. Shared navigation/CSS and small lifecycle helpers avoid another set of drifting copied headers. Rebuilding all games or changing physics/scoring is expressly out of scope.

## Contract
- All four routes have exactly `← 遊戲首頁`, linking to `/`, upper left with identical style, position and size. Header title plus music, restart, pause/resume in that order; minimum 44px targets and truthful accessible state.
- Keep existing keyboard mappings and gesture-gated audio. New Rod music uses the already bundled CC0 Not Jam track with attribution. Beer pause freezes sliding/replay and clears held input safely; an interrupted, unreleased gesture is cancelled without scoring as with existing blur/cancel behavior.
- Results are readable across portrait, landscape, desktop zoom. Beer result leaves the clipped stage for a viewport dialog, with internal scrolling, focus containment/return, and no resize/cropping of the live canvas.
- Common three actions: Threads text+current-origin route, native PNG share/save with desktop download fallback, copy result+URL. Never claim automatic Threads image upload. Beer PNG includes this round's actual visible settled/fall cup, score, verdict and brand; freeze immediately after rendering before a later resize, invalidate on restart, reject late asynchronous callbacks.
- Preserve Rod PNG capability, Long Jump cosmic/diagnostic/root-origin work, all records, physics and scoring. Only preview/hurdles; no push until parent review.
- Add reusable admission documentation and regressions; future games must comply.
