# 100m / 400m rival abilities

Parent: `c209852c3edccd10dcc063b1e6ea5b1db9ba8f17` on preview/hurdles. Preserve the completed 1500m v5 work; do not update main or unrelated games.

The user requested strong, middle and weak opponents in 100m and 400m as well. Only the two AI controllers change. Every rival still uses the original player input/energy/balance/motion rules. 100m uses .18/.35/.40s base steps and a modest late acceleration (×.88 after 65m) for the weak rival; it removes the previous player-lead-dependent catch-up. 400m uses phase-cadence factors 1/1.28/1.36, with a 1.30 finishing factor for the weak rival. Each AI can make at most one wrong-foot error, avoiding unbounded random failure streaks. No AI capability is scaled in response to the player's lead.

Neither game has contact/drafting interactions with opponents. Identical player inputs must retain identical complete player trajectories and finish state. Accordingly the original 100m local record key and 400m v3 rules/QA leaderboard remain unchanged; no database mutation, migration or new board is necessary. Rank may change; elapsed seconds and existing PBs do not. 1500m's v5 tiered system is untouched.

A new reversible manifest pins the full exact parent tree and the approved delta. Earlier manifests and source hashes remain unchanged. Tests compare both old/new gameplay engines and all player ticks, verify existing local/API contracts, and test replay/pause plus complete races.

The separately requested portrait-results CSS archive was resolved in Library (libfile_8f594cbb39ac819183997e037a1dc034, version 0), but the official materialization helper failed with `download failed`. No archive bytes were obtained or SHA-256 verified; none of its four CSS changes are included. The expected supplied archive SHA-256 is 797dc05d11f8c55429f89b87561e07ca49f1b9072186aca27e7e164019041f84. This download blocker does not authorize recreating or substituting that candidate.

Measured 200 seeds across four player strategies in each game, comparing 1,600 old/new pairs (3,200 complete simulations). All candidate opponents must finish before the existing result cutoff, including expert 100m seed 170 identified in independent review. Independent review also found the faster legal .11s input/.05s reaction case could reach the cutoff with .41s weak cadence. A 2,000-seed regression sweep now covers that case after tuning weak cadence to .40s. This is engine simulation evidence, not an iPhone or physical-device validation.
