# Reaction Rod final-moment result implementation plan

**Goal:** Show the tenth rod's resolution moment, including the rod, in the result dialog and exported score image. Preserve input, scoring, timing, and viewport repairs. Local candidate only; no push or deployment is authorized.

**Approved design:** Remove the result footer explanation and home link, move the score disclaimer into expandable details, retain retry/details/sharing/ranking. Follow the compact score, raw photo, actions hierarchy used by long/high jump. Portrait and desktop stack vertically; short landscape may split columns. Fit the complete scene without cropping; permit dialog scrolling instead of cutting controls off.

**Approaches:** Reusing the old end-state photo is smaller but misses the last rod because it waits 0.72 seconds and possible standing recovery. The selected approach records the exact last resolution before removal and uses that frozen scene for both outputs. Do not add replay or change the game.

**Architecture:** A side-channel observer stores a detached final visual state once per world before the rod is removed. The observer adds no fields to simulation/events and cannot throw into the game. A separate temporary scene renders the frozen state once into a persistent 2D image; its GPU resources are always released. Result display and share compositing consume the same image. A failed image can be retried from the immutable state without replaying physics.

**Tech stack:** Existing native ES modules, Three.js, canvas, Node tests and JSDOM. No dependencies.

## Review focus
- Catch, floor miss and fall miss retain the last rod and exact pose; ordinary earlier rods do not allocate a photo.
- Render/encoding failure cannot change simulation or prevent retry, text share or ranking.
- Resize, repeated result opening and native-share cancellation keep the same photo; restart discards it and late asynchronous callbacks.
- Portrait/short-landscape controls and expanded details are scrollable, not clipped; navigation omission is intentional.
- Provenance overlays are reversible and hash-checked, keeping every historical manifest unchanged.

## Steps
- [x] Write and fail tests for exact final moment and immutable simulation, photo resource cleanup, shared output, and result DOM contracts.
- [x] Add the minimal observation module and single resolution hook. Compare deterministic complete world/event traces against the pinned original physics over varied input/timestep scenarios.
- [x] Refactor snapshot boundaries to render the frozen moment independently, copy to 2D before releasing WebGL, and composite the same photograph into the share card.
- [x] Wire result photo lifecycle and resilient sharing; test the real controller with external GPU/canvas boundaries stubbed.
- [x] Add scoped result CSS and markup. Retain the verified viewport module and CSS unchanged.
- [x] Add an exact reversible provenance overlay and mutation tests. Run the full check and release preflight; independent code review.
- [ ] Package source, diff and evidence, verify restoration, upload private backup. Report remaining real-device verification. Do not publish.
