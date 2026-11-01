import {pose} from './physics.mjs';
import {sceneAltitude} from './altitude.mjs';
export {sceneAltitude} from './altitude.mjs';
// The ladder is a playful comparison, not a uniform survey datum. See HEIGHT-SOURCES.md.
export const milestones = Object.freeze([
  {id:'chair',label:'一張椅子',height:.9,kind:'everyday',description:'椅背高約 0.9 公尺；日常物件估算。'},
  {id:'bus',label:'一台公車',height:3.2,kind:'everyday',description:'公車高約 3.2 公尺；不同車型會有差異。'},
  {id:'tree',label:'一棵大樹',height:12,kind:'everyday',description:'一棵約 12 公尺的大樹；示意尺度，並非指定樹種。'},
  {id:'apartment',label:'十層樓公寓',height:30,kind:'everyday',description:'十層樓約 30 公尺；以每層約 3 公尺估算。'},
  {id:'arc',label:'巴黎凱旋門',height:49.54,kind:'landmark',description:'建物總高 49.54 公尺；法國文化遺產資料，常見50公尺為取整。'},
  {id:'liberty',label:'自由女神',height:92.99,kind:'landmark',description:'含基座至火炬頂端 92.99 公尺；美國國家公園資料。'},
  {id:'bigben',label:'大笨鐘・伊莉莎白塔',height:96.3,kind:'landmark',description:'塔高 96.3 公尺；大笨鐘原指塔內鐘體，英國國會資料。'},
  {id:'needle',label:'太空針塔',height:184.404,kind:'landmark',description:'官方總高 605 英尺，換算約 184.4 公尺。'},
  {id:'gateway',label:'聖路易拱門',height:192.024,kind:'landmark',description:'拱門630英尺，換算192.024公尺；美國國家公園資料。'},
  {id:'eiffel',label:'艾菲爾鐵塔',height:330,kind:'landmark',description:'含天線總高 330 公尺；依艾菲爾鐵塔官方資料。'},
  {id:'tokyo',label:'東京鐵塔',height:333,kind:'landmark',description:'總高 333 公尺；東京鐵塔官方資料。'},
  {id:'taipei101',label:'台北 101',height:508,kind:'landmark',description:'建築總高 508 公尺；依臺北市政府資料。'},
  {id:'lincoln',label:'林肯紀念堂',height:30.1752,kind:'landmark',description:'99英尺，從露台牆腳地坪起算；美國國家公園管理局。'},
  {id:'christ',label:'巴西基督像',height:38,kind:'landmark',description:'含8公尺基座，不含科科瓦多山所在地海拔。'},
  {id:'londoneye',label:'倫敦眼',height:135,kind:'landmark',description:'整座摩天輪總高度，不是輪圈直徑；官方135公尺。'},
  {id:'washington',label:'華盛頓紀念碑',height:169.046,kind:'landmark',description:'NOAA現代建築測量約169.046公尺，不採舊歷史數值。'},
  {id:'esb',label:'帝國大廈',height:443.2,kind:'landmark',description:'含天線約443.2公尺；官方資料。'},
  {id:'cntower',label:'加拿大CN塔',height:553.33,kind:'landmark',description:'基座至天線頂部553.33公尺；官方資料。'},
  {id:'skytree',label:'東京晴空塔',height:634,kind:'landmark',description:'塔體最高634公尺；東武官方資料。'},
  {id:'burj',label:'哈里發塔',height:829.8,kind:'landmark',description:'完整設備尖端829.8公尺；建築高度828公尺。比較完整剪影採尖端，CTBUH資料。'},
  {id:'fuji',label:'富士山',height:3776,kind:'mountain',description:'海拔 3,776 公尺；日本富士登山官方資料，不是山腳到山頂的落差。'},
  {id:'yushan',label:'玉山主峰',height:3952,kind:'mountain',description:'海拔 3,952 公尺；比較的是海拔數字，不是山腳到山頂的落差。'},
  {id:'montblanc',label:'白朗峰',height:4807,kind:'mountain',description:'海拔約 4,807 公尺；霞慕尼官方旅遊資料。冰雪峰頂會隨測量時間變動。'},
  {id:'kilimanjaro',label:'吉力馬札羅山',height:5895,kind:'mountain',description:'海拔 5,895 公尺；坦尚尼亞國家公園資料，不是山體離地高度。'},
  {id:'everest',label:'聖母峰',height:8848.86,kind:'mountain',description:'海拔 8,848.86 公尺；尼泊爾觀光局資料，不是山腳起算的高度。'},
  {id:'space',label:'太空邊界',height:100000,kind:'space',description:'宇宙彈簧模式｜100 公里採用 FAI 卡門線慣例；大氣並非在此突然結束。'},
  {id:'satellite',label:'太空站軌道',height:400000,kind:'space',description:'宇宙彈簧模式｜約 400 公里，借用國際太空站軌道高度作比較；軌道會變動。'},
  {id:'moon',label:'月球！',height:384400000,kind:'space',description:'宇宙彈簧模式｜約 384,400 公里為地月平均距離，非離地高度；純屬幻想挑戰。'},
].sort((a,b)=>a.height-b.height).map(Object.freeze));
const safeHeight = h => Number.isFinite(h) ? Math.max(0,h) : 0;
export function milestoneFor(height){const h=safeHeight(height);return [...milestones].reverse().find(m=>h>=m.height)??null;}
export function nextMilestone(height){const h=safeHeight(height);return milestones.find(m=>h<m.height)??null;}
// Continuous log scale shared by the runner, scenery tops, camera, and height ticks.
// The runner's body retains its original proportions; only travel is compressed.
export function projectAltitudePose(points,height){
  const offset=sceneAltitude(height)-safeHeight(height);
  return Object.fromEntries(Object.entries(points).map(([name,p])=>[name,{...p,y:p.y+offset}]));
}

// Keep metre-sized anatomy precise even when score altitude dwarfs a double's
// unit resolution. During the short backroll, bar and body share local metres.
export function vaultDisplay(s){
 const h=Math.max(0,s.altitude||0),finish=s.phase==='finish';let base=sceneAltitude(finish?s.finishAltitude:h),barY=s.finishAttempted?sceneAltitude(s.finishAltitude)+.26:sceneAltitude(s.barHeight||1.3)+.08;
 let points;
 if(s.phase==='drop'||s.padContact){points=pose(s);base=Math.max(0,s.y-s.finishHipHeight);}
 else if(s.phase==='run'||s.phase==='plant')points=pose(s);
 else if(s.phase==='air'&&s.airTime<.34)points=projectAltitudePose(pose(s),h);
 else{
  points=pose({...s,y:0});const low=Math.min(points.foot0.y,points.foot1.y);
  const lift=finish?s.finishHipHeight+s.finishArc*Math.sin(Math.PI*Math.min(1,s.finishTime/1.6)): .08-low;
  for(const p of Object.values(points))p.y+=base+lift;
 }
 return{points,worldY:base,barY};
}

// Fictional decimal milestones continue after the last sourced reference. One
// computed record replaces the last; no list or geometry grows with altitude.
export function cosmicMilestone(height){const exponent=Math.max(9,Math.min(150,Math.floor(Math.log10(Math.max(1,height)))+1)),jokes=['樓管拒收宇宙包裹','導航：這裡也要左轉？','太陽系已讀不回','宇宙客服轉接中'];return{id:'cosmic-'+exponent,height:10**exponent,label:jokes[exponent%jokes.length],kind:'fantasy'};}
