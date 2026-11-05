# Named sky journey

The player wants more clearly visible high-altitude and cosmic subjects, with names that make each stage unmistakable. The previous eight sky subjects were sparse over huge height ranges; portrait CSS hid their canvas captions entirely.

Build on the current preview branch and retain other game changes. Add 22 named stages from 45 km onward: atmospheric glow, meteor, Karman boundary, satellite, station, cargo capsule, probe, asteroid field, Moon, Mars, Jupiter, Saturn, Neptune, comet, boba ring world, pineapple capsule, night market, temple fair, lucky cat, lunchbox saucer, cosmic bus stop and galaxy doorway. After the authored journey, a bounded sequence revisits fantasy worlds instead of leaving infinite space empty. Exact authored thresholds are presentation choices, not new astronomical claims.

A single pure height-selected record supplies the principal model, prominent stage name, stage number, short comment and factual category. Names change together with the dominant model; an outgoing model may softly fade beside it. The actual height/score remains in the existing HUD. Label the early bands as scenery, Moon as a distance illustration, and the planetary tour and later jokes as fantasy. Never claim that a displayed planet has a fixed altitude above Earth.

A small DOM stage card remains readable in portrait even though the old decorative canvas is hidden. It occupies space below the portrait height/energy boxes, between those boxes on desktop, and uses a compact form in short landscape views. It cannot intercept input. The capture uses the same text record. Ground buildings, mountain heights, entry/input/physics/scoring, and result actions remain unchanged.

Approach: reuse the existing low-poly Three.js/CPU geometry and extend the fixed pool, rather than add image downloads or generate scenery per frame. This matches the original character and style and keeps mobile work bounded. At most two main subjects coexist; geometry is shared, time affects only cosmetic drift, and finish/capture selection uses the frozen altitude.
