# Studio attribution candidate for existing main games

Base main: `90e6690ca248752917955839d8c1ee2903a903d2`, with the unpublished `loading-main` overlay retained.
Attribution source: `1b79d1f22f84638f44b69bd7274bc84670af4876`.

## Scope

- Hurdles and Reaction Rod: add the preview's heading attribution, result attribution and stylesheet reference without replacing their HTML documents.
- Shared entry: change only the brand text to `島遊無界工作室 | PLAYFORMOSA STUDIO`. No audio branches or gameplay changes are imported.
- Add the exact preview `studio-brand.css` blob `18ba8abc165e498154dd167de0c0045e36b7df36`.
- Admit only that CSS through a new source-manifest public inventory list in build and verification.
- Preserve every older source ledger. The read chain is Studio → Loading → Rod. A later Jump promotion must add its own outer reversal layer.
- Long Jump's HTML and game modules are intentionally untouched here; its separate full promotion owns them.
- Hurdles and Rod share renderers already match preview byte-for-byte and already display `PLAYFORMOSA STUDIO`; they remain unchanged.

## Evidence on 2026-11-04

- Test-first studio suite: six missing-attribution failures before implementation; the unchanged-sharing assertion already passed.
- Studio, source provenance, loading and upload-scroll focused run: 63/63 passed.
- Full `npm run check`: 696 tests, 690 passed and six failed. These are the same original-asset availability failures recorded in `docs/loading-main/VERIFICATION.md`; there are no new failing tests.
- Full build/verification and real browser/mobile checks remain blocked. The four large original assets remain missing locally and have not been substituted.
- `git diff --check` passed.

No remote commit, branch update or deployment was made. This candidate must be integrated with the separate Long Jump change, receive the exact original missing assets, pass the complete aggregate checks and browser checks, and be reviewed against the latest main before publication. Its local Git history is a comparison snapshot, not a deployable or pushable repository baseline.
