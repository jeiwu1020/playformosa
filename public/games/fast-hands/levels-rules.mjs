// These are local arcade rounds, deliberately separate from the duck leaderboard.
// Bounded, explicit tuning values: speed rises without becoming impossible.
export const LEVEL_TUNING=Object.freeze({catchStartMs:520,catchFloorMs:220,catchDecay:.86,catchWindowRatio:.15,catchWindowFloorMs:35,practiceFlightMs:650,practiceWindowMs:100,aiMinMs:150,aiMaxMs:280,aiStumbleRate:.14});
export function catchStageSettings(level,{practice=false}={}){
 const stage=Math.max(1,Number.isFinite(level)?Math.floor(level):1),c=LEVEL_TUNING;
 const flightMs=practice?c.practiceFlightMs:c.catchFloorMs+(c.catchStartMs-c.catchFloorMs)*c.catchDecay**(stage-1);
 return Object.freeze({flightMs,windowMs:practice?c.practiceWindowMs:Math.max(c.catchWindowFloorMs,flightMs*c.catchWindowRatio)});
}
export const CATCH_WINDOW_MS = LEVEL_TUNING.catchStartMs*LEVEL_TUNING.catchWindowRatio;
// Actual alpha-safe cell boundaries, measured from the generated atlas.
// Inset each edge to exclude adjacent sprite traces; all paths share this crop.
export function itemArtFrame(index){
 const i=Math.max(0,Math.min(15,Number.isInteger(index)?index:0)),col=i%4,row=Math.floor(i/4),x=[0,313,627,940,1254],y=[0,313,627,900,1254],pad=2;
 return Object.freeze({left:(x[col]+pad)/1254,top:(y[row]+pad)/1254,width:(x[col+1]-x[col]-pad*2)/1254,height:(y[row+1]-y[row]-pad*2)/1254});
}
export const ITEMS = Object.freeze([
  {id:'slipper',name:'阿嬤的飛天拖鞋',quip:'這次不用閃，搶到算你的。'},
  {id:'toilet',name:'最後一捲衛生紙',quip:'關鍵時刻，手速就是尊嚴。'},
  {id:'broccoli',name:'健身教練的花椰菜',quip:'你可以不愛吃，但不能搶輸。'},
  {id:'alien',name:'迷路的外星人',quip:'他只是來問公車站在哪。'},
  {id:'lobster',name:'加班的龍蝦主管',quip:'別讓他先夾到你的下班時間。'},
  {id:'sock',name:'洗衣機裡的孤單襪子',quip:'另一隻依然下落不明。'},
  {id:'durian',name:'假裝沒味道的榴槤',quip:'聞起來是勝利的滋味嗎？'},
  {id:'plunger',name:'傳說中的通馬桶神器',quip:'大俠，輪到你出手了。'},
  {id:'crown',name:'夜市塑膠皇冠',quip:'登基只需要快一點。'},
  {id:'unicorn',name:'遲到的獨角獸',quip:'彩虹塞車，牠盡力了。'},
  {id:'brick',name:'非常有想法的一塊磚',quip:'今天也在努力當個有用的人。'},
  {id:'dumpling',name:'最後一顆水餃',quip:'禮貌先放旁邊，這顆我要。'},
  {id:'ufo',name:'沒油的飛碟',quip:'地球沒有這款充電孔。'},
  {id:'duck',name:'拒絕上班的小鴨',quip:'牠說今天只接受被搶走。'},
  {id:'banana',name:'一本正經的香蕉',quip:'不准滑倒，只准快手。'},
  {id:'teddy',name:'欠你五十塊的熊',quip:'終於讓你逮到了。'},
].map((item,artIndex)=>Object.freeze({...item,artIndex})));
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
  return frozen({mode,practice:Boolean(practice),total:practice?1:mode==='catch'?Infinity:10,items:shuffled(random),phase:'idle',results:frozen([]),startedAt:null,readyAt:null,liveAt:null,targetAt:null,flightMs:null,windowMs:null,aiMs:null});
}
export function beginRound(state,now,random=Math.random) {
  if(!Number.isFinite(now)||now<0||!['idle','feedback','paused'].includes(state.phase))return state;
  // Chosen now, before the signal, and never changed by a player's input.
  const aiMs=between(LEVEL_TUNING.aiMinMs,LEVEL_TUNING.aiMaxMs,random)+(randomUnit(random)>1-LEVEL_TUNING.aiStumbleRate?between(80,160,random):0);
  const settings=catchStageSettings(state.results.length+1,{practice:state.practice});
  return frozen({...state,phase:'waiting',startedAt:now,readyAt:now+between(900,2300,random),liveAt:null,targetAt:null,...settings,aiMs});
}
function settle(state,{winner,reason,playerMs=null,offsetMs=null}) {
  const result=frozen({round:state.results.length+1,item:state.items[state.results.length],winner,reason,playerMs,offsetMs,aiMs:state.aiMs,flightMs:state.flightMs,windowMs:state.windowMs});
  const results=frozen([...state.results,result]);
  return frozen({...state,results,phase:results.length===state.total||(state.mode==='catch'&&!state.practice&&winner!=='player')?'done':'feedback'});
}
const validTime=(state,now)=>Number.isFinite(now)&&now>=state.startedAt;
export function advance(state,now) {
  if(!validTime(state,now))return state;
  // Actual animation-frame onset avoids backdating a signal after a stalled tab.
  if(state.phase==='waiting'&&now>=state.readyAt)return frozen({...state,phase:'live',liveAt:now,targetAt:now+state.flightMs});
  if(state.phase!=='live')return state;
  if(state.mode==='catch'&&now>state.targetAt+state.windowMs)return settle(state,{winner:'none',reason:'miss'});
  if(state.mode==='duel'&&now>state.liveAt+state.aiMs)return settle(state,{winner:'ai',reason:'ai-first'});
  return state;
}
export function press(state,now) {
  if(!validTime(state,now)||!['waiting','live'].includes(state.phase))return state;
  if(state.phase==='waiting')return settle(state,{winner:state.mode==='duel'?'ai':'none',reason:'early'});
  if(now<state.liveAt)return state;
  if(state.mode==='catch'){
    const offsetMs=now-state.targetAt;
    return settle(state,{winner:Math.abs(offsetMs)<=state.windowMs?'player':'none',reason:Math.abs(offsetMs)<=state.windowMs?'caught':offsetMs<0?'early':'late',offsetMs});
  }
  const playerMs=now-state.liveAt;
  return settle(state,{winner:playerMs<state.aiMs?'player':playerMs>state.aiMs?'ai':'draw',reason:playerMs<state.aiMs?'player-first':playerMs>state.aiMs?'ai-first':'tie',playerMs});
}
export function pauseMatch(state) {
  return ['waiting','live'].includes(state.phase)?frozen({...state,phase:'paused',liveAt:null,targetAt:null}):state;
}
