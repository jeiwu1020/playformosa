# Pinball integration verification ledger

- Target: existing `jeiwu1020/playformosa` branch `preview/hurdles`, base `3e499fc21c4e71e655cebe669dcd4204ab6720c9`. No main update is authorized.
- Verified handoff: `overtime-v0.8.26-Sites33-source-6e7ad7a.zip`, 46,437,155 bytes, SHA-256 `cca63446ba25137c484d8d542b93a58b3f9023fb416b593e776f8a4060cbdc40`; 1,579 source files verified; original 407 tests, syntax and build pass.
- Backend tests watched fail before registration/cleanup implementation; API/separation/no unrelated data mutation cases pass with real in-memory SQLite, not remote D1.
- Frontend and backend combined subset: 121/121 pass. This is not the full-platform suite; the complete baseline was subsequently restored and verified (1,659 exact Git blobs, no missing/extra/mode differences).
- Separate source regression copy overlays integrated game files, then runs all original tests: 407/407 pass. Source original remains unchanged.
- Catalog card is an unmodified copy of source `docs/v0.8.26/qa/desktop-opening-close.png`, SHA-256 `12b3210178c644c38116bd4743bacd0c229d91b186ece0ffac6e0124c8df9f6e`. It is an archived v0.8.26 screenshot, not evidence of the integrated UI.
- Ruling: Keep legacy receipt cleanup unchanged; pinball submissions prune only their own scope/game/rules. This avoids any pinball write deleting other-game rows. It does not promise that legacy games can never prune old pinball receipts; existing seven-day retention remains.
- Ruling: Three QA-only game IDs and versioned rules use score + 1 in the unchanged positive-score schema, decoding exact zero on reads. No migration or old test-score import/deletion is needed.
- Browser validation is pending. Installed Chromium failed to launch with `socket() failed: Operation not permitted`; official browser and command-line client could not reach the local test HTTP server. Original Site requires sign-in. No site security bypass or account action was attempted.
- Fresh whole-integration review found three important defects: dark result surface with dark text, header/HUD overlap, and an asynchronous sharing-dialog close race. Each received a failing regression test before repair. Complete CSS cascade checks, ResizeObserver/intro-frame geometry, and asynchronous fallback lifecycle tests now pass; focused final integration suite: 72/72. This does not replace actual browser acceptance.
- Full restored-platform first test pass: 3,776 tests, 3,686 passed and 90 failed. Historical byte-preservation boundaries must be extended with an exact, reversible integration manifest; no old ledger or unrelated game source may be weakened. Final aggregate/release acceptance is pending.
- No remote submission, database mutation, branch update, deployment or original Site modification has occurred.

## 2026-11-12 recovery rebase

The unpublished 3e499fc-based candidate was three-way merged onto preview/hurdles 8d5a131bfa268c8e72fae6fa2a4735cd30a65d9e. All newer 100m/400m/1500m AI, mobile gesture rules, four portrait result layouts and phone 1500m map changes remain unchanged. The exact additive boundary now pins this latest parent tree, with the existing historical-view chain extended at its newest sports-results-portrait layer. Original handoff remains separately preserved in Library; no old published provenance baseline was rewritten. This rebase introduces no schema migration or live database operation.
