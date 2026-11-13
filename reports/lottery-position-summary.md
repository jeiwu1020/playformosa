# 摸彩箱位置與launcher防卡後複測

## 方法
576次paired樣本：12個分層開球seed×兩視角×60/180/不限時×四種操作×有盒/無盒。真tap/release/update，獨立摸彩RNG，每tick drainEvents。包含最新門與機關升級修補及launcher離開區域再觸發規則。
最初wall cap為限時+120秒；14個180秒組正常反覆QTE未達180 playClock，已同seed延長上限至720秒複測，全部在351.9–362.1 wall秒自然結算。原300秒快照保留。不限時仍以180 wall秒截尾，不把存活當失敗。

## 結果
- 384個限時樣本全部自然結算，playClock到達所選限時。
- 192個不限時樣本：無盒33、有盒26在180 wall秒仍存活；其餘已自然落球。
- launcher單局最大觸發由修正前249次降至11次。
- 24分組均無baseline曾到達設備在有盒組完全失去到達；全部12設備均可到達。
- 有盒288次樣本共抽495次，無NaN／releaseError。

## 設備到達樣本數（無盒→有盒，兩邊各288次）
- shredder: 176 → 175
- server: 126 → 109
- boss: 155 → 155
- copier: 232 → 234
- water: 151 → 164
- water2: 156 → 141
- desk: 246 → 256
- chair: 228 → 226
- chair2: 214 → 196
- desk2: 242 → 253
- desk3: 233 → 236
- launcher: 108 → 136

## 位置判斷
x0/z5/hx1/hz1仍為四個靜態候選中最佳平衡位置：最近字燈外緣1.443、reverse影印托盤2.582、全伸抽屜4.169，皆大於人物直徑1.3。幾何2/2測試通過。
有盒會改變路徑分布，server與parcel到達較少，但沒有完全封阻。這是機器固定策略探測，不是人類成功率，也不能保證視覺不遮擋。仍須桌機/手機兩視角視覺驗收。

## 檔案
- lottery-position-results-before-rearm.json：修正前。
- lottery-position-results-after-rearm-300cap.json：修正後初始時間上限。
- lottery-position-results.json：完成14個延長複測的最終結果。
- 重現：node reports/lottery-position-simulation.mjs 12，再執行同命令加 --complete-censored。