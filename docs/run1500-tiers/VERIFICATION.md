# 1500m rival tiers and concise player copy

Parent: `182b24ad497ebf23dd8bcb9e2a8418c0137effe1`, preview/hurdles. Only this preview branch is authorised; main and other games must retain their behavior.

The user requested removal of arcade/3D implementation wording and opponents of visibly different ability. Previously, ordinary supply-seeking cruise finished around 133–134s versus all three rivals around 121–126s. This revision keeps the strong rival's original effort, gives the middle rival .45/.43/.40s steps and the weak rival .54/.50/.46s steps, with bounded per-tier passing effort. Recovery, supplies, player inputs, lane clearance, drafting and physical rules remain unchanged. Skilled stamina/supply play can still beat the strong opponent; this is not a guaranteed win.

The four race plans vary only the strong rival's attack thresholds (0/6/12/18m offsets) and seeded timing. Middle/weak rivals have fixed independent random streams and schedules, ensuring that drawing a different strong plan does not directly reroll their timings. They still respond normally to space, energy and nearby runners; no AI reads the player's score or lead to alter its capability. An exploratory all-rival-varying version failed the matched-input fairness target on supply routes, so it was not retained.

Title, live HUD, help, renderer fallback, finish dialog and share result no longer expose arcade/rendering/version implementation text. Necessary controls, supply guidance, pause behavior, manual upload controls, storage failures and licence links are retained. Shared result template changes are conditional on run-1500m; run-400m retains its original content and rules.

Rules advance to `1500m-rival-tiers-v5` because slower rivals change drafting and collision opportunities. Engine, result snapshot, frontend metrics and QA backend agree. Local v3/v4 keys and existing QA leaderboard rows are retained; the current v5 board is a separate comparison. No schema migration, live database mutation, automatic score migration, or main promotion is performed.

The exact full parent tree and all changed preimages are recorded in a new reversible boundary. Prior manifests, simulation reports and historical hash pins remain unchanged. Simulation results describe tested scripts rather than a universal guarantee or phone-device validation.


## Verification outcome

- Extended live-engine experiment: 1,200 complete four-runner races. Same-input maximum plan spreads were 0.053909s (cruise), 0.831382s (sustained attack), 0.560054s (recovery), and 0.038327s (late attack). AI ranges across all scripts were strong 120.627–121.936s, middle 135.543–140.615s, weak 153.169–153.542s. Full numeric results are in SIMULATION.json.
- Ordinary cruise scripts finished second or third; recovery/supply scripts finished first or second. Reckless sustained attack can still finish fourth. These results do not guarantee every possible player input or rank.
- The 72 focused tests passed. Full npm run check passed after the repeated-history-reader correction. A final cache regression verifies that repeated malformed manifest reads cannot reuse a previous valid object; focused provenance checks were rerun after that correction.
- Independent Astra high read-only review passed 34 selected tests and exactly reproduced all runner times in the four worst-case scenarios (16 races). Additional historical checks accepted 14 exact reconstructed files, rejected all 14 changed copies, and rejected current-file rollback for eight overlapping paths. Non-1500 dictionary entries and a representative 400m result template were byte-identical to the parent.
- Real headless Chromium: ready startup, all four plan selections via actual restart, stable pause, successful finish/local save, no runtime exceptions, and no leftover technical text in the document (including shared help and ranking panels). No iPhone validation is claimed.
