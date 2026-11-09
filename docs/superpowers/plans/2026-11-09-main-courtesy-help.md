# Main Courtesy and Help Promotion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update help for the seven already released games and add Courtesy Contest without releasing any other preview game or changing existing production leaderboards.

**Architecture:** Work from main 4be21f0 in an isolated worktree. Copy Courtesy assets and behavior from approved preview ce14362, keep its leaderboard UI and repository separate, and add only its production route. Preserve the existing production D1 binding, original repositories, controllers, licensing paths and historical ledgers.

**Tech Stack:** Static HTML/CSS/ES modules, Phaser, Cloudflare Worker/D1, node:test, SQL.js, Chromium.

**Spec:** User-authorized main promotion and review constraints retained in the task handoff.

## Global Constraints

- Preserve main's seven released games, production D1 and all records.
- Promote only Courtesy Contest; do not promote 100/400/1500, vault, other preview games or vault candidate d787d4c.
- Do not overwrite main worker/router/shared modules with preview versions or execute ALTER statements remotely.
- Keep full credits for the three released sports and main's local Reaction Rod license path.
- Verify live production D1 structure before pushing main; if access is unavailable, stop publication with a concrete candidate and blocker report.
- No force push; only a normal fast-forward after validation and live D1 verification.

## Review Focus

- Existing production records: seed all released boards and prove Courtesy inserts leave their rows unchanged.
- Mixed score ordering: zero courtesies remains valid; count DESC and remaining seconds ASC retain ties, own rank and cooldown.
- Environment isolation: Courtesy accepts production origin/scope and rejects QA or cross-origin requests.
- Release inventory: exact asset allowlist admits Courtesy and three sports credits; all other preview HTML remains rejected.
- Touch/help and attribution: hidden Courtesy pause overlay does not capture the play surface; all legal links resolve.

## Task 1: Isolate and establish the baseline

- [x] Create /workspace/playformosa-main-release from main 4be21f0.
- [x] Create and verify the complete main history bundle before source edits.
- [x] Run npm run check: 1798 tests, build and 380 local references pass.

## Task 2: Promote released help and Courtesy's self-contained runtime

**Files:** public/games/shared/entry-shell.mjs, sports-help.mjs/css, sports-credits.html; existing Reaction Rod/Fast Hands copy; public/games/courtesy-contest; public/assets/courtesy-contest-card.jpg.

- [x] Apply exact approved text substitutions without copying existing game HTML wholesale.
- [x] Add help for long-jump, hurdles and high-jump only; retain their full credits on a three-section standalone page.
- [x] Copy Courtesy's approved runtime/assets, then point its platform at local leaderboard modules.
- [x] Use a Courtesy-scoped gesture rule for .hidden pause overlays; leave other games' gesture behavior unchanged.
- [x] Validate DOM/links and original controllers against main before-images.

## Task 3: Add Courtesy's production API and counts

**Files:** worker/leaderboard/courtesy-repository.mjs, worker/leaderboard/index.mjs; worker/play-counts/index.mjs/repository.mjs; public/games/shared/play-counts.mjs; tests/courtesy-production.test.mjs.

- [x] Add failing production tests for strict payload, rank ordering, isolation and preservation of legacy rows.
- [x] Route Courtesy alone to its dedicated repository; keep existing repositories and production config unchanged.
- [x] Add Courtesy alone to count admission and returned totals without changing prior keys.
- [x] Run SQL.js tests using the existing documented production schema migration locally only.
- [ ] Obtain live read-only table/index structure evidence; this is a publication gate, not authorization to alter schema.

## Task 4: Admission and verification

**Files:** src/catalog.mjs/render.mjs; scripts/release-policy.mjs/build.mjs/verify.mjs; package.json; new promotion provenance helper/manifest/tests.

- [x] Add exactly Courtesy's catalog/card/count entry and enumerate all required public assets.
- [x] Create a new historical restoration boundary; never repin prior ledgers.
- [x] Import behavior tests while excluding preview-only historical inventory assertions.
- [x] Run full npm run check and real browser flows for old/new games, licensing, responsive layout and mock API round trips.
- [x] Preserve candidate, bundle, patch, logs and an exact change inventory.
- [ ] Push main only after live D1 verification, then verify remote SHA and Cloudflare success. Otherwise report blocked publication precisely.
