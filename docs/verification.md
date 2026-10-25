# Local verification — 2026-10-25

- `npm run check`: 60/60 Node tests pass; static build succeeds; 23 local URL/anchor/module references across 15 output files resolve.
- Renderer and build tests were written first and observed failing before implementation.
- Full recursive diff of `public/games/long-jump/` against frozen source `sites/comic-long-jump/dist/`: identical (including Three.js license). Game v0.3.1's complete 56-test suite is copied under `tests/long-jump/`, with only local distribution paths adapted; all 56 run as part of this project's test command. Original game README is preserved in `docs/long-jump.md`.
- HTML parser check: unique IDs, exactly one H1, collapsed native roadmap, and only one playable route `/games/long-jump/`.
- Hero viewed, copied unchanged, actual 1536×1024 dimensions declared. It is separate artwork with transparency, not a screenshot UI.
- Source-level responsive checks: 1000px, 640px and 350px breakpoints; portrait single-column hero; compact landscape two-column hero; images height-auto/object-fit; native 44px+ nav/button targets; native disclosure; keyboard focus; reduced-motion support. These are source checks, not proof of actual browser layout.
- An initial verifier failure treated the game's valid `href="#"` as a missing ID. The checker now accepts the empty fragment as the document-top anchor; no game source changes were needed.
- Environment warning: npm reports inherited unknown `http-proxy` configuration. Commands still exit successfully; project has no npm dependencies.
- NOT RUN: browser render, screenshot comparisons, physical touch/keyboard/WebGL play, screen-reader QA. No browser/server/socket attempts were made, as directed after prior platform restrictions.
- No Sites registration, Git actions, account access, publishing or Cloudflare deployment performed. Prepared configuration is provisional and contains no account IDs or secrets.
