# Unified Fast Hands QA

Base: a35cea8f150a3bab67ecd0ada34b437455906aaa, preview/hurdles. Main is outside this change.

## Delivered behavior

- One brief introduction per tab session describes all three games. Starting enters the duck demonstration. The introduction can be reopened from the menu.
- A shared navigation/controller and consistent stage-first layout cover the three existing routes. This is cross-route navigation, not a same-document SPA. Direct links and independent game engine lifecycles are retained.
- An active switch stops the clock before asking for confirmation. Cancel retains completed rounds and returns the unfinished attempt to a fresh ready state. Back/forward restoration remains paused instead of resuming an old timer.
- Catch and duel results are native bounded dialogs with retry, practice, mode switching and expandable round details. Duck replay, sharing, record and voluntary ranking actions remain available. Small result dialogs scroll their supplementary content internally, while the score and retry remain accessible.
- Main controls occupy fixed-height slots through waiting, action, feedback and result dismissal. Normal layouts are vertical on desktop and mobile. Extremely short landscape screens combine toolbar/navigation into one row rather than hiding controls.

## Verified

- Browser fixture: 680/680 assertions, across duck/catch/duel at 1000x560, 1024x600, 1366x768, 1920x1080, 320x568, 360x640, 390x844, 430x932, 768x1024 and 844x390. It checks body and document height, horizontal overflow, stage order, action bounds and stable position, result bounds, and repeated results after native asynchronous dialog close events.
- All ten tested dimensions fit the play surface into one viewport. At 844x390 the stage is deliberately compact: duck110px and catch/duel122px. Touch controls remain at least44px tall.
- Real browser interaction: initial introduction/start/duck demo, direct mode switch without another intro, cancel and accept a busy switch, paused Back restoration, duck terminal result and retained result actions. Visual inspection covered narrow portrait introduction/play/results, desktop duck result and short landscape play.
- New/regression cases include queued dialog close events after retry in both modes and deferring results while the introduction is open. These failures were reproduced before the fix.
- Focused provenance/startup/result checks: 69/69. Manifest-generator negative cases:6/6.
- Fast Hands suite:424/425 passed. The remaining failure is the pre-existing missing javelin apple-touch icon in this minimal source reconstruction.
- Full repository suite:1856/1878 passed. All22 failures are the same baseline failures, involving missing historical binary assets and unavailable database-test dependencies. No new failure was introduced; this is not a claim of a clean aggregate run.
- Static build and preview release preflight both passed after the final runtime changes.

## Preservation and limits

The reversible CLUB-MANIFEST records five changed runtime files, two new shared files and55 byte-exact preserved Fast Hands runtime files. Existing rules, timing, input gate percentages, motion assets, artwork, score schemas and server ranking behavior are unchanged. Historical ledgers are preserved.

The cloud browser cannot create WebGL contexts. Browser interaction used the existing 2D fallback; 3D source/math tests passed, but actual GPU/device rendering was not verified. Mobile dimensions were exercised in browser frames, not on physical iOS/Android devices. A real-device smoke test remains useful, especially browser chrome/safe areas, font scaling and graphics.

Publication uses an incremental tree based on the remote tree, not the incomplete local reconstruction. No unrelated remote files are deleted. Deployment and live verification are recorded separately after publication.
