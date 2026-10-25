# 四肢各有想法－跳遠 — v0.5

Game source: `public/games/long-jump/`; platform build copies it to `dist/games/long-jump/`. No new backend, dependencies, social account tokens or assets. Existing homepage/catalog are unchanged.

## Changes
- All-device measured CSS viewport layout, including scaled desktop. Central arena and four large buttons dominate; no hero, technique text or detailed result statistics.
- Root native `<dialog>` with fixed fallback, independent of arena clipping. Entry has three short lines explaining paired rhythm, AS hold/release and airborne steps. Result is score/status, one verdict, Threads, image action and replay. Only dialog overflow may scroll.
- AS legs / JK arms unchanged. Deliberate AS hold/release still jumps. Pointer cancellation or unexpected lost capture pauses/cancels unfinished compression instead of producing a phantom jump; ordinary release still jumps.
- A qualified opposite pose followed by a transfer earns the first glide; returning earns the second. Each adds .65 m/s horizontal speed and .22 s of gravity at 35% strength. Total reduced-gravity budget .44 s; no upward velocity kick, no renewed budget on pause, no post-contact award. Sand now ends at x=42 and camera follows the larger valid area. Out-of-sand contacts do not earn a mark.
- First impact is separate from the final nearest scoring mark. Deterministic head/butt/hand/feet/body verdicts vary across five distance bands and invalid attempts. Foul remains invalid/zero official distance and never updates the best record. New `pf-longjump-best-v5` preserves v1–v4.

## Sharing
Threads opens `https://www.threads.com/intent/post?text=...` with factual result text containing the public game URL. It does **not** attach the local PNG, publish automatically or report publication. Popup blocking is reported. Official Meta documentation could not be retrieved during verification; intent behavior is not live/device-verified.

The separate image action uses native PNG + result text + public URL sharing on touch/mobile, desktop PNG download otherwise. Unsupported mobile file sharing opens the PNG for manual saving; native cancellation never triggers a download. Errors retain the prepared file. UI reports hand-off/request/opening, not guaranteed publication, download completion or photo-library saving. OS share targets/photo-save options cannot be forced; receiving apps may omit text or URL. An explicit copy-result-and-URL action is provided, reporting failure honestly.

PNG is prepared after final render, copied synchronously before asynchronous encoding, and rejected if its generation is stale after replay. Score card is simplified to the actual screenshot, score/status, verdict and studio identity. No account permissions or external image hosting.

References: [MDN Web Share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share), [WebKit activation](https://webkit.org/blog/13862/the-user-activation-api/), [Three.js screenshots](https://threejs.org/manual/pages/tips.html).

## Verification
`npm run check` passes **87/87 tests**, builds the platform, and verifies **25 local references across 17 output files**. All game ES modules pass `node --check`.

Tests cover 1280×600 CSS scaled-desktop space, 1920×1080, 667×320 with 44px side/21px bottom safe areas, portrait 390×844 and tablet 1024×768; viewport resizing/pinch behavior; root dialog/cancel; four-key/multi-pointer handling; semantic cancelled-touch versus intentional jump; stale captures; native share/cancel/unsupported/error and Threads popup routing; finite glides; fixed bones/rotations; first-contact versus nearest-mark/foul logic; deterministic verdict boundaries; CPU camera projection and frame-driver consistency.

## Repeatable operating recipe
1. Hold **A+K**, then **S+J**, about one third of a second each; switch rather than tapping furiously. The outlined pair changes after a .30 s hold, telling you when and which side to switch. Successful steps flash briefly. Tested ground speed reaches the 30.6 km/h cap; takeoff is slower after charging.
2. When **AS 蓄力！** appears roughly 5 m before the board, start holding **A+S** (release arms), hold about .30–.40 s, then release both when the cue says 放開 AS. The cue is a region, not an automatic jump. Starting later can still foul.
3. In air use the **same .28–.42 s rhythm** for three poses (A+K → S+J → A+K, or reversed), then hold AS with arms released to tuck before landing. Each earned glide flashes and leaves a shoe trail.
4. Optional stunt: deliberately hold A+J or S+K to rotate opposite directions. Keep it held beyond the short .14 s skew guard; release to stop adding torque, not to stop existing rotation. There is no automatic recovery.

The 27-case timing grid combines .28/.34/.42 s beats, .30/.35/.40 s charge and starting x=5/5.4/5.8 (4.2–5 m before board). All gave valid **11.488–13.865 m** with two glides. This is a useful tested strategy range, not a global optimum or human playtest. Brief .10 s arm skew still earns the two glides. Four-button 40 ms mash and all-held controls earn no run speed in the regression. A leg must first reach 65% flexion before useful ground extension; readiness resets when it extends below 10%. This rejects tiny taps from rest, while partial strokes after a genuine priming motion can still do some work.

Charge now fills in about .33 s; the first .15 s does not suffice to jump. Charging drag and takeoff loss are reduced. Air pose qualification uses 60/40% joints and .025 s stable dwell, rather than 72/28% and .05 s. A .14 s sustained-direction guard prevents brief pair skew from becoming unwanted flip torque; deliberate torque is stronger but still capped. Ground force/energy tuning otherwise remains unchanged.

A semantic cue-following simulation reaches peak 30.6 km/h, takeoff 27.34 km/h and a valid 11.30 m landing with two glides. Review also corrected the first-step hint and added a hold/switch regression. Touch-interruption regressions remain passing. Baseline homepage renderer/catalog/generated HTML/hero asset are byte-identical to `playformosa-cloudflare-handoff-v1.zip`; build regeneration did not change homepage content.

## Limits
The supplied user screenshot was inspected, but no browser screenshot, real-device touch/native-share or OS150% visual acceptance was performed. Layout budgets and source checks are not visual proof. Contact remains a simplified joint-center model, not full mesh collision hulls.
