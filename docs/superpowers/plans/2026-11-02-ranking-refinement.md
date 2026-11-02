# Ranking readability refinement Implementation Plan
> Native dot-cloud implementation; independent audit review before sole-publisher release.

**Goal:** Give the two existing boards breathing room, concise playful copy and evenly spaced phone toolbar.
**Architecture:** Presentation-only edits to shared leaderboard.mjs/css; retain every API/score/owner/lifecycle contract. Scope styles to pf-has-ranking.
**Spec:** User screenshots IMG_6389/6390 and approval 7ddfc6746950819195ac1147070f6dce.

## Constraints and review focus
- Preview 79c7dd0 only; main and worker/schema untouched.
- Public nickname/score and anonymous-device record meaning remain explicit before submission.
- Ranking uses raw scores unchanged; no false anti-cheat claims; display precision not a new scoring rule.
- All six toolbar targets share phone width, remain >=44px high/wide at320px; readable labels, no clipping.
- Entry/playing/result view transitions, repeated open/close, abort/stale callbacks and focus traps remain unchanged.

## Tasks
- [x] Add failing DOM copy/layout assertions; run red.
- [x] Remove redundant technical disclosure, retain short rule and one device/publication note. Replace right-packed nav with equal-width six-slot layout on phone; keep desktop. Hide only scoped decorative footer on phone if useful.
- [x] Run existing board/controller tests, full tests/build; report existing missing audio honestly.
- [x] Managed preview 320/375/390 and short landscape actual toolbar/board checks, mock clearly labelled; review exact diff.
- [x] Append exact two-UI-file provenance; freeze for Library backup/fresh restore.
- [ ] Sole publisher preview CAS/CI/live (release gate, not claimed yet).
