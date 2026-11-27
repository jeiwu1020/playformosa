PlayFormosa × 公園遊具 Step 2 正式版（main 分支 + 正式 D1）覆蓋包
================================================================

這包壓縮檔已經針對 jeiwu1020/playformosa 的 **main** 分支結構打包完成，
可以直接解壓縮並「全部取代 / 覆蓋」到 main 分支資料夾（或從 main 開出的 release 分支）中。
不會動到 wrangler.jsonc（沿用 main 既有的正式 D1 綁定 playformosa-leaderboard），
也不需要執行任何新的 D1 SQL migration（直接共用既有的 0001.sql 與 002.sql 資料表）。

包含內容：
1. 三款公園遊具正式版前端（已預編譯為 production 靜態資源，無需安裝 React/Vite）：
   - public/games/shared/park-app/park-app.{js,css}
     * 結算卡片：比照舊版小遊戲改為「手動上傳本次成績」（預設收合、1–20 字純文字暱稱、
       per-round submissionId 冪等重試、60 秒冷卻倒數、隱私說明、查看榮譽榜 ↗）
     * 榮譽榜：即時讀取 /api/leaderboard（Top 20 + 我的線上最佳與追趕差距）
     * 開玩次數：點擊「開始挑戰 ↗」、「再玩一場 ↗」或「↻ 重來」自動背景送出 /api/play-counts/starts
   - public/games/{swing,horizontal-bar,turbo-slide}/index.html
   - public/assets/park-{swing,bar,slide}-card.jpg
   - public/audio/pf-*.mp3

2. 原平台 Worker API 與首頁接軌：
   - worker/leaderboard/index.mjs（在 EXPANDED_SPORTS_BOARDS 新增 swing / horizontal-bar / turbo-slide）
     * swing: swing-flight-m-v1 (unit: 'm', desc, > 0)
     * horizontal-bar: horizontal-bar-loops-v1 (unit: 'loops', desc, integer >= 1)
     * turbo-slide: turbo-slide-m-v1 (unit: 'm', desc, > 0)
   - worker/play-counts/index.mjs、worker/play-counts/repository.mjs、public/games/shared/play-counts.mjs
   - src/catalog.mjs、src/render.mjs（首頁公園遊具 3 張卡片含即時開玩次數顯示）
   - public/assets/home.css、public/games/shared/controls-shell.css、public/games/javelin/controls-shell.css
   - docs/park-games/ADMISSION.json、scripts/release-policy.mjs、scripts/build.mjs、scripts/verify.mjs

3. 測試同步更新：
   - tests/main-expansion-release.test.mjs（更新開放項目數量 18 -> 21）
   - tests/main-counts-fighter.test.mjs（更新首頁計數器清單 23 -> 26）
   - tests/park-games-production.test.mjs（新增三款遊具 D1 排行榜、冷卻、遊玩次數與 bundle 驗證測試）

覆蓋後建議驗證指令：
  npm run build
  node scripts/verify.mjs
  node --test tests/park-games-production.test.mjs tests/main-expansion-release.test.mjs tests/main-counts-fighter.test.mjs tests/main-expansion-boards.test.mjs tests/play-counts-api.test.mjs tests/play-counts-client.test.mjs tests/leaderboard-api.test.mjs

確認通過後，即可 Commit & Push 到 main 分支部署至 Cloudflare 正式站與正式 D1！
