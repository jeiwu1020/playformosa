# QA play counts for the two released games

User requested QA first, later deciding whether to release together with the fighter portal card. Root approved this design; do not mutate main or production DB. Only Jump/Hurdles count actual admitted starts/retries; no other7game instrumentation and no external click-as-play. No historical totals invented.

## Approaches
Use existing Free QA D1, two new independent tables with indexed bounded receipts and aggregate totals. This is the selected approach approved by root. Browser storage cannot represent online totals; visits/analytics do not establish game starts. No new DB, paid tool, identity or credentials.

## Contract
Homepage two cards show `已開玩 N 次`, once-per-load combined GET, no polling; loading/unavailable is not0. Optional one short overall start-date note, not technical prose per card. Counts are recorded starts, not unique people or certified analytics. No individual information exposed.

Game start callback generates one run UUID after engine state begins; retry is new run, resume/help/replay is not. Best-effort background request never blocks start/retry; same frozen event for at most one retry, no persistent offline queue. Body game/deviceUUID/runUUID/startedAt; timestamp max10min old/30sec future. No score/nickname/private data. Existing anonymous deviceUUID can be reused.

Server fixed QA origin/scope and featuregate; exact allowlist of2games; bounded streamed body and Origin. Atomic receipt insertion then aggregate increment only for newly admitted receipt; duplicate same payload returns accepted, conflicting payload rejects. Device2sec cooldown/100daily and global10000daily admission. Seven-day receipts, bounded cleanup100 per accepted attempt; read indexes and maintenance budget tested. Ancient payload rejected before receipt expiry could let it count again. Client limits and quota refusals can undercount; UI never presents unique-player claims.

## Storage/deployment
Migration002 only CREATE new tables/indexes, no DROP/ALTER/UPDATE existing leaderboard. User must execute supplied exact .txt in existing QA DB75be2ba1-d2b8-455d-82c2-e5392ead01d4 once; server enable only after success. Production8a0… untouched. Existing Worker handles /api/play-counts routes using QA DB binding; no client-controlled env. Existing leaderboard continues independently. QA source/review/checkpoint restore before sole publisher preview CAS/CF/live.

## Tests and gates
TDD: exact migration independent of existing schema; concurrent identical/distinctUUID, conflict/rate/daily/TTL/stale payload; indexes/read bound; origin/bytes/unknownfield validation; one start hook only after success; resume/replay/help noevent; failures don'tthrow; homepage onceGET/allcards/zero-vs-failure/XSS. Full suite/build with existing missingasset limitations stated. Bounded mobile two cards andactual Hurdles begin/resume/retry + server counts; Jump WebGL limitation explicit. No public production writes. No fighter entry bundled now.
