# Fast Hands QA leaderboard

## Goal and scope
Connect the existing Fast Hands test game to the existing QA leaderboard. Mouse and touch are separate boards. Preserve the approved gameplay, front-facing character, result portrait, image download, all other games, and production data. No database migration, new credentials, paid resource, or production binding is required.

## Contract
- GET `/api/leaderboard?game=fast-hands&mode=mouse|touch` resolves one of two fixed rules: `shuttle-v3-mouse` or `shuttle-v3-touch`.
- POST uses the existing eight-field submission contract, with unit `ms`, status `success`, and the completed round's unrounded positive elapsed milliseconds, strictly below the existing physics deadline.
- Only QA accepts this game. Nine legacy game contracts remain unchanged.
- Rankings are player-reported, not an authenticated or verified competition. The UI explicitly discloses nickname and score visibility on the test board.
- Upload is always manual. A completed round freezes the actual pointer category and score. Browsing another board, closing/reopening a dialog, and retrying cannot mutate that payload or create duplicate submissions.
- Failures, cancellations, demonstrations, and historical local bests are not eligible.

## Implementation and checks
1. Add strict backend board resolution and real SQLite API tests. Check category/scope isolation, ascending raw score order, ties, invalid contracts, duplicate IDs, rate limits, and unavailable storage.
2. Add an isolated Fast Hands ranking controller and accessible bounded dialog. Retain existing anonymous device/nickname storage and manual retry semantics. Test race conditions, stale responses, storage/UUID failures, mode freezing, and input validation.
3. Merge only the reviewed loading overlay, then pin the new ranking layer in a reversible manifest. Preserve every prior provenance manifest and verify all historical protected bytes through the new layer.
4. Run focused tests, the complete suite, release/build checks, and browser checks on small/large viewports. Exercise success, failure, download, board read, and mocked upload/error paths. Physical phone/GPU checks remain unverified.
5. Publish only to `preview/hurdles` using an expected-HEAD lease after the loading batch has passed CI. Verify the exact commit's Cloudflare build and live QA GET responses. Actual online QA test submissions require explicit authorization of the test nickname/count; do not write production data.

## Review focus
- Score/mode cannot be read from formatted text or current preference after a round ends.
- Closing a pending upload does not imply server cancellation; retry uses the same UUID and immutable payload.
- New rounds invalidate stale UI while harmless read failures never interrupt play.
- Short landscape screens retain reachable controls and keyboard focus.
- All prior games and protected source inventories remain exact, including production isolation.

## Confirmed interface and artwork refinement
The result replay uses this round's accepted normalized pointer samples and original timestamps, not the demonstration. It is original-speed, non-interactive, does not score or submit again, omits untimed preparation, and returns to the original result. A bounded 4096-sample recorder safely disables replay for unavailable/oversized histories instead of inventing a path.

The entry keeps the first-start demonstration flow but removes its home link. Home, ranking, settings, and menu live in the platform-style top toolbar. Larger guidance explicitly starts at the paper bill; the visible front-3D caption is removed while renderer fallback disclosure remains. Two approved generated covers replace only homepage references, with archived source cards retained. New 768×512 WebP assets are 63,452 and 60,114 bytes; both are promotional illustrations, not gameplay screenshots.
