// Authored scenery stations, not score milestones or fixed astronomical heights.
// One height-selected record drives both the principal model and its visible name.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const band=(a,b,c,d,h)=>smooth(a,b,h)*(1-smooth(c,d,h));
const rows=[
 ['airglow',45000,'大氣光暈','雲海在腳下，天空還有下一層。'],
 ['meteor',70000,'流星擦肩而過','流星：我只是路過，你怎麼也在這？'],
 ['karman',100000,'卡門線・太空邊界','大氣沒有牆，想像力也沒有。'],
 ['satellite',180000,'人造衛星','訊號滿格，地面訊息還在讀取。'],
 ['station',400000,'國際太空站','這位選手沒有登機證。'],
 ['cargo',1200000,'軌道補給艙','貨單上沒有寫要附一位選手。'],
 ['probe',4000000,'深空探測器','導航重新規劃中，請繼續往上。'],
 ['asteroids',20000000,'小行星巡遊','此處碎石多，請收好你的四肢。'],
 ['lunar',100000000,'月球近景','月亮來打招呼，兔子還在加班。'],
 ['mars',1000000000,'火星紅沙地','火星：歡迎，這裡暫時沒有便利商店。'],
 ['jupiter',8000000000,'木星大紅斑','木星的漩渦，比你的髮旋還忙。'],
 ['saturn',50000000000,'土星光環','請勿把光環當成甜甜圈。'],
 ['neptune',300000000000,'海王星藍風暴','這裡的冷氣，可能開得有點強。'],
 ['comet',2000000000000,'彗星快遞','您的願望已出貨，送達時間未知。'],
 ['boba',10000000000000,'珍奶星環','少冰微糖，珍珠繞著你轉。'],
 ['pineapple',70000000000000,'鳳梨太空艙','旺來已抵達，歡迎搭乘。'],
 ['market',500000000000000,'宇宙夜市','老闆：飛這麼高，也可以加辣。'],
 ['temple',3000000000000000,'銀河廟會','平安符管四肢，重力另外問。'],
 ['cat',20000000000000000,'招財貓星球','手一直揮，也不一定是在叫你降落。'],
 ['lunch',100000000000000000,'便當飛碟','主菜還是雞腿，配菜已經失重。'],
 ['bus',800000000000000000,'宇宙公車站','下一班：大約再等一個宇宙。'],
 ['gateway',6000000000000000000,'銀河任意門','門後還有門，天空真的沒有下班。'],
];
export const JOURNEY_STAGES=Object.freeze(rows.map(([id,start,label,note],index)=>Object.freeze({id,start,label,note,index,fantasy:index>=9,datum:index>=9?'幻想星際旅行':id==='lunar'?'地月距離示意':id==='karman'?'100 km 邊界慣例':'景觀示意・非高度基準'})));
const fallback=Object.freeze({id:'cloudsea',label:'雲海上方',note:'還有風景，繼續往上。',datum:'景觀示意',fantasy:false,index:-1});
export function skyJourney(s){
 const raw=s.phase==='finish'?(s.finishAltitude??s.altitude):s.altitude;
 const h=Number.isFinite(raw)?Math.max(0,raw):0,log=Math.log10(Math.max(1,h));
 let index=-1;for(let i=0;i<JOURNEY_STAGES.length;i++)if(h>=JOURNEY_STAGES[i].start)index=i;
 let main=fallback,items=[],cycle=0;
 if(index>=0){
  const lastLog=Math.log10(JOURNEY_STAGES.at(-1).start),travel=Math.max(0,(log-lastLog)/1.2);
  let entry=JOURNEY_STAGES[index],previous=JOURNEY_STAGES[index-1],begin=Math.log10(entry.start),end=index<21?Math.log10(JOURNEY_STAGES[index+1].start):lastLog+1.2;
  if(travel>=1){const hop=Math.floor(travel);cycle=Math.floor((hop-1)/8)+1;index=14+(hop-1)%8;entry=JOURNEY_STAGES[index];previous=JOURNEY_STAGES[hop===1?21:14+(hop-2)%8];begin=lastLog+hop*1.2;end=begin+1.2;}
  const progress=clamp((log-begin)/(end-begin)),fade=smooth(0,.16,progress),weight=previous?.35*(1-fade):0;
  main={...entry,cycle,progress,weight:1-weight};items=[main];if(weight>.00001)items.push({...previous,cycle,progress:1,weight});
 }
 return{altitude:h,main,items,stageNumber:main.index+1,stageCount:JOURNEY_STAGES.length,cycle,
  clouds:band(1000,1800,16000,30000,h),horizon:band(24000,45000,180000,500000,h),
  moon:band(60000000,110000000,800000000,1100000000,h),earth:smooth(80000,150000,h)*(1-.85*smooth(6,9,log)),fantasy:smooth(5e8,1e9,h)};
}
