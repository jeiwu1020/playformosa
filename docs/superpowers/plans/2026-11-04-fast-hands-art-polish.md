# Fast Hands Art Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Polish duel labeling, uncropped result images and two generated intro covers.
**Architecture:** Keep the existing single entry and controllers. Change presentation only, reuse existing image capture with transparent letterbox pixels, and add two versioned image assets.
**Tech Stack:** Vanilla JS/CSS, PNG/WebP, built-in imagegen, Node/JSDOM/canvas and cloud browser QA.
**Spec:** docs/superpowers/specs/2026-11-04-fast-hands-art-polish-design.md

## Global Constraints
- preview/hurdles only; main, database, rules, AI and speeds unchanged.
- Never post live scores during verification.
- Preserve entire scene at its original aspect ratio, all existing sharing and replay.
- Retain the one main entry and all direct links.

## Review Focus
- Extra-tall/wide source canvases: preserve corner pixels, transparent unused padding, no live-canvas mutation.
- Fallback/errors: hide normal technical duel badge, not actionable loading failures.
- Failed image capture still explains the failure without a blank invisible caption.
- Phone and short landscape: four result actions remain visible and unchanged.
- Generated thumbnail identity, toy-vs-real weapon distinction, blue projectile shape and edge-safe subjects.

### Task 1: Presentation-only corrections
- [x] RED: add pixel tests proving transparent letterbox and full corner retention; CSS tests for panel-matching image field and noncropping; duel label/error contracts.
- [x] GREEN: update finale-image.mjs, finale.css and a duel-specific ready-state label rule in club.css; preserve loader and help/error paths.
- [x] Run targeted image/layout/controller tests and inspect changed files.

### Task 2: Generated intro covers
- [x] Inspect reference images and generate one 3:2 image per requested scene using built-in imagegen; inspect and persist final assets.
- [x] RED: require the two new distinct assets and dimensions in all three introductory HTML card sets.
- [x] GREEN: update only intro image sources/alt/dimensions; keep existing gameplay assets intact.
- [x] Inspect full-size and thumbnail pixels; verify same ratios and readable mobile presentation.

### Task 3: Integrity and final checks
- [x] Add an outer reversible art-polish provenance layer on 35b5bc6 without repinning history.
- [x] Run full suite, exact baseline-failure comparison, build, release preflight, independent review and fix important findings.
- [x] Coordinate shared preview; verify intro and result layouts at multiple dimensions, loading/fallback/error and repeated/replay flow; release preview.

### Task 4: Authorized publication
- [ ] Back up exact delta, verify remote parent, create blobs/tree/commit and lease-update preview/hurdles.
- [ ] Follow exact Cloudflare build to completion and inspect live UI without submitting scores.
- [ ] Record commit, main unchanged, rollback and validation limits.
