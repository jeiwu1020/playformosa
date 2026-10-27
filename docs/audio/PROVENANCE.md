# Jump game audio candidates — 2026-10-27

All recordings are existing CC0 assets, not generated sounds. No paid content was acquired; Not Jam used the official $0 download flow. These are candidate selections based on official file names, not an audition-approved mix.

## Authors and sources
- Kenney, RPG Audio: https://kenney.nl/assets/rpg-audio
  Original archive: https://kenney.nl/media/pages/assets/rpg-audio/8e99002d76-1677590336/kenney_rpg-audio.zip
  Included original license: licenses/Kenney-RPG-License.txt
- Not Jam, Not Jam Music Pack 2: https://not-jam.itch.io/not-jam-music-pack-2
  Official free download route: /purchase, then /download_url and /file/{upload_id}.
  SFX archive upload ID: 11283573. Really Long Arms loopable WAV upload ID: 11288645.
  The official page's CC0 statement is retained in licenses/notjam-source-page.html and summarized in licenses/NotJam-CC0-source-statement.txt. SFX ZIP itself has no license file.

## Ready-to-use files
Each web file has both .ogg and .mp3 variants:
- bgm: Not Jam really_long_arms_loopable.wav. Original seamless-loop variant; 15.360 seconds. OGG preferred for exact looping when supported. MP3 may introduce codec delay/padding depending on decoder; verify loop on target browsers, or decode original WAV and set loopEnd=15.36.
- step: Kenney Audio/footstep00.ogg, 0.249 seconds.
- jump: Not Jam SFX/slingshot.wav, 0.469 seconds.
- flight: Not Jam SFX/dash.wav, 0.517 seconds. One-shot flight accent, NOT a loop; do not repeat continuously without listening.
- land: Kenney Audio/dropLeather.ogg, 0.415 seconds. Soft landing candidate, not a literal body impact.
- result: Not Jam SFX/accept.wav, 0.571 seconds.

## Processing and QA
ffmpeg converted to 44.1 kHz, OGG Vorbis quality 3 and MP3 96 kbps; no composition, pitch changes, cuts or normalization. Original files and archives retained. manifest.json records source mappings, duration, output size and SHA-256 hashes. All web derivatives were decoded by ffmpeg successfully. No playback/listening audition was performed; subjective cheerfulness, sound balance, and seamless playback in the actual game remain manual QA tasks.

CC0 does not require credit. Optional credits: “Music and electronic SFX: Not Jam; footsteps and landing SFX: Kenney (CC0).”
