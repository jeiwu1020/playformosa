# Superseded v7 contracts — historical source, not active tests

These eight files are the previously active v7 tests, preserved as discussion and migration history. Their imports reflect their former `tests/long-jump/` location; they are not a runnable second test suite in this directory.

Why migrated: v8 deliberately removes Space, one-way exhausted flight energy, the 65 m end of the pit and 10 s / 30 s endings. Tests asserting those rules cannot remain pass criteria for the user-approved endless cartoon-world design.

Coverage retained/replaced:
- `v8-motion.test.mjs`: four independent joints, tap/hold threshold and releases, inherited airborne holds, fresh landing intent, cancellation, true ground propulsion/fall/recovery, actual-input renewable flight, static held-input landing, bounded forces/local coordinates, no old elapsed-distance endings, first-contact country, foul and legacy record separation, FPS consistency, opposing completed rotations.
- `character.test.mjs`: original model identity, fixed bone lengths, actual exported vertex bounds/projection and ground clearance, travel-facing versus limited comic glance.
- `v8-world`, `v8-scenery`, `v8-presentation`, `v8-verdicts`: itinerary and loops, bounded streaming and country geometry, readable input state/distance, actual-event ratings and recent-history exclusion.
- Existing capture/share/dialog/layout controls and experimental-v2 tests remain active (four-key-related assertions are migrated explicitly).

This migration is not a claim that every historic scenario or all human input possibilities have been exhaustively reverified. No live-browser or real-device acceptance is claimed.
