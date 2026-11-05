# PlayFormosa game admission standard

**Applies to new games and updates.** Approved 2026-10-28; first implementation covers Long Jump, Hurdles, Reaction Rod and Beer Slide on **preview/hurdles only**. This is a reusable interface/lifecycle contract, not permission to publish to another branch.

## 1. Common chrome; game-owned art and rules

Load `../shared/game-ui.css` **after** the game's art stylesheet and put `pf-game` on `<body>`. Use `pf-header` on a header in normal document flow, above the playing area. The visible left link is exactly **首頁**, without an arrow or other icon. Keep the existing native link, destination, and descriptive accessible name: the sports and standalone games use `class="pf-home"`, `href="/"`, accessible name `遊戲首頁`; the three Fast Hands entries retain their existing `/#minigames` destination and `返回小遊戲首頁` accessible name. This label rule does not rename game-internal navigation, recovery links, or the separate feel-test return link.

The header contains one game title and `nav[aria-label="遊戲操作"]`. In DOM, visual and keyboard order the three buttons are:

1. `data-game-action="music"`: genuine music/audio toggle; `aria-pressed` reflects audio availability/enabled state, with a truthful loading/error/retry status.
2. `data-game-action="restart"`: clears input and resets the current attempt through the engine's reset function; never reload the whole site as a pretend reset.
3. `data-game-action="pause"`: freezes real simulation/countdown/replay clocks. Use `syncPauseButton(button,{paused,available})` from `shared/game-ui.mjs` so label, visible text, pressed state and disabled state agree.

The shared sheet owns the home link's font, size, position and shape, and enforces **44 × 44 CSS-pixel minimum** toolbar targets. Narrow screens put the title on a second line; controls must never shrink below 44px or force horizontal overflow. Reset old absolute/floating header rules explicitly; importing a common stylesheet alone is not proof of compliance. Artwork, scenes, scores, physics and storage namespaces stay game-owned.

## 2. Lifecycle and input

- Pause must freeze simulation state, countdown, replay position and scoring. Opening Beer About also freezes released play; closing help returns to an explicit resume prompt. P/Escape can resume from the focused pause dialog. Resume rebases wall-clock timestamps; it must not consume elapsed background time.
- Clear held keys and pointer captures on interruption. An **unreleased Beer gesture is cancelled without scoring**, matching its existing cancel/blur policy, then paused. A released cup/replay stays at the same physical/time state.
- Restart invalidates pending captures, shares and clipboard requests before creating a fresh round. Preserve historical records; never clear another game's local storage.
- Keep existing keyboard mappings, including accessible native button activation. Do not consume keys inside text fields or copy dialogs. Do not attach touch-default suppression to document/body or result dialogs.
- Unlock audio inside a real user action, before awaiting work. Do not autoplay on page load. A disabled preference survives restart. Resume after a hidden-tab suspension must offer a new trusted unlock.
- If WebGL is unavailable, say so honestly, do not start scoring, keep Home/help and any independently functioning audio available, and disable unavailable game actions.

## 3. Results are viewport UI, never clipped stage content

Result containers must be native modal dialogs (or the existing tested Long Jump standalone recovery controller), outside clipped/isolation game stages. `createResultDialog(dialog,{focusTarget,returnFocus})` provides native top-layer opening, explicit result exits and focus return. It intentionally prevents Escape from silently discarding the result; provide restart/replay actions. Do not make the canvas smaller, crop it, resize it for a result panel, or constrain the result to a percentage of stage height.

- Use bounded viewport width/height, safe-area space, `overflow:auto`, `overscroll-behavior:contain` and `touch-action:pan-y`.
- Keep score, complete rating/verdict, supporting details and all actions reachable by internal scrolling at phone portrait/landscape and desktop 200% zoom.
- Focus a visible top heading with `tabindex="-1"` for long results (not an offscreen action below the photo); trap focus via native modality; return it to the play surface or invoking action on exit. Nested manual-copy/image dialogs return to the result action.
- Results may look like their game: shared semantics and actions do not require identical artwork or decorative typography.

## 4. Exactly three share actions

