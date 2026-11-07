# Courtesy platform upgrade

## Approved scope

Extend the existing PlayFormosa preview/hurdles integration: use the same platform loading screen, place the actual final game photo first on the result sheet, fit the default desktop result on one screen, use the platform's 1080×1180 score-card format, and add the online leaderboard. Refresh only the 400m and 1500m homepage card illustrations to match the other athletics cards and protagonist. Do not publish to main or alter the original private site or its records.

## Implementation plan and decisions

- Reuse high-jump's exact inline loading style, recovery script and warm-up illustration. The module preloads and one-line loading joke are courtesy-specific. Do not start gameplay or audio during loading.
- Keep game.js, controls, simulation, carriages, characters, music and scoring logic unchanged. The adapter freezes the real final canvas and result data once.
- Use a compact, photo-first desktop sheet. Default result actions, score, verdict and sharing remain visible together. Expanded optional upload controls and small/zoomed viewports may scroll; no content is clipped.
- Adapt the existing measured platform score-card typography/colors at 1080×1180. Include completed mutual offers, grade, seated/fall status and the exact displayed remaining time; fit the complete frozen photo without cropping.
- Reuse the platform's explicit manual-upload flow. Only successful seats qualify; completed mutual-offer count descending, then remaining time ascending. Chain bonuses do not enter ranking. Same count and time share rank. Failed or interrupted seats cannot upload. Scores are player-reported, not server-verified gameplay.
- QA board only: seated-courtesy-v1, courtesies, status seated. Existing secondary_score schema is reused. Courtesy stores count+1 internally because the historical schema requires positive scores, then decodes every public response. No migration, schema change or cleanup is part of this upgrade.
- Preserve original artwork as exact binary preimages. The two replacement thumbnails remain at their existing paths; no catalog, route, game mechanics or data changes.

## Verification contract

- Run real Node/SQLite leaderboard validation, sorting, best-update, tied-rank, zero-count, duplicates, conflict, cooldown, legacy-record preservation and production isolation tests.
- Run actual sharing, retry, stale-callback and lifecycle tests; check loading-script parity, DOM hierarchy and card bounds.
- Use managed Sites preview for browser layouts and actual gameplay; desktop 1366×768 and shorter windows, 320/390 portrait, 844 landscape, and zoom-equivalent sizing. Do not represent DOM-only checks as visual/device tests.
- Run full npm test, actual npm build, verify and release check against final frozen bytes. Compare existing baseline failures explicitly.
- Publish only an exact changed/addition Git tree over the verified current remote tree. Omitted local binaries never become deletions. Verify branch head and Cloudflare build for the new commit.

## Provenance

BASELINE.json is the full 1,525-file tree of preview head 256fb83c78d189640b252ee4333f45ec8146fe5f, reconstructed as tree 299a50eb55730cf9b5493570a91de1282f40447a. MANIFEST.json stores exact before/current hashes and preimages for this upgrade. Earlier manifests remain byte-identical. The new outer boundary restores this parent before historical tests run, while new tests inspect live behavior.

The original two runner cards were downloaded from the existing deployment using supported browser media download and matched to their pinned Git blobs. Six previously absent runtime PNGs are now restored from exact live assets; the one unavailable historical screen-alpha atlas stays pinned in the full remote tree and is not deleted.
