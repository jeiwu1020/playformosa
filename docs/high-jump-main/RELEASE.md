# Selective High Jump production promotion

Base main: bf3f719ada30eac22352c6ac6301af67ecbcfd43.
Preview source: 6723ba4c25dcae45fccb81dc2d8606098b2dab32.

Only High Jump is promoted. Physics, rendering, control bindings, replay, score images and artwork retain the preview bytes. The game controller changes four imports to local production adapters. Existing shared frontend modules and every other released game's files remain unchanged. The original preview-wide historical tests remain on preview; focused High Jump functional tests are included here.

The production catalog, artifact allowlist, worker board and recorded-start allowlist gain High Jump only. The existing generic leaderboard and play-counts tables support its game/rules keys, so no D1 migration, table reset, preview data copy or binding change is required. wrangler.jsonc and all SQL files stay byte-identical to main.

The source manifest records every changed and added path and original bytes. A separately SHA-256-pinned fixture lists exact modification/addition scope and complete remote main blob identities. Historical verification reverses only this verified delta before checking earlier releases. No old source ledger or historical fixture is rewritten.

Verification commands: npm test; npm run build; node scripts/verify.mjs. A per-file isolated runner is also used to identify slow tests. Local Chromium cannot start its process socket in the cloud execution sandbox and the cloud browser cannot reach that executor's localhost, so local real-browser testing is unavailable. DOM, layout, input, sharing, physics and real SQLite integration tests are used; production read-only UI/API checks follow publication. No synthetic scores are uploaded to production. Physical iPhone Safari testing is not claimed.
