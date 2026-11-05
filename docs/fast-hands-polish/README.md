# Six-game upload and Fast Hands toolbar repair

Base: `jeiwu1020/playformosa` main `2857cf68e6cf45f0cbb0e7a3e63520dba60e2c41`, tree `8b2d255b710933b2370c950706c8299ce8d7dacf`.

## Approved scope

- All six released games use one 60-second upload cooldown per scope, anonymous device and game. Duck mouse/touch rules share the same game cooldown. No game mechanics, scoring, assets, SQL schemas or production bindings change.
- Both leaderboard repositories preserve submission deduplication, best-score comparison, the scope-wide 1,000 accepted submissions per UTC day and 10,000 best-record capacity. Cross-game cooldowns are independent; quotas remain shared.
- Cooldown HTTP 429 gives the exact remaining seconds. Daily and capacity limits have separate reasons without a false short deadline. Clients show a disabled countdown, keep the same result and submission ID for manual retries, and do not spend network-retry attempts on 429. Timers never submit scores automatically.
- Fast Hands three pages share Home, title, Restart, Ranking, Settings and Help, followed by level navigation. Opening tools safely interrupts input; closing returns to the paused game or original result. Existing audio/input settings remain available. Remove test/QA user-facing ranking labels while retaining privacy, consent and measurement caveats.
- No preview branch, unreleased game, production test score, database write or account/configuration change is part of this repair.

- Follow-up acceptance repair: Help, Settings and Ranking share padded headers, parent-constrained scrolling content and reachable return controls. All three Help views link to the real ranking/settings and return to their own Help context. Settings retain only actual per-game controls and accurate operation explanations; result tickets, upload payloads and other games' artwork remain unchanged.

## Provenance

The new ledger stores the exact before/after SHA-256 and Git blob identities of modified tracked files. Its base is independently pinned to the 544-file remote main tree. The prior release ledgers and baseline fixtures remain byte-identical. Historical tests reverse this repair before applying the older release layers. The only new public runtime file is `games/shared/upload-cooldown.mjs`; build and verification enforce the complete 254-file public inventory.

## Validation limitations

Real DOM/controller tests cover six-game cooldowns, manual retries, stale requests, duplicate success, dialog closure/new rounds and toolbar interruption. Responsive CSS is checked across representative viewports. Native cloud-browser verification of the accepted preview covered all three games at 320×432 and 1181×757 CSS pixels, plus a 590×378 short landscape viewport. First and returning introductions, pointer and keyboard closing, child-panel returns, pause/manual continuation, stable Restart controls and complete bilingual branding were checked. Physical phone/Safari and WebGL were not tested; the existing 2D fallback was verified. No fake score was submitted.

The user accepted preview `f0ff36a3c0afe1bdf3bfa5b34086a4626e810a1d` and explicitly approved publishing the three Fast Hands games to main. This isolated candidate includes the previously approved independent cooldown repair for all six released games. The original main commit above is the rollback anchor. Do not merge the entire preview branch: its other games and test-console content are outside this release.

The in-progress Restart control sits in the upper toolbar, not the lower play area. Lower duplicate reset controls are unavailable during active/paused/inter-round play; completed-state and result-ticket choices remain. Restart keeps its existing explicit reset behavior, while auxiliary panels preserve the interrupted view.

## Accepted final entry and toolbar behavior

- First and returning introductions both show X. X, Escape and Start initialize the score-free demo/practice-ready surface once; closing never starts a counted attempt or automatically resumes a paused round. Held input is drained safely, including queued dialog-close events and BFCache returns.
- The upper controls are five equal-width, 44px-tall buttons with 14px text: Home, Restart, Ranking, Settings and Help. The Home label is explicit, title and full Chinese/English studio signature appear below, and Restart stays visible but disabled before a restartable state.
- Short or highly zoomed screens remain scrollable instead of clipping controls. Existing game rules, timing, scores, renderer assets, data and all unrelated runtime paths are unchanged.
