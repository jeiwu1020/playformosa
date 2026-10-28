# 1.1 — distance, countdown, hurdle gait

User-authorized scoped changes, 2026-10-28. No new site or production integration.

Root cause: race distance used 11–13px secondary text; Start called physics immediately; airborne hips/knees followed the same input-only angle formula for both legs, with no lead/trail selection or gait phase. Character bones were flattened at fixed lane depths.

Design: retain original mesh/material construction. Choose the released charge foot as the support/trail leg and opposite as lead; lock that decision throughout the flight. A timed asymmetric pose supplies support extension, lead-knee lift/extension, folded outward trail leg, lead-first descent and short landing-to-run blend. Player input still adjusts legs/arms and collisions sample those very endpoints. No guaranteed obstacle success or change to the four controls. A pure countdown gates simulation for exactly three seconds and exposes 3/2/1/開始, pauses without advancing, clears stale input at GO, and restarts on replay. Distance becomes a prominent numeric badge without increasing arena height.

Alternatives: swapping character or canned uncollidable jump animation rejected; preserve rig and physical endpoints instead. Countdown inside physics rejected to keep race-time semantics and existing scoring stable.

Verification: unit RED/GREEN countdown, lead/trail geometry/landing/input behavior, matched-cadence successful versus no-jump/early/late races and collision recovery; ordinary real browser countdown and complete airborne motion; desktop/portrait/landscape HUD fit. Preserve all existing asset/share/audio tests and limitations. Replace existing Library version and publish same private Site after checks.
