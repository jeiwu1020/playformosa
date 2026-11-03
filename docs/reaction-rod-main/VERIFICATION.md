# Reaction Rod production candidate verification

Approved sources: main `af138c1631b553b65531016f24888266c3ef2bbe` and preview `52c60d195e494146f95bc702763cbe6d7bcc742a`.

- Production baseline: 476 tests passed before editing.
- Candidate: 665 tests passed, no failures or skips; build resolves 167 references across exactly 166 public outputs.
- A separate clean dependency installation from the final lock was used, including the existing main `ws` 8.22.1 rather than preview's older dev dependency.
- All 97 existing files under Long Jump, Hurdles and shared are byte-identical. Original production binding, schemas and legacy leaderboard repository are unchanged.
- Only Rod uses the isolated manual-upload scrolling, result upload placement, leaderboard metrics and viewport helper. Other games do not receive preview's global behavioral changes.
- Complete round/replay, frozen last-rod photo, sharing failure/retry, interrupted rotation/help, keyboard focus, desktop/mobile CSS, ranking, duplicate/cooldown, missing schema and additive migration compatibility are covered by automated tests.
- Rod physics, rendered scene, replay, result stylesheet and photo/share generation are byte-identical to the approved preview. Only game import/audio paths and HTML local dependency/credits links were adapted.
- Public cloud-browser WebGL was unavailable during prior preview checks. These tests are not a substitute for physical iPhone standalone/PWA or actual GPU visual verification. The user accepted the preview on their own devices before this promotion.

## Production database prerequisite

No production database action has been performed by this candidate. Before deploying, inspect the actual production D1 schema and save/validate a backup. Apply only missing secondary-score columns and the Rod partial index after confirmation. Do not execute the migration blindly if partially applied. There is no runtime migration or management endpoint.

The migration is additive; original explicit-column SQL continues working and old score ordering remains `score, updated_at, device`. Rollback is by restoring the former code, leaving compatible columns and player data intact. Never drop columns or restore an older whole database as an automatic rollback.

## Scope and dependency provenance

The new ledger records all old bytes and exact candidate hashes. Historical release ledgers are unchanged, and their tests reverse only this checked promotion when testing earlier snapshots. Artifact admission remains explicit and rejects every other game.

Functional Rod suites were imported; old preview-wide provenance suites were replaced by this production-specific provenance check, because their assertions intentionally enumerate unrelated preview games. No tests are skipped. Asset licenses and credits are included locally under Rod.
