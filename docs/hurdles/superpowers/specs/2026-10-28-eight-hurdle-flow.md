# Approved running-flow revision (B), 2026-10-28

User approved the parent's exact proposal: keep 110 m; 8 hurdles, first at 18 m, 11.5 m spacing, last at 98.5 m; longer approach plus skilled low fast crossings and a brief fresh landing-input buffer. All visible copy/results/share must agree. Native dot cloud implementation; no production integration. A is separately committed before B.

Approaches considered: retain 10/110 and shorten flight only; 8/110 plus shorter skilled crossing (selected); increase real course distance with 10 obstacles (rejected to preserve 110 identity). Goal is space for effective alternating ground steps, not automatic clearances. Same character/keys, hold-release jump, physical joint contacts, recoverable stumble/impact penalty, 321, result touchguard, sound/share retained.

Builder calibration: continuously map short charge to lower/shorter ballistic arc and long charge to current high arc, so skilled timed release is faster but not a canned invincible animation. Pose phase must use per-flight gravity, still stable front straight/trail folded and lead-first landing. Fresh step press/release in final 100 ms before landing may queue one short stride; never turn held airborne controls into a charge, never trigger automatic jump, clear queue on pause/cancel/hit. New eight-hurdle course uses a distinct local-best key to avoid comparing old 10-hurdle records.

Implementation plan:
1. RED tests: exact 8 positions/110 finish; short-charge shorter/lower flight; fresh landing stride accepted once; stale air hold/release and outside-window taps rejected; cancel clears; never jump from buffer. Implement narrowly in physics.
2. Calibration test helper: same ground/arm schedule for clean/no/early/late; record speed/contact/flight/ground steps; clean faster, each contact once, all recoverable. Ensure at design speed skilled run gives multiple ground steps, test input deviations rather than one magic bot.
3. Update dynamic progress and all current 10-bar copy, share/export labels, best version, rules for fast release with compact explanation. No new image/audio or rig changes.
4. Full suite and actual cloud keyboard playthrough/held input, portrait/landscape and result guard/replay; record physical iOS/multitouch/WebGL limitations. Library same identity replacement, same owner-private URL and live hashes. Hand sealed commit only to platform preview integrator.
