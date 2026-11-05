# Javelin results and concise copy

Scope is `preview/hurdles` only. The result heading is no longer a focus target, which removes the unwanted heading rectangle. The actual Retry button receives default focus and retains the existing visible keyboard focus treatment. Space and Enter are handled as one fresh press/release; repeat, stale keyup, focus loss, duplicate clicks and older detached result buttons cannot restart a later attempt.

The result keeps the grade, distance or foul reason, one actionable next-throw tip, replay, landing view, retry and sharing. Renderer names, repeated launch metrics and verbose image explanations are removed. Help retains all four controls, the 6–7 m brace timing, braking/foul rules, local records, pause behavior and required asset credits.

## Preservation

No scoring, physics, pose, camera, rendering, audio, sharing, CSS or controls mapping files are changed. Ten protected javelin files were compared byte for byte with the verified baseline. The original `physics.mjs`, `pose.mjs`, `shoe-contact.mjs`, `render3d.mjs`, `character3d.mjs`, `share.mjs`, `audio.mjs`, `platform-audio.mjs`, `style.css` and `platform.css` remain exact.

The provenance layer restores independently pinned remote bytes for every edited path. All earlier manifests, fixtures and their hash pins stay unchanged. Only historical read/inventory boundaries are composed with this new reversible layer. Publication must overlay the current remote base tree, preserving the twelve PNGs unavailable in this connector materialization and every other branch path.

## Verification

- Regression-first checks reproduce old heading focus, held-key/stale-button activation, renderer caption and redundant copy before the fix.
- Javelin tests cover keyboard and touch-pointer input, terminal holds, valid/foul scoring, >100 m skill progression, replay, pause, photo capture, immutable sharing and input cancellation.
- Real DOM plus original physics: keyboard events and pointer events on the actual limb buttons both complete a valid 106.003984 m attempt, replay, return to the result, reject a held Retry key and restart to the untouched ready state. Hardware/audio/share boundaries are isolated; no position, score or launch state is injected.
- Independent review found no blocking correctness issues; the recommended stale-DOM guard was added with a failing/passing regression.

Browser validation and final aggregate/publication receipts are recorded after the final integration. Do not treat this document as a deployment receipt.

## Browser result checks

Managed Chromium tested actual fallback-canvas result screens at 1100×680, 390×844, 320×568 and 844×390. A local-only fixed-step frame clock drove original keyboard events through unchanged game physics; no position, score, launch or terminal state was injected. Every run was valid. The result heading's computed outline was `none`, Retry was the active element with a visible `solid` focus outline, and all views had zero horizontal overflow. Retry was fully inside the initial viewport in all four sizes. Native Space restarted each view to ready without beginning a run; a one-second held Space in landscape did the same once. Replays and return-to-result are also covered by original-controller tests.

This cloud browser disables WebGL, so screenshots and native key acceptance are from the genuine fallback renderer. These checks do not certify a physical phone or WebGL GPU behavior. Ten protected renderer/physics/audio/share/style files remain unchanged.

## Materialization limitation

The initial integrated local full run had 2773 tests: 2753 passed and 20 failed at existing missing-image boundaries. Twelve remote PNGs are unavailable in this connector checkout; all are retained by their original Git blobs in the publication base tree. The local static build and preview release-channel preflight passed. The reference verifier stops at the already-missing high-jump card. No missing-file assertions or old provenance pins were weakened. The upstream sky inventory repair was then integrated. The final integrated run on sprint parent `8dcf2515a0ccc2c60edbb28103126babc803ada5` had 2775 tests: 2755 passed and the same 20 local missing-image failures. All 107 javelin and successive provenance checks passed, including the complete-remote inventory regression that reproduces the earlier Cloudflare issue without reading missing binaries. Publication remains separate from this receipt.
