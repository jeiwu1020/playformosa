# Platform and game app icons

The platform and nine existing games each have their own generated raster icon family, browser favicons, Apple touch icon, manifest name and launch URL. Existing routes and original game art remain unchanged. The ten manifest IDs are `/` and `/games/<slug>/`; do not change them casually or use a shared `./` ID.

Each manifest is beside its page. `start_url` and `scope` are `./`, so the preview host launches the preview route rather than redirecting to production. Icon URLs are relative to the manifest/page. PNG exports are 32/48 browser, 180 Apple, 192/512 general, and a distinct 512 `maskable` entry. Platform and high-jump use separately generated mask-safe compositions; the other eight retain recognizable critical subject detail inside the central radius-40% circle.

## Deliberate limits

- No service worker, offline cache, new origin, route move, install prompt, storage migration, save reset or original artwork replacement is included.
- The platform scope `/` contains the game scopes. Unique IDs and metadata do not guarantee independent installation, prompts or link capture in every browser. Same-origin games still share origin-level storage.
- Existing installed shortcuts/icons may stay cached. Physical iOS/Android add-to-home-screen, launch and old-install update behavior has **not** been verified. Do not remove an existing install or clear site data merely to refresh its artwork without first protecting saves.
- A browser favicon is not the same as an installed app icon. Apple touch metadata and manifest icons are provided separately.

## Evidence

`INTEGRATION-MANIFEST.json` records the exact predecessor commit and before/after head hashes, with unchanged body hashes. `ASSET-PROVENANCE.json` records original source Git blobs, image_gen prompts and durable Library references, size-only exports and hashes. Tests cover all ten resolved IDs, current names, relative URLs, dimensions, opacity, distinct imagery, maskable purpose and renderer output in both catalog channels. Independent visual review checked actual 32/48 px and worst-case circular masks.

Primary references: [manifest ID](https://www.w3.org/TR/appmanifest/#id-member), [maskable safe zone](https://www.w3.org/TR/appmanifest/#icon-masks), [multiple PWAs on one origin](https://web.dev/articles/building-multiple-pwas-on-the-same-domain), [WebKit home-screen icons](https://webkit.org/blog/13878/).
