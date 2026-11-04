// These are local arcade rounds, deliberately separate from the duck leaderboard.
export const CATCH_WINDOW_MS = 110;
export const ITEMS = Object.freeze([
  {id:'slipper',emoji:'🩴',name:'阿嬤的飛天拖鞋',quip:'這次不用閃，搶到算你的。'},
  {id:'toilet',emoji:'🧻',name:'最後一捲衛生紙',quip:'關鍵時刻，手速就是尊嚴。'},
  {id:'broccoli',emoji:'🥦',name:'健身教練的花椰菜',quip:'你可以不愛吃，但不能搶輸。'},
  {id:'alien',emoji:'👽',name:'迷路的外星人',quip:'他只是來問公車站在哪。'},
  {id:'lobster',emoji:'🦞',name:'加班的龍蝦主管',quip:'別讓他先夾到你的下班時間。'},
  {id:'sock',emoji:'🧦',name:'洗衣機裡的孤單襪子',quip:'另一隻依然下落不明。'},
  {id:'durian',emoji:'🍈',name:'假裝沒味道的榴槤',quip:'聞起來是勝利的滋味嗎？'},
  {id:'plunger',emoji:'🪠',name:'傳說中的通馬桶神器',quip:'大俠，輪到你出手了。'},
  {id:'crown',emoji:'👑',name:'夜市塑膠皇冠',quip:'登基只需要快一點。'},
  {id:'unicorn',emoji:'🦄',name:'遲到的獨角獸',quip:'彩虹塞車，牠盡力了。'},
  {id:'brick',emoji:'🧱',name:'非常有想法的一塊磚',quip:'今天也在努力當個有用的人。'},
  {id:'dumpling',emoji:'🥟',name:'最後一顆水餃',quip:'禮貌先放旁邊，這顆我要。'},
  {id:'ufo',emoji:'🛸',name:'沒油的飛碟',quip:'地球沒有這款充電孔。'},
  {id:'duck',emoji:'🦆',name:'拒絕上班的小鴨',quip:'牠說今天只接受被搶走。'},
  {id:'banana',emoji:'🍌',name:'一本正經的香蕉',quip:'不准滑倒，只准快手。'},
  {id:'teddy',emoji:'🧸',name:'欠你五十塊的熊',quip:'終於讓你逮到了。'},
].map(Object.freeze));
const frozen = value => Object.freeze(value);
const randomUnit = random => Math.min(.999999,Math.max(0,Number(random())||0));
const between = (low,high,random) => Math.round(low+(high-low)*randomUnit(random));
function shuffled(random) {
  const items=[...ITEMS];
  for(let i=items.length-1;i>0;i--){const j=Math.floor(randomUnit(random)*(i+1));[items[i],items[j]]=[items[j],items[i]];}
  return frozen(items.slice(0,10));
}
export function newMatch(mode,{practice=false,random=Math.random}={}) {
  if(!['catch','duel'].includes(mode))throw new TypeError('Unknown level');
  return frozen({mode,practice:Boolean(practice),total:practice?1:10,items:shuffled(random),phase:'idle',results:frozen([]),startedAt:null,readyAt:null,liveAt:null,targetAt:null,flightMs:null,aiMs:null});
}
export function beginRound(state,now,random=Math.random) {
  if(!Number.isFinite(now)||now<0||!['idle','feedback','paused'].includes(state.phase))return state;
  // Chosen now, before the signal, and never changed by a player's input.
  const aiMs=between(160,480,random)+(randomUnit(random)>.86?between(120,320,random):0);
  return frozen({...state,phase:'waiting',startedAt:now,readyAt:now+between(900,2300,random),liveAt:null,targetAt:null,flightMs:between(640,1040,random),aiMs});
}
function settle(state,{winner,reason,playerMs=null,offsetMs=null}) {
  const result=frozen({round:state.results.length+1,item:state.items[state.results.length],winner,reason,playerMs,offsetMs,aiMs:state.aiMs});
  const results=frozen([...state.results,result]);
  return frozen({...state,results,phase:results.length===state.total?'done':'feedback'});
}
const validTime=(state,now)=>Number.isFinite(now)&&now>=state.startedAt;
export function advance(state,now) {
  if(!validTime(state,now))return state;
  // Actual animation-frame onset avoids backdating a signal after a stalled tab.
  if(state.phase==='waiting'&&now>=state.readyAt)return frozen({...state,phase:'live',liveAt:now,targetAt:now+state.flightMs});
  if(state.phase!=='live')return state;
  if(state.mode==='catch'&&now>state.targetAt+CATCH_WINDOW_MS)return settle(state,{winner:'none',reason:'miss'});
  if(state.mode==='duel'&&now>state.liveAt+state.aiMs)return settle(state,{winner:'ai',reason:'ai-first'});
  return state;
}
export function press(state,now) {
  if(!validTime(state,now)||!['waiting','live'].includes(state.phase))return state;
  if(state.phase==='waiting')return settle(state,{winner:state.mode==='duel'?'ai':'none',reason:'early'});
  if(now<state.liveAt)return state;
  if(state.mode==='catch'){
    const offsetMs=now-state.targetAt;
    return settle(state,{winner:Math.abs(offsetMs)<=CATCH_WINDOW_MS?'player':'none',reason:Math.abs(offsetMs)<=CATCH_WINDOW_MS?'caught':offsetMs<0?'early':'late',offsetMs});
  }
  const playerMs=now-state.liveAt;
  return settle(state,{winner:playerMs<state.aiMs?'player':playerMs>state.aiMs?'ai':'draw',reason:playerMs<state.aiMs?'player-first':playerMs>state.aiMs?'ai-first':'tie',playerMs});
}
export function pauseMatch(state) {
  return ['waiting','live'].includes(state.phase)?frozen({...state,phase:'paused',liveAt:null,targetAt:null}):state;
}
