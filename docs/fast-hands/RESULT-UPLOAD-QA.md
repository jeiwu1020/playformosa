# Result upload and readable introduction QA

Verified 2026-11-04 in the dot cloud against preview parent `6751a1a94d54e40e1ae79af50fb2e408d874186a`.

## Scope and preserved behavior

- All three result tickets have two fixed rows: retry/replay, upload/ranking. Sharing and details remain collapsible.
- Upload reuses the existing form and controller state inside the result ticket. Opening it never submits. Nickname and unchecked public-consent controls remain required; only the explicit submit action sends the frozen current result.
- Invalid, pending, completed and rejected results retain the action slot with a truthful reason. Pending close/new round, board navigation, identical retries, queued close events and replay are covered.
- The introduction uses the existing clear duck cover, catch-ready scene and duel-ready scene, consistently cropped at 3:2 without stretching. Copy is shortened, not the font.
- No changes to game speed, AI, rules, scoring, workers, remote database, historical scores, 3D assets or existing sharing behavior. No live score was submitted during QA.

## Verification

- Full Node suite: **2,143 passed / 2,157 total; 14 failed**. The 14 names exactly match the recorded published-parent baseline, caused by binary assets absent from this minimal local reconstruction. No new failures. These remote files are preserved by using the existing base tree, not deleted or replaced.
- Focus regression: six newly added tests first failed, then all 86 combined controller/app/finale tests passed. Actual 320×568 browser reproduction improved from 23/25 to 25/25 after scrolling to the focused field rather than only the form heading.
- Final targeted provenance/intro/layout checks: **29/29**. Existing entry-media and button contracts: **9/9**.
- Browser fixture: **1,340/1,340** assertions across all three modes at 1000×400, 1024×600, 1366×768, 1920×1080, 320×568, 360×640, 390×844, 430×932, 768×1024 and 844×390. Checks cover scene/control stability, four fixed result actions, inline form, consent, focused field visibility, replay without rescoring, repeated flow and retained image/share output. HTTP submissions are local stubs only.
- Intro browser checks: **126/126** across three modes at six phone/landscape/desktop sizes; representative images, readable text and start button remain within the dialog.
- Local SQLite worker tests: all three boards accept rank 22 after 21 better scores, retain all rows, return top 20 plus the caller's rank. Existing API plus these tests: **21/21**. No remote database access or test score publishing.
- `npm run build`, `npm run check:release -- --expect=preview`, and syntax checks for changed modules passed.
- Independent review found one focus-visibility issue, corrected and reverified; no other actionable findings.

## Limits and rollback

Cloud Chromium used the existing 2D fallback because WebGL is unavailable. Physical iPhone keyboard behavior, native iOS share sheets and hardware 3D rendering were not newly validated. Normal-height result content fits one page; expanded forms/share/details scroll inside the ticket while the primary actions remain fixed.

Rollback parent: `6751a1a94d54e40e1ae79af50fb2e408d874186a`. Immutable runtime preimages and the new outer provenance manifest are included. Independent backup SHA-256: `a844be64f06a1c074b0d8d32c76df2e7b391f7f842617d90102893f1acad9996`.

Raw geometry evidence: [result/upload checks](result-upload-qa/browser-geometry.json), [intro checks](result-upload-qa/intro-browser-geometry.json). Deployment and live verification are recorded separately after the authorized branch update.
