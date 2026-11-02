# Home Views Implementation Plan
> REQUIRED SUB-SKILL: executing-plans. Dot-cloud implementation, sole publisher writes branches.
**Goal:** Atomic qualified homepage views, then selective main counts + fighter entry.
**Architecture:** Existing Worker/D1 counter tables with home key and dedicated route; visible-page one-shot client; branch-isolated artifact closure.
**Tech Stack:** ES modules, Cloudflare Worker/D1, Node tests/JSDOM/SQLite.
**Spec:** ../specs/2026-11-02-home-views-design.md
## Constraints
No paid services, schema alteration, production QA data, IP tracking, or main publication before prod002 confirmation.
## Review focus
Concurrent tabs/server window; hidden page lifecycle; storage/fetch failures; game/home cooldown separation; main artifact allowlist.
## Tasks
- [ ] RED API/SQL home 30min boundary/concurrent UUID/conflict/cleanup/caps and scope separation.
- [ ] GREEN dedicated views route + repository admission; existing play tests unchanged.
- [ ] RED visible/deferred once/reload/stale/failed storage and concisefooter tests.
- [ ] GREEN homepage single POST then combinedGET, no intervals, no newgamehooks.
- [ ] QA fulltests/build/provenance/read-only review + archive/freshrestore + solepublisher CI/live.
- [ ] Main isolated two-game hooks/API + fighter-only card, merge reviewed home files, production schema gate.
- [ ] Main fulltests/artifact closure/review/archive/freshrestore + solepublisher CI/live. No repeated schema execution.
