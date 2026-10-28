# Eight-hurdle flow implementation plan

> For agentic workers: execute this approved bounded plan natively task-by-task.

Goal: skilled continuous run/jump without auto-success, with the approved110m/8bar arrangement.
Architecture: retain pure fixed-step physics, identical rig/contact endpoints, PointerEvent input and native resultguard. Calibrate per-flight arc and separate one-shot landing input state; derive UI progress from course constant.
Tech stack: existing JavaScript/Three.js/static Sites; no new dependencies/assets.
Spec: ../specs/2026-10-28-eight-hurdle-flow.md

- [x] A scoped long-press fix separately committed, backed up and deployed as1.2.1; never mix its scope with B.
- [x] Add RED tests for exact course, lower/shorter short-charge arc, fresh100ms stride, stale/cancel input, currentcopy/record/export.
- [x] Implement flight gravity/pose phase, low-arc speed retention and separate non-chargeable single landing token; preserve controls/impact difficulty.
- [x] Matched-cadence clean/none/early/late traces; effective ground steps and multiple skillful timing choices; full suite.
- [x] Independent read-only review; RED reproductions of held-through-landing jump and duplicate stride; fix and reviewer recheck.
- [x] Actual cloud keyboard full playthroughs, visible clean/contact motion, portrait/landscape, countdown/replay, image export, audio unlock.
- [ ] Final manifest/source backup/private deployment/live hashes; hand one sealed commit to platform preview owner.

Review focus: no air-held autojump, maxone buffer per landing, old records not miscompared, true joint/bar collision with no repeat penalty, no result ghostclick regression. Physical phone/WebGL unavailable; explicitly retained as limits.
