# Unified audio v1 — preview candidate

Base: 5763b4c255bff8a6c2559a98e8f74eb07e553bfd. No audio assets replaced or added.

## Preferences and playback
- Independent music/effects switches and volume, first visit enabled with 50%/70%. These defaults are implementation choices, not a measured loudness guarantee.
- Only pf-audio-preferences-v1 is written. No game saves, scores, anonymous IDs, or physics fields are changed by audio.
- The actual game owns start/pause/resume/result. User gesture unlock resumes synchronously; failure is observable/retryable. Audio never advances the game.
- Runtime has one context, one BGM source, one voice per named cue; procedural relay/gust use the same effects bus. Beer retains one context/loop and caps active effects at eight.
- No queued gameplay cues after pause/hide/restart. Observer APIs only read committed state and never consume events or call RNG. Replays do not retrigger action/result cues.

## Existing assets and attribution
Seven sport/tower BGM tracks reuse Kevin MacLeod, Funin and Sunin (CC BY 4.0), ISRC USUAN1700011. Existing game HTML credits and docs/audio/PROVENANCE.md are retained.
Beer and reaction-rod use Not Jam, Chill Menu (CC0), from the existing Beer audio folder.
Sports step: Kenney RPG footstep04; jump/flight: Not Jam slingshot/dash; landing: Kenney RPG dropLeather; result: FoolBoyMedia Crowd Cheer, Freesound397434 public HQ MP3 excerpt — all existing CC0 sources with receipts retained.
Beer glass-tap/spill-drop/ui-click/result-pizzicato reuse existing Kenney Interface/Music Jingles CC0 assets and beer-slide/audio/CREDITS.md.
No new downloaded sound or paid service.

## Mix and verification limits
Sports retain established source trims: step/result 1, jump .24, flight .14, land/impact .2 (additional conservative attenuation from .3). Other games use the same sports samples and trims. Beer retains music .60 and effects .70 trims under independent preference gains. Procedural relay/gust retain .045/.08 peaks under the effects bus.
ffmpeg measured shipped OGG/MP3 peaks: step about -19dB, jump -18.6dB, flight -12.5dB, land -0.2dB, result -12.8dB, BGM -13dB. Landing gain .2 reduces its peak about 14dB before the user slider. No quiet sound is boosted or peak-equalized. This unifies volume meaning but does not claim perceptual loudness matching or actual device listening. Source-code and fake Web Audio behavior tests do not prove audibility, browser decoding, or mobile activation.

## Event mapping
High-jump: running distance, takeoff, bar contact, landing, committed result. Shot: release, relay contact, landing, committed result. Discus: release, wind relay, landing, committed result. Rod: catch/miss/fall counters and result. Tower: committed uncancelled foot contacts, falls, result. Beer pointer and keyboard share push/release intent. Existing LJ/hurdles/pole event wiring remains.
