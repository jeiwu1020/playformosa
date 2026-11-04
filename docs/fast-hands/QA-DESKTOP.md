# Desktop scene-left layout

Baseline: `preview/hurdles` at `533056c2be3f1f7d02ae1f69712c00f2b5e452d1`, tree `0f1578705d3fe32a74bd4465841a776fadb28671`. Main is unchanged.

## Scope

Only `public/games/fast-hands/club.css` changes at runtime. The published CSS remains an exact byte prefix; the appended rules require a viewport width of at least 1000px. Mobile rules and all JavaScript, game timing, scoring, records, leaderboard, sharing and assets remain byte-identical.

All three desktop modes place the scene on the left and instruction/status/action content on the right. The duck's sliding pad still spans both columns at its original width, preserving the gesture distance rather than making desktop play easier or harder. Intro and result dialogs keep their existing behavior.

## Verification

- Desktop provenance tests cover exact parent/tree and CSS Git blob, append-only desktop media boundaries, runtime inventory, byte drift, malformed/overlapping reversal edits, unapproved paths, wrong parent bytes, encoding and outside-file handling.
- The outer desktop manifest reverses the one changed CSS file, preserves 62 other Fast Hands runtime files and all 12 earlier ledger files exactly. Entry reversal now applies desktop reversal first, keeping the historical chain fail-closed.
- All provenance checks: 37/38 passed. The sole inherited failure is `sharing preserves other games, loading art, previous manifests, backend, rules, character and score image`, caused by the minimal reconstruction's absent `public/assets/app-icons/javelin/apple-touch-icon.png`.
- Browser fixture: 804/804 checks across 11 sizes and three modes, including 1000x400, 1000x560, 1024x600, 1366x768 and 1920x1080 desktop views, plus widths 320, 360, 390, 430, 768 and 844. Checks cover viewport fit, right-side text/actions, full-width duck pad, stable state geometry and repeated result dialogs.
- Baseline browser measurements match exactly for all 18 shared mobile/tablet size-and-mode cases, including scene/control rectangles, container bounds, scrolling and states. Duck pad width is unchanged at every common tested size.
- Full suite: 1882/1904 passed with exactly the same 22 baseline failure labels, no new or removed failures. Missing historical binary assets and database-test dependencies remain unresolved; this is not an aggregate-pass claim.
- Visual inspection found no overlaps in all three desktop modes at 1000x560 and in the duel mode at 360x640.
- Static build and `npm run check:release -- --expect=preview` passed.
- Real browser mouse input on duck: dragging to the right end and releasing aborted normally without recording a score. No input or judging logic changed.

## Limits

Browser checks use the cloud browser and its existing fallback rendering. They do not establish real GPU rendering or physical-device behavior. Publication and deployment are verified separately against the resulting remote commit.
