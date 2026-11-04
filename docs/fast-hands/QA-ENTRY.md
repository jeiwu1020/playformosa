# Entry rendering and readable introduction

Baseline: preview/hurdles at3b3c09c54c910d69bad11708f5d3e011f8bb9794. Main is not changed.

## Reproduced cause

The shared entry controller could reveal the page while the duck renderer module was still pending. The original loading branch both displayed and painted the old2D canvas, then changed to WebGL or the offline demonstration later. A delayed-stage regression reproduced two legacy draws before readiness. This was a rendering-order issue, not a scoring change.

Mobile introduction card text was11px, with12px desktop copy. The start button's intended styling also lost to a more specific generic button selector in the real browser, despite JSDOM reporting the later rule.

## Changes

- A neutral preparation surface stays inside the existing stage. The hidden WebGL canvas retains its real layout dimensions; its first successful frame is painted before it is shown. Loading no longer draws or exposes legacy artwork.
- A five-second preparation timeout selects the existing fallback once. A late WebGL result is disposed rather than replacing that choice. First-paint errors and departures are handled; the original playable fallback remains available when WebGL genuinely fails.
- Starting a scored game waits for renderer selection. Scoring, input gates, existing animations, records, leaderboard and sharing logic are unchanged.
- Intro card titles are17px, copy/subtitle15px, and the start button17px with a48px minimum. Secondary buttons retain44px targets. Reduced decorative spacing keeps the full text; short landscape puts the duck intro's three actions in one row.

## Verification

- Startup regression7/7, including first/return visits, late readiness, timeout, first-paint failure, departure disposal, playable fallback and CSS visibility gates. The primary failure tests were observed red before implementation.
- Browser entry/typography fixture174/174: all three intros at320x568,360x640,390x844,844x390,1366x768 and1920x1080 fit within the viewport without inner scrolling. At320x568 the duck dialog is509px high; at844x390 it is364.39px. Actual browser styles show15px copy and17px/48px start controls.
- Browser play/regression fixture680/680 across ten sizes, with unchanged stage/control placement and repeated result dialogs.
- Controlled browser delayed/immediate renderer scenarios simulate cold/warm readiness for first and returning visits. Rejection, late completion and first-paint failure were also exercised. No loading observation exposed the legacy canvas; the simulated first paint occurred while the renderer was still hidden/loading and used the full364px stage width at390px viewport width.
- Normal browser interactions covered initial entry, starting the demonstration, both new modes back to duck, and Back/Forward. Returning did not reopen the intro; fallback demonstration and controls remained available.
- Focused integration/provenance79/79 and fail-closed generator8/8 passed. Fast Hands suite446/447 passed; its only failure is the inherited missing javelin icon.
- Full suite1878/1900 passed, with exactly the same22 baseline failures for absent historical binary assets and database-test dependencies. There are no new failure labels; this is not a clean aggregate-pass claim.
- Static build and preview release preflight passed after the final runtime changes. Incremental publication preserves remote files absent from this minimal reconstruction.

## Limits

The cloud browser cannot create WebGL contexts, so normal interactions use the existing fallback. Controlled renderer tests verify sequencing, sizing and failure handling, but do not establish real GPU rendering on physical phones or desktops. Cold/warm readiness was simulated without clearing the browser's entire cache. Browser frames test mobile geometry, not physical-device safe areas, browser chrome or font scaling. Extremely short260px-high screens retain internal dialog scrolling rather than shrinking the requested readable text.

The outer ENTRY-MANIFEST reverses three changed files and one new CSS file, preserving59 other Fast Hands runtime files and11 historical ledgers exactly. Deployment verification is recorded separately after publication.
