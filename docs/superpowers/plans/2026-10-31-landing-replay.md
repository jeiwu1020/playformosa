# Landing replay implementation plan

Goal: opt-in last five seconds before first contact, plus the complete settling tail. User requested direct implementation in preview/hurdles; no main publication.
Architecture: pure bounded state recorder/player; controller records physics snapshots and original render effects separately. Replay reads snapshots, never calls physics/scoring/storage, keeps the live settled state and frozen share PNG untouched. Existing Three.js/ESM/Node stack.

- [x] Add failing recorder tests: long-flight bounds, first-contact retention, complete tail, slow-motion boundaries, pause/cancel/repeat, deep-copy and rebase.
- [x] Implement replay.mjs with five-second ring, capped settling tail, independent playback clock and render transform snapshots.
- [x] Add failing controller lifecycle cases; wire opt-in result action and touch-safe replay controls. Input is blocked, hidden/blur/orientation pauses replay; close and finish restore same result, restart clears it.
- [x] Run all obtainable existing long-jump tests plus new tests; inspect unchanged physics hash, create baseline manifest and exact patch. Full repository check must be reported unavailable if source subset cannot support it; browser ownership stays with parent.

Verification: 28 focused tests pass; exact physics bytes preserved. Full platform build and actual browser acceptance remain blocked/unverified in the extracted source environment; managed CUA Chromium has WebGL disabled, and the full platform build script is absent in the source subset. This is not a deployment receipt.
