# Fast Hands sharing and flow QA — 2026-11-04

## Scope
Complete local scorecard sharing for catch/duel; manual repeat/formal choices after practice; styled safe navigation confirmation. Speeds, AI, scoring, 3D assets, existing boards and remote schema unchanged. Upload-control placement is intentionally unchanged pending separate discussion.

## Baseline and rollback
Published baseline: ad65ebe9eefebfc36590d075a838a24550160ec3, tree 0fd36a2738375d762ced690db363065d490068e6. This local source is a minimal reconstruction rather than a full checkout. All approved delta preimages are verified against the published Git blobs; the new outer ledger preserves every older ledger. The release updates preview/hurdles only.

## Automated checks
- Frozen baseline: 2027 tests, 2013 pass, 14 fail.
- Final source: 2090 tests, 2076 pass, the same 14 failures. No new failures.
- Full suites ran against the same dependency tree. Failures are preserved missing unrelated assets/source evidence from the minimal reconstruction, not waived.
- npm run build passed; npm run check:release -- --expect=preview passed.
- Independent review found and verified fixes for introductory ranking/settings controls blocked by the new navigation guard. Old renderer fixtures now follow the real intro-close-before-start contract rather than clicking hidden controls.

## Browser checks
- 860/860 sharing/layout assertions across all three games at 1000x400, 1024x600, 1366x768, 1920x1080, 320x568, 360x640, 390x844, 430x932, 768x1024 and 844x390.
- 180/180 navigation assertions at six desktop/mobile/landscape sizes: dialogs fit, buttons >=44px, text >=16px, modal blocks background actions, Escape leaves a manual retry, practice choices remain aligned and stable.
- Actual browser interaction verified failed practice -> manual formal start, custom switch confirmation -> Escape -> paused/manual retry, introductory settings, desktop PNG download, actual current result display, and mobile image/clipboard fallback via authored capability fixtures.
- Full PNGs are 1080x1350 and retain the captured 900x620 current frame; pixel tests verify the complete original frame. Threads intents contain only score text and the correct game URL. No real social post or leaderboard submission was performed.

## Limits
- WebGL is disabled in the cloud browser. Actual browser interaction uses the existing 2D compatible renderer. This change does not alter models, motion or rules.
- Native iOS sharing was tested through supported/unavailable/rejection/cancellation capability branches, not on a physical iPhone.
- A separate blob-URL image tab was blocked by browser URL policy and was not retried; the image was inspected in its allowed inline fallback.
- No whole-suite green claim: the unchanged baseline failures below remain.

## Unchanged baseline failures
- actual audio controller still loads and starts with a WebGL initialization exception
- all unrelated runtime sources, workers, data and historical ledgers remain byte-exact
- beer-slide: shipped original runtime and license files match the reviewed import
- build materializes a homepage and preserves the self-contained game
- default constructor preserves Window receiver for shipped push and result sound effects
- default constructor preserves Window receiver when loading and starting music
- echosboundary: original source evidence and local image bytes are preserved
- every runtime audio file matches preserved licensed derivative SHA256
- formosabattle: original source evidence and local image bytes are preserved
- polish has exactly four reversible presentation files and preserves all other runtime bytes
- previous games stay in correct shelves after sprint and javelin admission
- real controller touch-up path resumes, requests shipped MP3 and starts one loop; explicit SFX test uses shipped WAV
- sharing preserves other games, loading art, previous manifests, backend, rules, character and score image
- the hurdles catalog link reaches a self-contained platform game and approved illustration thumbnail
