# Cosmic journey source and provenance — 2026-10-28

## Authorization and baseline
User asked to expand long jump beyond the existing interstellar stage, approved realistic solar-system chapters → constellation cameos → surreal cosmic humour, then instructed implementation. Root approved additive compatibility at 14:19 UTC and new current-jump badges at 14:44 UTC. Sandpit remains deferred; no controls, input rules, physics, balance, route score reset, or new branching UI.
Verified published main: d1332dba44aabb6eb9a37d7278ed7da0080eca3f, tree 3d91092d54070913654202a985a375ffd5532db9. Independent isolated copy was made from a clean identical local tree. No mother checkout modified. No Codex task/tool run and no GitHub push.

## Compatibility contract
Existing Earth and space IDs/start thresholds/achievement labels are unchanged. `deep_space` remains at raw3288 and game1,384,346,319.5762184km. The infinite old score curve is still **exactly** `deepKm + (raw - deepStart) * (100000000 / 384)`; new chapters are presentation cut points on that curve, not distance rescalings. Before that point the original interpolation remains unchanged.

New raw cut points: Uranus3672, Neptune4056, Pluto/Kuiper4440, heliopause4920, Oort5496, Proxima6168, black hole6552, laundry6936, market7320, bubble tea7704, judges8088, endless multiverse8472. Final end is Infinity. Asteroid/Jupiter scenery cameos occupy2640–2736 and2736–2904 in the old Mars chapter. Old Mars result journey is retained; cameo verdict identifies the visible flyby. New badges are computed only from the current attempt's maximum reached distance, after the same six old badges. No saved best or visited ID is migrated or re-awarded.

## Astronomical sources
`public/games/long-jump/cosmic-data.mjs` contains individually labelled NASA references and source URLs; the same source text is in the existing optional music/art credits in index.html. Checked primary NASA pages on 2026-10-28. Moon distance has Earth origin; planetary means have Sun origin; Proxima is an observer distance. These references are NOT game score inputs.
- Moon mean distance: https://science.nasa.gov/moon/facts/
- Rounded planetary mean solar distances: https://science.nasa.gov/solar-system/planet-sizes-and-locations-in-our-solar-system/
- Sparse main belt: https://science.nasa.gov/mission/dawn/faq/
- Kuiper main belt includes Pluto: https://science.nasa.gov/solar-system/kuiper-belt/facts/
- Voyager1 heliopause crossing2012 about122AU solar distance, not a universal wall: https://science.nasa.gov/missions/voyager-program/10-things-going-interstellar/
- Oort is inferred, inner2,000–5,000AU and outer10,000–100,000AU estimates: https://science.nasa.gov/solar-system/oort-cloud/facts/
- Proxima about4.25light-years: https://science.nasa.gov/exoplanets/other-stars-other-worlds/our-nearest-celestial-neighbor-an-exotic-3-star-system/
- Apparent constellations, not co-located destinations: https://starchild.gsfc.nasa.gov/docs/StarChild/questions/question9.html
- Visual reference: https://science.nasa.gov/uranus/facts/ and https://science.nasa.gov/neptune/neptune-facts/ . Neptune uses restrained blue-cyan, not an exaggerated saturated-blue claim. Uranus has sideways rings. No giant planet has a simulated solid surface; the neutral game runway is a theatrical stage.

## Original art / prompt brief
No downloaded astronomy images, generated raster assets, or image model prompts. All original procedural low-poly geometry is in cosmic-art.mjs, using the existing shared primitive/vertex-colour material system. Design brief: recognisable miniatures, muted palette matching existing land landmarks; retain unique visual signatures rather than swapping ball colours. Moon craters/lander, Mars canyon/polar cap/rover, sparse asteroid belt/Ceres lights, Jupiter bands/red spot/moons, Saturn rings, Uranus sideways rings, Neptune cloud streaks, Pluto heart/Charon, Voyager dish/golden record/open boundary arcs, sparse inferred Oort shell, red-dwarf Proxima. Inner Mercury/Venus appear only as a look-back cameo, never a farther outward checkpoint.
Orion with stopwatch, Ursa Major and Minor are background star-pattern theatre. Black hole is decorative; no forces or death. Fantasy objects: laundry drum/socks/bubbles, market stalls/lanterns/alien vendor, pearl-filled giant tea, alien panel holding scorecards beside their visible faces, endless mixed planet/market/laundry/tea/judges scenes. No ending, world shrink, score reset or game-clear condition.

## Resource budget and cleanup
One shared material. Seven existing scenery chunks plus at most one active cosmic hero; geometry created only on scene or presentation-variant changes, disposed on replacement/exit. No asset downloads or textures. Tests enforce <100k streamed vertices via existing budget, <32 meshes/geometries; stricter new hero tests bound main scene and disposal. No unbounded hero cache. No new runtime dependency; original procedural modules only.

