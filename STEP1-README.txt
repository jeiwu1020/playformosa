PlayFormosa × 公園遊具 Step 1 覆蓋包
=====================================

這包壓縮檔已經依照 jeiwu1020/playformosa 的目錄結構打包完成，
可以直接解壓縮並「全部取代 / 覆蓋」到你在 GitHub Desktop 建立的分支資料夾中。

包含內容：
1. 三款公園遊具（已預先編譯為純靜態 HTML/JS/CSS，不需要在原專案安裝 React/Vite）：
   - public/games/swing/index.html（飛天盪鞦韆）
   - public/games/horizontal-bar/index.html（單槓甩到爆）
   - public/games/turbo-slide/index.html（極速滑梯王）
   - public/games/shared/park-app/park-app.{js,css}
   - public/assets/park-{swing,bar,slide}-card.jpg
   - public/audio/pf-*.mp3（10 個公園音效與 BGM）

2. 全平台手機橫向「左 AS / 右 JK」桌面排版優化：
   - public/games/shared/controls-shell.css
   - public/games/javelin/controls-shell.css

3. 原平台首頁與靜態檢查白名單接軌：
   - src/catalog.mjs（新增「公園遊具」3 張卡片）
   - src/render.mjs（渲染「公園遊具」專區與導覽列）
   - public/assets/home.css（公園遊具區塊樣式）
   - docs/park-games/ADMISSION.json（靜態產物清單白名單）
   - scripts/release-policy.mjs、scripts/build.mjs、scripts/verify.mjs

注意事項：
- Step 1 的三款公園遊具目前先將暱稱與個人紀錄存在瀏覽器 localStorage（pf_park_step1_state_v1），
  尚未串接原平台的 D1 排行榜與社群 API（這是 Step 2 & Step 3 的範圍）。
- 覆蓋後可在分支資料夾執行：
    npm run build
    node scripts/verify.mjs
  確認建置通過後，再從 GitHub Desktop Commit & Push 到 Cloudflare 取得 Preview 網址實測！
