# Fast Hands presentation polish

The user approved implementation and preview/hurdles publication after discussion, retaining one main entry. This is a narrow visual change on parent 35b5bc6c6017b03bca5e4d62474446854456a298.

## Goals
- Remove the normal duel scene's technical renderer label; genuine loading/art errors remain available, and fallback explanation remains in help.
- Blend final-result image padding into the gold ticket panel without stretching or cropping the actual scene. Preserve the frozen current-event capture and sharing/replay behavior.
- Replace only the catch/duel intro thumbnails with two distinct, matching generated 3:2 illustrations based on existing King, athlete and duck-cover references. Catch includes King, toy launcher and short blue foam dart; duel includes King and orange-shirt athlete reaching for the same prize.

## Chosen approach and alternatives
The user chose one main entry, rather than three homepage entries. Keep all original URLs, introduction/navigation flow and leaderboard identities. For result images, preserve complete contain-fit images rather than cropping to cover. Use transparent padding and a matching panel background, not a dark framed box. For intro artwork, use generated illustrations rather than the current distant gameplay frames. Precise composition and warm palette matching the duck cover are implementation choices.

## Constraints and verification
No changes to speed, AI, rules, scoring, gestures, model geometry, remote database, existing records or main. No live score submissions. New assets must be inspected as pixels and at small thumbnail sizes. Keep fixed result buttons and phone/desktop one-page main content. Test real capture edge pixels, duplicate/replay image behavior, renderer-error visibility, intro ratios and historical provenance; compare the full-suite baseline's 14 known missing-binary failures. Verify exact branch/CI/live result after publication. Cloud Chromium lacks WebGL, so retain explicit limits on hardware 3D and physical iPhone validation.
