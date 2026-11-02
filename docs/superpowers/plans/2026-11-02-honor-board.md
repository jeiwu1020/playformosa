# Arcade Honor Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give Jump and Hurdles a readable honor board backed by actual QA scores, own best/rank/gap and safe single-view navigation.
**Architecture:** Extend existing indexed D1 repository without migration; same device hash identifies own result. Reuse the entry shell's view owner for ranking instead of adding a competing modal. Preserve frozen manual submission and game state.
**Tech Stack:** Existing ES modules, Workers/D1, node:test/JSDOM/sql.js; no new dependency.
**Spec:** User approved root honor-board proposal, Sentinel_798419d3c66481919eeb40a9ef87d239.

## Global Constraints
- Preview 08d5d4eef20b005f072587d1c093f0ac7543fc41 only; main c92050c6 unchanged.
- Existing Free QA DB and data unchanged; no migration, credentials, billing, physics/camera/PNG changes.
- Two boards only; same nickname is not identity. Manual upload only; client scores are unverified.
- Competition ranks: 1,1,3. Gap is positive difference to nearest strictly better score; tied leaders have no gap. Stable display ties use existing timestamp/device order without exposing identifiers.
- Personalized GET uses X-Leaderboard-Device UUID header, never URL; no-store response. Anonymous top list may retain short cache. Never return device hashes/IDs.
- Top20 plus own row even outside top20. Rank uses indexed strict-better count, bounded by existing 10k stored-best cap; no polling. Same-device UUID can be copied/forged, not authentication.

## Review Focus
- Duplicate/conflicting/concurrent submissions must retain atomic best/admission and truthful bestUpdated.
- Equal scores and extreme finite Jump distances must retain rank/unit/precision without fake percentiles.
- Opening from entry/result/playing/help cannot leave two dialogs/inert traps or auto-resume/start.
- Late requests after close/new round must not repaint or focus a newer view.
- 320px toolbar remains one row, readable controls >=44px; other seven games unchanged.

## Task 1: Real ranking API
- [ ] Add failing SQLite/API tests for ties, own outside top20, nearest better gap, no identity leakage, updated/worse/duplicate/conflicting concurrent submission feedback.
- [ ] Extend repository top/own snapshot and atomic submit result; GET returns entries with rank/isMe and personal own summary; POST returns accepted/duplicate/bestUpdated/own.
- [ ] Run leaderboard repository/API tests and indexed query-plan/cost checks. Preserve original limits and schema byte-for-byte.

## Task 2: Shared honor board view and manual feedback
- [ ] Add failing JSDOM tests for entry->ranking->entry, playing->ranking->pause, result->ranking->same result, fallback focus, stale fetch and frozen payload.
- [ ] Add narrow optional entry-shell auxiliary view API using existing coordinator/controller, no second modal. Mount rank action only for two games; preserve entry start and results.
- [ ] Render icon/title/rule, actual personal best/rank/gap, small top3 badges, aligned scores; submission confirms true update and refreshes board. No fabricated empty rows/counts.
- [ ] Scope one-line toolbar adaptation to two leaderboard games, preserve all labels/44px height; test 320/375/390 and short landscape.

## Task 3: Verification and release
- [ ] Target actual two-game controllers, shared owner, other-seven absence, provenance and no game-state changes; focused tests then full existing gate.
- [ ] Supported managed preview UI checks, labeled mock data locally only; clean QA fixtures.
- [ ] Freeze exact overlay and before hashes; independent reviewer; Library archive fresh-restore verification.
- [ ] Sole publisher CAS preview, full CF, true QA API/read/manual submit/rank refresh and mobile UI. No main or schema writes.
