# Unified Fast Hands interface plan

Goal: One brief club introduction, consistent scene-first play screens and result dialogs, with safe mode switching and preserved gameplay.

The user approved implementation in the existing cloud task and publication to preview/hurdles. Main is excluded.

## Architecture

Keep the three canonical routes and independent game engines. A small shared club controller owns session introduction and guarded cross-route navigation. Shared CSS owns the scene-first layout and dialogs. This avoids merging the duck game's global replay, leaderboard, pointer-capture and renderer lifecycle merely to achieve a visual transition. Same-document engine consolidation is deferred; direct links remain supported.

## Tasks and checks

1. Shared entry and navigation: write failing tests, implement club.mjs and narrow duck lifecycle hooks. First visit shows three concise game cards; Start opens duck demonstration. Subsequent mode switches skip the introduction. Busy switches ask before discarding the run and stop the active timer. Cancel resumes from a safe ready state, never elapsed modal time. Test blocked storage, modifier links, same-route clicks, repeated navigation and history.
2. Shared layout: write failing structure tests; add club.css after current CSS and the enabling class. Scene above text and controls in every mode; preserve duck track width, percentage gates and timing. Check 320×568 through desktop1920×1080, including landscape844×390. Reserve controls, collapse secondary descriptions rather than shrinking touch targets or masking overflow.
3. Result dialogs: convert catch/duel summary to native dialogs with safe fallback, retain score/list pagination, add replay/practice actions, preserve 520ms visual completion before opening. Duck result/leaderboard/share functions remain present. Test close/reopen/new game and no behind-dialog input.
4. Add reversible outer provenance over a35cea8, preserve old ledgers and unaffected runtime bytes. Run affected tests, full suite, static build and preview preflight. Existing reconstruction failures must be distinguished from regressions.
5. Use shared preview only after coordination; verify all three flows, interruption and repeated switches at desktop/mobile sizes. Backup final delta; publish incremental tree to preview/hurdles with lease and verify exact commit's deployment and live behavior.

## Constraints

No changes to reaction/catch scoring, AI timings, duck record schemas or leaderboard behavior. No new dependencies or paid services. No new Codex task. Readable ordinary content, no emoji art. Real GPU/WebGL verification is unavailable in this cloud browser; use source/contact tests and state that limitation.
