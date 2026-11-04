# Fast Hands title refresh

Parent: `928772e5083ad08fedbef6a78536c08f3ff20bb7` (tree `500dec1dd2eee10290ac0d275d88d1cb991707f3`). Target: `preview/hurdles` only.

## Scope

- 玩具彈接接樂 → 彈無虛接
- 十回合對決 → 快手對決
- Catch board display category 玩具彈通關 → 彈無虛接
- Keep the descriptive subtitle 十回合反應對決 unchanged.

Seven runtime files change by those exact text replacements only. Homepage, browser and introduction headings, both navigation locations, share/Threads/copy text, score-image title and board category are covered. Routes, IDs, rules, stored results, counters, score units, export filenames, gameplay, timing, assets and CSS are unchanged.

`NAME-REFRESH-MANIFEST.json` and its independent test helper verify every allowed substitution and parent Git blob. Historical manifests, independent pins and preimages remain unchanged. The existing outer reader and three isolated provenance fixtures now understand the new layer; current-state tests reject stale titles.

## Checks

- 196 focused tests passed, covering titles, share-image generation and fallback paths, leaderboard payloads, real simulated rounds, navigation interruptions, practice controls, replay and play-count boundaries.
- Nine historical provenance/invalid-ledger/corruption tests passed.
- Preview build and release preflight passed.
- Isolated browser title/entry layout checks: 97 passed at 320×568, 390×844, 844×390 and 1366×768 across all three modes.

The local reconstruction does not contain every unchanged historical binary or unrelated game file, so the full repository suite is not claimed as passing. Local browser checks cover renamed labels and introduction geometry, not a new WebGL/physical-phone performance certification. No live score or play-count submissions or remote database changes were made for testing.

Rollback is the parent commit above. Publication must preserve its complete remote tree and update only the reviewed file inventory.
