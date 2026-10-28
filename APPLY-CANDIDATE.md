# Cosmic journey + endless multiverse candidate

This is an unpublished focused candidate, not a deployment receipt. Parent owns ordered publication; this worker did not push.

## Base and scope
- Original verified main: `d1332dba44aabb6eb9a37d7278ed7da0080eca3f`, tree `3d91092d54070913654202a985a375ffd5532db9`; local baseline `2d9ee5b`. Earlier cosmic candidate: `7821d4d`.
- User approved implementation of the endless multiverse replacement at 2026-10-28 15:06 UTC. No marble/world-shrink reveal and no game-clear ending.
- Parent reports P0 diagnostic releases now live: main `614614ca66d50340d6b70d3df0fe51a9d51405fb`; preview `d84b7fd0b0828319701fd35dc8a73ac0b762a58f`. Preserve these later changes.
- Apply only the exact paths in `evidence/cosmos/changed-files.json`, using `evidence/cosmos/cosmic-endless.patch`. Do not mirror, force-reset or copy this entire checkout over current branches.
- Important shared path: `public/games/long-jump/index.html` changes ONLY existing credits/details content. Merge that line while preserving the final `viewport-diagnostics.mjs` script import. Preserve the diagnostic module and both diagnostic test/helper files unchanged.
- Preserve all other upstream main/preview paths, including athletics preview games, hero art, audio and platform content. No sandpit changes are included.

## Runtime compatibility
Original 47 route IDs, names, raw boundaries and km starts are exact. The old infinite deep-space score formula remains unchanged beyond raw 3288. New chapters are presentation cut points, not real travel distances. Terminal multiverse begins at raw 8472, cycles six scenes every 192 raw units forever, never resets score or adds a completion flag. Twelve modules (including physics, controls, layout, dialogs, play surface, capture and results) are byte-identical. game.mjs has exactly one presentation-line change: pass first-contact scene distance separately from body anchoring, preventing landing photos from switching to a neighboring multiverse scene while their caption stays at first contact. No state-update, camera or score code changes. Results/share capture still use actual scene pixels; no replacement thumbnail.

## Evidence
- `evidence/cosmos/endless-check-final.txt`: full test/build/reference verification.
- `evidence/cosmos/physics-parity.json`: 41,645 input/pose steps and 28,170 mileage samples equal baseline.
- `evidence/cosmos/protected-source-sha256.txt`: immutable gameplay-file hashes.
- `evidence/cosmos/multiverse-red-resumed.txt` / `multiverse-green.txt`: fresh failing/passing regression cycle.
- `evidence/cosmos/endless-extended-green.txt`: six-variant portrait/landscape and capture framing, boundary reversal, repeated disposal and deep-origin checks.
- `evidence/cosmos/endless/cosmic-gallery.jpg`: current six-view CPU-rendered actual geometry, fixed landed-height review states, NOT browser/gameplay/device proof.
- Older marble-era CPU video/gallery are superseded for terminal presentation and must not be delivered as current.

Browser launch was blocked by the execution sandbox, then the escalated command failed in bwrap before launch. No WebGL/physical iPhone acceptance is claimed. Parent must rerun checks on the merged current-main/preview candidates, confirm expected remote commits and deployment success separately.
