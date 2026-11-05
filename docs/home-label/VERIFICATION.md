# Platform home label verification

Scope: preview/hurdles only. This revision retains the preceding pole-vault, sprint and javelin changes.

## Reviewed behavior

- Audited all 14 available catalog entries: eight athletic events, Reaction Rod, Beer Slide, Tower Climb, and the three Fast Hands entries.
- The 11 legacy platform-header anchors change only their visible text from `← 遊戲首頁` to `首頁`. Native anchors, hrefs, aria-labels, classes and keyboard behavior remain intact.
- The three Fast Hands entries already show `首頁`; their `/#minigames` destinations and descriptive accessible names remain unchanged.
- The separate feel-test return to its game, recovery links, result links, and game-internal navigation are unchanged.
- The shared home-link rule gains only `min-width:44px`, retaining the existing minimum height. This prevents the smaller mobile sprint/high-jump type and padding from making the shorter label hard to tap.
- Existing current-behavior tests and the interface standard are updated. The outer exact-reversal layer preserves all historical pins and verifies the complete materialized parent tree.

## Verification performed

- Test-first: 11 label checks failed on the old labels; the separate minimum-width check failed before the CSS addition. All 16 new behavior checks pass after the change.
- Independent review confirmed the exact 11 HTML text substitutions, unchanged destinations/accessibility, and no existing CSS override of the minimum width.
- Managed cloud-browser QA inspected 14 entries at 390×844, 844×390, 1366×768 and 320×568. All 56 sets had the expected text/href, keyboard-focusable native anchor, in-viewport bounds, at least 44×44 pixels, and no overlap with the title or toolbar.
- Visibility passed for 48 sets. Long Jump and Beer Slide's eight sets remained behind their existing startup gate because the cloud browser reports WebGL unavailable. Their DOM geometry and label checks passed, but this is not a successful gameplay/startup check for those two games. No startup gate or game state was bypassed.
- Sprint and Javelin were started normally in their supported 2D fallback. Keyboard Enter on the header home anchor navigated the actual iframe to the platform root. Javelin's mobile header was visually inspected.
- Static build and preview release preflight pass. Full integrated test results and deployment identity are reported separately after the final branch update; this source note alone is not a deployment receipt.

## Environment limits

The connector cannot materialize twelve existing remote PNGs larger than 1 MB: the original screen-alpha duel atlas, the javelin and sprint Apple icons, seven game cards, and the echosboundary/formosabattle portal images. Their remote base-tree blobs are preserved byte-for-byte. No substitute image, changed historical pin, or broad test exemption is used. Existing missing-asset failures are compared with the parent before publication. This browser check is responsive/CPU validation, not physical-phone or GPU certification.