Use `.pf-share-actions`, with these DOM/visual orders and attributes:

1. **分享至Threads** — `data-share="threads"`; text plus the current-origin canonical game route. Prepare anchor href before click where an anchor is used, so middle-click is correct. State that images must be attached manually.
2. **分享成績圖片** on phones / **下載成績圖片** on desktop — `data-share="image"`; real PNG file. Prepare it before the share click. Invoke `navigator.share({files:[file]})` synchronously in the activation handler, with no capture, encoding, fetch or await beforehand. Desktop downloads the PNG; unsupported/rejected mobile share exposes a long-press image fallback or an honest supported alternative. Cancellation is not an error or permission to post elsewhere.
3. **複製成績與網址** — `data-share="copy"`; result text and `location.origin + /games/<slug>/`, without debug query/hash or private prototype hosts. Clipboard denial offers selectable text/manual copy, never a false “copied” message.

All actions need a status live region, duplicate-request suppression, retry after recoverable failure, and generation checks that prevent older callbacks from overwriting a new round. A replay/rotation is **not** a new round and must preserve its image. Revoke temporary object URLs on close/reset; do not blank an image before its save flow can use it.

### Capture invariant

Render the actual settled/visible fall pose, then immediately copy the game canvas to an independent 2D canvas **in the same task**, before any resize clears WebGL. Encode from that copy. Never screenshot the first frame of a new round, a replay-in-progress frame, an empty canvas, or a synthetic cup with an unrelated score. Brand the PNG and include the same score and verdict displayed on screen. Beer uses `freezeResultFrame` and `drawBeerResultCard` in its `share.mjs`; falling cups use the recorded final visible fall pose, honestly labeled rather than stood upright.

## 5. Admission regression gate

Run `npm run check` after the last edit. A focused pass is not a full pass. Add tests for the new game to the package test command.

Required automated cases:
- Exact home name/path; title; ordered action data attributes; >=44px target rules; shared stylesheet imported after art CSS; no duplicate IDs.
- Start → pause → wait → resume; restart while active and paused; hidden/blur/orientation; pointer cancellation; held keyboard/pointer releases; no score or replay-clock advancement while paused.
- Complete a real round, preserve score/storage through replay, close/return focus, restart and complete a second round.
- Native share success, cancel, rejection and unsupported browser; double click; clipboard denial/manual copy; Threads content and current origin.
- Delayed/failed PNG encoding, retry, restart during pending encode/share/copy; late callback cannot publish stale content; result survives resize with the same frozen pixels.
- Asset/license provenance; physics/art/record namespace preservation; no private prototype URLs or unrelated diagnostic modifications.

Required browser/real-device acceptance before calling UI fully verified:
- 320×568 and 390×844 portrait; 844×390 landscape; 1366×768 desktop; 200% desktop zoom; portrait/landscape rotation while playing, paused and at result.
- All header controls visible and >=44px, no horizontal overflow; canvas retains aspect and true controls; all result content scrolls into view.
- Keyboard Tab focus stays within modal; close/replay/retry focus returns; nested copy/image fallback remains accessible.
- Actual mobile touch and audio unlock, native share sheet cancellation/retry, long-press PNG save; inspect real PNG pixels from two different rounds.

If a browser/tool is blocked, record the exact boundary, distinguish never-run from passed checks, and do not claim real-device acceptance from Node DOM adapters. `scripts/browser-platform-ui.mjs` is a bounded local Chromium smoke test, not iOS/Safari/native-share acceptance.

## 6. Maintenance and release discipline

The shared layer must stay small: chrome, action layout, truthful state helpers and modal focus. Keep per-game simulation out of it. Extend the shared contract/tests before admitting a novel game, rather than copying a different header and hoping it matches.

This UI candidate preserves the original `docs/minigames/SOURCE-MANIFEST.json`. Named approved controller/markup deltas are separately traced in `UI-STANDARD-MANIFEST.json`; unchanged physics, character/scene, camera, vendor, music and license bytes still match the imported originals. Long Jump cosmic, diagnostics and root-origin modules are untouched. Integrate the independent sandpit patch as explicit additive game hooks, never by replacing the whole game file.
