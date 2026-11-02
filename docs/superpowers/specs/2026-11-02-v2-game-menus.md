# Approved V2 game menus

Approved by user 805f0db988b48191bd3a373c64d6c70c after PNG `libfile_f5b223ec990081918248f7e342c32386`. All nine games use the same cream/mint/orange ticket surface, existing per-game icon, tactile buttons and restrained playful Traditional Chinese. Preview/hurdles only; main is not authorized.

Latest refinement 786dca960d9c8191a7652d4debf97014 overrides the mock: remove redundant help entries/prose from pause and results. Help remains in entry and canonical header. Pause prioritizes continue, two audio controls, available honor board, restart/home. Results retain score/retry/board/share; no new help action.

One dialog owner at a time. Entering help/ranking during play clears held input and pauses; return shows pause, never auto-resumes. Help/ranking from entry return to unstarted entry; from result restore the same score/PNG. Existing native/fallback/standalone handling, replay, storage and camera/physics remain intact.

Music and effects default enabled, independently persisted volume and enabled state. First defaults music .5/effects .7; per-source gain trim is audio-owner responsibility. Enabled is not readiness: show awaiting first gesture/loading/error honestly. No forced autoplay. Audio adapter supplied by audio owner; every visible control functional before release.

Honor boards use one consistent menu-row entry and one auxiliary view. Existing Jump/Hurdles boards work throughout. Other seven appear only when their real API/adapter is available; no dead placeholder. Casual rules preserve existing randomness. Backend expansion is separately owned and reviewed.

Minimum 44px actions; readable 18px main content; 320/375/390px and short landscape use bounded modal scroll and safe-area. Do not globally hide overflow or alter the scene/camera to fit menus. Use original approved icons, full license text and audio errors; do not add random mascots or remove attribution.
