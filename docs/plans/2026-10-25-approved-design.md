# Playformosa — approved local implementation

Approved direction: 島遊無界 / PLAYFORMOSA, warm cream, ink-navy outlines, orange calls to action, teal series banner, humorous toy-3D jumper. Hero:「操作不一定專業，跌倒一定精彩。」and「島遊無界的小遊戲實驗場」. Reference viewed: `hub-preview/playformosa-homepage-concept-v1.png`.

Scope: a new independent static hub, one actual game「四肢各有想法」under `/games/long-jump/`, ten-event series with 1/10 available, collapsed nine-event roadmap, future game shelf without fake playable cards. Native links and disclosure; no forced phone rotation. Separate hero image, never the full mockup as UI.

Implementation: catalog data → dependency-free Node static renderer → public HTML; `public/` is the source distribution, `dist/` reproducible output. No runtime framework, backend, trackers, account, or remote assets. Prepare deployment configuration only; do not register, publish, push, or assert availability.

Plan:
1. Test renderer catalog behavior first (available games only, correct routes, escaping and availability counts).
2. Implement catalog, semantic HTML and responsive CSS.
3. Integrate frozen self-contained long-jump build only after parent confirms freeze; integrate provided hero asset.
4. Run all Node tests and build; validate local routes/assets and game module imports without a server.
5. Record limits: no browser/socket attempts; rendering, actual touch interaction and visual QA remain unverified.
