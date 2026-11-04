# Fast Hands result sharing

Base: `preview/hurdles` at `90dd5ec4466a4065bc2d5e8a14d75b3cf8ec3a8b`.

## Design and scope

Compared the existing Beer Slide, Long Jump, Javelin and platform result standard before implementation. Preserve gameplay, original scorecard/character, records, leaderboard, actual-round replay and all other games. Only Fast Hands result presentation changes.

The result has three separate share actions in platform order: Threads, image, and copy result/link. Phones/tablets use a prepared PNG with `navigator.share({files:[file]})`; desktop retains direct PNG download. Detect mobile user agents or a primary coarse pointer rather than treating touch-capable desktop hardware or a single touch input as a phone.

The PNG is encoded before the click to preserve transient user activation, and is frozen to the actual result and input category. Reopening or replaying the same round reuses its image. Cancellation does not download or post elsewhere. Unsupported/rejected image sharing displays the PNG for manual long-press save. Clipboard denial displays readonly selectable text with native touch callout enabled.

Threads opens a compose intent with the result and the current-origin canonical `/games/fast-hands/` URL. It does not publish automatically or attach the PNG. The player confirms posting in Threads, and attaches an image manually if desired. No login, new API credentials, third-party upload service or database change is included.

## Verification and limits

- Automated coverage includes pre-encoding, synchronous files-only share, exact result/filename, cancellation, unsupported/throwing APIs, retry/timeout, duplicate actions, original-round identity, callback isolation, clipboard denial and URL cleanup.
- Cloud Chrome responsive fixture: 265 checks passed across 12 sizes from 320×568 and 568×320 to 1280×900. This includes the previous gameplay/replay/ranking checks and the new share links, mock mobile share/cancellation, fallback PNG, copy, 44px targets and overflow checks.
- Independent review found and then reverified a fixed cross-action callback race: an old clipboard rejection can no longer reopen a dismissed image fallback or replace newer feedback. Latest independent focused review: 35/35 passed, no remaining P0/P1/P2 findings.
- Native desktop mouse completed a round in 0.476 seconds. The original desktop download produced a visually inspected 1080×1350 PNG; real clipboard copy reported success. Synthetic fixture local bests are not human scores or online submissions.
- No real Threads post or additional QA leaderboard record was sent during this change.
- Physical iOS/Android system share sheets, Photos saving and real touch hardware were not tested. System share destinations depend on the browser/OS. Cloud Chrome lacked WebGL, so actual UI testing used the disclosed 2D fallback; character/model code was unchanged.
- The materialized checkout still lacks the unchanged Beer Slide `audio/chill-menu.mp3`, causing eight known full-suite failures. No file or passing result was fabricated; exact remote CI with the original file remains the deployment gate.

References: [Web Share standard](https://www.w3.org/TR/web-share/), [WebKit user activation](https://webkit.org/blog/13862/the-user-activation-api/). Threads behavior follows the existing platform's compose intent; Meta's documentation endpoint could not be retrieved during this check (429).
