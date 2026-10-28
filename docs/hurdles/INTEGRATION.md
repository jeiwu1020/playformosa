# Platform test-branch integration — 2026-10-28

## Source identities and boundaries
- Platform base: GitHub `jeiwu1020/playformosa` main `aa12a0ef6d6336c67eed0ce9d1dc7bdf9c0b6326`, tree `8ecfa01aad37e2ac42c53b09905633b4df14cbbd`. All 126 base files were reconstructed and checked against their Git blob SHA before modification.
- Hurdles source: sealed private-Site commit `b6cc36dea79baa442361c3967147140ed98ce58f`, release 1.3.0. Its independent full-source Library backup remains `libfile_3dc6ef08ebd481918a85b76ce68fb3be` version 4, archive SHA256 `53486b978c4b47c0704261aaa8cae685e6625429c606e8c0b7664f4e8d04872d`.
- `public/games/hurdles/` contains the complete 32-file sealed distribution. Only `index.html`, `share.mjs`, and one success message in `game.mjs` are adapted: same-platform home link, neutral test-version labels, and share text for the actual public preview URL. Physics, input, countdown, result guard, character, renderer, audio and licenses are byte-identical to the sealed source.
- Every existing long-jump and experiment file is unchanged. Beer and pole-vault work are not integrated. The private Site and its backups are retained.

## Hosting and visibility
The user enabled Cloudflare Worker Preview Builds and explicitly chose no login restriction. Preview is not production and is not private by default. GitHub is the source for this test branch; publication and a working Cloudflare preview must be verified separately.

The existing project is Workers Builds, not Pages. Dashboard settings shown by the user: build `npm run check`, preview `npx wrangler preview`, root `/`. This branch adds the required empty `previews` object to `wrangler.jsonc`; top-level static assets and all production settings stay unchanged. No account configuration, Access rule, production route or main ref is modified here.

Official references:
- https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/
- https://developers.cloudflare.com/workers/previews/configuration/
- https://developers.cloudflare.com/workers/previews/#access-control

## Files and art
- Homepage catalog: a discoverable second decathlon card, `110 公尺跨欄 · 測試版`, and two available events out of ten.
- `public/assets/hurdles-card.jpg` is a screenshot of the actual game renderer using the original character and course meshes. A temporary, unshipped render harness advanced the actual physics/input cadence to a first-hurdle airborne pose. It is not a new character illustration and does not claim a manually played perfect run. The cloud environment uses the same-mesh software renderer because WebGL is unavailable.
- The original root hero image and long-jump thumbnail are unchanged; only scene thumbnails get a cover crop.
- Upstream docs and manifest are retained as historical evidence under `docs/hurdles/`. Their standalone/private-Site wording describes that earlier deployment, not this platform preview. `upstream-README.md` and `upstream-source-manifest.json` retain the original paths and identity.
- `source-assets/hurdles/render_selected.py` is retained historical processing evidence, not an active build step; its original external working-directory paths are not a claim of a current reproducible pipeline. The full selected source music, footstep and cheer inputs and all distributed web encodings/licenses are retained. Missing historical action WAV sources remain documented upstream.

## Verification
- Baseline platform: 185 tests plus build and reference verification.
- Final integration: `npm run check`, 254 tests, build, 69 local references across 80 output files. Added catalog and public-share tests were observed failing before their corresponding changes; integration test required actual route/resources and valid image bytes.
- Actual cloud browser at the nested route: homepage card opens `/games/hurdles/`, eight-bar intro and 3 countdown render, ordinary A/S keyboard input moves the runner, audio reports enabled, pause/resume works, and the brand link returns to the same local platform root. Final card crop was visually checked. Upstream B source separately records full-race/result-image/portrait/landscape tests in `REVISION-1.3.md`.
- No real-device iOS/multitouch/native-share or real WebGL pass is claimed. No social post was sent. Cloudflare deployment is not inferred from these local checks.
