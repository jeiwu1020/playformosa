# V8 candidate verification

Scope: isolated long-jump v8 implementation from remote base 68685a8282a2143ff72832de03e4f6d06cf1adc9. No main push/deployment and no other platform game edits.

- Active aggregate run: **113/113 tests pass**.
- `npm run build`: passes. `node scripts/verify.mjs`: **41 local references across 26 output files verified**.
- Focused game suite: **86/86 pass**. An independent game-local reference check also passes 20 imports/asset references.
- All movement witnesses in `evidence/engine-traces.json` start from fresh state and feed actual input arrays. Examples: no further action lands after ~4.37 s /39.03 m; sustained skill feedback can fly ~181.65 s /5,043.02 m, complete seven cartoon loops, then choose to land. Static held inputs land; one-sided motion can produce real rotations. These are reproducible CPU witnesses, not maxima or human playtests.
- Landmarks/scenery are actual procedural meshes, streamed as seven bounded chunks. First-contact country, world-coordinate marks, local rebasing, opposite-direction full turns and versioned records have focused tests.
- CPU exports/rendered PNGs use actual scene geometry and game camera; Blender lighting is different. They are explicitly named offline CPU evidence, not live screenshots. Inspection caught excessive empty-sky framing and sparse landmarks; lift-at-altitude and landmark spacing were adjusted and rechecked without imposing a journey timer or distance ceiling.
- Layout budgets cover 852×393, 844×390, 390×844, 667×320 with safe area, 1024×768, scaled desktop 1280×600/640 and 1920×1080. Four controls use side-paired limbs. Live browser/native touch/share acceptance remains unperformed due the available environment’s browser connectivity/IPC limitations; no bypass was attempted.

## Preserved remote asset

`public/assets/hero-long-jump.png`: exact original Git blob `89d8dd2580a7b4c0842b6c7091bae7a8fa8fcc1f`, 2,290,523 bytes. Supported GitHub base64 contents initially returned empty for this large image; blob reader failed UTF-8 decoding; general fetch rejected binary. The parent subsequently verified the live root HTML and downloaded its public asset from https://playformosa.playformosa.workers.dev/assets/hero-long-jump.png through ordinary HTTP. This executor independently checked the Git blob hash, copied the exact original, and reran the complete checks successfully. It is not part of the candidate delta.

## Independent review

Two read-only reviewers found no remaining high/medium defect after fixes. Review found blocked-storage anti-repeat loss; the implementation now keeps session history when persistence is unavailable. A contact-boundary case now also includes the actual landed region in exploration, rather than relying only on hip travel. A separate 600-second input-policy witness completed 23 loops and 32 rebases and landed legally at 16,787.96 m (reported by the controls reviewer); this is bounded numerical/gameplay evidence, not a human playtest.

## Known remaining acceptance

Live WebGL/browser layout, phone thumb ergonomics, sound levels, native sharing on actual devices, and fun/difficulty tuning by people. The procedural country landmarks are intentionally compact prototypes, not accurate geographic models. No promise of macro resistance or limitless numeric precision is made.
