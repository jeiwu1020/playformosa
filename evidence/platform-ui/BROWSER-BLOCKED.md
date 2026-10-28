# UI browser verification — not run

Candidate: preview-only shared UI work over tree d9f2d51ed2541c0e98a0836eb948492066eb82e6.

- Local Chromium launch via Playwright failed before page load with `socket() failed: Operation not permitted (1)` (process singleton); crashpad also reported a missing database.
- A single approved local-test sandbox escalation failed before executing its command: `bwrap: Can't create file at /home/agent/.codex/sessions: Read-only file system`.
- No retry, permission change, access to that path or browser-policy bypass was attempted.
- Consequently there are **no new browser screenshots, GPU visual checks, actual zoom/mobile-touch checks or native-share-sheet results** from this candidate. Node DOM/Three-math and frozen-pixel lifecycle tests are automated evidence only, not browser QA.
- Bounded runnable check: `scripts/browser-platform-ui.mjs` against a local root HTTP server. Follow the fuller real-device checklist in `docs/GAME-UI-STANDARD.md`.
