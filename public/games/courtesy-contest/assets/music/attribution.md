# 配樂署名與來源

**Monkeys Spinning Monkeys** — Kevin MacLeod (incompetech.com)

Licensed under Creative Commons: By Attribution 4.0 License (CC BY 4.0).

- 官方曲目頁：https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400011
- 官方資料：https://incompetech.com/music/royalty-free/pieces.json
- 官方音檔：https://incompetech.com/music/royalty-free/mp3-royaltyfree/Monkeys%20Spinning%20Monkeys.mp3
- 授權：https://creativecommons.org/licenses/by/4.0/
- 授權完整條文：https://creativecommons.org/licenses/by/4.0/legalcode
- ISRC：USUAN1400011
- 官方標示：144 BPM、2:05，可循環播放。
- 本地檔案：`monkeys-spinning-monkeys.mp3`

## 使用與修改說明

官方原檔 `monkeys-spinning-monkeys.mp3` 保留未剪輯版本。實際遊戲載入 `monkeys-spinning-monkeys-game.mp3`，取原曲前 32 秒、重新編碼為 128 kbps MP3，以減少手機下載與解碼負擔。

遊戲循環播放此片段，並隨倒數接近 0 平滑提高播放速度至最高 1.5 倍；音高亦隨速度提高。若無法使用 Web Audio，則改用原速的 HTML 音訊播放。這些是本遊戲的剪輯與播放處理，並非作者的新版本或背書。

遊戲說明顯示曲名、作者、官方來源及授權連結，並明示片段、循環和加速等修改。CC BY 4.0 允許商業使用、分享與改作，但須適當署名、連結授權、標示修改，且不得對本素材施加阻止授權行為的額外限制。

## 驗證紀錄

2026-11-06：官方曲目資料的 ISRC、曲名、檔名相符；官方曲目頁的 Attribution Code 指定 Kevin MacLeod 與 CC BY 4.0。下載檔案經 ffprobe 確認為 125.0743 秒、5,005,207 bytes 的 MP3；file 顯示 320 kbps、44.1 kHz、立體聲。

本曲僅用作遊戲背景音樂，未暗示作者為遊戲背書。

2026-11-06 v7：遊戲片段為 32 秒、512,878 bytes、128 kbps MP3；以解碼後音訊時鐘控制變速，並與音效共用 AudioContext。
