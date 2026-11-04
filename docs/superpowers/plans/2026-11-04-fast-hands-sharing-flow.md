# Fast Hands Sharing and Flow Implementation Plan

> **For agentic workers:** Use subagent-driven development or executing-plans to implement each task with failing behavior tests first.

**Goal:** Bring both new games' sharing, practice choices and switching up to the approved interaction design.
**Architecture:** Retain independent game pages, existing immutable rules and local image capture. Add a level scorecard/share adapter, a shared asynchronous navigation dialog, and explicit practice controls without changing scoring.
**Tech Stack:** Vanilla ES modules, HTML dialog, Canvas PNG, Web Share API, node:test and JSDOM.
**Spec:** docs/superpowers/specs/2026-11-04-fast-hands-sharing-flow-design.md

## Global Constraints
- Keep levels-rules.mjs, score/AI constants and old leaderboard bytes unchanged.
- No remote database changes, paid services or new coding tasks.
- Publish only preview/hurdles after verification; rollback ad65ebe9eefebfc36590d075a838a24550160ec3.

## Review Focus
- Native share cancellation, rejected clipboard and late image completion must not mutate a newer result.
- Practice win/loss and repeated input must never start a scored attempt automatically.
- Confirm cancel during waiting/live/feedback must retain the correct completed rounds and no stale clock.
- Escape/Enter/Space/pointer-release cannot leak through a closing modal; only one pending destination.
- At small mobile and short desktop sizes, fixed practice choices and result actions remain usable without overlap.

## Tasks
- [x] Sharing: write failing level scorecard/adapter tests; add local complete PNG + Threads/mobile/desktop/copy behavior; integrate both summaries; run existing duck share regressions.
- [x] Navigation: write asynchronous dialog tests; replace window.confirm with styled dialog and lock lifecycle; test cancellation, confirmation, focus, repeated and interrupted flows.
- [x] Practice: write win/loss repeat/start tests; provide fixed two-button choices, explicit no-auto-start; preserve rules bytes and timing.
- [x] Integration: seal a new outer provenance ledger against frozen ad65ebe; preserve all older ledgers; run full tests, build and release preflight sequentially.
- [x] QA: inspect desktop/mobile shared preview, exercise repeat/replay/result/share/modal flows, compare protected hashes. Save test evidence and independent rollback artifact.
- [ ] Release: verify remote head unchanged, create commit and advance preview only, follow exact Cloudflare build and validate live. Stop and report denied or uncertain operations without blind retry.
