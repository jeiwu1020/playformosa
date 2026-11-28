PlayFormosa Step 3 覆蓋包：全站總排行榜（24 榜）＋ 公園遊具邀戰連結
======================================================================

建議測試分支操作方式：
1. 在本機 repo 確認目前在最新 main：
   git checkout main
   git pull
   git checkout -b feat/leaderboard-hub-and-duel

2. 將這份壓縮檔解壓縮並「全部取代 / 覆蓋」進資料夾中。

3. 執行本地建置與驗證：
   npm run build
   node scripts/verify.mjs
   node --test tests/park-games-production.test.mjs tests/main-expansion-release.test.mjs tests/main-counts-fighter.test.mjs tests/main-expansion-boards.test.mjs tests/play-counts-api.test.mjs tests/play-counts-client.test.mjs tests/play-counts-repository.test.mjs tests/leaderboard-api.test.mjs

新增與更新重點：
1. 全站線上榮譽榜頁（/leaderboards/）：
   - 首頁上方導覽列新增「榮譽榜」入口（/leaderboards/）
   - 一次整合 公園遊具（3 榜）＋ 十項全能（10 榜）＋ 小遊戲（11 榜）共 24 個線上榜單
   - 支援分類切換、同瀏覽器裝置自動顯示「我的名次與最佳成績」
   - 公園遊具榜單可直接點選選手「向他下戰帖 ↗」，或複製自己的戰帖連結

2. 公園遊具朋友邀戰連結（飛天盪鞦韆 / 單槓甩到爆 / 極速滑梯王）：
   - 結算畫面新增「複製戰帖連結」（挑戰成功時顯示「複製反擊戰帖」）
   - 朋友透過連結進入遊戲時，開場視窗與遊玩畫面會提示目標對象與分數
   - 結算自動比對成績並顯示「挑戰成功 / 剛好平手 / 挑戰失敗」與差距公尺或圈數

注意事項：
- 分支預覽網址上，頁面排版、首頁入口與朋友戰帖連結（成功/失敗判定）皆可完整測試；
  但 /api/leaderboard 因 wrangler.jsonc 鎖定正式網域保護 D1，會在合併進 main 正式網域後連通正式 D1。
