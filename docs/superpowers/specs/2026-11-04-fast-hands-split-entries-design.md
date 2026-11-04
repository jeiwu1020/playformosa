# Three Fast Hands entrances, recorded starts and a richer duck scene

The user approved three homepage cards with separate recorded starts, keeping the in-game mode tabs and existing direct links/boards. Each homepage entrance shows only that mode's short introduction. Tabs inside the club skip repeated introductions. Duck retains its demo; catch and duel retain score-free practice. No speed or gameplay changes.

## Approach

Keep the three existing routes and controllers rather than cloning games or introducing a client router. Add exact allowlisted nested routes and existing generated covers to the homepage renderer. Homepage links carry an introduction intent; the current same-tab continuation/session rules still skip introductions when moving among game tabs. First-ever direct entry into catch/duel must begin there, never redirect to duck. Reopening help must not reset a paused match.

Use the established anonymous, best-effort count protocol with separate keys `fast-hands`, `fast-hands-catch` and `fast-hands-duel`. An actual official duck pointer arm or first formal catch/duel round starts one record. Demo, practice, replay, subsequent stages/rounds and interrupted-current-run retries do not add records. Preserve duplicate UUID suppression, 2-second cross-game cooldown and existing daily caps. A successful empty totals query yields zero; unavailable remains unavailable. Counts begin with activation, not fabricated historical estimates. Existing schema 002 accepts arbitrary counter-key text; no D1 migration, production database or credentials changes are needed.

The user also requested modest duck scene enrichment based on the public reference at https://www.threads.com/@codemtcspeed/post/DfAV1SfjDYY. It was viewed without sign-in or downloading its media: light warm-gray tabletop, muted masonry, cream kitchen cabinets and a dark rear recess. Build original lightweight geometry/canvas details inspired by this setting, not copied video pixels. Keep the existing character, bill/duck geometry and timing unchanged, with neutral visual hierarchy and mobile-friendly static decoration. Do not alter the other two scenes.

## Later approved presentation scope

The duck game's formal display name is 鴨沒漏補 across homepage, tabs, introduction, help, result, leaderboard headings, share text, download filename and score-image heading. Preserve canonical routes, board/game IDs and all existing record keys. Its 1080×1350 share card gives the actual 900×620 scene its full 900×620 area without cropping the actor, retains legible results and keeps the studio signature.

All three game surfaces disable text selection and native long-press menus. Keep native editing for inputs, textareas and explicitly editable/copy regions; keep the image-save fallback available. Do not change touch-action, gestures, input distances or keyboard copy behavior.

Regenerate only the duel intro/home card using the actual homepage athlete image as imagegen reference, alongside the approved king cover. Preserve athlete face, swept-up hair, orange singlet, navy shorts and compact build. Preserve original artist evidence and archived images; new asset hashes live in a new task-specific provenance record.

First-entry auxiliary settings return to the unacknowledged intro on close, including Escape. Gameplay remains blocked until explicit Start. Reopened help must not reset or recount an interrupted run.

## Verification and publication

Baseline is 0e3456edc01268724ebcc3eecf7d5be31272dccb. Back up and preserve old manifests, runtime and backend history through an outer provenance layer. Tests use fake fetch or local SQLite only. No public count or score POSTs, including homepage-view tests. Browser gameplay tests run in an isolated local preview; live checks stop before formal starts and use read-only endpoint/source checks. Verify small phones and short desktop/landscape layouts, direct/old/home/tab entrances, interrupted/repeated runs, count dedupe/rate limits, result/replay/share regressions and scene geometry. Publish only preview/hurdles and verify Cloudflare; main stays unchanged. Hardware WebGL remains an explicit environment limitation.
