# Game UI Harmonization Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans task-by-task. Steps use checkbox syntax.
**Goal:** Make nine games' entry, HUD, results and downloads coherent without changing their play.
**Architecture:** Keep game-owned controllers and captures; narrowly adapt visible HTML/CSS/copy and shared presentation styles. Publish four independently usable overlays on fresh preview/hurdles heads; no source replacement or generic provenance exemptions.
**Tech Stack:** Static HTML/CSS/ES modules, Node tests, existing Cloudflare build.
**Spec:** docs/superpowers/specs/2026-11-01-game-ui-harmonization.md
## Global Constraints
- Only preview/hurdles; main/prototype Sites untouched. No Codex.
- Physics, input mappings, routes, storage keys, music, camera remain fixed; export framing may only preserve scene aspect.
- Keep real score/foul/medical and non-realistic safety meaning; no new timer/replay.
- Minimum44px controls, truthful mobile/native share activation, raw preview separate from full PNG.
## Review Focus
- Long/foul results: complete score/verdict/actions reachable, not cropped.
- Mobile sharing: synchronous native activation and cancellation unchanged.
- Restart during encoding: existing generation ownership retained.
- Narrow play: hints do not cover controls; pole height/energy remain visible.
- PNG: actual frozen scene, unchanged aspect; no stretch or fabricated score.
### Task1: Player-facing copy
Files: nine games' index.html, share.mjs, shot/high/hurdles game.mjs, beer platform.mjs; exact matching provenance and copy expectations.
- [ ] Add tests rejecting reviewed dev/private/version text in player UI and exported copy; assert safety remains. Observe fail.
- [ ] Replace only visible literals; preserve identifiers/comments/storage versioning and license attribution. Update narrow previous/current UI hashes.
- [ ] Run affected share/copy/provenance tests, syntax/build; review text diff. Archive+restore/hash, root review, publisher CAS and CF gate.
### Task2: Pole mobile HUD
Files: pole-vault/index.html,style.css,ui-state.mjs/game.mjs only presentation branches as needed; provenance/test.
- [ ] Assert mobile persistent height/energy and one contextual hint, collapsed detailed help; observe fail.
- [ ] Reduce duplicated hints and make landmark label phase/contextual without changing engine state.
- [ ] Run UI tests and supported390px/desktop visual check; durable archive, review, publish/gate.
### Task3: Result and PNG hierarchy
Files: nine game index.html/styles, existing share/capture/score-card/render export functions; shared/game-ui.css if common presentation rule helps.
- [ ] Pin retry-primary/existing-replay-secondary/details-collapsed and captured image aspect in relevant tests; observe fail.
- [ ] Apply score→verdict→actual scene→details→actions hierarchy; use high-jump1080x1180 base or documented aspect variant, no arbitrary crop/stretch.
- [ ] Inspect representative real PNG pixels and desktop/narrow result; run relevant lifecycle/capture tests, archive, review, publish/gate.
### Task4: Entry guidance
Files: nine game index.html plus presentation CSS; Beer existing inline help retained.
- [ ] Pin one goal/two core operations/collapsed advanced guidance without removing distinct mappings; observe fail.
- [ ] Apply scoped markup/copy retaining existing start/cancel/focus behavior and safety.
- [ ] Run affected entry/controller tests, supported desktop/narrow check; archive, review, publish/gate.
## Verification / ledger
Each batch logs actual commands/results and limitations. Full remote npm run check is mandatory; local focused checks never called full acceptance. Browser390px iframe is not physical-phone verification. Parent/root reviews each manifest; final reviewer checks cumulative scope. No optional confirmation required: user explicitly approved direct workflow.
