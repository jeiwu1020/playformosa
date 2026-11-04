# Fast Hands finale QA — 2026-11-04

Base: preview/hurdles b444877917ac9cdf473309b976ed0d62178457b4 (tree 1ba7dba2674d0e96b09b1a50b264b34d0ca99e58). Main is not part of this change.

## Delivered
- Three matching result dialogs: actual current-run image, prominent score, retry/replay/ranking, folded details and sharing. Duck original scorecard, share links and ranking remain available.
- Catch replays only the final stage; duel replays only the final round. Playback uses recorded observed events, never recalculates scores, sounds or submissions, and returns to the same result image. Interrupted playback is safe.
- Short synthesized launch/go cues, gesture-unlocked and muteable. No music.
- Straight blue foam dart; caught dart is deposited before lowered dual finger-guns. Final duel first preserves the last-round winner, deposits the prize on that side, then celebrates the overall winner; overall ties stay neutral.
- Independent QA boards for cleared catch stages and duel wins. Existing D1 schema and prior boards are unchanged. No remote database migration or QA score submission was performed. Upload requires player-entered nickname and explicit consent; 0/practice/incomplete/replay runs are not submitted.

## Verification
- Independent frozen baseline, with the same installed dependencies: 1,946 tests, 1,932 passed, 14 failed.
- Final full suite: 2,027 tests, 2,013 passed, same 14 baseline failures, no new failures. Baseline failures are unrelated missing reconstructed assets/source inventories (including old audio and app icons). This is not a claim that the complete repository suite is green.
- Build and preview release-channel preflight passed. No package or dependency manifest changed.
- 720/720 browser assertions across 1000×400, 1024×600, 1366×768, 1920×1080, 320×568, 360×640, 390×844, 430×932, 768×1024 and 844×390 for all three modes. Covered one-page main/result overview, 44px controls, stable primary position, detail expansion without button displacement, current 900×620 snapshots, replay no scoring/sound, repeated result/queued close, and original duck gesture width.
- Actual browser interaction at 1180×757: first introduction → duck → catch practice → scored early loss → actual image → final-stage replay → same result. Mobile-width result and expanded details visually inspected.
- CPU source-mesh fallback frames inspected; shared-motion tests sample every 10ms through the final ceremony, check fixed bone lengths/contact, reverse seeks, tie neutrality and last-round/overall-winner disagreement.
- Legacy provenance ledgers remain byte-identical. New outer ledger checks exact current and previous Git blobs, admits only the named files, and rejects drift/invalid paths.

## Limits
The cloud browser disables WebGL. Browser interactions therefore exercised the real 2D fallback, not GPU rendering or a physical phone. WebGL scene/force-capture logic is covered by module tests and CPU rendering of the shared scene. Audio scheduling/unlock/mute are tested; subjective loudness should be checked on the user's own device.
