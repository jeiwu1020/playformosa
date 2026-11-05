# Sprint fall head/neck repair

Preview-only visual repair for the reported detached head during a 100 m fall.

## Cause and scope

The old adapter flattened each joint and independently clamped its height to the track, while the torso and its neck retained a different fixed angle. At the first real repeated-leg fall, the rendered head center was 0.631 m from the rigid torso's expected head attachment. The fall-only fixed angle also snapped to the running angle on recovery.

Only `public/games/sprint-100m/pose3d.mjs` changes at runtime. The repair rotates the whole skeleton around the hip, supplies the same angle to the actual torso mesh, preserves upper-body lengths, and lifts the complete pose instead of separately moving anatomical endpoints. Smooth fall blending converges continuously to the original running pose. Normal running and crouching paths remain unchanged.

Race physics, controls, AI, timing, collision/scoring chest plane, replay, audio, camera and character meshes are unchanged. The branch's preceding pole-vault changes and its complete runtime-inventory repair are retained. `main` is not a target.

## Verification

- The new real Three.js regression initially failed on head attachment (0.631 m error) and recovery continuity. All four new tests pass after the fix.
- Tests cover a fall triggered by repeated real leg input, more than 100 recovery frames, all four runners, finish leans, varying gait times, an unchanged race snapshot after rendering, unchanged scoring-chest alignment, and 390×500, 844×290 and 1366×600 game-camera framing.
- Actual source geometry was CPU rendered for before/after fall, recovery and normal run, plus all three gameplay-camera sizes. Head/neck contact was visually inspected. These are CPU model renders, not browser screenshots.
- Read-only peer review found no blocking correctness issues.
- Chromium could not start in this cloud environment: both normal and approved escalation attempts failed with `socket() failed: Operation not permitted`. Browser WebGL and physical mobile-device acceptance were not performed.
- `FALL-MANIFEST.json` and its independently pinned baseline inventory account for every changed/new source path and preserve prior immutable provenance. Historical pins are not relaxed.

The full `npm run check` test stage executed 2,761 tests: 2,741 passed and 20 failed. The exact 20 failure names and first error reasons match the preceding sky candidate and original sparse-checkout limitations; there are no new failures. They depend on the same 12 omitted large PNGs, rather than the sprint repair. The check therefore does not count as a full pass. Standalone build and preview release preflight pass. Standalone local-reference verification stops at the already missing `public/assets/high-jump-card.png`. Those remote assets are preserved by the base-tree overlay; no missing local asset is published as a deletion.

Remote publication and deployment receipts are reported with the release. A source package alone is not proof of deployment.
