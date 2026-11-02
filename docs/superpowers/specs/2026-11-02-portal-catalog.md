# Approved portal directory design

User approved: four 大遊戲 cards plus a separate play. one more. brand section, formal public URLs, independent artwork and game identity, preview publication first. This is a homepage-only directory, not code consolidation, embedding, login/save integration, or changes to external games.

Keep the existing 十項全能 / 小遊戲 routes, counts and availability unchanged. Add readable consistent cards for 福爾摩沙群俠傳, 迴聲邊界：審判, 台灣小島疾走 and 武鬥台灣魂. Use verified owned original art, not invented screenshots. External cards say 前往遊玩 ↗; the platform section says 前往遊戲平台 ↗, with clear new-tab notice. Links use target=_blank and rel=noopener noreferrer.

Release management: each new entry has explicit preview/production visibility. All five are preview-visible, production-hidden initially. Root approved tracked config/catalog-channel.json for preview, separate from shared infrastructure and entry content. Missing config and renderer defaults mean production. Preview channel config is a separate commit NEVER promoted to main. No Cloudflare configuration changes or branch-name inference. Add an explicit expected-channel preflight for future publishing; hiding a card is not access control.

Alternatives: (A) homepage directory with independent platform brand section (approved); (B) four parallel navigation tabs with a whole platform listing page (unnecessary for one platform). Shared frame + original brand artwork, rather than homogenizing game internals.

Publish order is serialized: first-paint owner fix, this portal directory, then app icons. No main publication. Publisher must use fresh head, validate unchanged touched-file base hashes, preserve unrelated files, freeze and independently restore the package, then normal CAS preview publication and full Cloudflare/live verification.
