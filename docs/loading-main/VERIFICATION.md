# Main-only loading screen candidate

Base: `90e6690ca248752917955839d8c1ee2903a903d2`.
Sources: startup `4cb67f2f56be12e66c3f1669249ac2f33f40cc12`; loading look `90dd5ec4466a4065bc2d5e8a14d75b3cf8ec3a8b`.

## Scope

Only the three released game HTML documents gain the inline loading card, CSS, bootstrap and modulepreloads. No new public file or game is added. Removing these exact insertions recovers all original HTML bytes. Main game modules, production bindings, schemas, APIs, scoring, records and existing source ledgers remain byte-identical.

Main-specific adaptations:
- Reaction Rod preloads its existing `./layout.mjs`, not preview's different layout import.
- Long Jump's original WebGL-error dialog with a disabled start button is recognized. It retains the error message, receives reload/home links, and releases the loading gate. Normal successful startup still waits for the real shared entry.
- Historical source checks read through a separately hash-pinned reversal layer. Existing ledgers are not rewritten.
- The result-only Rod upload test fixture now completes the real entry/bootstrap handoff before exercising its unchanged scroll assertions.

## Verification on 2026-11-04

- Test-first loading behavior: 16 new tests failed before implementation, then all 16 passed.
- Loading and upload-scroll focused run: 52/52 passed.
- Focused source scope, reversible HTML and modulepreload checks: 3/3 passed.
- Independent review: 103 loader/controller/menu regression tests passed; 36/36 original upload-scroll assertions passed.
- `git diff --check`: passed.
- All six modified existing file baselines match the pinned main Git blobs. Every other locally available original file remains unchanged.
- Full `npm run check`: 685 tests, 679 passed, 6 failed due to unavailable original large assets. The aggregate did not advance to its final build/verify stages. The build test itself failed its original inventory check.

## Outstanding environment blockers

Four existing files could not be materialized: `public/assets/hero-long-jump.png`, `public/assets/hurdles-card.png`, `public/assets/reaction-rod-card.png`, and `public/games/reaction-rod/audio/chill-menu.mp3`. GitHub's file connector returned empty content for these >1 MB files; its blob operation accepts UTF-8 only. They have not been replaced, approximated or removed. Their expected Git blob identities remain protected in the source manifest.

The six failing tests are:
- build materializes a homepage and preserves the self-contained game
- exact preview dependency bundle and every other main Jump file are preserved
- the hurdles catalog link reaches a self-contained platform game and approved illustration thumbnail
- existing production tree stays byte-identical outside the declared overlay
- Rod promotion ledger protects every existing game, shared module, original schema and production binding byte
- all new production files belong only to Rod and public inventory excludes unapproved games

Real-browser desktop/mobile and real-device QA were not completed because the browser process could not start in the execution environment. DOM tests cover native/standalone entry handoff, failure recovery, late readiness, disabled starts, focus, and repeated entry. They do not establish pixel layout, real WebGL or touch behavior.

This is an unpublished candidate. No remote commit, main update or deployment was made. Before publication: restore the exact four original assets, run `npm run check` cleanly, complete desktop/mobile browser checks, re-read main HEAD, then publish only against an unchanged or deliberately rebased base using a non-forced ref lease.
