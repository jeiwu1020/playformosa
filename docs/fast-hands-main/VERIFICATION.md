# Fast Hands production promotion verification

- Baseline main: b09b4f841258bef41999bcc3b3684829b59a62c0. All 383 repository blobs were materialized and independently verified against GitHub.
- Approved source: preview/hurdles 037802320dc9317bc0ee02ea70fe790e999cd7b7. All 85 runtime additions match its Git blobs exactly, including the only external character dependency and required cover image.
- Existing main check: 739 tests passed, production build passed, 191 local references checked.
- Final integrated check: 1406 tests passed, no failures; production build passed; 314 local references across 253 output files verified.
- Tests cover the four Fast Hands leaderboard categories, production/QA separation, input validation, duplicate submissions, cooldown, best-score ordering and play counts. Existing leaderboard repositories and schema remain unchanged.
- Historical provenance tests verify current and prior SHA256/Git blobs, reject tampering, preserve the original release boundaries and independently pin the approved source and 138 protected files.
- Runtime gameplay, timing, scoring, artwork, input and sharing settings are unchanged. The isolated feel-test console and unrelated preview games are not admitted.
- Production API preflight returned HTTP 200 for all three existing boards and play counts. This is an operational check, not a direct Cloudflare D1 schema inspection. No database, binding or account settings were changed.
- Cloud-browser local server access was unavailable; browser checks use the byte-identical approved preview and are followed by production verification after deployment. Real-device touch and native WebGL verification are not claimed by this check.

## Recovery

The parent commit preserves the prior main version. Use a new forward commit restoring that tree if rollback is necessary. Retain any valid user scores or play counts recorded after release; this promotion does not need SQL rollback.
