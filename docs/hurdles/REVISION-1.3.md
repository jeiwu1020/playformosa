# 1.3.0 — eight-hurdle running flow (B)

Approved scope: 110m arcade time trial, eight bars, longer approach and gaps, skilled low fast crossing, short fresh landing-stride buffer. No production platform integration is included in this Site revision. The earlier long-press protection is independently preserved in 1.2.1 commits 41cb29711e42c7bb9a40008e50b6ca4a13a8bdb9 and ab2262250394615afecc07cbbeb54366523afae9.

## Course and pacing
- Total stays exactly 110m. Bars at 18, 29.5, 41, 52.5, 64, 75.5, 87, 98.5m (11.5m gaps, 11.5m runout). This is explicitly an eight-bar arcade arrangement, not a regulation simulation.
- Same A/S alternating releases (+.92 m/s versus same-leg +.34; very rapid releases +.08), speed cap9.7, hold threshold.24s, J/K balance/rescue and physical limb contacts retained.
- Charge power p=clamp((held−.24)/.42,0,1). Launch vy=5.25+.75p and per-flight gravity=20.5−8.7p. Short skilled holds make lower/shorter arcs; long holds retain high, slower arcs. Pose phases use the same flight gravity, retaining locked lead/trail, folded outward trail knee, lead-first landing. No invincibility window, target snap, automatic bar crossing or automatic jump.
- Launch retains99.5% forward speed (previous98%); unchanged speed drag still applies. Balanced clean landing has no extra velocity penalty. Impacts still remove70%, hold speed at≤1.4m/s for.8s, recoverable stumble; each bar only contacts once.
- Fresh short down/up in the final100ms can connect exactly one landing stride. A fresh down held across landing uses a separate non-chargeable one-shot token, requiring release within.24s after landing; longer holds are discarded. Completed buffered tap has priority over a concurrent held press. Old held air controls never become a jump charge. Pause/cancel, impact, launch clear tokens.
- New eight-bar local-best namespace leaves old ten-bar records untouched and prevents invalid comparisons. Intro/meta/progress/results/verdict/share/PNG copy all use8; title/distance stay110m.

## Tests and comparison
65 deterministic tests pass. New tests were observed RED before implementation, including two independent-review regressions for holding through landing and mixed held/released air taps. Reviewer rechecked both fixes and full65-test run.

Same ground cadence(.28s, .13s short press) and arm schedule across all four strategies; only maneuver timing differs. Clean charge.30s at distance≈.60×speed, early+2.2m, late−1.0m. All start with identical approach traces. Full speeds and contacts: docs/qa/matched-cadence-v1.3.json.

| Strategy | Time | Clears/hits | Jumps |
|---|---:|---:|---:|
| Correct |15.717s|8/0|8|
| No jump/hard contact|28.350s|0/8|0|
| Early|30.608s|0/8|8|
| Late|30.500s|0/8|8|

Clean landing→next charge leaves.575–.717s and effective steps[2,2,3,2,2,3,2], versus prior ten-bar trace usually1. Flight .525–.542s, travel3.94–4.26m; flight retains roughly93% velocity. Several deliberate charge/timing combinations(.28/.30/.32/.36) all clear8/8, rather than one exact magical input. Same-leg spam remains weaker, all-held input cannot finish, and errors remain penalized but recoverable.

## Actual cloud browser review
- Real keyboard start/replay321, held A spanning GO no stale jump; new best starts blank despite old course record. First-bar early and late attempts visibly contacted/toppled the bar; a corrected360ms hold plus airborne leg coordination cleared it and resumed at23.2km/h. Native inputs, no simulation-state injection.
- Complete ordinary keyboard run31.27s,1clear/7hits/1jump, recovering via alternating legs/arms. A second HUD-observed native-key run38.68s,1clear/7hits/5jumps. These are not claimed as expert clean races; perfect-run timing evidence is deterministic, not a physical-human or phone benchmark.
- Actual portrait400×607: four89×98px controls, no body overflow; resultclient542=scroll542, retryy72..119 clear of running keys. Landscape697×390 result also fits and fresh Space opens exactly one3 countdown. Pause/resume and native resize are functional.
- Actual desktop exported1080×1280 PNG was visually inspected:110m/8欄,31.27s,1clear/7hits, verdict and full finish character all readable. Download return unlocks result normally; late A/S/J/K spam did not restart. No Threads post was sent. Existing native-share success/cancel/fallback tests retained.
- All six unchanged audio files decoded and audio-ready=true after real input. No subjective listening claim. Cloud Chromium has WebGL disabled; visual motion uses the exact same Three.js mesh compatibility renderer, not real WebGL. Physical iOS Safari long-press/multitouch and native share sheet not available; scoped prefixed CSS/touch behavior and independent-pointer tests cover code paths but do not substitute for a phone pass.
