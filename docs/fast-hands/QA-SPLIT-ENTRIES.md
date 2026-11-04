# Split entrances, recorded starts and 鴨沒漏補 QA

## Scope and preservation

Parent commit: `0e3456edc01268724ebcc3eecf7d5be31272dccb` on `preview/hurdles`. Three homepage cards keep the same routes, game IDs, leaderboard rules and old records. Each homepage entry opens its own brief intro; in-game tabs continue without repeating it. The latest approved first-game name is **鴨沒漏補**, replacing the earlier proposed name. Display labels, board headings, share text, exported filename and score-card heading agree. The pre-existing result quip “一手包辦，鈔鴨雙收。” remains descriptive copy, not the game title.

The existing count service adds three exact keys. Actual new formal runs count once; practice, demo, replay, later rounds and interrupted-current-run retries do not. The existing anonymous receipt protocol, dedupe, body limit, cooldown, daily caps, origin gate and QA configuration are unchanged. Existing schema 002 supports the text keys without a migration. No remote SQL, real leaderboard submissions, public count POSTs or live homepage view events were executed during testing.

## Browser verification

Isolated local preview with fake fetch for all score/count requests; no public mutations. Actual game controllers and generated canvas captures were used, with deterministic clock/random for the new modes. Tested 1000×400, 1024×600, 1366×768, 1920×1080, 320×568, 360×640, 390×844, 430×932, 768×1024 and 844×390.

- 1740/1740 result/gameplay/selection checks passed across all three modes and ten sizes: one-page layout, usable/stable controls, original duck track width, four result actions, folded extras, nickname focus and native editing, consent-gated mock upload, simulated rank 27 accepted, current scene pixels, replay, sharing and repeated runs.
- 144/144 intro checks across six sizes: one large mode-specific 3:2 cover, complete uncropped artwork, readable copy, no overflowing start button or horizontal scroll.
- 50/50 actual entry-navigation checks: three homepage targets, cold direct entry, correct initial mode, warm homepage intent, in-game tab continuation, legacy links, reopened help and first-entry settings return.
- 22/22 dedicated actual duck-result/export checks: real 900×620 capture, 1080×1350 PNG, latest heading and mobile save-image fallback. No image posted to another service.
- An initial intro CSS max-height distorted the image element box at some sizes; the final width is constrained by viewport height while preserving the 3:2 ratio. The rerun passed.

Native long-press event prevention and computed user-select rules were tested in the real browser; editable nickname and manual copy/save-image exceptions remained available. This is not a claim of physical iOS/Android OS-menu testing.

## Scene and image review

The public reference at https://www.threads.com/@codemtcspeed/post/DfAV1SfjDYY was viewed without login or copying its media. Original static kitchen/table details reflect the visible neutral stone tabletop, muted masonry, cream cabinetry and rear recess. Existing character, bill, duck, controls and game timing remain unchanged. Scene cost is 179 meshes /34,742 triangles versus 155 /33,022, with no new textures.

The browser exposes disabled WebGL. Real browser play/capture was verified using the existing 2D fallback; the new 3D scene and score cards were additionally inspected through offline source-mesh rendering with the production camera, transforms, motion and capture flow. GPU performance and real-device WebGL appearance remain unverified.

The regenerated duel cover uses the actual homepage athlete image and existing king cover as direct imagegen inputs. Full-size and thumbnail review confirmed the athlete's swept hair, face, orange singlet and navy shorts. Asset hashes and reference hashes are recorded in SPLIT-ENTRIES-ASSETS.json. The duck share-card scene area is 900×620 within 1080×1350, retaining all capture pixels, readable text and studio credit. A browser export check exposed portrait-viewport letterboxing in the 2D capture; its identical frozen pose now renders offscreen at the canonical 900×500 scene size before contain-fitting to 900×620, without resizing the live canvas or cropping content; success, record and failed cards were reviewed.

## Review and tests

Independent review found a first-entry settings detour: closing settings exposed play before the intro was acknowledged, allowing reopened help to reset/recount an interrupted run. A RED regression reproduced it. The fix blocks unseen gameplay and restores the intro on settings close with stale-close/page-away guards. The reviewer independently passed 63 targeted tests with no remaining blocker. The final latest-name focused run passed 99 tests.

Build and preview release preflight passed. Fresh full suite: 2236 tests, 2222 passed and 14 baseline failures; failure names and error signatures match exactly. No new or changed failure remains. Final independent capture/name review passed 76 tests plus eight real-torso pixel-equivalence samples. This minimal local reconstruction lacks 15 unrelated historical image/audio binaries; the same 14 baseline tests fail for those absent files. No unrelated missing asset is deleted from the complete remote tree. The publication audit verifies every untouched remote blob and all archived ledgers/preimages.

## Release boundary

Only `preview/hurdles` is authorized. A complete candidate backup and exact publish inventory must precede the lease-checked update. Cloudflare build and non-mutating deployed source/GET checks follow publication; main must remain at its original commit. The new counts start from real future accepted events; zero must never be represented as historical usage. No database initialization or fabricated counts is performed.
