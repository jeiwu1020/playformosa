# Portal directory / selective release

This adds only homepage links to the five user-specified public game sites. It does not change those applications, their deployment, accounts, save formats or UI. Existing nine local-game entries retain their routes and availability. Source evidence for the copied original artworks is in `sources/`.

## How visibility works

`src/catalog-entries/<id>.json` contains one independent entry. `release.preview` / `release.production` must be explicit booleans. Each entry is initially preview=true, production=false. These flags decide whether the static homepage lists it; **they are not authentication, authorization or URL access control**. Existing local game catalog status is not reinterpreted.

The renderer defaults to production. Build reads `config/catalog-channel.json`; an absent file means production; malformed JSON or an unknown channel stops the build. There is no inference from a host, branch name, CF_PAGES_BRANCH, or browser-side flag.

### Preview-only configuration — NEVER PROMOTE TO MAIN

The isolated preview configuration is `{ "channel": "preview" }`. It has its own commit group. Never cherry-pick or merge that configuration into main. It changes only local build input, not Cloudflare account/project/security configuration.

`public/index.html` is generated. A preview build embeds preview entries and a `data-catalog-channel="preview"` marker. **Do not blindly cherry-pick that generated file onto main:** rebuild under production configuration so it reflects only approved production entries.

## Required publishing preflight

Use the expected channel explicitly, after running the complete build/check command against the final source:

```sh
npm run check
npm run check:release -- --expect=preview
# only with a separately approved production publication:
npm run check
npm run check:release -- --expect=production
```

The preflight checks both the tracked/default channel and generated `public/index.html` / `dist/index.html` channel markers and exact directory entry IDs. A wrong config, missing build or stale output fails. It does not infer publication permission and is not a substitute for reviewing the target branch or changes.

No existing Cloudflare build command was changed. The publisher must run the explicit channel preflight before updating a branch; otherwise a local script cannot guarantee what a separate hosting configuration will deploy.

## Promote only an approved entry

1. Obtain the user's approval for that exact entry and main publication. Read fresh main, not an old preview copy.
2. Apply shared directory/release infrastructure once. Each individual entry consists of its JSON, original local artwork and its source record; they can be applied independently. Shared tests use fixtures and do not require all five entry files to be installed.
3. Set only the approved entry's `release.production` to true. Leave all other entries absent or production=false. Do not bring preview-only config into main.
4. Rebuild with production config (or absent config), run all checks and `--expect=production`. Review the final diff, including regenerated HTML. Confirm existing main game/runtime changes were not silently pulled across.
5. Freeze/review/independently restore the exact publication package; use a fresh-head compare-and-swap update. Verify the exact remote commit, full Cloudflare result and public deployed homepage. Source backup alone is not deployment proof.

## Commit dependency groups

- Shared infrastructure: release loader/preflight, renderer/CSS, catalog integration and generic fixture-based tests/docs. Default production; no entry data required.
- Independent entries: formosabattle, echosboundary, taiwankart, taiwanfighter, arcadeplatform. Each depends only on shared infrastructure; no entry depends on another.
- Preview-only channel config: NEVER promote to main.
- Generated homepage: rebuild for the destination channel, never treat a preview HTML artifact as production source.

Current delivery order: first-paint game fixes, portal directory, then icon/manifest changes. A single publisher serializes fresh-head updates. This directory batch never publishes main.
