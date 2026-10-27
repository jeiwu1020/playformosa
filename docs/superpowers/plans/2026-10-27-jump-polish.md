# Jump share, sound and local flavour Implementation Plan

> **For agentic workers:** Use executing-plans, inline execution. User approved the audited design and direct release; remote writes remain locked by root until Beer is published.

**Goal:** Simplify onboarding, fix score PNG layout, make image-first sharing reliable, add licensed audio and route-specific humour without changing gameplay.
**Architecture:** Keep physics/control/world data unchanged. Dedicated text metrics layout, pure route flavour data, and testable audio controller; game.mjs wires events.
**Tech Stack:** Browser ES modules, Canvas 2D, Web Audio, node:test.
**Spec:** User approved recommendation 2026-10-27: initial「從台北出發，你能跳多遠？」; remove verbose route/mileage caveats; independent scorecard sections; image-first sharing plus copy text/URL; CC0 BGM/action sounds; 3–5 local food lines per active stop.

## Global Constraints
- No changes to physics, mileage conversion, controls, scenery, record namespaces, Beer or homepage catalog.
- No Codex calls. No remote writes before root lock release.
- No guarantee of Threads preview suppression or receiving-app completion.
- Audio assets must have original source/license provenance. Do not claim audition without listening.
- Durable Library checkpoints before release; local archive alone is not persistence.

## Review Focus
- Very long score/locality/verdict and foul must not overlap.
- Mobile share cancellation/denial must not trigger unexpected fallback.
- Audio resume rejection, mute during unlock, pause/restart, missing asset must remain playable and truthful.
- All route ids, including space, have local fictional jokes without implying actual tourism or real space food.
- Latest main can include Beer: publication must apply only owned delta atop fresh parent.

## Tasks
- [ ] 1. RED tests for simple copy, file-only sharing and metric block separation; implement; run full suite. Files: capture.mjs, presentation.mjs, share.mjs, index.html, game.mjs, tests.
- [ ] 2. RED route coverage and repeat/category tests; add flavour.mjs and wire verdict/arrival; full suite.
- [ ] 3. RED asynchronous audio lifecycle and event tests; add audio.mjs with licensed asset manifest; wire game events, pause/mute/resume, accessible status; full suite.
- [ ] 4. Build/verify; browser PNG and controls/UI QA; fresh review; fix important findings RED→GREEN; durable source + license + evidence checkpoint.
- [ ] 5. Root releases remote lock, publish owned delta atop current main, verify exact remote commit + deployment assets; never replace root tree.

## Ledger
- Baseline 143/143 tests pass. Read-only GitHub snapshot at 61813da with production hero blob restored; isolated branch jump-polish.
- Ruling: user's prior detailed design approval satisfies plan handoff; no redundant approval request. Root owns publication gate.
- Task 1 complete: four regression tests RED→GREEN; full suite147/147. Old caveat/payload assertions updated because approved requirement explicitly supersedes them.
- Task 2 complete: all47 active ids have3 authored local endings (141); action/category prefix preserved, space explicitly imaginary; full suite149/149. Ruling: world_complete retains existing achievement-first category rather than forcing head contact prefix.
- Task 3: downloaded CC0 originals and derivatives, implemented unlock/preview/mute/pause/event controller; full suite156/156. Pause-during-unlock regression caught and fixed before checkpoint. No subjective audio audition claimed.
- Final review: fixed pending-unlock status and overlapping operation races; each RED→GREEN. Food rotation test added RED→GREEN so three repeated visits use all three foods. Final full check159/159, build and48references pass.
- NativeCanvas actual-pixel QA covers27km, foul, long score+locality; passed. Browser QA blocked by platform sandbox/socket and escalation bwrap setup, not application failure; no sound audition or physical-device share claimed.
- Publishing remains pending root's single-writer lock release; frozen delta excludes homepage/catalog and immutable gameplay files.
