# PlayFormosa opt-in leaderboard implementation plan

> For agentic workers: use executing-plans task-by-task. Dot cloud only; no Codex.

**Goal:** Add a manually submitted casual leaderboard for long-jump and hurdles on preview, without spending money or altering gameplay.
**Architecture:** Same-origin Worker endpoint and separate D1 binding per deployment. A tiny shared client presents a collapsed ranking/submit area in the existing entry/result containers; no new competing modal. An explicit disabled-by-default config hides all network UI until the free-account/QA database/schema prerequisites are confirmed; live behavior must then pass the publication gate. Server ignores client environment selection. Device UUID is anonymous convenience, not identity or cheat protection.
**Tech Stack:** Existing ES modules, Cloudflare Worker/D1 SQLite, node:test/jsdom; no new runtime dependency; sql.js1.13.0 is a test-only SQLite engine compatible with Node20.
**Spec:** Parent's user-approved scope recorded below.

## Global constraints
- Base preview eeb32fce02712fbe9722af3e1ec272ee24818b24. Main c92050c6 remains untouched.
- Only manual submission; remember nickname locally, never upload previous local best or on finish automatically.
- Jump valid legalAdventureKm (not exploratory metres); Hurdles done and positive time <=180 seconds. Higher km / lower seconds wins per device + board rules version.
- No login, paid resources, CAPTCHA grants, private data collection, or claim of anti-cheat. Explain client-reported casual scores and device limitations.
- Initial default gate false; user has now confirmed QA DB/schema and root authorized same-batch QA-only enable. User confirmed the same Workers account is Free (Sentinel_5f21fad78f808191a1611259996ac00d). No D1/binding provisioning without existing supported management access. No broken public submit button.
- Preserve nine games, all source provenance, icons, portal, original gameplay/input/camera, result share/native activation, resultGuard, retries and records.

## Review focus
- Duplicate retry after uncertain response must reuse UUID and never duplicate a score; conflicting UUID payload rejected.
- Closing, retrying game, replay, or a newer result must invalidate stale asynchronous UI updates; no auto-upload.
- Invalid/NaN/infinite/negative scores, wrong game/rules/unit/status and nickname markup/control characters must be rejected server-side.
- QA and production isolation derives from server binding/config; client env field rejected, never chooses DB.
- Free deployment remains blocked until dedicated QA D1/binding access established; mocks and fixtures never enter a real database.

## Task 1 — server contract, D1 schema, tests
Files: worker/leaderboard/{index.mjs,repository.mjs,0001.sql,README.md}; tests/leaderboard-api.test.mjs.
- [ ] Write red tests for exact request validation, disabled/unbound response, best ordering, idempotency/conflict, cooldown, daily cap, top20 and server environment isolation.
- [ ] Implement fetch API GET /api/leaderboard?game=... and POST /api/leaderboard/submissions; strict board definitions, bounded request/nickname lengths; D1 atomic batch; UUID only identity, no IP storage.
- [ ] Run tests against actual SQLite SQL via isolated temporary fixture and injected clock. No real DB writes.

## Task 2 — shared client/manual UI and game adapters
Files: public/games/shared/leaderboard.{mjs,css}, leaderboard-config.mjs; long-jump/game.mjs and hurdles/game.mjs; tests/leaderboard-client.test.mjs.
- [ ] Red tests: gate false no DOM/no fetch; manual/cancel distinction; same UUID retry; nickname escaping; stale result/closed UI; valid score adapters; ranking errors do not block play.
- [ ] Add entry ranking disclosure inside existing shared entry (only two games) and result disclosure below primary actions. Input >=18px and buttons>=44px; close/return don't start/resume game.
- [ ] Snapshot each newly completed eligible round; do not submit on localbest/replay, reset pending panel on new round; retain only local nickname/device, server confirms receipt; first version does not display personal server best.

## Task 3 — integration, durable backup, review
- [ ] Run targeted existing Jump/Hurdles lifecycle/share/result tests and full available tests, distinguish missing baseline fixtures.
- [ ] Supported desktop/narrow fixture QA with mock explicitly labeled; production config remains disabled, no mocked data embedded in build.
- [ ] Narrow provenance updates only for exact UI adapter files; preserve source-origin and core hashes.
- [ ] Freeze overlay, save private Library source+before+manifest, fresh restore/hash, independent audit review.
- [ ] If free backend prerequisites unresolved: deliver tested durable code + exact setup blocker, no claim live rankings. Sole publisher can publish gated preview only with root's release decision; main untouched.

## Release decision 2026-11-02 08:06 UTC
User supplied dedicated QA DB UUID75be2ba1-d2b8-455d-82c2-e5392ead01d4 and successful schema execution. Root explicitly accepted one preview release with server/client true; no two-phase freeze existed. Publisher must verify live GET/submit/idempotency/best and repair or close client on binding failure. Main remains unchanged.
