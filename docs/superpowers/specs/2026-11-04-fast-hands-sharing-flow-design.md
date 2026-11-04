# Fast Hands sharing, practice and navigation design

The user approved the discussed three-part design on 2026-11-04 and explicitly asked to leave speeds unchanged. This is execution of that decision, not a new game redesign.

## Goals
- Catch and duel share the same complete scorecard and sharing choices as duck: Threads text/link intent, mobile file sharing with local image fallback, desktop image download, text/link copy.
- Practice success or loss offers two fixed-position choices, repeat practice or manually start the real challenge. No success gate and no automatic scored start.
- Replace the browser confirmation with a styled accessible game dialog. An unfinished attempt is interrupted before the dialog. Cancel retains completed rounds and requires a manual retry; never resume a stale reaction clock.

## Approaches
The approved approach extends existing local scorecard/sharing code rather than adding a service or changing the separate scoreboards. A styled HTML dialog replaces window.confirm rather than trying to style native browser prompts. Practice remains optional to repeat rather than requiring a win.

## Constraints
No change to levels-rules.mjs, duck rules, timing, AI distributions, scores, leaderboard schemas or existing desktop/mobile gameplay geometry. Preview branch only; main is out of scope. Threads receives text and URL only; image attachment remains a user action. Native file sharing is capability-dependent with an honest fallback.

## Interaction details
The modal owns one pending destination, locks gameplay before interruption, and prevents duplicate navigation and activation-key leakage. Escape means stay. Cancel restores a safe usable control, not a hidden action button. Interrupted pending attempts retry, already settled feedback continues to its next round. Replay is stopped without changing score or opening an overlay behind the confirmation. Existing result images are frozen per run; stale share callbacks cannot affect a later result.
