# Selective Hurdles Main Release Plan

> **For agentic workers:** Use executing-plans, with independent source/release review.

**Goal:** Add only approved Hurdles to existing main without promoting the preview branch.
**Architecture:** Exact main snapshot plus explicit Hurdles dependency closure from verified preview. Existing main Jump runtime unchanged except one necessary shared dialog focusable-selector upgrade. Keep original homepage and P favicon; add only Hurdles card/image behavior.
**Tech Stack:** Existing static ESM/build/node:test; pinned jsdom for actual shared-shell DOM tests.
**Spec:** User Sentinel_b36cda5c04b08191b879dc96e3a94f08 explicitly requests Hurdles main release; preview untouched.

## Global Constraints
- Main base7d5391b4df15137d4f92df192f028cb691bb84fa/tree cdc02552ee8e142a2356961afadc52bf8221bcd5.
- Hurdles source eeb32fce02712fbe9722af3e1ec272ee24818b24/tree0ca9fc6a814cb5912bec631083cf0684d975c699.
- No other seven local games, external game/portal sections, preview config, icon-wide rollout or ordering changes.
- Full Hurdles audio/vendor/legal/icon dependencies preserved. Original main P favicon and Jump assets/save keys/physics/camera preserved.
- No new Codex; sole publisher performs exact main CAS only after review/backup.

## Review Focus
- Dynamic audio ogg/mp3 variants and icon-manifest relative paths present, not only static imports.
- Native/fallback help and moved original volume controls remain reachable.
- Original main Jump dialog fallback and viewport recovery regressions remain green.
- Actual dist contains only long-jump/hurdles playable game directories; missing routes must not serve another game (do not assume HTTP404 without live evidence).
- Existing homepage layout/P icon and Jump card remain stable; Hurdles new cover uses contain without cropping.

### Task1: Minimal catalog/card and artifact gate
- [ ] Red tests catalog exact IDs long-jump/hurdles, no external catalog, original favicon, artifact allowlist rejecting extra playable HTML.
- [ ] Add main Hurdles catalog item and per-card optional safe image/kicker; preserve original homepage structure/styles except isolated illustration class.
- [ ] Build gate checks actual public/dist game folders and game HTML; retain existing Wrangler404-page behavior, add no SPA fallback.

### Task2: Complete verified dependency closure
- [ ] Copy exact34 Hurdles files,8 shared files,one latest long-jump/dialogs helper,6Hurdles icons+approved card from preview, verifying every Git blob.
- [ ] Record all imported hashes and original main Jump preservation in selective-source manifest. No other Jump updates.
- [ ] Import relevant Hurdles tests/helper; add realDOM native/fallback help+audio regression with jsdom pinned from approved current dependency version and lockfile.
- [ ] Run all original main tests + Hurdles/closure tests, build/local-reference/manifest checks; no skipped inherited protections.

### Task3: Delivery gates
- [ ] Supported preview desktop/narrow entry/start/help/audio/pause/result/share bounds; preserve renderer limitations honestly.
- [ ] Independent review; exact overlay and before sources archived to Library, independent restore/hash verification.
- [ ] Sole publisher fresh main parent check/CAS, full production CF and live home/Hurdles/Jump/missing-game route checks. Preview unchanged.
