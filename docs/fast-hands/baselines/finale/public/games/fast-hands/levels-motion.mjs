// Shared presentation only. Input windows, reaction times, scores and winners
// remain exclusively in levels-rules.mjs. This module does not import Three.
export const MOTION_DURATION_MS = 520;
export const FALLBACK_FRAME_NAMES = Object.freeze([
 'levels-catch-ready','levels-catch-reach','levels-catch-grab','levels-catch-return-mid','levels-catch-return','levels-catch-empty-mid',
 'levels-duel-ready','levels-duel-player-reach','levels-duel-player-grab','levels-duel-player-return-mid','levels-duel-player',
 'levels-duel-ai-reach','levels-duel-ai-grab','levels-duel-ai-return-mid','levels-duel-ai',
]);
const clamp = n => Math.max(0,Math.min(1,n));
const ease = n => {n=clamp(n);return n*n*(3-2*n);};
const finite = (n,fallback) => Number.isFinite(n)?n:fallback;
const mixPoint = (a,b,t) => a.map((v,i)=>v+(b[i]-v)*t);
export const LEVEL_CONTACTS = Object.freeze({
 kingRest:[.49,1.20,.27], kingHome:[.50,1.30,.32],
 catchRest:[.40,.90,.05], catchTarget:[.05,1.33,.35],
 athleteRest:[-.51,1.18,.27], athleteHome:[-.52,1.30,.31],
 prize:[0,1.14,.38], dartStart:[-.85,1.33,.35],
});
const pose = name => ({from:name,to:name,mix:0});
function between(from,to,amount){return amount<=0?pose(from):amount>=1?pose(to):{from,to,mix:amount};}
function frames(prefix,reach,retract,empty=false){
 if(retract>0)return retract<.5?between(prefix+'-grab',prefix+(empty?'-empty-mid':'-return-mid'),retract*2):between(prefix+(empty?'-empty-mid':'-return-mid'),empty?'levels-catch-ready':prefix+'-return',(retract-.5)*2);
 return reach<.5?between(prefix==='levels-catch'?'levels-catch-ready':'levels-duel-ready',prefix+'-reach',reach*2):between(prefix+'-reach',prefix+'-grab',(reach-.5)*2);
}
function actionTime(mode,state,result,now){
 if(Number.isFinite(state.presentation?.pressedAt))return state.presentation.pressedAt;
 if(mode==='catch'&&Number.isFinite(result?.offsetMs)&&Number.isFinite(state.targetAt))return state.targetAt+result.offsetMs;
 if(mode==='duel'&&Number.isFinite(result?.playerMs)&&Number.isFinite(state.liveAt))return state.liveAt+result.playerMs;
 if(result?.reason==='early')return finite(state.presentation?.settledAt,finite(state.startedAt,now));
 return null;
}
export function dartPoint(progress){
 const p=Math.max(0,Math.min(2.5,progress)),point=mixPoint(LEVEL_CONTACTS.dartStart,LEVEL_CONTACTS.catchTarget,p);
 point[1]+=Math.sin(Math.min(1,p)*Math.PI)*.055;
 if(p>1)point[1]-=(p-1)*.24;
 return point;
}
export function sampleLevelMotion({mode='duel',state={},now=0}={}){
 now=finite(now,0);const catching=mode==='catch',phase=state.phase||'idle',feedback=['feedback','done'].includes(phase),live=phase==='live';
 const result=feedback?state.results?.at(-1):null,winner=result?.winner;
 const pressedAt=feedback?actionTime(mode,state,result,now):null;
 const defaultSettle=catching?finite(state.targetAt,now)+finite(result?.offsetMs,100):finite(state.liveAt,now)+finite(result?.playerMs,finite(state.aiMs,180));
 const settledAt=finite(state.presentation?.settledAt,Number.isFinite(pressedAt)?pressedAt:defaultSettle);
 const after=feedback?Math.max(0,now-settledAt):0;
 let kingReach=0,athleteReach=0,kingReturn=0,athleteReturn=0,grip=0,athleteGrip=0,itemAttachedTo=null,dartAttached=false;
 let kingPalm=[...(catching?LEVEL_CONTACTS.catchRest:LEVEL_CONTACTS.kingRest)],athletePalm=catching?null:[...LEVEL_CONTACTS.athleteRest];
 let fallbackFrame=pose(catching?'levels-catch-ready':'levels-duel-ready');
 let dartPosition=dartPoint(Number.isFinite(state.liveAt)?(now-state.liveAt)/Math.max(1,finite(state.flightMs,400)):0);
 if(catching&&Number.isFinite(pressedAt)){
  const t=Math.max(0,now-pressedAt);kingReach=ease(t/120);kingReturn=ease((t-175)/260);
  grip=ease((t-85)/35)*(winner==='player'?1:1-kingReturn);
  kingPalm=mixPoint(mixPoint(LEVEL_CONTACTS.catchRest,LEVEL_CONTACTS.catchTarget,kingReach),winner==='player'?LEVEL_CONTACTS.kingHome:LEVEL_CONTACTS.catchRest,kingReturn);
  dartAttached=winner==='player'&&t>=120;
  if(dartAttached)dartPosition=[...kingPalm];
  else if(winner==='player')dartPosition=mixPoint(dartPoint((pressedAt-finite(state.liveAt,pressedAt))/Math.max(1,finite(state.flightMs,400))),LEVEL_CONTACTS.catchTarget,ease(t/120));
  fallbackFrame=frames('levels-catch',kingReach,kingReturn,winner!=='player');
 }else if(!catching){
  const aiMs=Math.max(1,finite(state.aiMs,180)),elapsed=now-finite(state.liveAt,now);
  if(live){kingReach=ease(elapsed/aiMs);fallbackFrame=frames('levels-duel-ai',kingReach,0);}
  if(feedback&&winner==='player'){
   const t=Math.max(0,now-finite(pressedAt,settledAt));athleteReach=ease(t/150);athleteReturn=ease((t-210)/300);athleteGrip=ease((t-110)/40);
   kingReach=(Number.isFinite(state.liveAt)?ease((finite(pressedAt,settledAt)-state.liveAt)/aiMs):0)*(1-ease(t/190));
   if(t>=150)itemAttachedTo='athlete';
   fallbackFrame=frames('levels-duel-player',athleteReach,athleteReturn);
  }else if(feedback&&winner==='ai'){
   const contactAt=Number.isFinite(state.liveAt)?state.liveAt+aiMs:settledAt+150;
   const t=now-contactAt;kingReach=Number.isFinite(state.liveAt)?ease(elapsed/aiMs):ease((now-settledAt)/150);kingReturn=ease((t-60)/300);grip=ease((t+40)/40);
   if(t>=0)itemAttachedTo='king';
   if(Number.isFinite(pressedAt)){const attempted=Math.max(0,now-pressedAt);athleteReach=ease(attempted/150)*.65*(1-ease((attempted-150)/180));athleteGrip=ease(attempted/120)*(1-ease((attempted-150)/180));}
   fallbackFrame=frames('levels-duel-ai',kingReach,kingReturn);
  }else if(feedback&&winner==='draw'){
   const t=Math.max(0,now-finite(pressedAt,settledAt));athleteReach=ease(t/150)*(1-ease((t-210)/230));kingReach=(1-ease(t/230));
   fallbackFrame=frames('levels-duel-player',athleteReach,0);
  }
  kingPalm=mixPoint(mixPoint(LEVEL_CONTACTS.kingRest,LEVEL_CONTACTS.prize,kingReach),LEVEL_CONTACTS.kingHome,kingReturn);
  athletePalm=mixPoint(mixPoint(LEVEL_CONTACTS.athleteRest,LEVEL_CONTACTS.prize,athleteReach),LEVEL_CONTACTS.athleteHome,athleteReturn);
  // Retain the established final filename while making it the actual return pose.
  for(const key of ['from','to'])fallbackFrame[key]=fallbackFrame[key].replace(/^levels-duel-(player|ai)-return$/,'levels-duel-$1');
 }
 const item=itemAttachedTo==='king'?kingPalm:itemAttachedTo==='athlete'?athletePalm:LEVEL_CONTACTS.prize;
 const motion={phase,feedback,pressedAt,settledAt,after,winner,kingReach,athleteReach,kingReturn,athleteReturn,grip,athleteGrip,itemAttachedTo,dartAttached,kingPalm,athletePalm,item:[...item],dartPosition,fallbackFrame,durationMs:MOTION_DURATION_MS,complete:!feedback||after>=MOTION_DURATION_MS};
 motion.overlay=projectOverlay(motion,{catching,now});return motion;
}
// Fixed orthographic fallback camera: 900 × 620, at (0, 2.35, 6),
// looking at (0, 1.15, .15), view height 2.42. Keep projection deterministic.
export function projectFallbackPoint(point){
 const length=Math.hypot(1.2,5.85),upY=5.85/length,upZ=-1.2/length;
 return{x:.5+point[0]/(2.42*900/620),y:.5-((point[1]-1.15)*upY+(point[2]-.15)*upZ)/2.42};
}
function projectOverlay(motion,{catching,now}){
 const [x,y,z]=motion.item,artY=motion.feedback ? .045 : .045+Math.sin(now*.0025)*.012;
 const project=projectFallbackPoint;
 return{prize:project(motion.item),prizeArtCenter:project([x,y+artY,z+.018]),prizeArtCorners:[[-.28,.28],[.28,.28],[.28,-.28],[-.28,-.28]].map(([dx,dy])=>project([x+dx,y+artY+dy,z+.018])),receivingHand:project(motion.kingPalm),playerHand:motion.athletePalm?project(motion.athletePalm):null,dartStart:catching?project(LEVEL_CONTACTS.dartStart):null,dartTip:catching?project(motion.dartPosition):null};
}
