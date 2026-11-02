# QA Play Counts Implementation Plan

> **For agentic workers:** execute approved dot-cloud plan task-by-task; no remote publication except sole publisher.

**Goal:** two current-main game cards show actual recorded starts on QA first.
**Architecture:** independent count endpoint/storage in existing QA Worker/D1, bounded background start events and one homepage read. No leaderboard storage changes.
**Tech Stack:** existing vanilla ESM, D1 SQLite, Node tests/sql.js/JSDOM; no new dependency.
**Spec:** docs/superpowers/specs/2026-11-02-play-counts-design.md

## Global constraints
Preview91a34 only; no main/prod mutation, only Jump/Hurdles. Card copy only 已開玩 N 次 or 次數暫時讀不到. No fixture/history fabrication. Actual game starts, no pageviews/replays/resume. Free account unchanged; user executes additive QA migration once.

## Review focus
Atomic retry/concurrency increments once; expired duplicate payload cannot recount; missing storage/crypto/network never blocks game; start constructor/render failure notcounted; home API failure notzero. Each is tested below.

## 1 Storage/API
- [ ] Red tests tests/play-counts-api.test.mjs and play-counts-repository.test.mjs assert exact2game/schema, origin/body/timestamps, simultaneous sameUUID onlyone, conflict rejection, cooldown/daycap, stale receipt refusal and bounded100cleanup/indices.
- [ ] Implement worker/play-counts/{002.sql,repository.mjs,index.mjs}. handlePlayCounts(request,env,now) handles GET /api/play-counts → {counts:{'long-jump':{count,since},hurdles:{count,since}}}; POST /api/play-counts/starts body{game,deviceId,runId,startedAt} → {accepted:true,duplicate:boolean} or error. Trusted QA origin/scope plus PLAY_COUNTS_ENABLED gate; no client scope. Repository exported PlayCountsRepository(db,scope).start(data,now), totals().
- [ ] Green above; independent review migration, deliver byte-identical .txt to root; no DB execution by agent.

## 2 Client/controller
- [ ] Red tests tests/play-counts-client.test.mjs assert best-effort tracker, immutable UUID across bounded retry, strict device recovery, exceptions ignored; real controller starts countedonce/resume/replayzero.
- [ ] Add public/games/shared/play-counts.mjs createPlayCounter({window,game,enabled=true}).start(); generates frozen event per explicitcall, reuses current pf-leaderboard-device-v1 UUID, one delayed retry onlynetwork/503/429 with max12.5sec total wall time, no persistentqueue. Function neverthrows.
- [ ] Add import and last successfulstart hook to two controllers, leave physics/frame/input/render untouched.
- [ ] Green real controller/old harness tests with narrow boundary adaptation, no assertion weakening.

## 3 Homepage/config/release
- [ ] Red tests tests/play-counts-home.test.mjs verify two placeholders only, onecombinedGET, number0valid, unavailabledistinct, textContentsafe.
- [ ] Add public/assets/play-counts.mjs onDOMContentLoaded and script in renderer; scoped smalltext CSS only. Worker existingindex routes /api/play-counts* before leaderboard; Wrangler run_worker_first extends that path, previews PLAY_COUNTS_ENABLED remainsfalse untilschema success.
- [ ] Fulltests/build; focusedschema/indexcost review and narrowhomepage/browser actualstart QA. Updateprovenance narrowUIfile ledger only.
- [ ] Incompletecheckpoint then finalLibrary archive+freshrestorehash; reviewer GREEN; solepublisherpreviewCAS/fullCF/trueliveQA. Main/fighter deferred usergate.

## Implementation ruling
Use recordPlayStart(window,game) instead of retaining a factory instance: every call independently freezes one run event, and no state is needed between starts. Actual controller hook only after successful start. Root requests concise card only; accumulation scope uses title metadata, no repeated technical prose. User349f4a49f52881919ffa7a8882161ad3 confirms QA002 SQL success; no agent rerun. Gate nowtrue for final QA release.
