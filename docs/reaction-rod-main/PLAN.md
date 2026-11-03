# Reaction Rod main promotion

Goal: promote only the approved Reaction Rod game from preview 52c60d1 onto production af138c1, with navigation ordered 十項全能 → 小遊戲 → 大遊戲. Do not alter any existing game's physics, UI, audio, ranking rules, or data.

1. Assert current production baseline and add failing admission, homepage, and Rod API tests.
2. Copy the 23 approved Rod assets. Isolate required layout, audio, manual-upload, and ranking helpers under Rod rather than changing shared modules. Preserve every existing game and shared file byte-for-byte.
3. Add only the Rod homepage card and minigame category using preview styling. Retain existing Fighter link and all production catalog restrictions.
4. Add Rod-only board validation/repository and recorded-start admission. Preserve legacy repository and validation behavior. Add compatible secondary-score columns with defaults only after production schema inspection and backup. Never lazy-migrate during a request.
5. Extend the explicit production artifact inventory. Keep historical release ledgers intact, with a new before/after ledger for the narrowly authorized promotion.
6. Run the complete production and Rod suites, build, verify dependencies, independent integrity review, and backup/restore verification. Publish with a fresh remote-head lease only when the production database prerequisite is satisfied. Verify exact main commit deployment and live routes.

Review focus: unsupported games stay absent; existing leaderboard tie ordering stays unchanged; missing secondary schema fails only Rod; replay and image failure never change scores; touch/rotation/help/result flows retain approved behavior.