## Earlier candidate verification (superseded terminal visuals) and known limits
Full checks, parity receipt, red/green logs and CPU render manifest are packaged under evidence/cosmos. Protected-source SHA256 list now covers 12 unchanged modules: physics, controls, layout, dialogs, play surface, capture, character, share, presentation, result view, audio and route data. The final game integration has one explicit presentation-only line exception described below. 41,645 actual-input simulation steps (347s) and all skeleton points exactly match production; only presentation-only lastRegion/visited/verdict differ. 28,170 sampled game km values match exactly.
CPU geometry preview is 12 seconds, 12fps at real1× time, six explicit scene cuts. All poses and cameras come from actual-input trial, no physics teleport for motion clips. Gallery is fixed landed-height review states, not gameplay claims. CPU z-buffer/lighting differs from WebGL; no WebGL/browser screenshot or physical iPhone touch verification claimed. Full desktop/phone viewport framing and actual result-photo crop are tested mathematically. Existing capture code remains byte-identical and copies actual scene pixels; no replacement thumbnails.

## Reproduce
npm run check
sha256sum -c evidence/cosmos/protected-source-sha256.txt
node scripts/check-cosmos-parity.mjs /absolute/path/to/verified-baseline
node scripts/render-cosmos-evidence.mjs
python scripts/paint-cosmos-evidence.py
ffmpeg -framerate 12 -i evidence/cosmos/render-final/motion-%04d.png -c:v libx264 -pix_fmt yuv420p cosmic-preview.mp4

Earlier pre-revision local check: 237 tests pass; build and 55 local references pass. One earlier build failed solely because temporary review projections exhausted writable storage; 426MB of this task's reproducible temporary buffers were removed and the full check rerun successfully. Final runtime inputs remained unchanged. Observed all-route maxima: 60,456 vertices and21 meshes; three new runtime-facing changes (route, scenery, captions) use the old shared material. Final preview checked frame-by-frame timestamp spacing: six24-frame segments at12fps, each source step1/12 second; no time acceleration.

## Endless multiverse revision — 2026-10-28
User approved the no-ending proposal at 15:06 UTC after identifying the disconnected marble reveal. The unpublished terminal stage is now `endless_multiverse`, 荒謬多重宇宙, at the same raw 8472 boundary with end Infinity. Every 192 raw units it cycles through six combined scenes: 土星環夜市、海王星評審團、彗星自助洗衣店、珍奶衛星群、冥王星續攤夜市、紅矮星外星頒獎台. Variant names/captions reflect the first-contact journey distance. Cycling changes visuals only; it never resets mileage, records, jump state or creates a completion flag. One current-attempt entry badge says 多重宇宙持續探索. Variants do not add visited IDs or an unbounded mesh cache.

Fresh exact baseline parity: 41,645 actual-input steps and poses, 28,170 km samples. Twelve protected gameplay/presentation modules are byte-identical to original published baseline d1332dba. Repeated 24-segment transitions verify one hero, disposal, one material, seven chunks; deep rebasing checked through raw 1e12. Portrait/landscape full scene and result crop checks now cover all six variants. Current six-view CPU evidence is `evidence/cosmos/endless/cosmic-gallery.jpg`; old `cosmic-normal-speed-CPU.mp4` and gallery describe the earlier candidate and are NOT current terminal evidence.

New browser review was NOT executed: Chromium launch failed at socket() under the syscall sandbox; the escalated command then failed in bwrap before launch while preparing a read-only denied path. No workaround, no reads of that path, no WebGL or real-device touch acceptance claimed. CPU geometry and mathematical framing are the verified visual evidence.

Parent will overlay this focused cosmic diff onto the now-live P0 diagnostic release. Preserve viewport-diagnostics.mjs, its tests/preparation helper, and the script import on the last index.html line. Only the existing credits/details line changes in cosmic index.html. This checkout has not pushed or deployed anything. See APPLY-CANDIDATE.md for exact paths and evidence.

### Review-discovered landing-boundary correction
A legal-input trial (`flightSeconds:309.175,maxSeconds:330`) first contacts at raw8661.972253298582 (土星環夜市), then its body settles at raw8664.683814866396 (next scene). Before correction, the final photo changed to 海王星評審團 while the correct first-contact caption remained 土星環夜市. A fresh failing lifecycle regression reproduces this through the actual game frame and real scenery.
The fix changes exactly one `game.mjs` display line to name its existing first-contact distance and pass it as a third scenery argument. Scenery selects the hero using that distance while still anchoring it/chunks to current body distance. Camera, all state updates, result computation, capture behavior and physics are unchanged. This intentionally supersedes the earlier blanket byte-identical game.mjs claim. Red/green logs: landing-scene-red.txt / landing-scene-green.txt; isolated integration diff: game-presentation-only.patch.
