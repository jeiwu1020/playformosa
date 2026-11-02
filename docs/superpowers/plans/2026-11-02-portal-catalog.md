# Portal Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four independent game cards and a play. one more. section to the preview homepage, with safe per-entry release management.
**Architecture:** Existing static renderer remains framework-free. A build-time channel filters only the new directory entries; tracked preview config is isolated from shared code and never promoted to main. Existing nine local games and external applications remain untouched.
**Tech Stack:** Node ESM, static HTML/CSS, node:test, existing jsdom/PostCSS test dependencies.
**Spec:** docs/superpowers/specs/2026-11-02-portal-catalog.md

## Global Constraints
- HOME ONLY; four exact names/public URLs and one external platform; no iframe, runtime-game changes, paid services, new Codex tasks, hosting/security changes, or main publication.
- External links are target=_blank rel=noopener noreferrer; all strings escaped and exact URLs allowlisted.
- Original brand artwork only; mobile readable, no tall empty hero panels; existing nine routes and counts preserved.
- Defaults are production. New entries preview=true / production=false. Preview-only config commit must never be promoted to main.

## Review Focus
- Missing/invalid channel must not accidentally expose preview entries.
- Malicious URL/text/image input must not create unsafe or misleading links.
- Empty or selectively promoted catalogs must not leave dead navigation anchors.
- 320px mobile / 200% text must retain readable titles, useful buttons and horizontal fit.
- Existing nine local games, original hero, counters and generated-source consistency must remain intact.

## Task 1: Release infrastructure
**Files:** src/release.mjs, scripts/build.mjs, scripts/check-release.mjs, tests/catalog-release.test.mjs, package.json.
**Interfaces:** resolveCatalogChannel(config) returns preview|production (missing => production); filterReleased(entries, channel) accepts explicit release booleans; renderPage(catalog,{channel}) defaults production.
- [ ] Add failing tests for default, invalid channels, independent entry promotion, preserved legacy catalog and expected-channel mismatch.
- [ ] Run node --test tests/catalog-release.test.mjs and record RED.
- [ ] Implement filters and explicit npm run check:release -- --expect=production|preview, never infer CI branch names.
- [ ] Run focused release tests GREEN. Keep preview channel config in its own commit group.

## Task 2: Original external catalog + homepage
**Files:** src/external-catalog.mjs, src/catalog.mjs, src/render.mjs, public/assets/home.css, public/assets/portal-*, tests/portal-catalog.test.mjs, docs/portal/ART-SOURCES.json.
**Interfaces:** externalGames/platforms entries have id,title,href,description,image,release; existing catalog games/minigames/events unchanged.
- [ ] Test exact five public URLs/titles, required link rel/target, escaping/allowlists, no iframe, accurate counts and absent empty section/navigation.
- [ ] Run focused tests RED; implement consistent original-art cards and brand section, conditional navigation.
- [ ] Preserve current hero and local shelves; append scoped responsive portal styles (two columns desktop, one mobile).
- [ ] Verify public source assets and record source URL/hash; run existing render/home tests and new tests GREEN.

## Task 3: Verification, packaging, serialized handoff
**Files:** config/catalog-channel.json (preview-only), public/index.html (build-generated), docs/portal/RELEASE.md, frozen manifest/checkpoint outside repo.
- [ ] Build/check production (new five absent), build/check preview (all five present), verify one-entry promotion fixtures.
- [ ] Run full existing tests/build/reference validation, report missing baseline artifacts or environment limitations separately.
- [ ] Browser desktop and phone-size QA; check original art legibility, links, navigation, overflow, text enlargement.
- [ ] Root review; freeze exact changed-file hashes, base hashes and commit groups. Create durable checkpoint and independent restore verification.
- [ ] Hand off to single publisher only after first-paint fix has completed CF gate, using its fresh head; no main changes. Wait for final deployed source and live verification; provide resulting head to icon owner.
