# 四肢各有想法 — v0.4

Game source: `public/games/long-jump/`; platform build copies it to `dist/games/long-jump/`. No new backend, dependencies, social account tokens or assets. Existing homepage/catalog are unchanged.

## Changes
- All-device measured CSS viewport layout, including scaled desktop. Central arena and four large buttons dominate; no hero, technique text or detailed result statistics.
- Root native `<dialog>` with fixed fallback, independent of arena clipping. Entry is title/key mapping/start. Result is score/status, one verdict, Threads, image action and replay. Only dialog overflow may scroll.
- AS legs / JK arms unchanged. Deliberate AS hold/release still jumps. Pointer cancellation or unexpected lost capture pauses/cancels unfinished compression instead of producing a phantom jump; ordinary release still jumps.
- Two complete opposite-limb cycles each add .65 m/s horizontal speed and .22 s of gravity at 35% strength. Total reduced-gravity budget .44 s; no upward velocity kick, no renewed budget on pause, no post-contact award. Sand now ends at x=42 and camera follows the larger valid area. Out-of-sand contacts do not earn a mark.
- First impact is separate from the final nearest scoring mark. Deterministic head/butt/hand/feet/body verdicts vary across five distance bands and invalid attempts. Foul remains invalid/zero official distance and never updates the best record. New `pf-longjump-best-v4` preserves v1–v3.

## Sharing
Threads opens `https://www.threads.com/intent/post?text=...` with factual result text containing the public game URL. It does **not** attach the local PNG, publish automatically or report publication. Popup blocking is reported. Official Meta documentation could not be retrieved during verification; intent behavior is not live/device-verified.

The separate image action uses native file sharing on touch/mobile, desktop PNG download otherwise. Unsupported mobile file sharing opens the PNG for manual saving; native cancellation never triggers a download. Errors retain the prepared file. UI reports hand-off/request/opening, not guaranteed publication, download completion or photo-library saving. OS share targets/photo-save options cannot be forced.

PNG is prepared after final render, copied synchronously before asynchronous encoding, and rejected if its generation is stale after replay. Score card is simplified to the actual screenshot, score/status, verdict and studio identity. No account permissions or external image hosting.

References: [MDN Web Share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share), [WebKit activation](https://webkit.org/blog/13862/the-user-activation-api/), [Three.js screenshots](https://threejs.org/manual/pages/tips.html).

## Verification
`npm run check` passes **72/72 tests**, builds the platform, and verifies **25 local references across 17 output files**. All game ES modules pass `node --check`.

Tests cover 1280×600 CSS scaled-desktop space, 1920×1080, 667×320 with 44px side/21px bottom safe areas, portrait 390×844 and tablet 1024×768; viewport resizing/pinch behavior; root dialog/cancel; four-key/multi-pointer handling; semantic cancelled-touch versus intentional jump; stale captures; native share/cancel/unsupported/error and Threads popup routing; finite glides; fixed bones/rotations; first-contact versus nearest-mark/foul logic; deterministic verdict boundaries; CPU camera projection and frame-driver consistency.

Matched policy: .30s ground pairs, begin .425s compression at x=5.75, airborne .22s pairs until .90s then tuck. Coordinated glide reaches **12.789m**, baseline **9.102m**, with **+0.325s airtime** and **0.44s consumed glide window**. Not a global maximum or human playtest.

Independent review found one touch-interruption bug, fixed with an observed failing regression then passing full suite. Baseline homepage renderer/catalog/generated HTML/hero asset are byte-identical to `playformosa-cloudflare-handoff-v1.zip`; build regeneration did not change homepage content.

## Limits
The supplied user screenshot was inspected, but no browser screenshot, real-device touch/native-share or OS150% visual acceptance was performed. Layout budgets and source checks are not visual proof. Contact remains a simplified joint-center model, not full mesh collision hulls.
