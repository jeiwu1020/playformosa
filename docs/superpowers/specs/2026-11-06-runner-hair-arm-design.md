# Runner hair and arm visual revision

## Approved intent
Improve only the 400 m and 1500 m characters: fill the missing rear/side hair, preserve their existing face, palette and hairstyle identity, fix short-looking arms with stable limb lengths and coherent shoulder/elbow/hand movement, and smoothly blend normal running, fatigue and finish leaning. Keep 400 m banking and 1500 m fatigue recognizable. Update both live 3D and baked compatibility sprites. Do not change 100 m, race rules, physics, timing, scores, leaderboard contracts, audio or platform layouts.

The user approved this concrete proposal after a read-only diagnosis, and additionally asked to first research Omni robot running arms and use the interesting movement as a reference. The user subsequently confirmed the reference is Tiangong Omni's 400 m run. Source video: https://www.wenweipo.com/a/202608/23/AP6a8abc51e4b0c1e50025eda7.html . Manufacturer-context post: https://www.sina.cn/news/detail/5335130365494975.html . Research must distinguish visible motion from reporting. Use only motion inspiration, no copied footage, branding or robot appearance.

## Approaches
Simply stretching the existing arm meshes would retain collapsing elbows and changing proportions, so reject it. Replacing the character would break visual continuity, so reject it. The approved approach preserves this character, fixes its render-only articulation and rear hair, and regenerates compatible atlases.

## Builder decisions
Use the existing Three.js procedural meshes and plain JavaScript. Give the arms a readable high-forearm, slightly outward comic silhouette inspired by the reference while keeping joints coherent. Do not invent a user-facing mode or change the input scheme. Use a small shared render-only arm helper for the two games if useful. Retain independent pose adapters for their distinct motion. Choose exact angles from geometry and front/side/back visual review, not an invented claim of measured robot joint angles.

## Constraints and acceptance
- Publish only the existing preview/hurdles branch after verification, with an expected-head check; main must stay unchanged.
- Preserve all unrelated assets and unavailable original remote blobs; the remote source baseline is 8e502b76005f9b74219394e0c35336ff09eafd88, tree 6d17b5b19ad6cbc6572f15f9084d1f079a8bd31d.
- Never write live scores or change a database.
- Preserve all sprint-100m files byte-for-byte.
- Add regression tests before production changes for rear hair coverage, stable arm lengths, non-collapsing elbow configurations, continuous leaning, coherent hands and no race-state mutation.
- Verify actual meshes from front, side and rear; normal, tired, leaning, crouch and fall where applicable; both compatibility rendering and live 3D or explicitly disclose an unavailable backend.
- Keep source provenance truthful: original import hashes remain historical; record explicitly authorized visual revisions separately and audit only their exact allowed paths.
