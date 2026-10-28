# Hurdles Preview Integration Plan

> **For agentic workers:** Use the native assigned task with the existing approved design; parent reviews the exact diff before any GitHub publication.

**Goal:** Add the approved hurdles game to a test branch without changing production main or any other game.

**Architecture:** Recover every platform file from verified GitHub main blobs, integrate the sealed hurdles static distribution beneath `/games/hurdles/`, and keep homepage catalog rendering data-driven. GitHub publication uses a tree based on actual main and a non-forced preview ref; deployment is a separate verified outcome.

**Tech Stack:** Dependency-free static HTML/CSS/ES modules, Node.js tests, Cloudflare Workers Builds.

**Spec:** User-approved preview-branch integration and 110m / 8-hurdle rules; sealed game source owns physics.

## Global constraints
- Base main: `aa12a0ef6d6336c67eed0ce9d1dc7bdf9c0b6326`; recheck before publication.
- Never change main, production routes, long-jump assets/code, or cancelled beer game.
- Wait for sealed hurdles source; preserve controls, countdown, share, input guarding, audio, licenses, and approved 8-hurdle rules.
- Use neutral test labels; a GitHub branch does not imply a private or deployed preview.
- Do not modify Cloudflare configuration without a verified plan and authorization.

## Review focus
- Both games remain discoverable with distinct visuals and correct decathlon availability counts.
- Nested game routes load all local modules/assets without depending on the original private Site.
- Game brand link stays in the test platform; share URLs reflect the test host.
- Touch controls, result dialogs, best-score storage, and repeated game starts retain sealed-source behavior.
- Production main and long-jump blob hashes remain unchanged.

## Tasks
1. Write and run failing catalog-render tests for the second game, per-game image/copy, safe image paths, and preview label.
2. Add the smallest catalog/renderer extension, gameplay scene thumbnail with the original hurdles character, and matching labels; rerun render tests.
3. Import sealed hurdles distribution, original sources/licenses/docs, and adapted tests. Only adapt hosting links/neutral test labels; do not alter physics.
4. Run all tests, build/reference checks, scoped browser QA where available, and compare every unchanged blob with main.
5. Save a full source backup to Library, provide exact diff to parent, then publish only after parent check. Verify remote branch SHA, exact-commit Cloudflare check, and returned preview URL. If preview settings are not observable, report the precise dashboard action needed instead of claiming deployment.
