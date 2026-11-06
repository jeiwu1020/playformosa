# Runner hair and arm revision

## Scope
Only the 400 m and 1500 m visual characters are revised. The original imported SOURCE-MANIFEST.json remains unchanged as a historical source record. VISUAL-REVISION-MANIFEST.json records each explicitly revised visual file against the fresh preview/hurdles parent 8e502b76005f9b74219394e0c35336ff09eafd88. The integration manifest describes the current complete runner addition inventory.

The 100 m game, game rules, physics, race timing, score/leaderboard contracts, audio and platform layout remain outside this revision. No live leaderboard scores or database changes are part of validation.

## Motion reference
The user confirmed the intended reference is Tiangong Omni's 400 m running posture.
- Reporter footage, photos and animated sequence: https://www.wenweipo.com/a/202608/23/AP6a8abc51e4b0c1e50025eda7.html
- Manufacturer-context identification: https://www.sina.cn/news/detail/5335130365494975.html
- Engineer-interview report: https://www.beijing.gov.cn/fuwu/lqfw/gggs/202608/t20260824_4834498.html

Visible observations: bent elbows, hands mainly in the front space between chest and face, different forearm positions across frames, and forward torso lean. These observations guide an original cartoon pose. They do not establish measured joint angles, swing amplitude or a precise left/right timing cycle. The game does not include copied footage, photographs, logos or robot geometry.

## Validation
Geometry, pose continuity and provenance are tested automatically. The two actual game renderers and offline front/side/rear views are inspected separately. Any inability to exercise hardware WebGL or real-device input is reported rather than inferred from compatibility rendering.

After starting, an unfinished cartoon runner retains the high-forearm ready pose even if its speed falls to zero. Only a real finish starts the arm-settling sequence. This avoids combining a leaning pose with unavailable partially settled sprite variants. The compatibility atlas uses complete, discrete poses, not transparent whole-character blending, and approximates low-speed leg motion. The existing 1500 m engine freezes its race clock after the last runner finishes, so that boundary also freezes cosmetic recovery.

Both atlases use 272 cells in a 3072 × 4896 image, approximately 57.4 MiB decoded RGBA per game. Real low-memory-device and hardware-WebGL testing remains necessary. The shortest 320 × 568 view retains the existing 1500 m HUD overlap; this revision does not change layout.
