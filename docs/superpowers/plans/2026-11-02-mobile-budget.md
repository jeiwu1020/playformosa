# Toolbar, help credits and mobile viewport Implementation Plan

> **For agentic workers:** Use executing-plans; implement task-by-task with independent audit review.

**Goal:** Nine games use an ordinary 說明 toolbar action, one complete credit location in help, and playable mobile viewport budgets.
**Architecture:** Preserve the shared help coordinator and original engines. Centralize credit source selectors in entry-content; hide only original duplicate presentation after collecting its full contents. Use the shared controls frame and narrowly scoped host CSS for remaining viewport space; keep resize observers and original camera projection.
**Tech Stack:** Existing ESM, CSS, node:test/JSDOM, supported Sites preview/CUA.
**Spec:** User Sentinel_32912674206881918dba1896ad96ccc0; approved preview-only adjustment.

## Global Constraints
- No physics, camera, inputs, scoring, PNG, routes, save keys or media changes.
- Keep all author/license/source text and license files; help/error/audio controls remain reachable.
- Header action says 說明 without question mark, inherits existing toolbar typography; targets ≥44px.
- Never conceal page overflow globally. Help/result scroll internally; existing standalone safeguards remain.
- Exact base d5fb870032c7b46ed8260c0bde2c5156ad9e8cd7. Preserve portal/Soul/icons and main.

## Review Focus
- Credit links nested in old pause dialogs remain fully accessible in help after duplicate hiding.
- Short viewport with safe areas retains all four control targets and useful scene space.
- Dynamic orientation/viewport updates invoke existing renderer resize, not CSS-stretch a stale canvas.
- Audio failure status is readable rather than suppressed to fit.
- Original help single-owner/focus/paused-state restoration survives layout changes.

### Task 1: Toolbar and credit collection
Files: shared/entry-content.mjs, shared/entry-shell.mjs/css; tests/mobile-budget.test.mjs.
- [ ] Inventory nine original credit sources and capture normalized original author/source text and URLs.
- [ ] Red test: no question mark; same toolbar font rules; credit source content preserved in shared advanced panel and no duplicate interactive links outside it.
- [ ] Implement exact selector-driven collection and duplicate hiding, preserving original source DOM for history and error recovery.
- [ ] Run mobile-budget and shared-help/controller focused tests.

### Task 2: Actual available viewport budget
Files: shared/controls-shell.css and only necessary per-host presentation rules; retain existing controls-shell resize mechanism.
- [ ] Reproduce shot/discus excess height from fixed frame clamp plus outside tutorial/footer/header rows; measure supported preview at 390x600, 390x844, 844x390, desktop.
- [ ] Add regression for bounded host/frame sizing, readable controls ≥44px, optional guidance moved to help, and no global overflow concealment.
- [ ] Make frame consume actual remaining space after header/HUD/status. Keep compact useful text; preserve real status/errors and safe area.
- [ ] Measure nine-game representative layouts and repeat help/pause/resume. Record WebGL and iframe limitations accurately.

### Task 3: Provenance, review and publication
- [ ] Update only exact changed UI expected hashes and direct assertions; preserve source origin/history and icon head hashes.
- [ ] Relevant tests, build/verify and full available suite; distinguish missing original MP3 from real failures.
- [ ] Freeze exact overlay; independent review; private Library archive and independent fresh-restore SHA verification.
- [ ] Sole publisher fresh before-blob/CAS to preview/hurdles, full CF and bounded live gate. No main.
