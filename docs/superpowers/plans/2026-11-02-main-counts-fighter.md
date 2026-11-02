# Selective Main Play Counts and Fighter Entry Implementation Plan

> **For agentic workers:** Use executing-plans; complete local candidate, no publication in this task.

**Goal:** Add recorded starts for the two released games and only the approved Fighter homepage entry.
**Architecture:** Main-derived isolated tree; exact approved play-count modules plus narrow start hooks and homepage card counts. Separate fighter JSON carries explicit production release; no other external entries or unpublished local runtime. Parent merges home-view implementation later.
**Tech Stack:** Existing Node tests/JSDOM/SQLite, static renderer, Worker/D1.
**Spec:** User approval relayed by parent: counts accepted; add homepage views and Fighter entry.

## Constraints / review focus
- Preserve main Jump physics, scene/camera, icons and leaderboard DB/binding.
- PLAY_COUNTS_ENABLED stays false until production migration confirmation.
- Failed/paused/resumed/replayed actions must not count as fresh starts.
- Missing counters show unavailable, never invented zero.
- Exact production inventory admits only two games and approved added resources.
- Fighter link exact https://taiwanfighter.playformosa.workers.dev/ with noopener; no other portal/game entry.

## Tasks
- [ ] Fresh-check main and all baseline hashes; write red selective page/count tests.
- [ ] Copy approved counter modules/tests; patch only successful start tails and current main home renderer.
- [ ] Add one production-enabled fighter JSON and exact preview art, scoped styles and strict renderer validation.
- [ ] Append provenance, update exact artifact inventory and direct historical expectations; run targeted then main check.
- [ ] Hand parent working candidate for home-view merge; do not freeze/publish before merge and review.
