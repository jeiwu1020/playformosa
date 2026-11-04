# Fast Hands Result Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox syntax.

**Goal:** Put explicit, consent-based score upload in each result ticket and enlarge clear intro images.
**Architecture:** Rehost the existing single upload form within the result ticket. Keep immutable payloads and board controllers; add an optional inline host adapter and preserve default board behavior.
**Tech Stack:** Vanilla browser JavaScript, CSS, Node tests, JSDOM, existing canvas fixtures.
**Spec:** docs/superpowers/specs/2026-11-04-fast-hands-result-upload-design.md

## Global Constraints
- Publish only preview/hurdles; main, speed, AI, rules and remote database unchanged.
- No live score submission or social post during QA.
- Preserve sharing, replay, historical scores and top-20 display semantics.
- Use dot cloud and existing task; no new Codex task.

## Review Focus
- Close/replay/new-round while submission is pending: abort observation, preserve truthful uncertain status and idempotency.
- Board-to-result transitions never duplicate form IDs, scores or listeners.
- No consent or invalid result cannot POST; own rank over 20 still accepted.
- Small phone/landscape: primary controls remain visible; form scroll and keyboard focus accessible.
- Introduction imagery clear and not distorted without changing first-entry/demo behavior.

### Task 1: Single controller form rehosting
Files: leaderboard.mjs, levels-leaderboard.mjs, optional shared helper, new controller tests.
- [x] Add failing tests for optional inlineUpload host/trigger/hint/resultDialog and showResultUpload().
- [x] Implement rehosting, explicit-submit guards, close/retry handling and eligibility/status hints.
- [x] Run old and new controller tests, including own rank >20 and no-POST paths.

### Task 2: Result UI and app wiring
Files: index.html, catch.html, duel.html, finale.css, app.mjs, levels-app.mjs, new/updated integration tests.
- [x] Add failing structural and real app flow tests.
- [x] Add four fixed action slots, hidden upload host and reason text; wire controller options and showResultUpload.
- [x] Keep existing board upload path and all sharing/replay behavior.

### Task 3: Intro image clarity
Files: club.css intro rules and three HTML intro cards; new visual contract tests.
- [x] Pin readable, consistently sized representative image cards in tests.
- [x] Update existing scene image references and concise copy; increase card image area without distortion.
- [x] Inspect phone, landscape and desktop presentation.

### Task 4: Integrity and verification
- [x] Seal a new reversible provenance layer on baseline 6751a1a, preserving older ledgers.
- [x] Run focused and full tests, compare exact known baseline failures, build and release preflight.
- [x] Browser actual and authored-fixture checks: form opens within same result, consent, no automatic POST, button geometry, scroll/focus, interrupted/repeated flow, intro clarity.
- [x] Independent review, address findings, rerun affected checks.

### Task 5: Authorized publication
- [ ] Package exact delta and independent rollback backup, recheck remote parent, create commit and lease-update preview/hurdles.
- [ ] Monitor exact Cloudflare build to terminal result and verify live UI without score submission.
- [ ] Report exact commit, untouched main and verification limits.
