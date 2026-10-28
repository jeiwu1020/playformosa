# Resume approved visual sandpits on cosmic main

Goal/spec: `../specs/2026-10-28-visual-sandpits-design.md` (existing user-approved design). This is the last approved phase after accepted Web App touch fixes and cosmic release.

Base: local 9f98925, tree 5a6856ca6560ec7e8d8c3322f872e7ff87255dc2 (remote main dae384d). Isolated candidate only; no publication before parent review. Never restore old files over cosmic/main/preview.

## Constraints
Only `sandpits.mjs` plus additive game import/create/reset/update-before-render. No physics, camera, character, controls, scoring, mileage, collision, audio, UI, capture/share, standalone/root-origin or cosmic scenery changes. Exactly two pit groups and a bounded particle/mark pool; no image assets or dependencies. First-contact scenery selection remains intact.

## Tasks and interfaces
1. Restore the prior isolated visual module after baseline tests and absent-feature RED. API: `createSandpits(THREE, scene) -> {group, update(state, points, {elapsed, paused}), reset, dispose}`. Add RED regression using the real 5-second rhythm flight: full settled character plus current foot marks must remain inside finite receiving sand, not 0.43 unit beyond its end. Fit only the receiving pit around contact plus full pose with skin margin; never reposition athlete. Keep footprint/rim/skid aligned to the actual feet; head/seat impression follows its real contacting part with a bounded first-contact skid. Retain first-contact world anchor through rebase.
2. Add integration RED to current `game-lifecycle.test.mjs` using real Three geometry and sandpit module, with mocked renderer only. Add four game wiring lines without replacing old source blocks. Verify same-frame frozen result sees impressions, retry clears, pause stops animation, first-contact cosmic boundary test remains green.
3. Full `npm run check`, protected file hashes and input-by-input parity. Real-source scene CPU previews: board, arrival, feet regression, seat, head, cosmic first-contact boundary; portrait projection/capture framing checks. Try browser once only if available; report CPU versus WebGL limitation precisely. Save small patch and exact base/tree receipts; parent independent review is publication gate.

## Review focus
- Pit end boundary/near board: full landing pose, not only hip or first contact.
- First-contact versus settled coordinates: matching feet/seat/head marks and bounded skids, no scoring anchor drift.
- Long flights and rebasing: two finite pits and no increasing geometry/material count; original city/cosmic backdrop survives.
- Late first render/result capture: visible pit and effect prepared before freeze, without replacing cosmic first-contact selection.
- Retry/pause and standalone portrait: no stale effects, zero visual motion while paused, subject and current marks stay in original camera/HUD-safe region.

## Verification outcome
- Baseline 260 tests; final 278 tests plus static build and 60-reference verification pass.
- The old 5-second rhythm defect was reproduced with real input: 0.4285-unit skeletal endpoint overrun (0.6553 including rendered skin). Receiving sand now covers body and current impressions, with only finite scenery movement.
- Current portrait/landscape projection and existing score-card crop include full athlete and contact mark; camera/layout/capture are unchanged.
- Independent reviewer checked 80 scenarios / 79,773 exact parity steps / 9,680 containment frames, plus 240 seeded real-input landings (feet, head, seat, knee, hand). One Important delayed-freeze issue was reproduced RED and fixed: done-state spray age is held so a zero-sized result viewport cannot erase spray before its first successful snapshot. Final 278-test suite passes.
- Fixed resources: 2 finite pits, 91 mesh objects, 4 geometries, 8 materials, 116 instanced sand speckles and 32 spray particles. Disposal covered.
- CPU source-geometry previews verify board, arriving pit, feet, seat, head and retained Saturn-market cosmic scene. They are not WebGL/browser/device screenshots. Chromium was blocked before page load by sandbox socket permission; no retry/escalation. Real-device/GPU appearance remains a limitation, not a pass.
- No publication performed. Parent review/integration is required; common game UI is a separate candidate.
