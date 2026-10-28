# Cosmic journey: approved additive expansion
User approved realistic solar-system exploration, constellation theatre, then surreal cosmos. Root approved compatibility plan at 14:19 UTC. No Codex task, no publishing, no mother-tree writes. Sandpit deferred.

## Approach
Keep old route milestones and all game-km mapping unchanged. Asteroids/Jupiter are scenery cameos within the old Mars chapter; new outward chapters follow old `deep_space`. Reordering old routes or replacing km with astronomical distances was rejected because it would invalidate records. New astronomy references explicitly identify their origin and stay in optional details; game HUD remains fun and uncluttered. Legacy deep_space is an exploration prologue, not a scientific boundary claim.

## Scope
Original procedural low-poly geometry, no external texture payloads. Moon/Mars/Saturn recognisable, add asteroid belt, Jupiter bands/red spot, sideways Uranus, Neptune storm, Pluto heart/Charon and Kuiper ice, Voyager dish/record, sparse Oort shell, Proxima red dwarf. Constellation patterns are sky cameos, not physical stations. Fantasy: black-hole portal (no forces), washing machine, night market, bubble tea, alien judges, then endlessly alternating absurd multiverse scenes. New destination/landing verdicts. Existing snapshot captures actual rendered scenery.

## Hard constraints
physics, controls, layout, dialogs and play-surface remain byte-identical. Final review permits one presentation-only game.mjs line to pass first-contact scene selection while preserving body anchoring; no state, camera or scoring changes. All old IDs, achievement labels, score storage keys preserved; old saved visited IDs not inferred as newly visited. Use same unbounded linear km formula beyond old deep start. One current persistent space hero and small reusable chunks; clean every discarded geometry. No gameplay controls or one-page layout changes. Credits are within existing collapsible details.

## Approved revision — 2026-10-28 15:06 UTC
The user rejected the disconnected marble reveal and explicitly asked for no game-clear ending. They approved the proposed replacement: an endlessly extending absurd multiverse alternating planets, night markets, alien judges and strange scenery. Retain every preceding chapter; replace only the unpublished terminal marble presentation at raw 8472.
Implementation choice: six deterministic combined procedural scenes, each spanning 192 raw units, repeat indefinitely with no reset, finish flag, or growing geometry cache. The terminal route identity stays stable as `endless_multiverse`; presentation variants do not create saved route entries or badges. Reuse existing art rather than rebuilding the cosmic expansion. Physics, km mapping and result rules remain exact.
