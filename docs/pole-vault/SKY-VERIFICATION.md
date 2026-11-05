# Sky journey verification

## Scope and source

Base: preview/hurdles f0ff36a3c0afe1bdf3bfa5b34086a4626e810a1d, tree fe9763f7427e8b9b5104b43d7ef6c1806750da3b. Only pole-vault/render.mjs and two new visual modules affect runtime. Character, input, physics, scoring, result-frame and sharing code remain byte-exact. Original skyline, landmark approach views and platform integration are preserved.

Height-selected clouds, upper-atmosphere glow/meteor, orbital station/probe, lunar visit, comet and later Taiwanese fantasy use a fixed low-poly model pool. Flight bands are scenery illustrations, not new scored milestones. The original Earth, Moon, satellite and ringed planet remain. Results retain the scene selected by finish altitude.

## Automated checks

- Full unchanged baseline: 2740 tests, 2720 pass, 20 failures.
- Full candidate: 2752 tests, 2732 pass, the same 20 failures. Exact failing test names and ENOENT paths, inventory missing-path diffs, or assertion messages were compared. No new failures.
- Twelve new tests cover height progression, finish stability, finite extremes, fixed meshes, immutable gameplay state, capture/history restoration, portrait bounds and strict historical provenance.
- Build passes. Preview release configuration check passes.
- Static asset verification cannot complete because public/assets/high-jump-card.png is unavailable locally. This is an original missing asset, not a product change.

## Visual and performance checks

- Native cloud-browser check of the actual game: desktop startup, keyboard response, result/restart, pause/resume, and phone-layout frames at 390x844 and 844x390. Scenery inspection uses a separate renderer-only QA page, clearly not a manual high-score run.
- CPU scene samples at 1000x550, 390x600 and 844x390 cover atmosphere, station, probe, Moon, comet, pearl-milk-tea planet, pineapple capsule and floating night market.
- Independent review found no blocking issue. The new sky pool contains 109 meshes using five shared geometries; sampled maximum visible load was 34 meshes / 952 triangles. No per-frame model creation or extra asset requests.
- Finite extreme heights, six real-physics finish states, repeated captures and resize/restoration were checked. No state mutation found.
- This is responsive browser/CPU validation, not physical-phone GPU or frame-rate certification. Audio did not load inside the local phone iframe; audio code was not changed. No leaderboard submissions or external shares were made.

## Source limitations and publication guard

The connector could not materialize twelve remote PNGs larger than 1 MB: the original screen-alpha duel atlas, the javelin and sprint apple-touch icons, discus/high-jump/javelin/pole-vault/shot-put/sprint/tower cards, and the echosboundary/formosabattle portal images. They remain untouched in the remote base tree. Their absence explains the existing 20 failures. No placeholder assets, old pins or historical fixtures were substituted.

A strict outer audit layer records exact before/current hashes, all added paths and the complete 1266-file remote baseline. Historical readers reverse this approved change before checking older frozen ledgers. Three isolated provenance tests copy this layer's helper, manifest and fixture so they still exercise their original corruption checks. Unknown additions, forged preimages, current drift, duplicate paths and missing new files are rejected.

Publication is a delta tree on the freshly verified remote base, with compare-and-swap of preview/hurdles only. main is not a deployment target. A matching successful Cloudflare check and a live preview reload are verified after publication.
