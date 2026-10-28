# Source and asset provenance

## Character / visual identity
- Existing PlayFormosa procedural Three.js character reused. Version 1.0 was verbatim; version 1.1 changes only point/bone/band helper depth handling so the original meshes follow the trail-leg abduction. Mesh construction and materials remain unchanged. Repo: jeiwu1020/playformosa, public/games/long-jump/character.mjs, main blob 9eeffe3ac5526b6a75ecb7a7cffa6f525a3a811f (read-only retrieval 2026-10-28).
- Latest long-jump layout/index/style/game/physics/capture/share read as references; new game implemented independently in a new private Sites project.
- Original Library source: libfile_585e60e777708191a4667510cfc243c5 v3, file_00000000797c81f58ce727ba25bdc97d, archive SHA256 1729fc35c2f6b4863b3e52f30961a56c9068d2de8ba0af17fdfcf5a085244f04. Materialized with supported Library helper and attributes verified.
- No new raster images generated. Course art is original procedural Three.js geometry; software compatibility path renders those SAME meshes with flat lighting. Thus image-generation prompt: not applicable. Model dimensions, material palette, clothes, face and hair remain original.
- Three.js bundled modules and original MIT license retained in dist/vendor.

## Audio
All deployment audio bytes reused from the approved long-jump selected release; see docs/audio/PROVENANCE.md and source-assets/licenses. Full Funin and Sunin source MP3, original selected footstep04.ogg and creator public cheer HQ preview MP3 retained. Jump/flight/land source web encodings and license statements are retained verbatim; their pre-encoding WAV/original files were NOT present in Library v3 and are not falsely claimed to be included. Their origin mapping remains in docs/audio/historical-manifest.json.

License/source URLs are linked in game settings/footer credits. BGM incompetech CC BY4.0, step/cheer/Kenney/NotJam action sounds CC0. No license purchased. No music generated. Current game gain defaults: music65%, effects80%, adjustable. No unauthorized source downloads.

## Build prompts and brief
See docs/DESIGN.md and docs/superpowers/plans/2026-10-28-hurdles.md. Original human instruction:「請直接依照跟跳遠相同規格做好 包括美術音效那些」; approved scope is dot-cloud isolated private hurdles preview only, not production integration. creation_intent=user_requested.
